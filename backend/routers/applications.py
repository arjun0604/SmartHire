from datetime import datetime, timezone
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload, selectinload

from backend.database import get_db
from backend.auth import (
    get_current_candidate,
    get_current_recruiter,
    get_current_user,
)
from backend.models import (
    Application,
    ApplicationStatusHistory,
    Candidate,
    CandidateSkill,
    Job,
    Recruiter,
    Resume,
    User,
)
from backend.schemas import (
    ApplicationCreate,
    ApplicationResponse,
    ApplicationStatusHistoryResponse,
    ApplicationStatusUpdate,
)
from backend.services.matcher import get_or_create_application_match

ALLOWED_TRANSITIONS = {
    "Applied": {"Screening", "Rejected"},
    "Screening": {"Applied", "Shortlisted", "Rejected"},
    "Shortlisted": {"Screening", "Rejected"},
    "Rejected": set(),
}

router = APIRouter(prefix="/applications", tags=["applications"])


def format_application_response(app: Application) -> ApplicationResponse:
    candidate_name = app.candidate.name if app.candidate else None
    candidate_email = app.candidate.user.email if app.candidate and app.candidate.user else None
    job_title = app.job.title if app.job else None
    company_name = app.job.company.name if app.job and app.job.company else "Meridian Labs"
    resume_name = app.resume.file_name if app.resume else (app.candidate.resumes[0].file_name if app.candidate and app.candidate.resumes else None)
    resume_url = app.resume.file_url if app.resume else None

    candidate_phone = app.candidate.phone if app.candidate else None
    candidate_location = app.candidate.location if app.candidate else None
    candidate_dob = app.candidate.dob if app.candidate else None
    candidate_skills = []
    if app.candidate and app.candidate.skills:
        candidate_skills = [cs.skill.name for cs in app.candidate.skills if cs.skill]

    ats_score = None
    ai_score = None
    overall_score = None
    match_details = None
    if hasattr(app, "match") and app.match:
        ats_score = float(app.match.ats_score) if app.match.ats_score is not None else None
        ai_score = float(app.match.ai_score) if app.match.ai_score is not None else None
        overall_score = float(app.match.overall_score) if app.match.overall_score is not None else None
        match_details = app.match.match_details

    require_assessment = bool(app.job.require_assessment) if app.job else False
    assessment_status = None
    assessment_score = None
    assessment_total_questions = None
    assessment_correct_answers = None
    assessment_percentage = None

    attempt = getattr(app, "assessment_attempt", None)
    if attempt:
        if attempt.status == "SUBMITTED":
            assessment_status = "Completed"
            assessment_score = attempt.score
            assessment_total_questions = attempt.total_questions
            assessment_correct_answers = attempt.correct_answers
            if attempt.total_questions and attempt.total_questions > 0 and attempt.score is not None:
                assessment_percentage = round((float(attempt.score) / float(attempt.total_questions)) * 100.0, 1)
        elif attempt.status == "IN_PROGRESS":
            assessment_status = "In Progress"
            assessment_total_questions = attempt.total_questions
        else:
            assessment_status = "Not Started"
    elif require_assessment:
        assessment_status = "Not Started"

    return ApplicationResponse(
        id=app.id,
        candidate_id=app.candidate_id,
        job_id=app.job_id,
        resume_id=app.resume_id,
        status=app.status,
        status_changed_at=app.status_changed_at,
        status_changed_by=app.status_changed_by,
        rejection_reason=app.rejection_reason,
        current_job_title=app.current_job_title,
        years_experience=app.years_experience,
        highest_education=app.highest_education,
        why_interested=app.why_interested,
        relevant_experience=app.relevant_experience,
        is_currently_employed=app.is_currently_employed,
        additional_information=app.additional_information,
        applied_at=app.applied_at,
        candidate_name=candidate_name,
        candidate_email=candidate_email,
        candidate_phone=candidate_phone,
        candidate_location=candidate_location,
        candidate_dob=candidate_dob,
        job_title=job_title,
        company_name=company_name,
        resume_name=resume_name,
        resume_url=resume_url,
        skills=candidate_skills,
        overall_score=overall_score,
        ats_score=ats_score,
        ai_score=ai_score,
        match_details=match_details,
        require_assessment=require_assessment,
        assessment_status=assessment_status,
        assessment_score=assessment_score,
        assessment_total_questions=assessment_total_questions,
        assessment_correct_answers=assessment_correct_answers,
        assessment_percentage=assessment_percentage,
    )


