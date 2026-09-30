import hashlib
import json
import re
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID
from sqlalchemy.orm import Session, joinedload, selectinload

from backend.models import (
    Application,
    Candidate,
    CandidateJobMatch,
    CandidateSkill,
    Job,
    JobSkill,
    Resume,
)
from backend.services.semantic_matcher import (
    check_semantic_cache,
    evaluate_semantic_match,
)

DEFAULT_WEIGHTS = {
    "required_skills": 40,
    "preferred_skills": 15,
    "experience": 20,
    "education": 10,
    "location_work_mode": 10,
    "employment_status": 5,
}

DEFAULT_ATS_SCORE_WEIGHT = 0.70
DEFAULT_SEMANTIC_SCORE_WEIGHT = 0.30


def calculate_overall_score(
    ats_score: float,
    ai_score: Optional[float],
    ats_weight: float = DEFAULT_ATS_SCORE_WEIGHT,
    semantic_weight: float = DEFAULT_SEMANTIC_SCORE_WEIGHT,
) -> float:
    if ai_score is not None:
        return round((float(ats_score) * ats_weight) + (float(ai_score) * semantic_weight), 2)
    return round(float(ats_score), 2)


def normalize_text(text: Optional[str]) -> str:
    if not text:
        return ""
    return re.sub(r"\s+", " ", text.strip().lower())


def skill_matches(job_skill: str, candidate_skills: List[str]) -> bool:
    norm_job = normalize_text(job_skill)
    if not norm_job:
        return False
    for cs in candidate_skills:
        norm_cs = normalize_text(cs)
        if norm_job == norm_cs:
            return True
        if norm_job in norm_cs or norm_cs in norm_job:
            if len(norm_job) >= 3 and len(norm_cs) >= 3:
                return True
    return False


def parse_years_from_string(text: Optional[str]) -> Optional[float]:
    if not text:
        return None
    s = text.strip().lower()
    range_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)", s)
    if range_match:
        val1 = float(range_match.group(1))
        val2 = float(range_match.group(2))
        return round((val1 + val2) / 2.0, 1)
    plus_match = re.search(r"(\d+(?:\.\d+)?)\s*\+", s)
    if plus_match:
        return float(plus_match.group(1))
    single_match = re.search(r"(\d+(?:\.\d+)?)", s)
    if single_match:
        return float(single_match.group(1))
    if "entry" in s or "fresher" in s:
        return 0.0
    if "mid" in s:
        return 3.0
    if "senior" in s:
        return 5.0
    if "lead" in s or "principal" in s:
        return 7.0
    if "director" in s or "executive" in s:
        return 8.0
    return None


def parse_date_full(date_str: Optional[str]) -> Optional[datetime]:
    if not date_str:
        return None
    s = str(date_str).strip().lower()
    if s in ("present", "current", "now", "ongoing"):
        now = datetime.now(timezone.utc)
        return datetime(now.year, now.month, now.day)
    month_map = {
        "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
        "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
        "january": 1, "february": 2, "march": 3, "april": 4, "june": 6,
        "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
    }
    m = re.search(r"\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2}),?\s+(19\d\d|20\d\d)\b", s)
    if m:
        return datetime(int(m.group(3)), month_map[m.group(1)], int(m.group(2)))
    m2 = re.search(r"\b(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?),?\s+(19\d\d|20\d\d)\b", s)
    if m2:
        return datetime(int(m2.group(3)), month_map[m2.group(2)], int(m2.group(1)))
    m3 = re.search(r"\b(19\d\d|20\d\d)[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b", s)
    if m3:
        return datetime(int(m3.group(1)), int(m3.group(2)), int(m3.group(3)))
    return None


def parse_date_to_year_month(date_str: Optional[str]) -> Optional[Tuple[int, int]]:
    if not date_str:
        return None
    s = str(date_str).strip().lower()
    if s in ("present", "current", "now", "ongoing"):
        now = datetime.now(timezone.utc)
        return (now.year, now.month)
    month_map = {
        "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
        "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
        "january": 1, "february": 2, "march": 3, "april": 4, "june": 6,
        "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
    }
    m_named = re.search(r"\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b", s)
    m_year = re.search(r"\b(19\d\d|20\d\d)\b", s)
    if m_named and m_year:
        return (int(m_year.group(1)), month_map[m_named.group(1)])
    m_iso = re.search(r"\b(19\d\d|20\d\d)[-/](0?[1-9]|1[0-2])\b", s)
    if m_iso:
        return (int(m_iso.group(1)), int(m_iso.group(2)))
    m_slash = re.search(r"\b(0?[1-9]|1[0-2])[-/](19\d\d|20\d\d)\b", s)
    if m_slash:
        return (int(m_slash.group(2)), int(m_slash.group(1)))
    if m_year:
        return (int(m_year.group(1)), 1)
    return None


