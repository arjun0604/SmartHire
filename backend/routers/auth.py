import logging
import os
import urllib.parse
from pathlib import Path
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
import httpx
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.auth import get_auth0_id_from_token, get_current_user
from backend.models import (
    Application,
    Candidate,
    Company,
    Job,
    JobSkill,
    Recruiter,
    Resume,
    SavedJob,
    User,
)
from backend.schemas import UserResponse, UserSyncRequest, UpdateAccountRequest
from backend.services.storage import upload_avatar_file, delete_storage_file

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024


def format_user_response(user: User) -> UserResponse:
    company_id = None
    company_name = None
    recruiter_id = None
    candidate_id = None
    phone = None
    location = None
    dob = None
    resume_id = None
    resume_name = None
    resume_url = None
    onboarding_completed = False

    if user.role == "recruiter" and user.recruiter:
        recruiter_id = user.recruiter.id
        company_id = user.recruiter.company_id
        if user.recruiter.company:
            company_name = user.recruiter.company.name
            onboarding_completed = bool(company_name and company_name != "My Company")
    elif user.role == "candidate" and user.candidate:
        candidate_id = user.candidate.id
        phone = user.candidate.phone
        location = user.candidate.location
        dob = user.candidate.dob
        if user.candidate.resumes:
            genuine_resumes = [r for r in user.candidate.resumes if not r.is_baseline]
            if genuine_resumes:
                latest_res = max(genuine_resumes, key=lambda r: r.uploaded_at)
                resume_id = latest_res.id
                resume_name = latest_res.file_name
                resume_url = latest_res.file_url
        has_valid_name = bool(user.candidate.name and len(user.candidate.name.strip().split()) >= 2)
        has_valid_phone = bool(user.candidate.phone and user.candidate.phone.strip())
        has_valid_loc = bool(user.candidate.location and user.candidate.location.strip())
        has_valid_dob = bool(user.candidate.dob)
        has_persisted_resume = bool(resume_id is not None)
        onboarding_completed = bool(has_valid_name and has_valid_phone and has_valid_loc and has_valid_dob and has_persisted_resume)

    effective_name = user.candidate.name if (user.role == "candidate" and user.candidate and user.candidate.name) else user.name

    return UserResponse(
        id=user.id,
        auth0_id=user.auth0_id,
        email=user.email,
        name=effective_name,
        role=user.role,
        company_id=company_id,
        company_name=company_name,
        candidate_id=candidate_id,
        recruiter_id=recruiter_id,
        phone=phone,
        location=location,
        dob=dob,
        resume_id=resume_id,
        resume_name=resume_name,
        resume_url=resume_url,
        picture_url=user.picture_url,
        onboarding_completed=onboarding_completed,
    )



