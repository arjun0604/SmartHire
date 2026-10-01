from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, List, Optional, cast
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload, selectinload

from backend.database import get_db
from backend.auth import get_current_recruiter, get_current_user
from backend.models import Application, Job, JobSkill, Recruiter, Skill, User
from backend.schemas import JobCreate, JobResponse, JobUpdate
from backend.services.matcher import (
    compute_job_matching_fingerprint,
    recalculate_job_application_matches,
)
from backend.services.skill_normalizer import sync_job_skills

router = APIRouter(prefix="/jobs", tags=["jobs"])


def format_relative_time(dt: datetime) -> str:
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    diff = now - dt
    days = diff.days
    if days <= 0:
        return "Posted today"
    if days == 1:
        return "Posted yesterday"
    return f"Posted {days} days ago"


def to_numeric_salary_str(val) -> Optional[str]:
    if val is None:
        return None
    try:
        d = Decimal(str(val))
        if d == d.to_integral():
            return str(int(d))
        return str(d)
    except Exception:
        s = str(val).strip()
        return s if s else None



def format_job_response(job: Job) -> JobResponse:
    company_name = job.company.name if job.company else "Meridian Labs"
    company_logo = job.company.logo_url if job.company else None

    req_skills = [js.skill.name for js in job.job_skills if js.is_required and js.skill]
    pref_skills = [js.skill.name for js in job.job_skills if not js.is_required and js.skill]
    all_skills = [js.skill.name for js in job.job_skills if js.skill]

    app_list = job.applications or []
    applicant_count = len(app_list)
    shortlisted_count = sum(1 for a in app_list if a.status == "Shortlisted")
    app_scores = [
        float(a.match.overall_score)
        for a in app_list
        if getattr(a, "match", None) and a.match.overall_score is not None
    ]
    avg_match = round(sum(app_scores) / len(app_scores), 1) if app_scores else None

    posted_date_str = job.posted_at.strftime("%b %d, %Y") if job.posted_at else "Recently"
    posted_rel = format_relative_time(job.posted_at) if job.posted_at else "Recently"

    return JobResponse(
        id=job.id,
        company_id=job.company_id,
        created_by=job.created_by,
        title=job.title,
        department=job.department,
        work_mode=cast(Any, job.work_mode),
        employment_type=cast(Any, job.employment_type),
        location=job.location,
        experience_level=job.experience_level,
        education_level=job.education_level,
        salary_min=job.salary_min,
        salary_max=job.salary_max,
        description=job.description,
        responsibilities=job.responsibilities or [],
        qualifications=job.qualifications or [],
        preferred_qualifications=job.preferred_qualifications or [],
        status=cast(Any, job.status),
        deadline=job.deadline,
        require_assessment=bool(job.require_assessment),
        posted_at=job.posted_at,
        company_name=company_name,
        company_logo=company_logo,
        required_skills=req_skills,
        preferred_skills=pref_skills,
        applicant_count=applicant_count,
        match_score=85,
        company=company_name,
        companyLogo=company_logo,
        workMode=job.work_mode,
        employmentType=job.employment_type,
        jobType=job.employment_type,
        experience=job.experience_level,
        experienceLevel=job.experience_level,
        education=job.education_level or "Bachelor's Degree",
        salaryMin=to_numeric_salary_str(job.salary_min),
        salaryMax=to_numeric_salary_str(job.salary_max),
        postedDate=posted_date_str,
        postedRelative=posted_rel,
        createdAt=job.posted_at.isoformat() if job.posted_at else None,
        updated_at=getattr(job, "updated_at", None) or job.posted_at,
        updatedAt=(getattr(job, "updated_at", None) or job.posted_at).isoformat() if (getattr(job, "updated_at", None) or job.posted_at) else None,
        requireAssessment=bool(job.require_assessment),
        preferredQualifications=job.preferred_qualifications or [],
        requiredSkills=req_skills,
        preferredSkills=pref_skills,
        skills=all_skills,
        applicants=applicant_count,
        applicantCount=applicant_count,
        shortlisted=shortlisted_count,
        average_match=avg_match,
        averageMatch=avg_match,
        matching_weights=cast(Any, job.matching_weights or {"required_skills": 40, "preferred_skills": 15, "experience": 20, "education": 10, "location_work_mode": 10, "employment_status": 5}),
        additional_requirements=job.additional_requirements,
        matchingWeights=job.matching_weights or {"required_skills": 40, "preferred_skills": 15, "experience": 20, "education": 10, "location_work_mode": 10, "employment_status": 5},
        additionalRequirements=job.additional_requirements,
    )


@router.get("", response_model=List[JobResponse])
def get_jobs(
    status_filter: Optional[str] = Query(None, alias="status"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Job).options(
        joinedload(Job.company),
        selectinload(Job.job_skills).joinedload(JobSkill.skill),
        selectinload(Job.applications).joinedload(Application.match),
    )
    if user.role == "candidate":
        query = query.filter(Job.status == "Active")
    elif user.role == "recruiter" and user.recruiter:
        recruiter = user.recruiter
        query = query.filter(Job.company_id == recruiter.company_id)
        if isinstance(status_filter, str) and status_filter.strip():
            query = query.filter(Job.status == status_filter.strip())
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied.",
        )

    jobs = query.order_by(Job.updated_at.desc().nullslast(), Job.posted_at.desc()).all()
    return [format_job_response(j) for j in jobs]


