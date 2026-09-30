import random
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload

from backend.auth import get_current_candidate
from backend.database import get_db
from backend.models import (
    Application,
    AssessmentAttempt,
    AssessmentAttemptQuestion,
    Candidate,
    Job,
    MCQQuestion,
)
from backend.schemas import (
    AssessmentAnswerPayload,
    CandidateAssessmentAttemptResponse,
    CandidateAssessmentListItem,
    CandidateAssessmentMyAttemptResponse,
    CandidateAssessmentQuestionResponse,
    CandidateAssessmentSubmitResponse,
    CandidateOptionItem,
    MarkReviewPayload,
)

router = APIRouter(tags=["candidate-assessments"])


def grade_and_submit_attempt(
    attempt: AssessmentAttempt,
    db: Session,
    submitted_timestamp: Optional[datetime] = None,
) -> AssessmentAttempt:
    if not submitted_timestamp:
        submitted_timestamp = datetime.now(timezone.utc)

    correct_count = 0
    total = len(attempt.attempt_questions)

    for aq in attempt.attempt_questions:
        if not aq.selected_option:
            aq.is_correct = False
        else:
            orig_key = aq.option_order.get(aq.selected_option)
            if orig_key == aq.question.correct_option:
                aq.is_correct = True
                correct_count += 1
            else:
                aq.is_correct = False

    time_taken = int((submitted_timestamp - attempt.started_at).total_seconds())
    if time_taken < 0:
        time_taken = 0
    duration_mins = attempt.job.assessment_duration_minutes if (attempt.job and attempt.job.assessment_duration_minutes) else 30
    duration_secs = duration_mins * 60
    if time_taken > duration_secs:
        time_taken = duration_secs

    pct = round((correct_count / total * 100), 2) if total > 0 else 0.0

    attempt.status = "SUBMITTED"
    attempt.submitted_at = submitted_timestamp
    attempt.correct_answers = correct_count
    attempt.score = correct_count
    attempt.total_questions = total
    attempt.time_taken_seconds = time_taken
    attempt.percentage = pct

    db.commit()
    return attempt


def build_candidate_attempt_response(attempt: AssessmentAttempt) -> CandidateAssessmentAttemptResponse:
    answered_count = sum(1 for aq in attempt.attempt_questions if aq.selected_option is not None)
    sorted_questions = sorted(attempt.attempt_questions, key=lambda x: x.question_order)

    questions_payload: List[CandidateAssessmentQuestionResponse] = []
    for aq in sorted_questions:
        options: List[CandidateOptionItem] = []
        for disp_key in ["A", "B", "C", "D"]:
            orig_key = aq.option_order.get(disp_key, disp_key)
            opt_text = getattr(aq.question, f"option_{orig_key.lower()}", "") if aq.question else ""
            options.append(CandidateOptionItem(key=disp_key, text=opt_text))

        questions_payload.append(
            CandidateAssessmentQuestionResponse(
                question_id=aq.question_id,
                question_number=aq.question_order,
                question_text=aq.question.question_text if aq.question else "",
                options=options,
                selected_option=aq.selected_option,
                is_marked_for_review=getattr(aq, "is_marked_for_review", False),
            )
        )

    job_title = attempt.job.title if attempt.job else None
    company_name = (
        attempt.job.company.name if attempt.job and attempt.job.company else None
    )

    is_completed = attempt.status in ("SUBMITTED", "EXPIRED")
    score = attempt.score if is_completed else None
    correct_answers = attempt.correct_answers if is_completed else None
    percentage = float(attempt.percentage) if (is_completed and attempt.percentage is not None) else None
    time_taken_seconds = attempt.time_taken_seconds if is_completed else None

    duration_minutes = attempt.job.assessment_duration_minutes if (attempt.job and attempt.job.assessment_duration_minutes) else 30

    return CandidateAssessmentAttemptResponse(
        id=attempt.id,
        job_id=attempt.job_id,
        job_title=job_title,
        company_name=company_name,
        status=attempt.status,
        started_at=attempt.started_at,
        expires_at=attempt.expires_at,
        submitted_at=attempt.submitted_at,
        duration_minutes=duration_minutes,
        server_time=datetime.now(timezone.utc),
        total_questions=attempt.total_questions,
        answered_count=answered_count,
        score=score,
        percentage=percentage,
        time_taken_seconds=time_taken_seconds,
        correct_answers=correct_answers,
        questions=questions_payload,
    )


