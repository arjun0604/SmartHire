from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Skill
from backend.schemas import SkillResponse

router = APIRouter(prefix="/skills", tags=["skills"])


@router.get("", response_model=List[SkillResponse])
def list_skills(
    q: Optional[str] = Query(None, max_length=100),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    query = db.query(Skill)
    if q and q.strip():
        search = f"%{q.strip()}%"
        query = query.filter(Skill.name.ilike(search))
    return query.order_by(Skill.name.asc()).limit(limit).all()