def parse_experience_months_from_string(text: Optional[str]) -> Optional[int]:
    if not text:
        return None
    s = str(text).strip().lower()
    if "<" in s and "1" in s:
        return 0
    range_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)", s)
    if range_match:
        val1 = float(range_match.group(1))
        val2 = float(range_match.group(2))
        avg_years = (val1 + val2) / 2.0
        return int(round(avg_years * 12))
    plus_match = re.search(r"(\d+(?:\.\d+)?)\s*\+", s)
    if plus_match:
        return int(round(float(plus_match.group(1)) * 12))
    month_match = re.search(r"(\d+)\s*(?:month|mo)", s)
    if month_match:
        return int(month_match.group(1))
    year_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:year|yr)", s)
    if year_match:
        return int(round(float(year_match.group(1)) * 12))
    single_num = re.search(r"^(\d+(?:\.\d+)?)$", s)
    if single_num:
        return int(round(float(single_num.group(1)) * 12))
    if "entry" in s or "fresher" in s:
        return 0
    if "mid" in s:
        return 36
    if "senior" in s:
        return 60
    if "lead" in s or "principal" in s:
        return 84
    if "director" in s or "executive" in s:
        return 96
    return None


def calculate_resume_experience_months(parsed_details: Optional[Dict[str, Any]]) -> int:
    if not parsed_details or not isinstance(parsed_details, dict):
        return 0
    if parsed_details.get("career_level") == "fresher" and not parsed_details.get("work_experience"):
        return 0

    work_exp = parsed_details.get("work_experience", [])
    if not isinstance(work_exp, list) or len(work_exp) == 0:
        return 0

    now = datetime.now(timezone.utc)
    active_months = set()

    for item in work_exp:
        if not isinstance(item, dict):
            continue
        start_str = item.get("start_date")
        end_str = item.get("end_date")
        is_curr = bool(item.get("is_current"))

        if start_str and any(sep in str(start_str) for sep in ["-", "–", " to "]) and not end_str:
            parts = re.split(r"\s*(?:-|–|\bto\b)\s*", str(start_str), maxsplit=1)
            if len(parts) == 2:
                start_str, end_str = parts[0], parts[1]

        start_dt = parse_date_full(start_str)
        end_dt = parse_date_full(end_str)

        start_ym = parse_date_to_year_month(start_str)
        if not start_ym:
            continue

        end_d_norm = str(end_str or "").strip().lower()
        if is_curr or end_d_norm in ("present", "current", "now", "ongoing"):
            end_ym = (now.year, now.month)
        elif end_str:
            end_ym = parse_date_to_year_month(end_str)
        else:
            end_ym = start_ym

        if not end_ym or end_ym < start_ym:
            end_ym = start_ym

        if start_dt and end_dt and not is_curr and end_d_norm not in ("present", "current", "now", "ongoing"):
            days = (end_dt - start_dt).days
            if 0 < days <= 45:
                active_months.add(start_ym)
                continue

        cur_y, cur_m = start_ym
        end_y, end_m = end_ym
        while (cur_y < end_y) or (cur_y == end_y and cur_m <= end_m):
            active_months.add((cur_y, cur_m))
            cur_m += 1
            if cur_m > 12:
                cur_m = 1
                cur_y += 1

    return len(active_months)


def calculate_resume_experience_years(parsed_details: Dict[str, Any]) -> float:
    months = calculate_resume_experience_months(parsed_details)
    if months > 0:
        return round(months / 12.0, 1)
    return 0.0


