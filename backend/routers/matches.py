from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload, selectinload

from backend.database import get_db
from backend.auth import get_current_user
from backend.models import Application, CandidateJobMatch, Job, JobSkill, User
from backend.schemas import MatchReportResponse
from backend.services.matcher import (
    compute_job_matching_fingerprint,
    format_months_to_display,
    get_or_create_resume_match,
)

router = APIRouter(prefix="/matches", tags=["matches"])


def format_match_response(match: CandidateJobMatch, job: Optional[Job] = None) -> MatchReportResponse:
    details = dict(match.match_details or {})
    ats_breakdown = dict(details.get("ats") or details.get("breakdown") or {})
    if "experience" in ats_breakdown and isinstance(ats_breakdown["experience"], dict):
        exp_dict = dict(ats_breakdown["experience"])
        cand_m = exp_dict.get("candidate_months")
        req_m = exp_dict.get("required_months")
        if cand_m is None:
            eff_y = exp_dict.get("effective_years") or exp_dict.get("resume_years") or 0.0
            cand_m = int(round(float(eff_y) * 12))
            exp_dict["candidate_months"] = cand_m
        if req_m is None:
            req_y = exp_dict.get("required_years") or 0.0
            req_m = int(round(float(req_y) * 12))
            exp_dict["required_months"] = req_m
        if "meets_requirement" not in exp_dict:
            exp_dict["meets_requirement"] = cand_m >= req_m
        if "difference_months" not in exp_dict:
            exp_dict["difference_months"] = cand_m - req_m
        if "candidate_display" not in exp_dict:
            exp_dict["candidate_display"] = format_months_to_display(cand_m)
        if "required_display" not in exp_dict:
            exp_dict["required_display"] = format_months_to_display(req_m)
        ats_breakdown["experience"] = exp_dict

    semantic = details.get("semantic")
    if isinstance(semantic, dict):
        semantic = dict(semantic)
        if "alignment_points" not in semantic:
            semantic["alignment_points"] = semantic.get("strengths") or []
        if "technical_gaps" not in semantic:
            semantic["technical_gaps"] = semantic.get("gaps") or []
        if "experience_analysis" not in semantic:
            exp_align = semantic.get("experience_alignment")
            if isinstance(exp_align, dict) and exp_align.get("summary"):
                semantic["experience_analysis"] = [exp_align["summary"]]
            else:
                semantic["experience_analysis"] = []
        if "education_analysis" not in semantic:
            qual_align = semantic.get("qualification_alignment")
            if isinstance(qual_align, dict) and qual_align.get("summary"):
                semantic["education_analysis"] = [qual_align["summary"]]
            else:
                semantic["education_analysis"] = []
        structured_review = []
        edu_text = None
        if semantic.get("education_analysis") and len(semantic["education_analysis"]) > 0:
            edu_text = semantic["education_analysis"][0]
        elif isinstance(semantic.get("qualification_alignment"), dict) and semantic["qualification_alignment"].get("summary"):
            edu_text = semantic["qualification_alignment"]["summary"]
        if edu_text:
            structured_review.append({"label": "Education", "text": edu_text})

        exp_text = None
        if semantic.get("experience_analysis") and len(semantic["experience_analysis"]) > 0:
            exp_text = semantic["experience_analysis"][0]
        elif isinstance(semantic.get("experience_alignment"), dict) and semantic["experience_alignment"].get("summary"):
            exp_text = semantic["experience_alignment"]["summary"]
        if exp_text:
            structured_review.append({"label": "Relevant background", "text": exp_text})

        if isinstance(semantic.get("responsibility_alignment"), dict) and semantic["responsibility_alignment"].get("summary"):
            structured_review.append({"label": "Role alignment", "text": semantic["responsibility_alignment"]["summary"]})

        if isinstance(semantic.get("project_alignment"), dict) and semantic["project_alignment"].get("summary"):
            structured_review.append({"label": "Projects & technical exposure", "text": semantic["project_alignment"]["summary"]})

        if isinstance(semantic.get("additional_requirements_alignment"), dict) and semantic["additional_requirements_alignment"].get("summary"):
            structured_review.append({"label": "Additional requirements", "text": semantic["additional_requirements_alignment"]["summary"]})

        gaps_list = semantic.get("technical_gaps") or semantic.get("gaps") or []
        if isinstance(gaps_list, list):
            for g in gaps_list:
                if isinstance(g, str) and g.strip():
                    structured_review.append({"label": "Gaps", "text": g.strip()})

        if structured_review:
            semantic["structured_review"] = structured_review

    ov_score = (
        float(match.overall_score)
        if match.overall_score is not None
        else (float(details["overall_score"]) if details.get("overall_score") is not None else None)
    )
    ats_score = float(match.ats_score) if match.ats_score is not None else 0.0
    ai_score = float(match.ai_score) if match.ai_score is not None else None

    is_stale = False
    if match.match_type == "application":
        if details.get("is_stale") is True:
            is_stale = True
        elif job:
            current_fp = compute_job_matching_fingerprint(job)
            stored_fp = details.get("job_fingerprint")
            if stored_fp and stored_fp != current_fp:
                is_stale = True

    return MatchReportResponse(
        id=match.id,
        job_id=match.job_id,
        candidate_id=match.candidate_id,
        resume_id=match.resume_id,
        application_id=match.application_id,
        match_type=match.match_type,
        overall_score=ov_score,
        ats_score=ats_score,
        ai_score=ai_score,
        ats=ats_breakdown,
        semantic=semantic,
        strengths=details.get("strengths", []),
        gaps=details.get("gaps", []),
        weights_used=details.get("weights_used", {}),
        breakdown=ats_breakdown,
        is_stale=is_stale,
        created_at=match.created_at,
        updated_at=match.updated_at,
    )