@router.get("/recruiter", response_model=List[JobResponse])
def get_recruiter_jobs(
    status_filter: Optional[str] = Query(None, alias="status"),
    recruiter: Recruiter = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Job)
        .options(
            joinedload(Job.company),
            selectinload(Job.job_skills).joinedload(JobSkill.skill),
            selectinload(Job.applications).joinedload(Application.match),
        )
        .filter(Job.company_id == recruiter.company_id)
    )
    if isinstance(status_filter, str) and status_filter.strip():
        query = query.filter(Job.status == status_filter.strip())
    jobs = query.order_by(Job.updated_at.desc().nullslast(), Job.posted_at.desc()).all()
    return [format_job_response(j) for j in jobs]


@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = (
        db.query(Job)
        .options(
            joinedload(Job.company),
            selectinload(Job.job_skills).joinedload(JobSkill.skill),
            selectinload(Job.applications).joinedload(Application.match),
        )
        .filter(Job.id == job_id)
        .first()
    )
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if user.role == "candidate":
        if job.status != "Active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Candidates may only view active jobs.",
            )
    elif user.role == "recruiter" and user.recruiter:
        recruiter = user.recruiter
        if job.company_id != recruiter.company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to view this job.",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied.",
        )
    return format_job_response(job)


@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(
    payload: JobCreate,
    recruiter: Recruiter = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    if not recruiter.company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recruiter is not associated with a company.",
        )
    company_id = recruiter.company_id

    new_job = Job(
        company_id=company_id,
        created_by=recruiter.id,
        title=payload.title,
        department=payload.department,
        work_mode=payload.work_mode,
        employment_type=payload.employment_type,
        location=payload.location,
        experience_level=payload.experience_level,
        education_level=payload.education_level,
        salary_min=payload.salary_min,
        salary_max=payload.salary_max,
        description=payload.description,
        responsibilities=payload.responsibilities,
        qualifications=payload.qualifications,
        preferred_qualifications=payload.preferred_qualifications,
        matching_weights=payload.matching_weights.model_dump() if hasattr(payload.matching_weights, "model_dump") else payload.matching_weights,
        additional_requirements=payload.additional_requirements,
        status=payload.status,
        deadline=payload.deadline,
        require_assessment=payload.require_assessment,
    )
    db.add(new_job)
    db.flush()

    try:
        sync_job_skills(
            db=db,
            job_id=new_job.id,
            required_skills=payload.required_skills,
            preferred_skills=payload.preferred_skills,
            replace=True,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    db.commit()
    created_job = (
        db.query(Job)
        .options(
            joinedload(Job.company),
            selectinload(Job.job_skills).joinedload(JobSkill.skill),
            selectinload(Job.applications),
        )
        .filter(Job.id == new_job.id)
        .first()
    )
    return format_job_response(created_job or new_job)


@router.put("/{job_id}", response_model=JobResponse)
def update_job(
    job_id: UUID,
    payload: JobUpdate,
    recruiter: Recruiter = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    job = (
        db.query(Job)
        .options(
            selectinload(Job.job_skills).joinedload(JobSkill.skill),
        )
        .filter(Job.id == job_id)
        .first()
    )
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    if job.company_id != recruiter.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You cannot edit jobs that are not yours.",
        )

    old_fingerprint = compute_job_matching_fingerprint(job)

    update_dict = payload.model_dump(exclude_unset=True)
    required_skills = update_dict.pop("required_skills", None)
    preferred_skills = update_dict.pop("preferred_skills", None)

    salary_min_val = update_dict.get("salary_min", job.salary_min)
    salary_max_val = update_dict.get("salary_max", job.salary_max)
    if salary_min_val is not None and salary_max_val is not None and salary_min_val > salary_max_val:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="salary_min cannot be greater than salary_max.",
        )

    work_mode_val = update_dict.get("work_mode", job.work_mode)
    location_val = update_dict.get("location", job.location)
    if work_mode_val != "Remote":
        if not location_val or str(location_val).strip().lower() == "remote":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Physical location is required for On-site or Hybrid jobs.",
            )
    else:
        if location_val is not None and not str(location_val).strip():
            update_dict["location"] = "Remote"

    qual_val = update_dict.get("qualifications", job.qualifications) or []
    pref_qual_val = update_dict.get("preferred_qualifications", job.preferred_qualifications) or []
    qual_norm = {q.lower().strip() for q in qual_val if q}
    for pq in pref_qual_val:
        if pq and pq.lower().strip() in qual_norm:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"'{pq}' cannot be both a basic qualification and a preferred qualification.",
            )

    for field, val in update_dict.items():
        setattr(job, field, val)
    job.updated_at = datetime.now(timezone.utc)

    if required_skills is not None or preferred_skills is not None:
        current_req = [js.skill.name for js in job.job_skills if js.is_required]
        current_pref = [js.skill.name for js in job.job_skills if not js.is_required]
        final_req = required_skills if required_skills is not None else current_req
        final_pref = preferred_skills if preferred_skills is not None else current_pref
        if not final_req:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one required skill must be specified.",
            )
        try:
            sync_job_skills(
                db=db,
                job_id=job.id,
                required_skills=final_req,
                preferred_skills=final_pref,
                replace=True,
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )

    db.flush()
    db.refresh(job, ["job_skills"])

    new_fingerprint = compute_job_matching_fingerprint(job)
    if old_fingerprint != new_fingerprint:
        recalculate_job_application_matches(db=db, job=job, job_fingerprint=new_fingerprint)

    db.commit()
    updated_job = (
        db.query(Job)
        .options(
            joinedload(Job.company),
            selectinload(Job.job_skills).joinedload(JobSkill.skill),
            selectinload(Job.applications).joinedload(Application.match),
        )
        .filter(Job.id == job.id)
        .first()
    )
    return format_job_response(updated_job or job)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: UUID,
    recruiter: Recruiter = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    if job.company_id != recruiter.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You cannot delete jobs that are not yours.",
        )

    db.delete(job)
    db.commit()
    return None