def format_months_to_display(months: int) -> str:
    if months <= 0:
        return "0 months"
    if months == 1:
        return "1 month"
    if months < 12:
        return f"{months} months"
    years = months // 12
    rem_months = months % 12
    if rem_months == 0:
        return f"{years} yr" if years == 1 else f"{years} yrs"
    yr_str = "1 yr" if years == 1 else f"{years} yrs"
    mo_str = "1 mo" if rem_months == 1 else f"{rem_months} mos"
    return f"{yr_str} {mo_str}"


def normalize_education_level(edu_str: Optional[str]) -> Tuple[int, str]:
    if not edu_str:
        return (0, "Not Specified")
    s = edu_str.lower()
    if any(k in s for k in ("ph.d", "phd", "doctorate", "doctoral")):
        return (5, "Doctorate")
    if any(k in s for k in ("master", "msc", "m.s", "m.tech", "mba", "post graduate", "pg ")):
        return (4, "Master's Degree")
    if any(k in s for k in ("bachelor", "bsc", "b.s", "b.tech", "b.e", "undergraduate", "bba", "bca")):
        return (3, "Bachelor's Degree")
    if any(k in s for k in ("associate", "diploma")):
        return (2, "Associate Degree")
    if any(k in s for k in ("high school", "secondary", "12th", "10th", "ged")):
        return (1, "High School")
    return (0, edu_str.strip())


def score_location_work_mode(
    job_work_mode: str,
    job_location: str,
    candidate_location: Optional[str],
    candidate_text: str = ""
) -> Tuple[Optional[float], str, str]:
    norm_mode = (job_work_mode or "").strip().lower()
    norm_job_loc = (job_location or "").strip().lower()
    if norm_mode == "remote" or norm_job_loc == "remote":
        return (100.0, "remote", "Job is fully remote; location is 100% compatible.")
    if not candidate_location or not candidate_location.strip() or not job_location or not job_location.strip():
        return (None, "unavailable", "Location information is unavailable. Excluded from scoring.")
    norm_cand_loc = candidate_location.strip().lower()
    cand_tokens = {t.strip() for t in re.split(r"[,/\\-]", norm_cand_loc) if len(t.strip()) > 2}
    job_tokens = {t.strip() for t in re.split(r"[,/\\-]", norm_job_loc) if len(t.strip()) > 2}
    if cand_tokens.intersection(job_tokens) or norm_cand_loc in norm_job_loc or norm_job_loc in norm_cand_loc:
        return (100.0, "same_city", "Candidate is located in the same city as the job.")
    reloc_keywords = ("relocate", "relocation", "open to move", "willing to relocate", "willing to move", "open to relocation")
    combined_text = (candidate_text + " " + norm_cand_loc).lower()
    if any(kw in combined_text for kw in reloc_keywords) and "not moving" not in combined_text and "cannot relocate" not in combined_text:
        return (70.0, "relocation", "Candidate is in another city but open to relocation.")
    if norm_mode == "hybrid":
        return (25.0, "incompatible", "Location mismatch for hybrid role without relocation indication.")
    return (25.0, "incompatible", "Location mismatch for on-site role without relocation indication.")


def score_employment_status(
    match_type: str,
    parsed_details: Dict[str, Any],
    is_currently_employed_app: Optional[bool],
    current_job_title_app: Optional[str] = None,
) -> Tuple[Optional[float], str, str]:
    if match_type == "application":
        if is_currently_employed_app is True:
            job_info = f" as {current_job_title_app.strip()}" if current_job_title_app and current_job_title_app.strip() else ""
            return (100.0, "employed", f"Candidate confirmed current employment{job_info} in application.")
        elif is_currently_employed_app is False:
            return (60.0, "available", "Candidate is not currently employed and available for immediate joining.")
        else:
            return (None, "unavailable", "Employment status was not provided. Excluded from scoring.")
    else:
        work_exp = parsed_details.get("work_experience", [])
        if not isinstance(work_exp, list) or len(work_exp) == 0:
            return (None, "unavailable", "No explicit employment status in resume. Excluded from scoring.")
        has_current = False
        for item in work_exp:
            if isinstance(item, dict):
                if item.get("is_current") is True:
                    has_current = True
                    break
                end_d = str(item.get("end_date") or "").strip().lower()
                if end_d in ("present", "current", "now", "ongoing"):
                    has_current = True
                    break
        if has_current:
            return (100.0, "employed", "Resume explicitly indicates candidate is currently employed.")
        return (None, "unavailable", "No explicit current employment evidence in resume. Excluded from scoring.")