@router.post("/jobs/{job_id}/assessment/start", response_model=CandidateAssessmentAttemptResponse)
def start_or_resume_assessment(
    job_id: UUID,
    candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db),
):
    job = (
        db.query(Job)
        .options(joinedload(Job.company))
        .filter(Job.id == job_id)
        .first()
    )
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    app = (
        db.query(Application)
        .filter(Application.candidate_id == candidate.id, Application.job_id == job_id)
        .with_for_update()
        .first()
    )
    if not app:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must submit an application for this job before taking the assessment.",
        )

    existing_attempt = (
        db.query(AssessmentAttempt)
        .options(
            joinedload(AssessmentAttempt.job).joinedload(Job.company),
            selectinload(AssessmentAttempt.attempt_questions).joinedload(
                AssessmentAttemptQuestion.question
            ),
        )
        .filter(AssessmentAttempt.application_id == app.id)
        .first()
    )

    if existing_attempt:
        if existing_attempt.status in ("SUBMITTED", "EXPIRED"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assessment has already been submitted.",
            )
        now_utc = datetime.now(timezone.utc)
        if existing_attempt.expires_at and now_utc >= existing_attempt.expires_at:
            grade_and_submit_attempt(existing_attempt, db, now_utc)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assessment time has expired.",
            )
        if app.status.upper() == "REJECTED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Application has been rejected. Assessment cannot be continued.",
            )
        return build_candidate_attempt_response(existing_attempt)

    if app.status.upper() != "SCREENING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Candidate is not eligible to take this assessment. Application status must be SCREENING (current status: {app.status}).",
        )

    if job.assessment_status == "CLOSED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This assessment is closed and no new attempts can be started.",
        )

    if job.assessment_status not in ("ACTIVE", "STARTED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Assessment is not active (Status: {job.assessment_status}).",
        )

    questions = (
        db.query(MCQQuestion)
        .filter(MCQQuestion.job_id == job.id)
        .all()
    )
    if not questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No questions configured for this assessment.",
        )

    target_count = job.assessment_question_count or len(questions)
    target_count = max(1, min(target_count, len(questions)))
    selected_questions = random.sample(questions, target_count)
    random.shuffle(selected_questions)

    duration_mins = job.assessment_duration_minutes or 30
    now_utc = datetime.now(timezone.utc)
    expires_at = now_utc + timedelta(minutes=duration_mins)

    attempt = AssessmentAttempt(
        job_id=job.id,
        candidate_id=candidate.id,
        application_id=app.id,
        status="IN_PROGRESS",
        started_at=now_utc,
        expires_at=expires_at,
        total_questions=len(selected_questions),
    )
    db.add(attempt)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        existing_attempt = (
            db.query(AssessmentAttempt)
            .options(
                joinedload(AssessmentAttempt.job).joinedload(Job.company),
                selectinload(AssessmentAttempt.attempt_questions).joinedload(
                    AssessmentAttemptQuestion.question
                ),
            )
            .filter(AssessmentAttempt.application_id == app.id)
            .first()
        )
        if existing_attempt:
            if existing_attempt.status in ("SUBMITTED", "EXPIRED"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Assessment has already been submitted.",
                )
            now_utc = datetime.now(timezone.utc)
            if existing_attempt.expires_at and now_utc >= existing_attempt.expires_at:
                grade_and_submit_attempt(existing_attempt, db, now_utc)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Assessment time has expired.",
                )
            return build_candidate_attempt_response(existing_attempt)
        raise

    for idx, q in enumerate(selected_questions):
        shuffled_orig_opts = ["A", "B", "C", "D"]
        random.shuffle(shuffled_orig_opts)
        option_order = {
            disp_key: orig_key
            for disp_key, orig_key in zip(["A", "B", "C", "D"], shuffled_orig_opts)
        }
        aq = AssessmentAttemptQuestion(
            attempt=attempt,
            question=q,
            attempt_id=attempt.id,
            question_id=q.id,
            question_order=idx + 1,
            option_order=option_order,
            is_marked_for_review=False,
        )
        db.add(aq)

    if job.assessment_status == "ACTIVE":
        job.assessment_status = "STARTED"

    db.commit()

    created_attempt = (
        db.query(AssessmentAttempt)
        .options(
            joinedload(AssessmentAttempt.job).joinedload(Job.company),
            selectinload(AssessmentAttempt.attempt_questions).joinedload(
                AssessmentAttemptQuestion.question
            ),
        )
        .filter(AssessmentAttempt.id == attempt.id)
        .first()
    )

    return build_candidate_attempt_response(created_attempt)