@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def create_application(
    payload: ApplicationCreate,
    candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db),
):
    if payload.candidate_id and payload.candidate_id != candidate.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Cannot create application for another candidate.",
        )

    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    resume_id = payload.resume_id
    if resume_id:
        resume = db.query(Resume).filter(Resume.id == resume_id).first()
        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found.",
            )
        if resume.candidate_id != candidate.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied.",
            )
        if resume.is_baseline:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid resume: Baseline placeholder cannot be used for applications.",
            )
    else:
        latest_resume = (
            db.query(Resume)
            .filter(Resume.candidate_id == candidate.id, Resume.is_baseline == False)
            .order_by(Resume.uploaded_at.desc())
            .first()
        )
        if not latest_resume:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A resume is required to submit an application. Please upload a resume first.",
            )
        resume_id = latest_resume.id

    existing = (
        db.query(Application)
        .filter(Application.candidate_id == candidate.id, Application.job_id == job.id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Candidate has already applied to this job",
        )

    now_ts = datetime.now(timezone.utc)
    new_app = Application(
        candidate_id=candidate.id,
        job_id=job.id,
        resume_id=resume_id,
        status="Applied",
        status_changed_at=now_ts,
        status_changed_by=candidate.user_id,
        rejection_reason=None,
        current_job_title=payload.current_job_title,
        years_experience=payload.years_experience,
        highest_education=payload.highest_education,
        why_interested=payload.why_interested,
        relevant_experience=payload.relevant_experience,
        is_currently_employed=payload.is_currently_employed,
        additional_information=payload.additional_information,
    )
    db.add(new_app)
    db.flush()

    status_history = ApplicationStatusHistory(
        application_id=new_app.id,
        from_status=None,
        to_status="Applied",
        changed_by=candidate.user_id,
        changed_at=now_ts,
        reason=None,
    )
    db.add(status_history)

    try:
        get_or_create_application_match(db=db, application=new_app)
    except Exception:
        pass

    db.commit()
    created_app = (
        db.query(Application)
        .options(
            joinedload(Application.job).joinedload(Job.company),
            joinedload(Application.candidate).joinedload(Candidate.user),
            joinedload(Application.resume),
            joinedload(Application.match),
            joinedload(Application.assessment_attempt),
            joinedload(Application.candidate).selectinload(Candidate.skills).joinedload(CandidateSkill.skill),
        )
        .filter(Application.id == new_app.id)
        .first()
    )
    return format_application_response(created_app or new_app)


@router.get("/recruiter", response_model=List[ApplicationResponse])
def get_recruiter_applications(
    recruiter: Recruiter = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    apps = (
        db.query(Application)
        .options(
            joinedload(Application.job).joinedload(Job.company),
            joinedload(Application.candidate).joinedload(Candidate.user),
            joinedload(Application.resume),
            joinedload(Application.match),
            joinedload(Application.assessment_attempt),
            joinedload(Application.candidate).selectinload(Candidate.skills).joinedload(CandidateSkill.skill),
        )
        .join(Job, Application.job_id == Job.id)
        .filter(Job.company_id == recruiter.company_id)
        .order_by(Application.applied_at.desc())
        .all()
    )
    return [format_application_response(a) for a in apps]


@router.get("/candidate/{candidate_id}", response_model=List[ApplicationResponse])
def get_candidate_applications(
    candidate_id: UUID,
    candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db),
):
    if candidate.id != candidate_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    apps = (
        db.query(Application)
        .options(
            joinedload(Application.job).joinedload(Job.company),
            joinedload(Application.candidate).joinedload(Candidate.user),
            joinedload(Application.resume),
            joinedload(Application.match),
            joinedload(Application.assessment_attempt),
            joinedload(Application.candidate).selectinload(Candidate.skills).joinedload(CandidateSkill.skill),
        )
        .filter(Application.candidate_id == candidate_id)
        .order_by(Application.applied_at.desc())
        .all()
    )
    return [format_application_response(a) for a in apps]


@router.get("/job/{job_id}", response_model=List[ApplicationResponse])
def get_job_applications(
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
            detail="Access denied: You do not have permission to view applications for this job.",
        )
    apps = (
        db.query(Application)
        .options(
            joinedload(Application.job).joinedload(Job.company),
            joinedload(Application.candidate).joinedload(Candidate.user),
            joinedload(Application.resume),
            joinedload(Application.match),
            joinedload(Application.assessment_attempt),
            joinedload(Application.candidate).selectinload(Candidate.skills).joinedload(CandidateSkill.skill),
        )
        .filter(Application.job_id == job_id)
        .order_by(Application.applied_at.desc())
        .all()
    )
    return [format_application_response(a) for a in apps]


@router.get("/{application_id}", response_model=ApplicationResponse)
def get_application(
    application_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app = (
        db.query(Application)
        .options(
            joinedload(Application.job).joinedload(Job.company),
            joinedload(Application.candidate).joinedload(Candidate.user),
            joinedload(Application.resume),
            joinedload(Application.match),
            joinedload(Application.assessment_attempt),
            joinedload(Application.candidate).selectinload(Candidate.skills).joinedload(CandidateSkill.skill),
        )
        .filter(Application.id == application_id)
        .first()
    )
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    if user.role == "recruiter" and user.recruiter:
        recruiter = user.recruiter
        if not app.job or app.job.company_id != recruiter.company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to view this application.",
            )
    elif user.role == "candidate" and user.candidate:
        if app.candidate_id != user.candidate.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied.",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied.",
        )
    return format_application_response(app)


