import logging
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from pathlib import Path

logger = logging.getLogger(__name__)

from backend.database import get_db
from backend.auth import get_current_candidate, get_current_user
from backend.models import Application, Candidate, CandidateJobMatch, Job, Resume, User
from backend.schemas import ResumeResponse
from backend.services.storage import delete_storage_file, upload_resume_file
from backend.services.extractor import extract_resume_text
from backend.services.structurer import structure_resume_text
from backend.services.skill_normalizer import sync_candidate_skills

router = APIRouter(prefix="/resumes", tags=["resumes"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/octet-stream",
}
MAX_FILE_SIZE = 10 * 1024 * 1024


@router.post("/upload", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    candidate_id: UUID = Form(...),
    file: UploadFile = File(...),
    candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db),
):
    if candidate.id != candidate_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied.",
        )

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only PDF and DOC/DOCX files are supported.",
        )

    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the 10MB limit.",
        )

    is_valid_resume = False
    if ext == ".pdf" and content.startswith(b"%PDF"):
        is_valid_resume = True
    elif ext == ".docx" and content.startswith(b"PK\x03\x04"):
        is_valid_resume = True
    elif ext == ".doc" and content.startswith(b"\xd0\xcf\x11\xe0"):
        is_valid_resume = True

    if not is_valid_resume:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File signature does not match the declared document format.",
        )

    upload_result = await upload_resume_file(
        candidate_id=str(candidate.id),
        filename=file.filename or "resume.pdf",
        content=content,
        content_type=file.content_type or "application/pdf",
    )

    metadata = {
        "file_size": upload_result["file_size"],
        "content_type": upload_result["content_type"],
        "storage_path": upload_result["storage_path"],
    }

    try:
        raw_text = extract_resume_text(filename=file.filename or "resume.pdf", content=content)
        metadata["raw_text"] = raw_text
        metadata["character_count"] = len(raw_text)
        metadata["parsing_status"] = "extracted"
    except Exception:
        metadata["raw_text"] = ""
        metadata["character_count"] = 0
        metadata["parsing_status"] = "failed_extraction"

    if metadata["raw_text"]:
        try:
            structured = structure_resume_text(metadata["raw_text"])
            metadata.update(structured.model_dump())
            metadata["parsing_status"] = "structured"
        except Exception as e:
            logger.warning(f"Resume structuring failed: {type(e).__name__}: {str(e)}")
            metadata["parsing_status"] = "failed_structuring"

    new_resume = Resume(
        candidate_id=candidate.id,
        file_url=upload_result["file_url"],
        file_name=upload_result["file_name"],
        parsed_details=metadata,
        is_baseline=False,
    )
    db.add(new_resume)

    if metadata.get("skills"):
        sync_candidate_skills(
            db=db,
            candidate_id=candidate.id,
            raw_skills=metadata["skills"],
        )

    db.commit()
    db.refresh(new_resume)

    try:
        older_resumes = (
            db.query(Resume)
            .filter(
                Resume.candidate_id == candidate.id,
                Resume.id != new_resume.id,
                Resume.is_baseline == False,
            )
            .all()
        )
        for old_res in older_resumes:
            is_referenced_by_app = (
                db.query(Application.id)
                .filter(Application.resume_id == old_res.id)
                .first()
            ) is not None
            is_referenced_by_match = (
                db.query(CandidateJobMatch.id)
                .filter(CandidateJobMatch.resume_id == old_res.id)
                .first()
            ) is not None
            if not is_referenced_by_app and not is_referenced_by_match:
                await delete_storage_file(old_res.file_url)
                db.delete(old_res)
        db.commit()
    except Exception as cleanup_err:
        db.rollback()
        logger.warning(f"Orphaned resume cleanup failed: {type(cleanup_err).__name__}: {cleanup_err}")

    return new_resume


@router.get("/candidate/{candidate_id}", response_model=ResumeResponse)
def get_candidate_resume(
    candidate_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role == "candidate":
        if not user.candidate or user.candidate.id != candidate_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    elif user.role == "recruiter" and user.recruiter:
        has_application = (
            db.query(Application)
            .join(Job)
            .filter(
                Application.candidate_id == candidate_id,
                Job.company_id == user.recruiter.company_id,
            )
            .first()
        )
        if not has_application:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    resume = (
        db.query(Resume)
        .filter(Resume.candidate_id == candidate_id, Resume.is_baseline == False)
        .order_by(Resume.uploaded_at.desc())
        .first()
    )
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found for this candidate",
        )
    return resume


@router.get("/{resume_id}", response_model=ResumeResponse)
def get_resume(
    resume_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found",
        )

    if user.role == "candidate":
        if not user.candidate or resume.candidate_id != user.candidate.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    elif user.role == "recruiter" and user.recruiter:
        has_authorized_relation = (
            db.query(Application)
            .join(Job, Application.job_id == Job.id)
            .filter(
                Application.resume_id == resume.id,
                Job.company_id == user.recruiter.company_id,
            )
            .first()
        )
        if not has_authorized_relation:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Recruiter is not authorized to view this resume.",
            )
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return resume