def extract_candidate_skills(candidate: Candidate, resume: Optional[Resume]) -> List[str]:
    seen = set()
    skills = []
    if candidate and candidate.skills:
        for cs in candidate.skills:
            if cs.skill and cs.skill.name:
                name = cs.skill.name.strip()
                norm = name.lower()
                if norm not in seen:
                    seen.add(norm)
                    skills.append(name)
    if resume and isinstance(resume.parsed_details, dict):
        resume_skills = resume.parsed_details.get("skills", [])
        if isinstance(resume_skills, list):
            for s in resume_skills:
                name = None
                if isinstance(s, dict) and s.get("name"):
                    name = str(s.get("name")).strip()
                elif isinstance(s, str) and s.strip():
                    name = s.strip()
                if name:
                    norm = name.lower()
                    if norm not in seen:
                        seen.add(norm)
                        skills.append(name)
    return skills


def calculate_match_report(
    job: Job,
    candidate: Candidate,
    resume: Resume,
    match_type: str,
    application: Optional[Application] = None,
) -> Dict[str, Any]:
    weights = dict(DEFAULT_WEIGHTS)
    if isinstance(job.matching_weights, dict) and job.matching_weights:
        for k in DEFAULT_WEIGHTS.keys():
            if k in job.matching_weights:
                try:
                    weights[k] = int(job.matching_weights[k])
                except (ValueError, TypeError):
                    pass

    parsed_details = dict(resume.parsed_details) if isinstance(resume.parsed_details, dict) else {}
    candidate_skills = extract_candidate_skills(candidate, resume)

    req_skills_list = [js.skill.name for js in job.job_skills if js.is_required and js.skill]
    pref_skills_list = [js.skill.name for js in job.job_skills if not js.is_required and js.skill]

    req_matched = [s for s in req_skills_list if skill_matches(s, candidate_skills)]
    req_missing = [s for s in req_skills_list if s not in req_matched]
    if len(req_skills_list) > 0:
        req_score = round((len(req_matched) / len(req_skills_list)) * 100.0, 1)
    else:
        req_score = None

    pref_matched = [s for s in pref_skills_list if skill_matches(s, candidate_skills)]
    pref_missing = [s for s in pref_skills_list if s not in pref_matched]
    if len(pref_skills_list) > 0:
        pref_score = round((len(pref_matched) / len(pref_skills_list)) * 100.0, 1)
    else:
        pref_score = None

    req_months = parse_experience_months_from_string(job.experience_level)
    if req_months is None:
        req_months = 0
    req_years = round(req_months / 12.0, 1)

    resume_months = calculate_resume_experience_months(parsed_details)
    resume_years = round(resume_months / 12.0, 1)

    app_declared_text = None
    app_years = None
    if match_type == "application" and application and application.years_experience:
        app_declared_text = str(application.years_experience).strip()
        app_months_parsed = parse_experience_months_from_string(application.years_experience)
        if app_months_parsed is not None and app_months_parsed > 0:
            app_years = round(app_months_parsed / 12.0, 1)

    candidate_months = resume_months
    effective_years = resume_years
    exp_source = "resume"

    meets_requirement = candidate_months >= req_months
    difference_months = candidate_months - req_months

    candidate_display = format_months_to_display(candidate_months)
    required_display = format_months_to_display(req_months)

    if req_months == 0:
        exp_score = 100.0
        exp_explanation = f"Candidate has {candidate_display} of verified experience (no minimum required)."
    elif meets_requirement:
        exp_score = 100.0
        diff_str = format_months_to_display(difference_months)
        if difference_months > 0:
            exp_explanation = f"Candidate has {candidate_display} of verified experience, exceeding the required {required_display} by {diff_str}."
        else:
            exp_explanation = f"Candidate has {candidate_display} of verified experience, fully meeting the required {required_display}."
    else:
        exp_score = round((candidate_months / float(req_months)) * 100.0, 1)
        shortfall_str = format_months_to_display(abs(difference_months))
        exp_explanation = f"Candidate has {candidate_display} of verified experience, which is {shortfall_str} below the required {required_display}."

    if app_declared_text:
        exp_explanation += f" (Application declared: '{app_declared_text}')"

    job_edu_level, job_edu_label = normalize_education_level(job.education_level)
    cand_edu_str = None
    if match_type == "application" and application and application.highest_education:
        cand_edu_str = application.highest_education
    elif parsed_details.get("education") and isinstance(parsed_details["education"], list) and len(parsed_details["education"]) > 0:
        first_edu = parsed_details["education"][0]
        if isinstance(first_edu, dict):
            cand_edu_str = first_edu.get("degree")

    cand_edu_level, cand_edu_label = normalize_education_level(cand_edu_str)
    if job_edu_level == 0:
        edu_score = None
        edu_explanation = "Job has no specific education requirement. Excluded from scoring."
    else:
        if cand_edu_level >= job_edu_level:
            edu_score = 100.0
            edu_explanation = f"Candidate education ({cand_edu_label}) meets or exceeds requirement ({job_edu_label})."
        elif cand_edu_level > 0:
            edu_score = round((cand_edu_level / job_edu_level) * 100.0, 1)
            edu_explanation = f"Candidate education ({cand_edu_label}) is below requirement ({job_edu_label})."
        else:
            edu_score = 0.0
            edu_explanation = f"Candidate education not specified for required {job_edu_label}."

    cand_reloc_context = ""
    if match_type == "application" and application:
        cand_reloc_context = f"{application.why_interested or ''} {application.relevant_experience or ''} {application.additional_information or ''}"

    loc_score, loc_status, loc_explanation = score_location_work_mode(
        job_work_mode=job.work_mode,
        job_location=job.location,
        candidate_location=candidate.location,
        candidate_text=cand_reloc_context,
    )

    is_curr_employed = application.is_currently_employed if (match_type == "application" and application) else None
    curr_job_title = application.current_job_title if (match_type == "application" and application) else None
    emp_score, emp_status, emp_explanation = score_employment_status(
        match_type=match_type,
        parsed_details=parsed_details,
        is_currently_employed_app=is_curr_employed,
        current_job_title_app=curr_job_title,
    )

    raw_scores = {
        "required_skills": req_score,
        "preferred_skills": pref_score,
        "experience": exp_score,
        "education": edu_score,
        "location_work_mode": loc_score,
        "employment_status": emp_score,
    }

    active_criteria = {k: v for k, v in raw_scores.items() if v is not None}
    sum_active_weights = sum(weights.get(k, 0) for k in active_criteria.keys())

    effective_weights = {}
    weighted_contributions = {}
    total_ats_score = 0.0

    if sum_active_weights > 0:
        for k in weights.keys():
            if k in active_criteria:
                norm_w = (weights[k] / sum_active_weights) * 100.0
                effective_weights[k] = round(norm_w, 2)
                contrib = (active_criteria[k] * norm_w) / 100.0
                weighted_contributions[k] = round(contrib, 2)
                total_ats_score += contrib
            else:
                effective_weights[k] = 0.0
                weighted_contributions[k] = 0.0
    else:
        for k in weights.keys():
            effective_weights[k] = 0.0
            weighted_contributions[k] = 0.0

    final_ats_score = round(min(100.0, max(0.0, total_ats_score)), 1)

    strengths = []
    gaps = []

    if req_score is not None:
        if req_score >= 75.0:
            strengths.append(f"Matched {len(req_matched)} of {len(req_skills_list)} required skills ({', '.join(req_matched)}).")
        if req_missing:
            gaps.append(f"Missing required skills: {', '.join(req_missing)}.")

    if pref_score is not None:
        if pref_matched:
            strengths.append(f"Has preferred skills: {', '.join(pref_matched)}.")
        if pref_missing:
            gaps.append(f"Missing preferred skills: {', '.join(pref_missing)}.")

    if exp_score == 100.0:
        strengths.append(f"Has {candidate_display} of verified experience (meets requirement of {required_display}).")
    elif exp_score < 100.0:
        gaps.append(f"Experience ({candidate_display}) is below required {required_display}.")

    if edu_score == 100.0:
        strengths.append(f"Meets education requirement with {cand_edu_label}.")
    elif edu_score is not None and edu_score < 100.0:
        gaps.append(f"Education level ({cand_edu_label}) does not meet required {job_edu_label}.")

    if loc_score == 100.0:
        strengths.append(f"Location is 100% compatible ({loc_status}).")
    elif loc_score is not None and loc_score <= 50.0:
        gaps.append(f"Location is marked as {loc_status} for {job.work_mode} position.")

    if emp_score == 100.0:
        strengths.append("Currently employed in a relevant capacity.")

    breakdown = {
        "required_skills": {
            "score": req_score,
            "weight": effective_weights.get("required_skills", 0.0),
            "configured_weight": weights.get("required_skills", 40),
            "contribution": weighted_contributions.get("required_skills", 0.0),
            "matched": req_matched,
            "missing": req_missing,
            "total": len(req_skills_list),
            "matched_count": len(req_matched),
        },
        "preferred_skills": {
            "score": pref_score,
            "weight": effective_weights.get("preferred_skills", 0.0),
            "configured_weight": weights.get("preferred_skills", 15),
            "contribution": weighted_contributions.get("preferred_skills", 0.0),
            "matched": pref_matched,
            "missing": pref_missing,
            "total": len(pref_skills_list),
            "matched_count": len(pref_matched),
        },
        "experience": {
            "score": exp_score,
            "weight": effective_weights.get("experience", 0.0),
            "configured_weight": weights.get("experience", 20),
            "contribution": weighted_contributions.get("experience", 0.0),
            "required_years": req_years,
            "effective_years": effective_years,
            "application_years": app_years,
            "resume_years": resume_years,
            "required_months": req_months,
            "candidate_months": candidate_months,
            "meets_requirement": meets_requirement,
            "difference_months": difference_months,
            "candidate_display": candidate_display,
            "required_display": required_display,
            "application_declared": app_declared_text,
            "source": exp_source,
            "explanation": exp_explanation,
        },
        "education": {
            "score": edu_score,
            "weight": effective_weights.get("education", 0.0),
            "configured_weight": weights.get("education", 10),
            "contribution": weighted_contributions.get("education", 0.0),
            "required_level": job_edu_label,
            "candidate_level": cand_edu_label,
            "explanation": edu_explanation,
        },
        "location_work_mode": {
            "score": loc_score,
            "weight": effective_weights.get("location_work_mode", 0.0),
            "configured_weight": weights.get("location_work_mode", 10),
            "contribution": weighted_contributions.get("location_work_mode", 0.0),
            "status": loc_status,
            "job_work_mode": job.work_mode,
            "job_location": job.location,
            "candidate_location": candidate.location,
            "explanation": loc_explanation,
        },
        "employment_status": {
            "score": emp_score,
            "weight": effective_weights.get("employment_status", 0.0),
            "configured_weight": weights.get("employment_status", 5),
            "contribution": weighted_contributions.get("employment_status", 0.0),
            "status": emp_status,
            "currently_employed": is_curr_employed,
            "current_job": curr_job_title,
            "explanation": emp_explanation,
        },
    }

    return {
        "ats_score": final_ats_score,
        "match_type": match_type,
        "weights_used": {
            "configured": weights,
            "effective": effective_weights,
        },
        "breakdown": breakdown,
        "strengths": strengths,
        "gaps": gaps,
    }