@router.get("/jobs/{job_id}/assessment/my-attempt", response_model=CandidateAssessmentMyAttemptResponse)
def get_my_assessment_attempt(
    job_id: UUID,
    candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    app = (
        db.query(Application)
        .filter(Application.candidate_id == candidate.id, Application.job_id == job_id)
        .first()
    )

    if not app:
        return CandidateAssessmentMyAttemptResponse(
            has_attempt=False,
            can_start=False,
            assessment_status=job.assessment_status,
        )

    attempt = (
        db.query(AssessmentAttempt)
        .options(
            selectinload(AssessmentAttempt.attempt_questions).joinedload(
                AssessmentAttemptQuestion.question
            )
        )
        .filter(AssessmentAttempt.application_id == app.id)
        .first()
    )

    duration_mins = job.assessment_duration_minutes or 30

    if not attempt:
        can_start = (app.status.upper() == "SCREENING") and (job.assessment_status in ("ACTIVE", "STARTED"))
        return CandidateAssessmentMyAttemptResponse(
            has_attempt=False,
            can_start=can_start,
            assessment_status=job.assessment_status,
            duration_minutes=duration_mins,
            server_time=datetime.now(timezone.utc),
        )

    now_utc = datetime.now(timezone.utc)
    if attempt.status == "IN_PROGRESS" and attempt.expires_at and now_utc >= attempt.expires_at:
        grade_and_submit_attempt(attempt, db, now_utc)

    answered_count = sum(1 for aq in attempt.attempt_questions if aq.selected_option is not None)
    can_start = (attempt.status == "IN_PROGRESS") and (app.status.upper() != "REJECTED")
    score = attempt.score if attempt.status in ("SUBMITTED", "EXPIRED") else None
    correct_answers = attempt.correct_answers if attempt.status in ("SUBMITTED", "EXPIRED") else None
    percentage = float(attempt.percentage) if (attempt.status in ("SUBMITTED", "EXPIRED") and attempt.percentage is not None) else None

    return CandidateAssessmentMyAttemptResponse(
        has_attempt=True,
        can_start=can_start,
        assessment_status=job.assessment_status,
        attempt_id=attempt.id,
        attempt_status=attempt.status,
        started_at=attempt.started_at,
        expires_at=attempt.expires_at,
        duration_minutes=duration_mins,
        server_time=now_utc,
        submitted_at=attempt.submitted_at,
        total_questions=attempt.total_questions,
        answered_count=answered_count,
        score=score,
        percentage=percentage,
        time_taken_seconds=attempt.time_taken_seconds,
        correct_answers=correct_answers,
    )


@router.get("/assessment-attempts/{attempt_id}", response_model=CandidateAssessmentAttemptResponse)
def get_assessment_attempt(
    attempt_id: UUID,
    candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db),
):
    attempt = (
        db.query(AssessmentAttempt)
        .options(
            joinedload(AssessmentAttempt.job).joinedload(Job.company),
            selectinload(AssessmentAttempt.attempt_questions).joinedload(
                AssessmentAttemptQuestion.question
            ),
        )
        .filter(AssessmentAttempt.id == attempt_id)
        .first()
    )
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment attempt not found",
        )

    if attempt.candidate_id != candidate.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You do not own this assessment attempt.",
        )

    now_utc = datetime.now(timezone.utc)
    if attempt.status == "IN_PROGRESS" and attempt.expires_at and now_utc >= attempt.expires_at:
        grade_and_submit_attempt(attempt, db, now_utc)

    return build_candidate_attempt_response(attempt)