@router.post("/sync", response_model=UserResponse)
def sync_user(
    payload: UserSyncRequest,
    current_user_sub: str = Depends(get_auth0_id_from_token),
    db: Session = Depends(get_db),
):
    if current_user_sub != payload.auth0_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token subject does not match requested user ID",
        )
    user = db.query(User).filter(User.auth0_id == payload.auth0_id).first()
    if not user:
        user = db.query(User).filter(User.email == payload.email).first()
        if user:
            user.auth0_id = payload.auth0_id

    is_explicit_update = bool(payload.is_profile_update or payload.is_onboarding_completion)

    if payload.is_onboarding_completion:
        if payload.role != "candidate" or (user and user.role != "candidate"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only candidates can complete candidate onboarding.",
            )
        name_parts = payload.name.strip().split()
        if len(name_parts) < 2:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Both first name and last name are required to complete onboarding.",
            )
        if not payload.phone or not payload.phone.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Phone number is required to complete onboarding.",
            )
        if not payload.location or not payload.location.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Location is required to complete onboarding.",
            )
        effective_dob = payload.dob or (user.candidate.dob if (user and user.candidate) else None)
        if not effective_dob:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Date of birth is required to complete onboarding.",
            )
        has_genuine_resume = False
        if user and user.candidate and user.candidate.resumes:
            has_genuine_resume = any(not r.is_baseline for r in user.candidate.resumes)
        if not has_genuine_resume and not payload.resume_name:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="A persisted resume is required to complete onboarding.",
            )

    target_role = user.role if user else payload.role
    if target_role == "candidate":
        cand_phone = payload.phone.strip() if payload.phone and payload.phone.strip() else None
        if cand_phone:
            cand_id = user.candidate.id if (user and user.candidate) else None
            phone_query = db.query(Candidate).filter(Candidate.phone == cand_phone)
            if cand_id:
                phone_query = phone_query.filter(Candidate.id != cand_id)
            if phone_query.first():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A candidate with this phone number already exists.",
                )

    if not user:
        user = User(
            auth0_id=payload.auth0_id,
            email=payload.email,
            name=payload.name,
            role=payload.role,
            picture_url=payload.picture_url,
        )
        db.add(user)
        db.flush()

        if payload.role == "recruiter":
            company_title = payload.company_name or "My Company"
            company = Company(
                name=company_title,
                industry=payload.industry,
                company_size=payload.company_size,
                headquarters=payload.headquarters,
                description=payload.description,
                founded_year=payload.founded_year,
                website=payload.website,
                linkedin=payload.linkedin,
                logo_url=payload.logo_url,
            )
            db.add(company)
            db.flush()
            recruiter = Recruiter(user_id=user.id, company_id=company.id)
            db.add(recruiter)
        else:
            candidate = Candidate(
                user_id=user.id,
                name=payload.name,
                dob=payload.dob,
                phone=payload.phone.strip() if payload.phone else None,
                location=payload.location.strip() if payload.location else None,
            )
            db.add(candidate)
            db.flush()
            if payload.resume_name:
                clean_text = (payload.resume_text or payload.resume_name).replace("\x00", "")
                resume = Resume(
                    candidate_id=candidate.id,
                    file_name=payload.resume_name,
                    file_url=f"/resumes/{payload.resume_name}",
                    parsed_details={"text": clean_text},
                    is_baseline=False,
                )
                db.add(resume)
    else:
        user.email = payload.email
        if payload.role and user.role != payload.role:
            user.role = payload.role

        if user.role == "recruiter":
            user.name = payload.name
            if not user.recruiter:
                company_title = payload.company_name or "My Company"
                company = Company(
                    name=company_title,
                    industry=payload.industry,
                    company_size=payload.company_size,
                    headquarters=payload.headquarters,
                    description=payload.description,
                    founded_year=payload.founded_year,
                    website=payload.website,
                    linkedin=payload.linkedin,
                    logo_url=payload.logo_url,
                )
                db.add(company)
                db.flush()
                recruiter = Recruiter(user_id=user.id, company_id=company.id)
                db.add(recruiter)
            elif user.recruiter.company:
                comp = user.recruiter.company
                if payload.company_name and (comp.name == "My Company" or len(comp.recruiters) <= 1):
                    comp.name = payload.company_name
                if payload.industry is not None:
                    comp.industry = payload.industry
                if payload.company_size is not None:
                    comp.company_size = payload.company_size
                if payload.headquarters is not None:
                    comp.headquarters = payload.headquarters
                if payload.description is not None:
                    comp.description = payload.description
                if payload.founded_year is not None:
                    comp.founded_year = payload.founded_year
                if payload.website is not None:
                    comp.website = payload.website
                if payload.linkedin is not None:
                    comp.linkedin = payload.linkedin
                if payload.logo_url is not None:
                    comp.logo_url = payload.logo_url
        elif user.role == "candidate":
            if not user.candidate:
                candidate = Candidate(
                    user_id=user.id,
                    name=payload.name,
                    dob=payload.dob,
                    phone=payload.phone.strip() if payload.phone else None,
                    location=payload.location.strip() if payload.location else None,
                )
                db.add(candidate)
                db.flush()
                user.name = payload.name
                if payload.resume_name:
                    clean_text = (payload.resume_text or payload.resume_name).replace("\x00", "")
                    resume = Resume(
                        candidate_id=candidate.id,
                        file_name=payload.resume_name,
                        file_url=f"/resumes/{payload.resume_name}",
                        parsed_details={"text": clean_text},
                        is_baseline=False,
                    )
                    db.add(resume)
            else:
                if is_explicit_update:
                    user.candidate.name = payload.name
                    user.name = payload.name
                    if payload.dob is not None:
                        user.candidate.dob = payload.dob
                    if payload.phone is not None:
                        user.candidate.phone = payload.phone.strip() if payload.phone else None
                    if payload.location is not None:
                        user.candidate.location = payload.location.strip() if payload.location else None
                else:
                    if user.candidate.name:
                        user.name = user.candidate.name
                    else:
                        user.candidate.name = payload.name
                        user.name = payload.name
                    if not user.candidate.dob and payload.dob is not None:
                        user.candidate.dob = payload.dob
                    if not user.candidate.phone and payload.phone:
                        user.candidate.phone = payload.phone.strip()
                    if not user.candidate.location and payload.location:
                        user.candidate.location = payload.location.strip()

                if payload.resume_name and not user.candidate.resumes:
                    clean_text = (payload.resume_text or payload.resume_name).replace("\x00", "")
                    resume = Resume(
                        candidate_id=user.candidate.id,
                        file_name=payload.resume_name,
                        file_url=f"/resumes/{payload.resume_name}",
                        parsed_details={"text": clean_text},
                        is_baseline=False,
                    )
                    db.add(resume)

        if payload.picture_url is not None:
            user.picture_url = payload.picture_url if payload.picture_url else None

    db.commit()
    db.refresh(user)
    return format_user_response(user)