@router.patch("/{application_id}/status", response_model=ApplicationResponse)
def update_application_status(
    application_id: UUID,
    payload: ApplicationStatusUpdate,
    recruiter: Recruiter = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    if not app.job or app.job.company_id != recruiter.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not have permission to modify this application.",
        )
    if payload.status not in ALLOWED_TRANSITIONS.get(app.status, set()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status transition from '{app.status}' to '{payload.status}'.",
        )

    from_status = app.status
    to_status = payload.status
    now_ts = datetime.now(timezone.utc)

    app.status = to_status
    app.status_changed_at = now_ts
    app.status_changed_by = recruiter.user_id
    if to_status == "Rejected":
        app.rejection_reason = payload.reason
    else:
        app.rejection_reason = None

    history_entry = ApplicationStatusHistory(
        application_id=app.id,
        from_status=from_status,
        to_status=to_status,
        changed_by=recruiter.user_id,
        changed_at=now_ts,
        reason=payload.reason,
    )
    db.add(history_entry)
    db.commit()
    refreshed_app = (
        db.query(Application)
        .options(
            joinedload(Application.job).joinedload(Job.company),
            joinedload(Application.candidate).joinedload(Candidate.user),
            joinedload(Application.resume),
            joinedload(Application.match),
            joinedload(Application.assessment_attempt),
            joinedload(Application.candidate).selectinload(Candidate.skills).joinedload(CandidateSkill.skill),
        )
        .filter(Application.id == application_id)
        .first()
    )
    return format_application_response(refreshed_app or app)


@router.get("/{application_id}/history", response_model=List[ApplicationStatusHistoryResponse])
def get_application_status_history(
    application_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app = (
        db.query(Application)
        .options(joinedload(Application.job))
        .filter(Application.id == application_id)
        .first()
    )
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    if user.role == "recruiter" and user.recruiter:
        if not app.job or app.job.company_id != user.recruiter.company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to view this application history.",
            )
    elif user.role == "candidate" and user.candidate:
        if app.candidate_id != user.candidate.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied.",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied.",
        )

    return (
        db.query(ApplicationStatusHistory)
        .filter(ApplicationStatusHistory.application_id == application_id)
        .order_by(ApplicationStatusHistory.changed_at.asc())
        .all()
    )