@router.post("/assessment-attempts/{attempt_id}/answer")
def save_assessment_answer(
    attempt_id: UUID,
    payload: AssessmentAnswerPayload,
    candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db),
):
    attempt = (
        db.query(AssessmentAttempt)
        .options(
            selectinload(AssessmentAttempt.attempt_questions).joinedload(
                AssessmentAttemptQuestion.question
            )
        )
        .filter(AssessmentAttempt.id == attempt_id)
        .first()
    )
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment attempt not found",
        )

    if attempt.candidate_id != candidate.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You do not own this assessment attempt.",
        )

    now_utc = datetime.now(timezone.utc)
    if attempt.expires_at and now_utc >= attempt.expires_at:
        grade_and_submit_attempt(attempt, db, now_utc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assessment time has expired. Your answers have been submitted.",
        )

    if attempt.status != "IN_PROGRESS":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot answer questions for an assessment with status {attempt.status}.",
        )

    aq = (
        db.query(AssessmentAttemptQuestion)
        .filter(
            AssessmentAttemptQuestion.attempt_id == attempt.id,
            AssessmentAttemptQuestion.question_id == payload.question_id,
        )
        .first()
    )
    if not aq:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found in this assessment attempt.",
        )

    if payload.selected_option is not None:
        if payload.selected_option == "":
            aq.selected_option = None
        else:
            normalized_option = payload.selected_option.upper().strip()
            if normalized_option not in ("A", "B", "C", "D"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="selected_option must be A, B, C, or D.",
                )
            aq.selected_option = normalized_option

    if payload.is_marked_for_review is not None:
        aq.is_marked_for_review = payload.is_marked_for_review

    db.commit()

    return {
        "status": "saved",
        "question_id": str(payload.question_id),
        "selected_option": aq.selected_option,
        "is_marked_for_review": aq.is_marked_for_review,
    }


@router.post("/assessment-attempts/{attempt_id}/review")
def mark_question_review(
    attempt_id: UUID,
    payload: MarkReviewPayload,
    candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db),
):
    attempt = (
        db.query(AssessmentAttempt)
        .filter(AssessmentAttempt.id == attempt_id)
        .first()
    )
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment attempt not found",
        )

    if attempt.candidate_id != candidate.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You do not own this assessment attempt.",
        )

    now_utc = datetime.now(timezone.utc)
    if attempt.expires_at and now_utc >= attempt.expires_at:
        grade_and_submit_attempt(attempt, db, now_utc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assessment time has expired.",
        )

    if attempt.status != "IN_PROGRESS":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot mark questions for an assessment with status {attempt.status}.",
        )

    aq = (
        db.query(AssessmentAttemptQuestion)
        .filter(
            AssessmentAttemptQuestion.attempt_id == attempt.id,
            AssessmentAttemptQuestion.question_id == payload.question_id,
        )
        .first()
    )
    if not aq:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found in this assessment attempt.",
        )

    aq.is_marked_for_review = payload.is_marked_for_review
    db.commit()

    return {
        "status": "updated",
        "question_id": str(payload.question_id),
        "is_marked_for_review": aq.is_marked_for_review,
    }


@router.post("/assessment-attempts/{attempt_id}/submit", response_model=CandidateAssessmentSubmitResponse)
def submit_assessment(
    attempt_id: UUID,
    candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db),
):
    attempt = (
        db.query(AssessmentAttempt)
        .options(
            joinedload(AssessmentAttempt.job),
            selectinload(AssessmentAttempt.attempt_questions).joinedload(
                AssessmentAttemptQuestion.question
            ),
        )
        .filter(AssessmentAttempt.id == attempt_id)
        .first()
    )
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment attempt not found",
        )

    if attempt.candidate_id != candidate.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You do not own this assessment attempt.",
        )

    if attempt.status in ("SUBMITTED", "EXPIRED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assessment has already been submitted.",
        )

    now_utc = datetime.now(timezone.utc)
    grade_and_submit_attempt(attempt, db, now_utc)

    return CandidateAssessmentSubmitResponse(
        attempt_id=attempt.id,
        status="SUBMITTED",
        submitted_at=attempt.submitted_at,
        total_questions=attempt.total_questions,
        score=attempt.score,
        percentage=float(attempt.percentage) if attempt.percentage is not None else None,
        time_taken_seconds=attempt.time_taken_seconds,
        correct_answers=attempt.correct_answers,
    )