@router.get("/me/{auth0_id}", response_model=UserResponse)
def get_user_profile(
    auth0_id: str,
    user: User = Depends(get_current_user),
):
    if user.auth0_id != auth0_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied.",
        )
    return format_user_response(user)


@router.post("/profile-photo")
async def upload_profile_photo(
    auth0_id: str = Form(...),
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.auth0_id != auth0_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied.",
        )

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format. Only PNG, JPG, JPEG, and WEBP files are allowed.",
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
            detail="Image size exceeds the 5MB limit.",
        )

    is_png = content.startswith(b"\x89PNG\r\n\x1a\n")
    is_jpeg = content.startswith(b"\xff\xd8\xff")
    is_webp = content.startswith(b"RIFF") and len(content) >= 12 and content[8:12] == b"WEBP"
    if not (is_png or is_jpeg or is_webp):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File signature does not match a supported image format (JPEG, PNG, WEBP).",
        )

    if user.picture_url:
        await delete_storage_file(user.picture_url)

    upload_result = await upload_avatar_file(
        user_id=str(user.id),
        filename=file.filename or "avatar.jpg",
        content=content,
        content_type=file.content_type or "image/jpeg",
    )

    user.picture_url = upload_result["file_url"]
    db.commit()
    db.refresh(user)

    return {"picture_url": user.picture_url}


@router.delete("/profile-photo/{auth0_id}")
async def remove_profile_photo(
    auth0_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.auth0_id != auth0_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied.",
        )

    if user.picture_url:
        await delete_storage_file(user.picture_url)
        user.picture_url = None
        db.commit()

    return {"status": "removed"}


@router.put("/account", response_model=UserResponse)
def update_account(
    payload: UpdateAccountRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.auth0_id != payload.auth0_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied.",
        )

    clean_name = payload.name.strip()
    if not clean_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name cannot be empty.",
        )

    user.name = clean_name
    if user.role == "candidate" and user.candidate:
        user.candidate.name = clean_name

    if payload.picture_url is not None:
        user.picture_url = payload.picture_url if payload.picture_url else None

    db.commit()
    db.refresh(user)
    return format_user_response(user)


def is_mock_or_test_auth0_id(auth0_id: str) -> bool:
    lowered = auth0_id.lower()
    return (
        lowered.startswith("demo|")
        or lowered.startswith("test|")
        or lowered.startswith("mock|")
    )