def get_or_create_resume_match(db: Session, candidate: Candidate, job: Job) -> Optional[CandidateJobMatch]:
    existing = (
        db.query(CandidateJobMatch)
        .filter(
            CandidateJobMatch.candidate_id == candidate.id,
            CandidateJobMatch.job_id == job.id,
            CandidateJobMatch.match_type == "resume",
        )
        .order_by(CandidateJobMatch.created_at.desc())
        .first()
    )
    if existing:
        return existing

    existing_app_match = (
        db.query(CandidateJobMatch)
        .filter(
            CandidateJobMatch.candidate_id == candidate.id,
            CandidateJobMatch.job_id == job.id,
            CandidateJobMatch.match_type == "application",
        )
        .order_by(CandidateJobMatch.created_at.desc())
        .first()
    )
    if existing_app_match:
        return existing_app_match

    current_resume = (
        db.query(Resume)
        .filter(Resume.candidate_id == candidate.id, Resume.is_baseline == False)
        .order_by(Resume.uploaded_at.desc())
        .first()
    )
    if not current_resume:
        current_resume = (
            db.query(Resume)
            .filter(Resume.candidate_id == candidate.id)
            .order_by(Resume.uploaded_at.desc())
            .first()
        )
    if not current_resume:
        return None

    report = calculate_match_report(
        job=job,
        candidate=candidate,
        resume=current_resume,
        match_type="resume",
        application=None,
    )

    _, fingerprint, version_metadata = check_semantic_cache(
        stored_semantic=None,
        job=job,
        resume=current_resume,
        match_type="resume",
        application=None,
        ats_report=report,
    )
    semantic_res = evaluate_semantic_match(
        job=job,
        resume=current_resume,
        match_type="resume",
        application=None,
        ats_report=report,
    )
    if not isinstance(semantic_res, dict):
        semantic_res = {}
    else:
        semantic_res = dict(semantic_res)
    if not semantic_res.get("fingerprint"):
        semantic_res["fingerprint"] = fingerprint
    if not semantic_res.get("version_metadata"):
        semantic_res["version_metadata"] = version_metadata

    ai_val = None
    if semantic_res.get("status") == "success" and semantic_res.get("semantic_score") is not None:
        ai_val = round(semantic_res["semantic_score"], 2)

    ov_score = calculate_overall_score(float(report["ats_score"]), ai_val)

    match_details = {
        **report,
        "ats": report["breakdown"],
        "semantic": semantic_res,
        "overall_score": ov_score,
    }

    new_match = CandidateJobMatch(
        candidate_id=candidate.id,
        job_id=job.id,
        resume_id=current_resume.id,
        match_type="resume",
        application_id=None,
        ats_score=Decimal(str(report["ats_score"])),
        ai_score=Decimal(str(ai_val)) if ai_val is not None else None,
        overall_score=Decimal(str(ov_score)),
        match_details=match_details,
    )
    db.add(new_match)
    db.commit()
    db.refresh(new_match)
    return new_match


