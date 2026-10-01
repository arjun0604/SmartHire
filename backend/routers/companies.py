from pathlib import Path
import xml.etree.ElementTree as ET
from uuid import UUID
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.auth import get_current_recruiter, get_current_user
from backend.models import Company, Job, Recruiter, User
from backend.schemas import (
    CandidateCompanyDetailsResponse,
    CandidateCompanyJobItem,
    CompanyResponse,
    CompanyUpdateRequest,
)
from backend.services.storage import upload_company_logo_file, delete_storage_file

router = APIRouter(prefix="/companies", tags=["companies"])

ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".svg"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024


@router.get("/my", response_model=CompanyResponse)
def get_my_company(
    recruiter: Recruiter = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    if not recruiter.company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recruiter has no associated company",
        )
    company = db.query(Company).filter(Company.id == recruiter.company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company record not found",
        )
    return company


@router.put("/my", response_model=CompanyResponse)
def update_my_company(
    payload: CompanyUpdateRequest,
    recruiter: Recruiter = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    if not recruiter.company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recruiter has no associated company",
        )
    company = db.query(Company).filter(Company.id == recruiter.company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company record not found",
        )

    if payload.name is not None and payload.name.strip():
        company.name = payload.name.strip()
    if payload.industry is not None:
        company.industry = payload.industry.strip() or None
    if payload.company_size is not None:
        company.company_size = payload.company_size.strip() or None
    if payload.headquarters is not None:
        company.headquarters = payload.headquarters.strip() or None
    if payload.description is not None:
        company.description = payload.description.strip() or None
    if payload.founded_year is not None:
        company.founded_year = payload.founded_year
    if payload.website is not None:
        company.website = payload.website.strip() or None
    if payload.linkedin is not None:
        company.linkedin = payload.linkedin.strip() or None
    if payload.logo_url is not None:
        company.logo_url = payload.logo_url.strip() or None

    db.commit()
    db.refresh(company)
    return company


@router.post("/my/logo")
async def upload_my_company_logo(
    file: UploadFile = File(...),
    recruiter: Recruiter = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    if not recruiter.company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recruiter has no associated company",
        )
    company = db.query(Company).filter(Company.id == recruiter.company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company record not found",
        )

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format. Supported formats: PNG, JPG, JPEG, WEBP, SVG.",
        )

    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the 5MB limit.",
        )

    is_valid_logo = False
    if content.startswith(b"\x89PNG\r\n\x1a\n") or content.startswith(b"\xff\xd8\xff"):
        is_valid_logo = True
    elif content.startswith(b"RIFF") and len(content) >= 12 and content[8:12] == b"WEBP":
        is_valid_logo = True
    elif ext == ".svg":
        try:
            root = ET.fromstring(content.decode("utf-8", errors="ignore"))
            tag = root.tag.lower()
            if tag.endswith("svg") or tag == "svg":
                is_valid_logo = True
        except Exception:
            pass

    if not is_valid_logo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File signature does not match a supported image or SVG format.",
        )

    old_logo_url = company.logo_url

    upload_result = await upload_company_logo_file(
        company_id=str(company.id),
        filename=file.filename or "logo.png",
        content=content,
        content_type=file.content_type or "image/png",
    )

    company.logo_url = upload_result["file_url"]
    db.commit()
    db.refresh(company)

    # Clean up previous logo file if it was replaced with a new path/file
    if old_logo_url and old_logo_url.split("?")[0] != company.logo_url.split("?")[0]:
        await delete_storage_file(old_logo_url)

    return {"logo_url": company.logo_url}


@router.get("/{company_id}", response_model=CandidateCompanyDetailsResponse)
def get_company_by_id(
    company_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    active_jobs_query = db.query(Job).filter(Job.company_id == company_id, Job.status == "Active")
    active_jobs = active_jobs_query.order_by(Job.posted_at.desc()).all()

    if user.role == "candidate" and not active_jobs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found or has no active listings",
        )

    job_items = [
        CandidateCompanyJobItem(
            id=j.id,
            title=j.title,
            department=j.department,
            work_mode=str(j.work_mode),
            employment_type=str(j.employment_type),
            location=j.location,
            experience_level=j.experience_level,
            salary_min=str(j.salary_min) if j.salary_min is not None else None,
            salary_max=str(j.salary_max) if j.salary_max is not None else None,
            posted_date=j.posted_at.strftime("%b %d, %Y") if j.posted_at else None,
            deadline=j.deadline,
            status=str(j.status),
        )
        for j in active_jobs
    ]

    return CandidateCompanyDetailsResponse(
        id=company.id,
        name=company.name,
        logo_url=company.logo_url,
        industry=company.industry,
        company_size=company.company_size,
        headquarters=company.headquarters,
        description=company.description,
        founded_year=company.founded_year,
        website=company.website,
        linkedin=company.linkedin,
        active_jobs=job_items,
    )