@router.get("/jobs/{job_id}/resume", response_model=MatchReportResponse)
def get_job_resume_match(
    job_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "candidate" or not user.candidate:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only candidates can view pre-application resume matches.",
        )

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    existing_match = (
        db.query(CandidateJobMatch)
        .filter(
            CandidateJobMatch.candidate_id == user.candidate.id,
            CandidateJobMatch.job_id == job_id,
        )
        .order_by(CandidateJobMatch.created_at.desc())
        .first()
    )
    if existing_match:
        return format_match_response(existing_match, job=job)

    match = get_or_create_resume_match(db=db, candidate=user.candidate, job=job)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload a resume to view your match report.",
        )
    return format_match_response(match, job=job)


@router.get("/jobs/{job_id}/current", response_model=MatchReportResponse)
def get_job_current_match(
    job_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "candidate" or not user.candidate:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only candidates can view current job matches.",
        )

    application = (
        db.query(Application)
        .options(
            joinedload(Application.job).selectinload(Job.job_skills).joinedload(JobSkill.skill),
        )
        .filter(Application.candidate_id == user.candidate.id, Application.job_id == job_id)
        .first()
    )
    if application:
        match = (
            db.query(CandidateJobMatch)
            .filter(
                CandidateJobMatch.application_id == application.id,
                CandidateJobMatch.match_type == "application",
            )
            .first()
        )
        if match:
            return format_match_response(match, job=application.job)

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    existing_match = (
        db.query(CandidateJobMatch)
        .filter(
            CandidateJobMatch.candidate_id == user.candidate.id,
            CandidateJobMatch.job_id == job_id,
        )
        .order_by(CandidateJobMatch.created_at.desc())
        .first()
    )
    if existing_match:
        return format_match_response(existing_match, job=job)

    match = get_or_create_resume_match(db=db, candidate=user.candidate, job=job)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload a resume to view your match report.",
        )
    return format_match_response(match, job=job)


@router.get("/applications/{application_id}", response_model=MatchReportResponse)
def get_application_match(
    application_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    application = (
        db.query(Application)
        .options(
            joinedload(Application.job).selectinload(Job.job_skills).joinedload(JobSkill.skill),
        )
        .filter(Application.id == application_id)
        .first()
    )
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    if user.role == "candidate":
        if not user.candidate or application.candidate_id != user.candidate.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to view this application match.",
            )
    elif user.role == "recruiter":
        if not user.recruiter or not application.job or application.job.company_id != user.recruiter.company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to view matches for other companies' jobs.",
            )
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    match = (
        db.query(CandidateJobMatch)
        .filter(
            CandidateJobMatch.application_id == application.id,
            CandidateJobMatch.match_type == "application",
        )
        .first()
    )
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application match not found",
        )
    return format_match_response(match, job=application.job)