async def delete_auth0_user_identity(auth0_id: str) -> None:
    if is_mock_or_test_auth0_id(auth0_id):
        return

    domain = os.getenv("AUTH0_DOMAIN") or os.getenv("VITE_AUTH0_DOMAIN")
    client_id = os.getenv("AUTH0_MANAGEMENT_CLIENT_ID")
    client_secret = os.getenv("AUTH0_MANAGEMENT_CLIENT_SECRET")

    if not (domain and client_id and client_secret):
        logger.error("Auth0 Management API credentials (AUTH0_MANAGEMENT_CLIENT_ID / AUTH0_MANAGEMENT_CLIENT_SECRET) are not configured.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Identity provider management service is not properly configured.",
        )

    token_url = f"https://{domain}/oauth/token"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            token_res = await client.post(
                token_url,
                json={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "audience": f"https://{domain}/api/v2/",
                    "grant_type": "client_credentials",
                },
            )
            if token_res.status_code != 200:
                logger.error(f"Auth0 token request failed with status {token_res.status_code}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to authenticate with identity provider.",
                )

            token_data = token_res.json()
            access_token = token_data.get("access_token")
            if not access_token:
                logger.error("Auth0 token response missing access_token")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to obtain authorization from identity provider.",
                )

            encoded_id = urllib.parse.quote(auth0_id, safe="")
            delete_url = f"https://{domain}/api/v2/users/{encoded_id}"
            del_res = await client.delete(
                delete_url,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if del_res.status_code not in (200, 204, 404):
                logger.error(f"Auth0 user deletion failed with status {del_res.status_code}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to delete account from identity provider.",
                )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error communicating with Auth0: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to communicate with identity provider.",
        )


@router.delete("/account/{auth0_id}")
async def delete_account(
    auth0_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.auth0_id != auth0_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied.",
        )

    await delete_auth0_user_identity(auth0_id)

    user_picture_url = user.picture_url
    resume_files_to_delete = []
    company_logo_to_delete = None

    try:
        if user.role == "candidate" and user.candidate:
            for resume in user.candidate.resumes:
                storage_path = None
                if resume.parsed_details and isinstance(resume.parsed_details, dict):
                    storage_path = resume.parsed_details.get("storage_path")
                target = storage_path or resume.file_url
                if target:
                    resume_files_to_delete.append(target)
            db.delete(user)
            db.commit()

        elif user.role == "recruiter" and user.recruiter:
            recruiter = user.recruiter
            company_id = recruiter.company_id

            if company_id:
                other_recruiters = (
                    db.query(Recruiter)
                    .filter(Recruiter.company_id == company_id, Recruiter.id != recruiter.id)
                    .all()
                )

                if other_recruiters:
                    remaining_recruiter_id = other_recruiters[0].id
                    jobs_created_by_current = (
                        db.query(Job)
                        .filter(Job.created_by == recruiter.id)
                        .all()
                    )
                    for job in jobs_created_by_current:
                        job.created_by = remaining_recruiter_id
                    db.flush()

                    db.delete(recruiter)
                    db.delete(user)
                    db.commit()
                else:
                    company = db.query(Company).filter(Company.id == company_id).first()
                    if company:
                        company_logo_to_delete = company.logo_url
                        company_jobs = db.query(Job).filter(Job.company_id == company_id).all()
                        for job in company_jobs:
                            db.query(Application).filter(Application.job_id == job.id).delete(synchronize_session=False)
                            db.query(JobSkill).filter(JobSkill.job_id == job.id).delete(synchronize_session=False)
                            db.query(SavedJob).filter(SavedJob.job_id == job.id).delete(synchronize_session=False)
                            db.delete(job)
                        db.flush()

                        db.delete(recruiter)
                        db.delete(company)
                        db.delete(user)
                        db.commit()
                    else:
                        db.delete(recruiter)
                        db.delete(user)
                        db.commit()
            else:
                jobs_created_by_current = (
                    db.query(Job)
                    .filter(Job.created_by == recruiter.id)
                    .all()
                )
                for job in jobs_created_by_current:
                    db.query(Application).filter(Application.job_id == job.id).delete(synchronize_session=False)
                    db.query(JobSkill).filter(JobSkill.job_id == job.id).delete(synchronize_session=False)
                    db.query(SavedJob).filter(SavedJob.job_id == job.id).delete(synchronize_session=False)
                    db.delete(job)
                db.flush()
                db.delete(recruiter)
                db.delete(user)
                db.commit()
        else:
            db.delete(user)
            db.commit()

    except Exception as e:
        db.rollback()
        logger.error(f"Error during database account deletion: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete account data.",
        )

    if user_picture_url:
        await delete_storage_file(user_picture_url)
    for file_path in resume_files_to_delete:
        await delete_storage_file(file_path)
    if company_logo_to_delete:
        await delete_storage_file(company_logo_to_delete)

    return {"status": "deleted"}

