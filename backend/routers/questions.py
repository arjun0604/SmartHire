from datetime import datetime, timezone
import math
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import case, func, or_
from sqlalchemy.orm import Session, joinedload, selectinload

from backend.database import get_db
from backend.auth import get_current_recruiter
from backend.models import (
    Application,
    AssessmentAttempt,
    AssessmentAttemptQuestion,
    Candidate,
    Job,
    MCQQuestion,
    Recruiter,
    User,
)
from backend.schemas import (
    AssessmentConfigurePayload,
    AssessmentStatusResponse,
    CandidateOptionItem,
    MCQQuestionCreate,
    MCQQuestionResponse,
    MCQQuestionUpdate,
    RecruiterAssessmentOverview,
    RecruiterCandidateAssessmentItem,
    RecruiterCandidateDetailResultResponse,
    RecruiterJobAssessmentResultsResponse,
    RecruiterQuestionPerformanceItem,
)
from backend.routers.candidate_assessments import grade_and_submit_attempt

router = APIRouter(tags=["questions"])


def check_job_recruiter_access(job: Optional[Job], recruiter: Recruiter) -> Job:
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )
    if job.company_id != recruiter.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not have permission to manage questions for this job.",
        )
    return job


@router.post("/jobs/{job_id}/questions", response_model=MCQQuestionResponse, status_code=status.HTTP_201_CREATED)
def create_job_question(
    job_id: UUID,
    payload: MCQQuestionCreate,
    recruiter: Recruiter = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    check_job_recruiter_access(job, recruiter)

    if job.assessment_status in ("STARTED", "CLOSED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot add questions when assessment is {job.assessment_status}.",
        )

    question = MCQQuestion(
        job_id=job.id,
        question_text=payload.question_text,
        option_a=payload.option_a,
        option_b=payload.option_b,
        option_c=payload.option_c,
        option_d=payload.option_d,
        correct_option=payload.correct_option,
        marks=payload.marks,
    )
    db.add(question)
    db.commit()
    db.refresh(question)

    new_count = db.query(func.count(MCQQuestion.id)).filter(MCQQuestion.job_id == job.id).scalar() or 0
    if job.assessment_question_count is None or job.assessment_question_count <= 0:
        job.assessment_question_count = new_count
        db.commit()
        db.refresh(job)

    return question


@router.post("/jobs/{job_id}/questions/bulk", response_model=List[MCQQuestionResponse], status_code=status.HTTP_201_CREATED)
def create_job_questions_bulk(
    job_id: UUID,
    payload: List[MCQQuestionCreate],
    recruiter: Recruiter = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    check_job_recruiter_access(job, recruiter)

    if job.assessment_status in ("STARTED", "CLOSED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot add questions when assessment is {job.assessment_status}.",
        )

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload list cannot be empty",
        )

    created_questions = []
    for item in payload:
        question = MCQQuestion(
            job_id=job.id,
            question_text=item.question_text,
            option_a=item.option_a,
            option_b=item.option_b,
            option_c=item.option_c,
            option_d=item.option_d,
            correct_option=item.correct_option,
            marks=item.marks,
        )
        db.add(question)
        created_questions.append(question)

    db.commit()
    for q in created_questions:
        db.refresh(q)

    new_count = db.query(func.count(MCQQuestion.id)).filter(MCQQuestion.job_id == job.id).scalar() or 0
    if job.assessment_question_count is None or job.assessment_question_count <= 0:
        job.assessment_question_count = new_count
        db.commit()
        db.refresh(job)

    return created_questions


@router.post("/questions", response_model=MCQQuestionResponse, status_code=status.HTTP_201_CREATED)
def create_question_direct(
    payload: MCQQuestionCreate,
    recruiter: Recruiter = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    if not payload.job_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="job_id is required in request payload",
        )
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    check_job_recruiter_access(job, recruiter)

    if job.assessment_status in ("STARTED", "CLOSED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot add questions when assessment is {job.assessment_status}.",
        )

    question = MCQQuestion(
        job_id=job.id,
        question_text=payload.question_text,
        option_a=payload.option_a,
        option_b=payload.option_b,
        option_c=payload.option_c,
        option_d=payload.option_d,
        correct_option=payload.correct_option,
        marks=payload.marks,
    )
    db.add(question)
    db.commit()
    db.refresh(question)

    new_count = db.query(func.count(MCQQuestion.id)).filter(MCQQuestion.job_id == job.id).scalar() or 0
    if job.assessment_question_count is None or job.assessment_question_count <= 0:
        job.assessment_question_count = new_count
        db.commit()
        db.refresh(job)

    return question


@router.get("/jobs/{job_id}/questions", response_model=List[MCQQuestionResponse])
def get_job_questions(
    job_id: UUID,
    recruiter: Recruiter = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    check_job_recruiter_access(job, recruiter)

    questions = (
        db.query(MCQQuestion)
        .filter(MCQQuestion.job_id == job.id)
        .order_by(MCQQuestion.created_at.asc())
        .all()
    )
    return questions


@router.get("/questions/{question_id}", response_model=MCQQuestionResponse)
def get_question(
    question_id: UUID,
    recruiter: Recruiter = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    question = (
        db.query(MCQQuestion)
        .options(joinedload(MCQQuestion.job))
        .filter(MCQQuestion.id == question_id)
        .first()
    )
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )
    check_job_recruiter_access(question.job, recruiter)
    return question


@router.get("/jobs/{job_id}/questions/{question_id}", response_model=MCQQuestionResponse)
def get_job_question(
    job_id: UUID,
    question_id: UUID,
    recruiter: Recruiter = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    check_job_recruiter_access(job, recruiter)

    question = (
        db.query(MCQQuestion)
        .filter(MCQQuestion.id == question_id, MCQQuestion.job_id == job.id)
        .first()
    )
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found for this job",
        )
    return question


@router.put("/questions/{question_id}", response_model=MCQQuestionResponse)
@router.patch("/questions/{question_id}", response_model=MCQQuestionResponse)
def update_question_direct(
    question_id: UUID,
    payload: MCQQuestionUpdate,
    recruiter: Recruiter = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    question = (
        db.query(MCQQuestion)
        .options(joinedload(MCQQuestion.job))
        .filter(MCQQuestion.id == question_id)
        .first()
    )
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )
    check_job_recruiter_access(question.job, recruiter)

    if question.job.assessment_status in ("STARTED", "CLOSED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot modify questions when assessment is {question.job.assessment_status}.",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field_name, value in update_data.items():
        if value is not None:
            setattr(question, field_name, value)

    db.commit()
    db.refresh(question)
    return question


@router.put("/jobs/{job_id}/questions/{question_id}", response_model=MCQQuestionResponse)
@router.patch("/jobs/{job_id}/questions/{question_id}", response_model=MCQQuestionResponse)
def update_job_question(
    job_id: UUID,
    question_id: UUID,
    payload: MCQQuestionUpdate,
    recruiter: Recruiter = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    check_job_recruiter_access(job, recruiter)

    if job.assessment_status in ("STARTED", "CLOSED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot modify questions when assessment is {job.assessment_status}.",
        )

    question = (
        db.query(MCQQuestion)
        .filter(MCQQuestion.id == question_id, MCQQuestion.job_id == job.id)
        .first()
    )
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found for this job",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field_name, value in update_data.items():
        if value is not None:
            setattr(question, field_name, value)

    db.commit()
    db.refresh(question)
    return question


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(
    question_id: UUID,
    recruiter: Recruiter = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    question = (
        db.query(MCQQuestion)
        .options(joinedload(MCQQuestion.job))
        .filter(MCQQuestion.id == question_id)
        .first()
    )
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )
    check_job_recruiter_access(question.job, recruiter)

    if question.job.assessment_status in ("STARTED", "CLOSED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete questions when assessment is {question.job.assessment_status}.",
        )

    job = question.job
    db.delete(question)
    db.commit()

    if job:
        remaining = db.query(func.count(MCQQuestion.id)).filter(MCQQuestion.job_id == job.id).scalar() or 0
        if remaining == 0:
            job.assessment_question_count = None
            db.commit()
        elif job.assessment_question_count and job.assessment_question_count > remaining:
            job.assessment_question_count = remaining
            db.commit()

    return None


@router.delete("/jobs/{job_id}/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job_question(
    job_id: UUID,
    question_id: UUID,
    recruiter: Recruiter = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    check_job_recruiter_access(job, recruiter)

    if job.assessment_status in ("STARTED", "CLOSED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete questions when assessment is {job.assessment_status}.",
        )

    question = (
        db.query(MCQQuestion)
        .filter(MCQQuestion.id == question_id, MCQQuestion.job_id == job.id)
        .first()
    )
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found for this job",
        )

    db.delete(question)
    db.commit()

    remaining = db.query(func.count(MCQQuestion.id)).filter(MCQQuestion.job_id == job.id).scalar() or 0
    if remaining == 0:
        job.assessment_question_count = None
        db.commit()
    elif job.assessment_question_count and job.assessment_question_count > remaining:
        job.assessment_question_count = remaining
        db.commit()

    return None


def compute_assessment_lifecycle(job: Job, db: Session) -> tuple[str, int, int, bool, bool, Optional[int], Optional[str]]:
    question_count = (
        db.query(func.count(MCQQuestion.id))
        .filter(MCQQuestion.job_id == job.id)
        .scalar()
        or 0
    )
    duration = job.assessment_duration_minutes or 30
    configured_question_count = job.assessment_question_count

    validation_message: Optional[str] = None
    if question_count == 0:
        validation_message = "No questions in question bank. Add at least one MCQ before activation."
    elif not job.assessment_duration_minutes or job.assessment_duration_minutes <= 0:
        validation_message = "Assessment duration must be configured and greater than 0 minutes."
    elif not configured_question_count or configured_question_count <= 0:
        validation_message = "Number of questions must be configured and greater than 0."
    elif configured_question_count > question_count:
        validation_message = f"Configured question count ({configured_question_count}) exceeds available questions in question bank ({question_count})."

    is_valid_config = (validation_message is None)

    if question_count == 0:
        return "NOT_STARTED", 0, duration, False, False, configured_question_count, validation_message

    if job.assessment_status == "CLOSED":
        return "CLOSED", question_count, duration, is_valid_config, False, configured_question_count, validation_message

    attempt_count = (
        db.query(func.count(AssessmentAttempt.id))
        .filter(AssessmentAttempt.job_id == job.id)
        .scalar()
        or 0
    )

    if job.assessment_status in ("ACTIVE", "STARTED"):
        if attempt_count > 0:
            return "STARTED", question_count, duration, False, True, configured_question_count, validation_message
        return "ACTIVE", question_count, duration, False, True, configured_question_count, validation_message

    return "CONFIGURED", question_count, duration, is_valid_config, False, configured_question_count, validation_message


@router.get("/jobs/{job_id}/assessment/status", response_model=AssessmentStatusResponse)
def get_assessment_status(
    job_id: UUID,
    recruiter: Recruiter = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    check_job_recruiter_access(job, recruiter)

    status_val, question_count, duration, can_activate, can_close, conf_q_count, val_msg = compute_assessment_lifecycle(job, db)
    return AssessmentStatusResponse(
        job_id=job.id,
        status=status_val,
        question_count=question_count,
        duration_minutes=duration,
        configured_question_count=conf_q_count,
        can_activate=can_activate,
        can_close=can_close,
        validation_message=val_msg,
    )


@router.patch("/jobs/{job_id}/assessment/settings", response_model=AssessmentStatusResponse)
@router.post("/jobs/{job_id}/assessment/configure", response_model=AssessmentStatusResponse)
def update_assessment_settings(
    job_id: UUID,
    payload: AssessmentConfigurePayload,
    recruiter: Recruiter = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    check_job_recruiter_access(job, recruiter)

    if job.assessment_status in ("STARTED", "CLOSED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot modify assessment settings when assessment is {job.assessment_status}.",
        )

    bank_count = (
        db.query(func.count(MCQQuestion.id))
        .filter(MCQQuestion.job_id == job.id)
        .scalar()
        or 0
    )

    if payload.duration_minutes is not None:
        if payload.duration_minutes <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duration must be greater than 0 minutes.",
            )
        job.assessment_duration_minutes = payload.duration_minutes

    if payload.question_count is not None:
        if payload.question_count <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Number of questions must be greater than 0.",
            )
        if bank_count > 0 and payload.question_count > bank_count:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Configured question count ({payload.question_count}) cannot exceed available questions in question bank ({bank_count}).",
            )
        job.assessment_question_count = payload.question_count

    db.commit()
    db.refresh(job)

    status_val, q_count, duration, can_act, can_cls, conf_q_count, val_msg = compute_assessment_lifecycle(job, db)
    return AssessmentStatusResponse(
        job_id=job.id,
        status=status_val,
        question_count=q_count,
        duration_minutes=duration,
        configured_question_count=conf_q_count,
        can_activate=can_act,
        can_close=can_cls,
        validation_message=val_msg,
    )


@router.post("/jobs/{job_id}/assessment/activate", response_model=AssessmentStatusResponse)
def activate_assessment(
    job_id: UUID,
    recruiter: Recruiter = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    check_job_recruiter_access(job, recruiter)

    question_count = (
        db.query(func.count(MCQQuestion.id))
        .filter(MCQQuestion.job_id == job.id)
        .scalar()
        or 0
    )
    if question_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot activate assessment: Job has no MCQ questions configured.",
        )

    if not job.assessment_duration_minutes or job.assessment_duration_minutes <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot activate assessment: Assessment duration must be configured and greater than 0 minutes.",
        )

    configured_count = job.assessment_question_count
    if not configured_count or configured_count <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot activate assessment: Number of questions must be configured and greater than 0.",
        )

    if configured_count > question_count:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot activate assessment: Configured question count ({configured_count}) exceeds available questions in question bank ({question_count}).",
        )

    job.assessment_status = "ACTIVE"
    job.require_assessment = True
    db.commit()
    db.refresh(job)

    status_val, q_count, duration, can_act, can_cls, conf_q_count, val_msg = compute_assessment_lifecycle(job, db)
    return AssessmentStatusResponse(
        job_id=job.id,
        status=status_val,
        question_count=q_count,
        duration_minutes=duration,
        configured_question_count=conf_q_count,
        can_activate=can_act,
        can_close=can_cls,
        validation_message=val_msg,
    )