def get_or_create_application_match(db: Session, application: Application) -> CandidateJobMatch:
    existing = (
        db.query(CandidateJobMatch)
        .filter(
            CandidateJobMatch.application_id == application.id,
            CandidateJobMatch.match_type == "application",
        )
        .first()
    )
    if existing:
        return existing

    candidate = application.candidate or db.query(Candidate).filter(Candidate.id == application.candidate_id).first()
    job = application.job or db.query(Job).options(
        selectinload(Job.job_skills).joinedload(JobSkill.skill)
    ).filter(Job.id == application.job_id).first()
    resume = application.resume or db.query(Resume).filter(Resume.id == application.resume_id).first()

    if not candidate or not job or not resume:
        raise ValueError("Invalid application data: candidate, job, or resume not found.")

    report = calculate_match_report(
        job=job,
        candidate=candidate,
        resume=resume,
        match_type="application",
        application=application,
    )

    _, fingerprint, version_metadata = check_semantic_cache(
        stored_semantic=None,
        job=job,
        resume=resume,
        match_type="application",
        application=application,
        ats_report=report,
    )
    semantic_res = evaluate_semantic_match(
        job=job,
        resume=resume,
        match_type="application",
        application=application,
        ats_report=report,
    )
    if not isinstance(semantic_res, dict):
        semantic_res = {}
    else:
        semantic_res = dict(semantic_res)
    if not semantic_res.get("fingerprint"):
        semantic_res["fingerprint"] = fingerprint
    if not semantic_res.get("version_metadata"):
        semantic_res["version_metadata"] = version_metadata

    ai_val = None
    if semantic_res.get("status") == "success" and semantic_res.get("semantic_score") is not None:
        ai_val = round(semantic_res["semantic_score"], 2)

    ov_score = calculate_overall_score(float(report["ats_score"]), ai_val)

    job_fingerprint = compute_job_matching_fingerprint(job)
    match_details = {
        **report,
        "ats": report["breakdown"],
        "semantic": semantic_res,
        "overall_score": ov_score,
        "job_fingerprint": job_fingerprint,
        "is_stale": False,
    }

    new_match = CandidateJobMatch(
        candidate_id=candidate.id,
        job_id=job.id,
        resume_id=resume.id,
        match_type="application",
        application_id=application.id,
        ats_score=Decimal(str(report["ats_score"])),
        ai_score=Decimal(str(ai_val)) if ai_val is not None else None,
        overall_score=Decimal(str(ov_score)),
        match_details=match_details,
    )
    db.add(new_match)
    db.flush()
    return new_match