@router.get("/candidate/assessments", response_model=List[CandidateAssessmentListItem])
def get_candidate_assessments(
    candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db),
):
    applications = (
        db.query(Application)
        .options(
            joinedload(Application.job).joinedload(Job.company),
            joinedload(Application.assessment_attempt),
        )
        .filter(Application.candidate_id == candidate.id)
        .all()
    )

    eligible_apps = [
        app for app in applications
        if (app.status and app.status.upper() == "SCREENING") or app.assessment_attempt is not None
    ]

    items: List[CandidateAssessmentListItem] = []
    for app in eligible_apps:
        job = app.job
        if not job:
            continue

        question_count = (
            db.query(func.count(MCQQuestion.id))
            .filter(MCQQuestion.job_id == job.id)
            .scalar()
            or 0
        )

        attempt = app.assessment_attempt or (
            db.query(AssessmentAttempt)
            .filter(AssessmentAttempt.application_id == app.id)
            .first()
        )

        company_name = job.company.name if job.company else "Unknown Company"

        if attempt:
            if attempt.status == "IN_PROGRESS" and attempt.expires_at:
                now_utc = datetime.now(timezone.utc)
                if now_utc >= attempt.expires_at:
                    grade_and_submit_attempt(attempt, db, now_utc)

            if attempt.status in ("SUBMITTED", "EXPIRED"):
                pct = float(attempt.percentage) if attempt.percentage is not None else (round((attempt.score / attempt.total_questions * 100), 1) if attempt.total_questions > 0 else 0.0)
                items.append(
                    CandidateAssessmentListItem(
                        application_id=app.id,
                        job_id=job.id,
                        job_title=job.title,
                        company_name=company_name,
                        location=job.location,
                        work_mode=job.work_mode,
                        assessment_type="MCQ",
                        total_questions=attempt.total_questions,
                        status="Completed",
                        can_start=False,
                        can_continue=False,
                        can_view_result=True,
                        attempt_id=attempt.id,
                        score=attempt.score,
                        percentage=pct,
                        time_taken_seconds=attempt.time_taken_seconds,
                        correct_answers=attempt.correct_answers,
                        submitted_at=attempt.submitted_at,
                    )
                )
            else:
                can_cont = app.status.upper() != "REJECTED"
                items.append(
                    CandidateAssessmentListItem(
                        application_id=app.id,
                        job_id=job.id,
                        job_title=job.title,
                        company_name=company_name,
                        location=job.location,
                        work_mode=job.work_mode,
                        assessment_type="MCQ",
                        total_questions=attempt.total_questions,
                        status="In Progress",
                        can_start=False,
                        can_continue=can_cont,
                        can_view_result=False,
                        attempt_id=attempt.id,
                        score=None,
                        percentage=None,
                        time_taken_seconds=None,
                        correct_answers=None,
                        submitted_at=None,
                    )
                )
        else:
            is_active = job.assessment_status in ("ACTIVE", "STARTED") and question_count > 0
            items.append(
                CandidateAssessmentListItem(
                    application_id=app.id,
                    job_id=job.id,
                    job_title=job.title,
                    company_name=company_name,
                    location=job.location,
                    work_mode=job.work_mode,
                    assessment_type="MCQ",
                    total_questions=question_count,
                    status="Pending",
                    can_start=is_active,
                    can_continue=False,
                    can_view_result=False,
                    attempt_id=None,
                    score=None,
                    percentage=None,
                    time_taken_seconds=None,
                    correct_answers=None,
                    submitted_at=None,
                )
            )

    return items
