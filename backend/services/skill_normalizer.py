import re
from typing import Any, Dict, List, Optional
from uuid import UUID
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.models import CandidateSkill, JobSkill, Resume, Skill, SkillAlias


def normalize_skill_key(raw_name: str) -> str:
    if not raw_name:
        return ""
    cleaned = re.sub(r"\s+", " ", str(raw_name).strip().lower())
    return cleaned


def is_valid_standalone_skill(raw_name: str) -> bool:
    if not raw_name or not isinstance(raw_name, str):
        return False
    trimmed = raw_name.strip()
    if len(trimmed) < 2 or len(trimmed) > 50:
        return False
    if not any(c.isalnum() for c in trimmed):
        return False
    if trimmed.isdigit():
        return False
    if len(trimmed.split()) > 5:
        return False
    if trimmed.endswith(".") or re.search(r"[,;]\s", trimmed):
        return False

    disallowed_patterns = [
        r"\b(?:years?|months?)\s+(?:of\s+)?experience\b",
        r"\b(?:responsible\s+for|demonstrated|proficient\s+in|knowledge\s+of|worked\s+with)\b",
        r"\b(?:duties\s+included|experienced\s+in|understanding\s+of)\b",
        r"\b(?:cloud-based|multi-tenant|saas\s+platform|scalable\s+systems?)\b",
        r"\b(?:optimization|asynchronous\s+processing)\b",
        r"\b(?:api\s+integration|cloud\s+deployment)\b",
        r"^(?:deployment|integration|automation)$",
        r"\b(?:notifications?|uploads?|report\s+generation|data\s+export|task\s+queues?)\b",
        r"\b(?:performance\s+tuning|error\s+handling|api\s+contracts?|api\s+authorization)\b",
        r"\b(?:service-to-service|session\s+management|automated\s+testing|debugging)\b",
        r"^(?:indexing|caching)$",
        r"^(?:designed|designing|architected|architecting|developed|developing|built|building|implemented|implementing|engineered|created|creating|orchestrated|orchestrating|configured|configuring|maintained|maintaining)\s+",
        r"\band\s+(?:maintained|maintaining|deployed|deploying|managed|managing|implemented|implementing|engineered|built)\b",
    ]
    lower = trimmed.lower()
    for pattern in disallowed_patterns:
        if re.search(pattern, lower):
            return False

    return True


def sanitize_skill_display_name(raw_name: str) -> str:
    s = str(raw_name).strip()
    s = re.sub(r"^[\s,.;:!?\-_/\\|*•]+", "", s)
    s = re.sub(r"[\s,.;:!?\-_/\\|*•]+$", "", s)
    s = re.sub(r"\s+", " ", s)
    if not s:
        return ""
    if s.islower():
        return s.title()
    return s


def get_or_create_canonical_skill(db: Session, clean_name: str) -> Skill:
    clean_key = normalize_skill_key(clean_name)
    existing = (
        db.query(Skill)
        .filter(func.lower(func.trim(Skill.name)) == clean_key)
        .first()
    )
    if existing:
        return existing

    alias_entry = (
        db.query(SkillAlias)
        .filter(SkillAlias.normalized_alias == clean_key)
        .first()
    )
    if alias_entry and alias_entry.skill:
        return alias_entry.skill

    try:
        with db.begin_nested():
            new_skill = Skill(name=clean_name)
            db.add(new_skill)
            db.flush()
            return new_skill
    except IntegrityError:
        existing = (
            db.query(Skill)
            .filter(func.lower(func.trim(Skill.name)) == clean_key)
            .first()
        )
        if existing:
            return existing
        alias_entry = (
            db.query(SkillAlias)
            .filter(SkillAlias.normalized_alias == clean_key)
            .first()
        )
        if alias_entry and alias_entry.skill:
            return alias_entry.skill
        raise


def resolve_canonical_skill(
    db: Session,
    raw_name: str,
    create_if_missing: bool = True,
) -> Optional[Skill]:
    clean_name = sanitize_skill_display_name(raw_name)
    if not clean_name:
        return None
    clean_key = normalize_skill_key(clean_name)

    existing_skill = (
        db.query(Skill)
        .filter(func.lower(func.trim(Skill.name)) == clean_key)
        .first()
    )
    if existing_skill:
        return existing_skill

    alias_entry = (
        db.query(SkillAlias)
        .filter(SkillAlias.normalized_alias == clean_key)
        .first()
    )
    if alias_entry and alias_entry.skill:
        return alias_entry.skill

    if not is_valid_standalone_skill(raw_name):
        return None

    if create_if_missing:
        return get_or_create_canonical_skill(db, clean_name)

    return None


