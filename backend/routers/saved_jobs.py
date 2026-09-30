from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.auth import get_current_candidate
from backend.models import Candidate, Job, SavedJob
from backend.schemas import SavedJobToggleRequest, SavedJobToggleResponse

router = APIRouter(prefix="/saved-jobs", tags=["saved-jobs"])


@router.get("/{candidate_id}", response_model=List[str])
def get_saved_job_ids(
    candidate_id: UUID,
    candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db),
):
    if candidate.id != candidate_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied.",
        )

    records = db.query(SavedJob.job_id).filter(SavedJob.candidate_id == candidate_id).all()
    return [str(r[0]) for r in records]


@router.post("/toggle", response_model=SavedJobToggleResponse)
def toggle_saved_job(
    payload: SavedJobToggleRequest,
    candidate: Candidate = Depends(get_current_candidate),
    db: Session = Depends(get_db),
):
    if candidate.id != payload.candidate_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied.",
        )

    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    existing = (
        db.query(SavedJob)
        .filter(SavedJob.candidate_id == candidate.id, SavedJob.job_id == payload.job_id)
        .first()
    )

    if existing:
        db.delete(existing)
        db.commit()
        return SavedJobToggleResponse(saved=False, job_id=payload.job_id, candidate_id=candidate.id)
    else:
        new_record = SavedJob(candidate_id=candidate.id, job_id=payload.job_id)
        db.add(new_record)
        db.commit()
        return SavedJobToggleResponse(saved=True, job_id=payload.job_id, candidate_id=candidate.id)