@router.post("/jobs/{job_id}/assessment/close", response_model=AssessmentStatusResponse)
def close_assessment(
    job_id: UUID,
    recruiter: Recruiter = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    check_job_recruiter_access(job, recruiter)

    question_count = (
        db.query(func.count(MCQQuestion.id))
        .filter(MCQQuestion.job_id == job.id)
        .scalar()
        or 0
    )
    if question_count == 0 or job.assessment_status == "NOT_STARTED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot close an assessment that has not been configured or activated.",
        )

    job.assessment_status = "CLOSED"
    db.commit()
    db.refresh(job)

    status_val, q_count, duration, can_act, can_cls, conf_q_count, val_msg = compute_assessment_lifecycle(job, db)
    return AssessmentStatusResponse(
        job_id=job.id,
        status=status_val,
        question_count=q_count,
        duration_minutes=duration,
        configured_question_count=conf_q_count,
        can_activate=can_act,
        can_close=can_cls,
        validation_message=val_msg,
    )


@router.get("/jobs/{job_id}/assessment/results", response_model=RecruiterJobAssessmentResultsResponse)
def get_job_assessment_results(
    job_id: UUID,
    search: Optional[str] = Query(None, description="Search candidate name or email"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (completed, in_progress, not_started, passed, failed)"),
    min_score: Optional[float] = Query(None, ge=0, description="Minimum score percentage (0-100)"),
    max_score: Optional[float] = Query(None, ge=0, description="Maximum score percentage (0-100)"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(20, ge=1, le=100, description="Number of items per page"),
    recruiter: Recruiter = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    job = (
        db.query(Job)
        .options(joinedload(Job.company))
        .filter(Job.id == job_id)
        .first()
    )
    check_job_recruiter_access(job, recruiter)

    if min_score is not None and max_score is not None:
        if min_score > max_score:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="min_score cannot be greater than max_score",
            )

    normalized_status: Optional[str] = None
    if status_filter is not None and status_filter.strip():
        norm = status_filter.strip().lower().replace(" ", "_").replace("-", "_")
        if norm in ("submitted", "expired"):
            norm = "completed"
        valid_statuses = {"completed", "in_progress", "not_started", "passed", "failed"}
        if norm not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status '{status_filter}'. Valid options are: completed, in_progress, not_started, passed, failed.",
            )
        normalized_status = norm

    total_questions = (
        db.query(func.count(MCQQuestion.id))
        .filter(MCQQuestion.job_id == job.id)
        .scalar()
        or 0
    )

    all_eligible_apps = (
        db.query(Application)
        .outerjoin(AssessmentAttempt, AssessmentAttempt.application_id == Application.id)
        .options(
            joinedload(Application.assessment_attempt),
        )
        .filter(
            Application.job_id == job.id,
            or_(
                func.upper(Application.status).in_(["SCREENING", "SHORTLISTED"]),
                AssessmentAttempt.id.isnot(None),
            ),
        )
        .all()
    )

    now_utc = datetime.now(timezone.utc)
    started_count = 0
    completed_count = 0
    not_started_count = 0
    overview_scores: List[int] = []
    overview_percentages: List[float] = []

    for app in all_eligible_apps:
        attempt = app.assessment_attempt
        if attempt:
            started_count += 1
            if attempt.status == "IN_PROGRESS" and attempt.expires_at and now_utc >= attempt.expires_at:
                grade_and_submit_attempt(attempt, db, now_utc)

            if attempt.status in ("SUBMITTED", "EXPIRED"):
                completed_count += 1
                score = attempt.score or 0
                pct = float(attempt.percentage) if attempt.percentage is not None else (round((score / total_questions * 100), 1) if total_questions > 0 else 0.0)
                overview_scores.append(score)
                overview_percentages.append(pct)
        else:
            not_started_count += 1

    total_eligible = len(all_eligible_apps)
    attended_count = started_count
    attendance_rate = round((attended_count / total_eligible * 100), 1) if total_eligible > 0 else 0.0
    completion_rate = round((completed_count / total_eligible * 100), 1) if total_eligible > 0 else 0.0
    avg_score = round(sum(overview_scores) / len(overview_scores), 2) if overview_scores else None
    avg_pct = round(sum(overview_percentages) / len(overview_percentages), 1) if overview_percentages else None

    overview = RecruiterAssessmentOverview(
        total_eligible=total_eligible,
        started=started_count,
        started_count=started_count,
        completed=completed_count,
        completed_count=completed_count,
        not_started=not_started_count,
        not_started_count=not_started_count,
        average_score=avg_score,
        average_percentage=avg_pct,
        completion_rate=completion_rate,
        completion_rate_percentage=completion_rate,
        attendance_rate=attendance_rate,
        attendance_rate_percentage=attendance_rate,
    )

    query = (
        db.query(Application)
        .join(Application.candidate)
        .join(Candidate.user)
        .outerjoin(AssessmentAttempt, AssessmentAttempt.application_id == Application.id)
        .filter(
            Application.job_id == job.id,
            or_(
                func.upper(Application.status).in_(["SCREENING", "SHORTLISTED"]),
                AssessmentAttempt.id.isnot(None),
            ),
        )
    )

    if search and search.strip():
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Candidate.name.ilike(search_pattern),
                User.email.ilike(search_pattern),
            )
        )

    calc_pct = func.coalesce(
        AssessmentAttempt.percentage,
        case(
            (AssessmentAttempt.total_questions > 0, AssessmentAttempt.score * 100.0 / AssessmentAttempt.total_questions),
            else_=0.0,
        ),
    )

    if normalized_status:
        if normalized_status == "completed":
            query = query.filter(AssessmentAttempt.status.in_(["SUBMITTED", "EXPIRED"]))
        elif normalized_status == "in_progress":
            query = query.filter(AssessmentAttempt.status == "IN_PROGRESS")
        elif normalized_status == "not_started":
            query = query.filter(AssessmentAttempt.id.is_(None))
        elif normalized_status == "passed":
            query = query.filter(
                AssessmentAttempt.status.in_(["SUBMITTED", "EXPIRED"]),
                calc_pct >= 60.0,
            )
        elif normalized_status == "failed":
            query = query.filter(
                AssessmentAttempt.status.in_(["SUBMITTED", "EXPIRED"]),
                calc_pct < 60.0,
            )

    if min_score is not None:
        query = query.filter(
            AssessmentAttempt.status.in_(["SUBMITTED", "EXPIRED"]),
            calc_pct >= min_score,
        )

    if max_score is not None:
        query = query.filter(
            AssessmentAttempt.status.in_(["SUBMITTED", "EXPIRED"]),
            calc_pct <= max_score,
        )

    total = query.count()
    total_pages = math.ceil(total / limit) if total > 0 else 0
    offset = (page - 1) * limit

    paginated_apps = (
        query.options(
            joinedload(Application.candidate).joinedload(Candidate.user),
            joinedload(Application.assessment_attempt),
        )
        .order_by(Application.applied_at.desc(), Application.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    candidate_items: List[RecruiterCandidateAssessmentItem] = []
    for app in paginated_apps:
        cand = app.candidate
        cand_name = cand.name if cand else "Unknown Candidate"
        cand_email = cand.user.email if cand and cand.user else "No email"
        attempt = app.assessment_attempt

        if attempt:
            if attempt.status in ("SUBMITTED", "EXPIRED"):
                score = attempt.score or 0
                pct = float(attempt.percentage) if attempt.percentage is not None else (round((score / total_questions * 100), 1) if total_questions > 0 else 0.0)
                candidate_items.append(
                    RecruiterCandidateAssessmentItem(
                        candidate_id=cand.id,
                        candidate_name=cand_name,
                        candidate_email=cand_email,
                        application_id=app.id,
                        attempt_id=attempt.id,
                        assessment_attempt_id=attempt.id,
                        status="Completed",
                        attempt_status="Completed",
                        application_status=app.status,
                        score=score,
                        total_questions=attempt.total_questions or total_questions,
                        percentage=pct,
                        time_taken_seconds=attempt.time_taken_seconds,
                        started_at=attempt.started_at,
                        completed_at=attempt.submitted_at,
                    )
                )
            else:
                candidate_items.append(
                    RecruiterCandidateAssessmentItem(
                        candidate_id=cand.id,
                        candidate_name=cand_name,
                        candidate_email=cand_email,
                        application_id=app.id,
                        attempt_id=attempt.id,
                        assessment_attempt_id=attempt.id,
                        status="In Progress",
                        attempt_status="In Progress",
                        application_status=app.status,
                        score=None,
                        total_questions=total_questions,
                        percentage=None,
                        time_taken_seconds=None,
                        started_at=attempt.started_at,
                        completed_at=None,
                    )
                )
        else:
            candidate_items.append(
                RecruiterCandidateAssessmentItem(
                    candidate_id=cand.id,
                    candidate_name=cand_name,
                    candidate_email=cand_email,
                    application_id=app.id,
                    attempt_id=None,
                    assessment_attempt_id=None,
                    status="Not Started",
                    attempt_status="Not Started",
                    application_status=app.status,
                    score=None,
                    total_questions=total_questions,
                    percentage=None,
                    time_taken_seconds=None,
                    started_at=None,
                    completed_at=None,
                )
            )

    company_name = job.company.name if job.company else "Unknown Company"

    return RecruiterJobAssessmentResultsResponse(
        job_id=job.id,
        job_title=job.title,
        company_name=company_name,
        assessment_status=job.assessment_status,
        duration_minutes=job.assessment_duration_minutes or 30,
        total_questions=total_questions,
        overview=overview,
        candidates=candidate_items,
        page=page,
        limit=limit,
        total=total,
        total_pages=total_pages,
    )


@router.get("/jobs/{job_id}/assessment/results/{attempt_id}", response_model=RecruiterCandidateDetailResultResponse)
def get_candidate_assessment_result_detail(
    job_id: UUID,
    attempt_id: UUID,
    recruiter: Recruiter = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    job = (
        db.query(Job)
        .options(joinedload(Job.company))
        .filter(Job.id == job_id)
        .first()
    )
    check_job_recruiter_access(job, recruiter)

    attempt = (
        db.query(AssessmentAttempt)
        .options(
            joinedload(AssessmentAttempt.candidate).joinedload(Candidate.user),
            selectinload(AssessmentAttempt.attempt_questions).joinedload(
                AssessmentAttemptQuestion.question
            ),
        )
        .filter(AssessmentAttempt.id == attempt_id, AssessmentAttempt.job_id == job.id)
        .first()
    )
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment attempt not found",
        )

    cand = attempt.candidate
    cand_name = cand.name if cand else "Unknown Candidate"
    cand_email = cand.user.email if cand and cand.user else "No email"

    sorted_questions = sorted(attempt.attempt_questions, key=lambda x: x.question_order)
    questions_perf: List[RecruiterQuestionPerformanceItem] = []

    for aq in sorted_questions:
        q = aq.question
        options_list = [
            CandidateOptionItem(key="A", text=q.option_a),
            CandidateOptionItem(key="B", text=q.option_b),
            CandidateOptionItem(key="C", text=q.option_c),
            CandidateOptionItem(key="D", text=q.option_d),
        ]

        cand_disp_opt = aq.selected_option
        cand_orig_opt = aq.option_order.get(cand_disp_opt) if cand_disp_opt else None
        cand_text = getattr(q, f"option_{cand_orig_opt.lower()}", None) if cand_orig_opt else None

        correct_orig = q.correct_option
        correct_text = getattr(q, f"option_{correct_orig.lower()}", None)

        if not cand_disp_opt:
            q_status = "Unanswered"
        elif aq.is_correct:
            q_status = "Correct"
        else:
            q_status = "Incorrect"

        questions_perf.append(
            RecruiterQuestionPerformanceItem(
                question_id=aq.question_id,
                question_number=aq.question_order,
                question_text=q.question_text,
                options=options_list,
                candidate_selected_option=cand_orig_opt,
                candidate_selected_text=cand_text,
                correct_option=correct_orig,
                correct_text=correct_text,
                is_correct=aq.is_correct,
                status=q_status,
            )
        )

    score = attempt.score or 0
    pct = float(attempt.percentage) if attempt.percentage is not None else (round((score / attempt.total_questions * 100), 1) if attempt.total_questions > 0 else 0.0)

    return RecruiterCandidateDetailResultResponse(
        attempt_id=attempt.id,
        candidate_id=attempt.candidate_id,
        candidate_name=cand_name,
        candidate_email=cand_email,
        job_id=job.id,
        job_title=job.title,
        company_name=job.company.name if job.company else "Unknown Company",
        status=attempt.status,
        score=score,
        total_questions=attempt.total_questions,
        percentage=pct,
        time_taken_seconds=attempt.time_taken_seconds,
        started_at=attempt.started_at,
        submitted_at=attempt.submitted_at,
        questions=questions_perf,
    )