def sync_candidate_skills(
    db: Session,
    candidate_id: UUID,
    raw_skills: List[Any],
) -> List[Skill]:
    if not raw_skills:
        return []

    resolved_map: Dict[int, Skill] = {}
    for item in raw_skills:
        name = None
        if isinstance(item, dict):
            name = item.get("name")
        elif isinstance(item, str):
            name = item
        if not name or not isinstance(name, str):
            continue

        skill = resolve_canonical_skill(db, name, create_if_missing=True)
        if skill:
            resolved_map[skill.id] = skill

    if not resolved_map:
        return []

    existing_skill_ids = set(
        r[0]
        for r in db.query(CandidateSkill.skill_id)
        .filter(CandidateSkill.candidate_id == candidate_id)
        .all()
    )

    for skill_id, skill in resolved_map.items():
        if skill_id not in existing_skill_ids:
            try:
                with db.begin_nested():
                    db.add(CandidateSkill(candidate_id=candidate_id, skill_id=skill_id))
                    db.flush()
                    existing_skill_ids.add(skill_id)
            except IntegrityError:
                existing_skill_ids.add(skill_id)

    return list(resolved_map.values())


def backfill_all_candidate_skills(db: Session) -> int:
    resumes = (
        db.query(Resume)
        .filter(Resume.is_baseline == False)
        .all()
    )
    synced_count = 0
    for r in resumes:
        if not r.parsed_details or not isinstance(r.parsed_details, dict):
            continue
        extracted_skills = r.parsed_details.get("skills", [])
        if extracted_skills and r.candidate_id:
            sync_candidate_skills(
                db=db,
                candidate_id=r.candidate_id,
                raw_skills=extracted_skills,
            )
            synced_count += 1
    db.commit()
    return synced_count


def sync_job_skills(
    db: Session,
    job_id: UUID,
    required_skills: Optional[List[str]] = None,
    preferred_skills: Optional[List[str]] = None,
    replace: bool = True,
) -> List[JobSkill]:
    target_skills: Dict[int, bool] = {}

    if preferred_skills:
        for raw in preferred_skills:
            if not raw or not isinstance(raw, str) or not raw.strip():
                continue
            if not is_valid_standalone_skill(raw):
                raise ValueError(f"Invalid skill input: '{raw}'")
            skill = resolve_canonical_skill(db, raw, create_if_missing=True)
            if not skill:
                raise ValueError(f"Invalid skill input: '{raw}'")
            target_skills[skill.id] = False

    if required_skills:
        for raw in required_skills:
            if not raw or not isinstance(raw, str) or not raw.strip():
                continue
            if not is_valid_standalone_skill(raw):
                raise ValueError(f"Invalid skill input: '{raw}'")
            skill = resolve_canonical_skill(db, raw, create_if_missing=True)
            if not skill:
                raise ValueError(f"Invalid skill input: '{raw}'")
            target_skills[skill.id] = True

    existing_records = {
        js.skill_id: js
        for js in db.query(JobSkill).filter(JobSkill.job_id == job_id).all()
    }

    if replace:
        for skill_id, js in list(existing_records.items()):
            if skill_id not in target_skills:
                db.delete(js)
            elif js.is_required != target_skills[skill_id]:
                js.is_required = target_skills[skill_id]

        for skill_id, is_req in target_skills.items():
            if skill_id not in existing_records:
                db.add(JobSkill(job_id=job_id, skill_id=skill_id, is_required=is_req))
    else:
        for skill_id, is_req in target_skills.items():
            if skill_id in existing_records:
                if is_req and not existing_records[skill_id].is_required:
                    existing_records[skill_id].is_required = True
            else:
                db.add(JobSkill(job_id=job_id, skill_id=skill_id, is_required=is_req))

    db.flush()
    return db.query(JobSkill).filter(JobSkill.job_id == job_id).all()

