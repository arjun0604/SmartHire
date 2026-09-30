from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Candidate, Application, Job, User, Resume
from backend.auth import get_current_user

router = APIRouter(prefix="/candidates", tags=["candidates"])


@router.get("/{candidate_id}")
def get_candidate_details(
    candidate_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role == "candidate":
        if not user.candidate or user.candidate.id != candidate_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied.",
            )
        candidate = user.candidate
    elif user.role == "recruiter" and user.recruiter:
        recruiter = user.recruiter
        has_application = (
            db.query(Application)
            .join(Job)
            .filter(
                Application.candidate_id == candidate_id,
                Job.company_id == recruiter.company_id,
            )
            .first()
        )
        if not has_application:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Candidate has not applied to your jobs.",
            )
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidate not found",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied.",
        )

    resume = (
        db.query(Resume)
        .filter(Resume.candidate_id == candidate_id)
        .order_by(Resume.uploaded_at.desc())
        .first()
    )
    candidate_skills = [cs.skill.name for cs in candidate.skills if cs.skill] if candidate.skills else []
    resume_data = None
    if resume:
        parsed = dict(resume.parsed_details) if isinstance(resume.parsed_details, dict) else {}
        if not parsed.get("skills") and candidate_skills:
            parsed["skills"] = [
                {"name": name, "type": "explicit", "supporting_evidence": "Explicitly listed in candidate skills."}
                for name in candidate_skills
            ]
        resume_data = {
            "id": str(resume.id),
            "file_url": resume.file_url,
            "file_name": resume.file_name,
            "parsed_details": parsed,
        }
    elif candidate_skills:
        resume_data = {
            "id": "",
            "file_url": "",
            "file_name": "Resume.pdf",
            "parsed_details": {
                "skills": [
                    {"name": name, "type": "explicit", "supporting_evidence": "Explicitly listed in candidate skills."}
                    for name in candidate_skills
                ]
            },
        }

    return {
        "id": str(candidate.id),
        "name": candidate.name,
        "email": candidate.user.email if candidate.user else None,
        "phone": candidate.phone,
        "location": candidate.location,
        "dob": str(candidate.dob) if candidate.dob else None,
        "skills": candidate_skills,
        "current_title": resume_data.get("parsed_details", {}).get("current_title") if resume_data else None,
        "career_level": resume_data.get("parsed_details", {}).get("career_level") if resume_data else None,
        "resume": resume_data,
    }