def compute_job_matching_fingerprint(job: Job) -> str:
    req_skills = sorted([
        normalize_text(js.skill.name)
        for js in (job.job_skills or [])
        if js.is_required and js.skill and js.skill.name and normalize_text(js.skill.name)
    ])
    pref_skills = sorted([
        normalize_text(js.skill.name)
        for js in (job.job_skills or [])
        if not js.is_required and js.skill and js.skill.name and normalize_text(js.skill.name)
    ])
    weights = dict(DEFAULT_WEIGHTS)
    if isinstance(job.matching_weights, dict):
        for k in sorted(DEFAULT_WEIGHTS.keys()):
            if k in job.matching_weights:
                try:
                    weights[k] = int(job.matching_weights[k])
                except (ValueError, TypeError):
                    pass

    payload = {
        "required_skills": req_skills,
        "preferred_skills": pref_skills,
        "experience_level": normalize_text(job.experience_level),
        "education_level": normalize_text(job.education_level),
        "work_mode": normalize_text(job.work_mode),
        "location": normalize_text(job.location),
        "employment_type": normalize_text(job.employment_type),
        "description": normalize_text(job.description),
        "responsibilities": sorted([normalize_text(r) for r in (job.responsibilities or []) if normalize_text(r)]),
        "qualifications": sorted([normalize_text(q) for q in (job.qualifications or []) if normalize_text(q)]),
        "preferred_qualifications": sorted([normalize_text(pq) for pq in (job.preferred_qualifications or []) if normalize_text(pq)]),
        "additional_requirements": normalize_text(job.additional_requirements),
        "matching_weights": weights,
    }
    serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def recalculate_job_application_matches(db: Session, job: Job, job_fingerprint: str) -> List[CandidateJobMatch]:
    existing_matches = (
        db.query(CandidateJobMatch)
        .options(
            joinedload(CandidateJobMatch.application).joinedload(Application.candidate),
            joinedload(CandidateJobMatch.resume),
        )
        .filter(
            CandidateJobMatch.job_id == job.id,
            CandidateJobMatch.match_type == "application",
            CandidateJobMatch.application_id.isnot(None),
        )
        .all()
    )
    updated_matches: List[CandidateJobMatch] = []
    for match in existing_matches:
        application = match.application
        if not application:
            continue
        resume = match.resume or db.query(Resume).filter(Resume.id == match.resume_id).first()
        if not resume and application.resume_id:
            resume = db.query(Resume).filter(Resume.id == application.resume_id).first()
        if not resume:
            continue
        candidate = application.candidate or db.query(Candidate).filter(Candidate.id == application.candidate_id).first()
        if not candidate:
            continue

        report = calculate_match_report(
            job=job,
            candidate=candidate,
            resume=resume,
            match_type="application",
            application=application,
        )

        _, fingerprint, version_metadata = check_semantic_cache(
            stored_semantic=None,
            job=job,
            resume=resume,
            match_type="application",
            application=application,
            ats_report=report,
        )
        semantic_res = evaluate_semantic_match(
            job=job,
            resume=resume,
            match_type="application",
            application=application,
            ats_report=report,
        )
        if not isinstance(semantic_res, dict):
            semantic_res = {}
        else:
            semantic_res = dict(semantic_res)
        if not semantic_res.get("fingerprint"):
            semantic_res["fingerprint"] = fingerprint
        if not semantic_res.get("version_metadata"):
            semantic_res["version_metadata"] = version_metadata

        ai_val = None
        if semantic_res.get("status") == "success" and semantic_res.get("semantic_score") is not None:
            ai_val = round(semantic_res["semantic_score"], 2)

        ov_score = calculate_overall_score(float(report["ats_score"]), ai_val)

        match_details = {
            **report,
            "ats": report["breakdown"],
            "semantic": semantic_res,
            "overall_score": ov_score,
            "job_fingerprint": job_fingerprint,
            "is_stale": False,
        }

        match.ats_score = Decimal(str(report["ats_score"]))
        match.ai_score = Decimal(str(ai_val)) if ai_val is not None else None
        match.overall_score = Decimal(str(ov_score))
        match.match_details = match_details
        match.updated_at = datetime.now(timezone.utc)
        updated_matches.append(match)

    return updated_matches
