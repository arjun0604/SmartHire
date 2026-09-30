import hashlib
import json
import logging
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional, Tuple
from dotenv import load_dotenv
from pydantic import BaseModel, Field

from backend.models import Application, Job, Resume
from backend.services.ai_provider import generate_structured_output, get_configured_strategy

SEMANTIC_MATCHER_VERSION = "1.0.0"
SEMANTIC_SCHEMA_VERSION = "1.0.0"
DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b"
DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

logger = logging.getLogger(__name__)


class AlignmentCriterion(BaseModel):
    score: float = Field(..., ge=0.0, le=100.0)
    level: Literal["high", "moderate", "low", "unspecified"]
    summary: str
    evidence: List[str] = Field(default_factory=list)


class SemanticMatchOutput(BaseModel):
    semantic_score: float = Field(..., ge=0.0, le=100.0)
    summary: Optional[str] = None
    strengths: List[str] = Field(default_factory=list)
    gaps: List[str] = Field(default_factory=list)
    alignment_points: List[str] = Field(default_factory=list)
    technical_gaps: List[str] = Field(default_factory=list)
    experience_analysis: List[str] = Field(default_factory=list)
    education_analysis: List[str] = Field(default_factory=list)
    experience_alignment: AlignmentCriterion
    responsibility_alignment: AlignmentCriterion
    qualification_alignment: AlignmentCriterion
    project_alignment: AlignmentCriterion
    additional_requirements_alignment: AlignmentCriterion
    evidence: List[str] = Field(default_factory=list)


class StructuredResumeInput(BaseModel):
    summary: Optional[str] = None
    current_title: Optional[str] = None
    career_level: Optional[str] = None
    work_experience: List[Dict[str, Any]] = Field(default_factory=list)
    education: List[Dict[str, Any]] = Field(default_factory=list)
    projects: List[Dict[str, Any]] = Field(default_factory=list)
    certifications: List[Dict[str, Any]] = Field(default_factory=list)


class SemanticJobInput(BaseModel):
    title: str
    department: Optional[str] = None
    description: str
    responsibilities: List[str] = Field(default_factory=list)
    qualifications: List[str] = Field(default_factory=list)
    preferred_qualifications: List[str] = Field(default_factory=list)
    additional_requirements: Optional[str] = None


class SemanticApplicationInput(BaseModel):
    current_job_title: Optional[str] = None
    years_experience: Optional[str] = None
    highest_education: Optional[str] = None
    why_interested: Optional[str] = None
    relevant_experience: Optional[str] = None
    is_currently_employed: Optional[bool] = None
    additional_information: Optional[str] = None


class DeterministicATSFindings(BaseModel):
    ats_score: float
    weights_used: Dict[str, Any] = Field(default_factory=dict)
    required_skills: Dict[str, Any] = Field(default_factory=dict)
    preferred_skills: Dict[str, Any] = Field(default_factory=dict)
    experience: Dict[str, Any] = Field(default_factory=dict)
    education: Dict[str, Any] = Field(default_factory=dict)
    location_work_mode: Dict[str, Any] = Field(default_factory=dict)
    employment_status: Dict[str, Any] = Field(default_factory=dict)


class SemanticMatchInput(BaseModel):
    match_context: Literal["resume", "application"]
    job: SemanticJobInput
    resume: StructuredResumeInput
    application: Optional[SemanticApplicationInput] = None
    deterministic_ats: Optional[DeterministicATSFindings] = None


def build_controlled_failure_state(
    error_code: str,
    fingerprint: Optional[str] = None,
    version_metadata: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    return {
        "status": "failed",
        "error_code": error_code,
        "semantic_score": None,
        "fingerprint": fingerprint,
        "version_metadata": version_metadata,
        "strengths": [],
        "gaps": [],
        "summary": None,
        "alignment_points": [],
        "technical_gaps": [],
        "experience_analysis": [],
        "education_analysis": [],
        "experience_alignment": None,
        "responsibility_alignment": None,
        "qualification_alignment": None,
        "project_alignment": None,
        "additional_requirements_alignment": None,
        "evidence": [],
    }


def compute_semantic_fingerprint(
    semantic_input: SemanticMatchInput,
    strategy_provider: Optional[str] = None,
    strategy_model: Optional[str] = None,
    matcher_version: str = SEMANTIC_MATCHER_VERSION,
    schema_version: str = SEMANTIC_SCHEMA_VERSION,
    model_name: Optional[str] = None,
    provider: Optional[str] = None,
) -> str:
    conf_strat_prov, conf_strat_model = get_configured_strategy()
    active_strat_prov = strategy_provider or provider or conf_strat_prov
    active_strat_model = strategy_model or model_name or conf_strat_model
    payload = {
        "matcher_version": matcher_version,
        "schema_version": schema_version,
        "strategy_provider": active_strat_prov,
        "strategy_model": active_strat_model,
        "input": semantic_input.model_dump(mode="json"),
    }
    serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def get_semantic_version_metadata(
    actual_provider: Optional[str] = None,
    actual_model: Optional[str] = None,
    strategy_provider: Optional[str] = None,
    strategy_model: Optional[str] = None,
    matcher_version: str = SEMANTIC_MATCHER_VERSION,
    schema_version: str = SEMANTIC_SCHEMA_VERSION,
    model_name: Optional[str] = None,
    provider: Optional[str] = None,
) -> Dict[str, str]:
    conf_strat_prov, conf_strat_model = get_configured_strategy()
    active_strat_prov = strategy_provider or provider or conf_strat_prov
    active_strat_model = strategy_model or model_name or conf_strat_model
    act_prov = actual_provider or provider or active_strat_prov
    act_model = actual_model or model_name or active_strat_model
    return {
        "matcher_version": matcher_version,
        "schema_version": schema_version,
        "strategy_provider": active_strat_prov,
        "strategy_model": active_strat_model,
        "provider": act_prov,
        "model": act_model,
    }


def is_semantic_cache_valid(
    stored_semantic: Optional[Dict[str, Any]],
    expected_fingerprint: str,
    strategy_provider: Optional[str] = None,
    strategy_model: Optional[str] = None,
    matcher_version: str = SEMANTIC_MATCHER_VERSION,
    schema_version: str = SEMANTIC_SCHEMA_VERSION,
    model_name: Optional[str] = None,
    provider: Optional[str] = None,
) -> bool:
    if not isinstance(stored_semantic, dict):
        return False
    if stored_semantic.get("status") != "success":
        return False
    if stored_semantic.get("fingerprint") != expected_fingerprint:
        return False
    meta = stored_semantic.get("version_metadata")
    if not isinstance(meta, dict):
        return False
    if meta.get("matcher_version") != matcher_version:
        return False
    if meta.get("schema_version") != schema_version:
        return False

    conf_strat_prov, conf_strat_model = get_configured_strategy()
    active_strat_prov = strategy_provider or provider or conf_strat_prov
    active_strat_model = strategy_model or model_name or conf_strat_model

    stored_strat_prov = meta.get("strategy_provider") or meta.get("provider")
    stored_strat_model = meta.get("strategy_model") or meta.get("model")

    if stored_strat_prov != active_strat_prov:
        return False
    if stored_strat_model != active_strat_model:
        return False
    return True


def extract_structured_resume_input(parsed_details: Optional[Dict[str, Any]]) -> StructuredResumeInput:
    if not parsed_details:
        return StructuredResumeInput()

    def clean_exp_item(item: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "title": item.get("title"),
            "company": item.get("company"),
            "responsibilities": item.get("responsibilities", []),
            "description": item.get("description"),
            "start_date": item.get("start_date"),
            "end_date": item.get("end_date"),
            "is_current": item.get("is_current", False),
        }

    def clean_edu_item(item: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "degree": item.get("degree"),
            "field_of_study": item.get("field_of_study"),
            "institution": item.get("institution"),
            "start_date": item.get("start_date"),
            "end_date": item.get("end_date"),
        }

    def clean_proj_item(item: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "name": item.get("name"),
            "description": item.get("description"),
            "technologies": item.get("technologies", []),
        }

    def clean_cert_item(item: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "name": item.get("name"),
            "issuing_organization": item.get("issuing_organization"),
        }

    raw_exp = parsed_details.get("work_experience") or []
    raw_edu = parsed_details.get("education") or []
    raw_proj = parsed_details.get("projects") or []
    raw_cert = parsed_details.get("certifications") or []

    clean_exp = [clean_exp_item(x) for x in raw_exp if isinstance(x, dict)]
    clean_edu = [clean_edu_item(x) for x in raw_edu if isinstance(x, dict)]
    clean_proj = [clean_proj_item(x) for x in raw_proj if isinstance(x, dict)]
    clean_cert = [clean_cert_item(x) for x in raw_cert if isinstance(x, dict)]

    return StructuredResumeInput(
        summary=parsed_details.get("summary"),
        current_title=parsed_details.get("current_title"),
        career_level=parsed_details.get("career_level"),
        work_experience=clean_exp,
        education=clean_edu,
        projects=clean_proj,
        certifications=clean_cert,
    )


def extract_semantic_job_input(job: Job) -> SemanticJobInput:
    return SemanticJobInput(
        title=job.title,
        department=job.department,
        description=job.description or "",
        responsibilities=job.responsibilities or [],
        qualifications=job.qualifications or [],
        preferred_qualifications=job.preferred_qualifications or [],
        additional_requirements=job.additional_requirements,
    )


def extract_semantic_application_input(application: Optional[Application]) -> Optional[SemanticApplicationInput]:
    if not application:
        return None
    return SemanticApplicationInput(
        current_job_title=application.current_job_title,
        years_experience=application.years_experience,
        highest_education=application.highest_education,
        why_interested=application.why_interested,
        relevant_experience=application.relevant_experience,
        is_currently_employed=application.is_currently_employed,
        additional_information=application.additional_information,
    )


def extract_deterministic_ats_findings(report: Optional[Dict[str, Any]]) -> Optional[DeterministicATSFindings]:
    if not report:
        return None
    breakdown = report.get("breakdown", {})
    return DeterministicATSFindings(
        ats_score=float(report.get("ats_score", 0.0)),
        weights_used=report.get("weights_used", {}),
        required_skills=breakdown.get("required_skills", {}),
        preferred_skills=breakdown.get("preferred_skills", {}),
        experience=breakdown.get("experience", {}),
        education=breakdown.get("education", {}),
        location_work_mode=breakdown.get("location_work_mode", {}),
        employment_status=breakdown.get("employment_status", {}),
    )


def extract_semantic_input(
    job: Job,
    resume: Resume,
    match_type: str,
    application: Optional[Application] = None,
    ats_report: Optional[Dict[str, Any]] = None,
) -> SemanticMatchInput:
    job_input = extract_semantic_job_input(job)
    resume_input = extract_structured_resume_input(resume.parsed_details)
    ats_findings = extract_deterministic_ats_findings(ats_report)
    if match_type == "resume":
        app_input = None
        context = "resume"
    else:
        context = "application"
        app_input = extract_semantic_application_input(application) if application else None

    return SemanticMatchInput(
        match_context=context,
        job=job_input,
        resume=resume_input,
        application=app_input,
        deterministic_ats=ats_findings,
    )


def evaluate_semantic_match(
    job: Job,
    resume: Resume,
    match_type: str = "resume",
    application: Optional[Application] = None,
    ats_report: Optional[Dict[str, Any]] = None,
    preferred_provider: Optional[str] = None,
) -> Dict[str, Any]:
    strategy_provider, strategy_model = get_configured_strategy()
    try:
        semantic_input = extract_semantic_input(
            job=job,
            resume=resume,
            match_type=match_type,
            application=application,
            ats_report=ats_report,
        )
    except Exception as e:
        logger.exception(f"Failed to prepare semantic matching input: {e}")
        return build_controlled_failure_state("INPUT_PREPARATION_ERROR")

    fingerprint = compute_semantic_fingerprint(
        semantic_input,
        strategy_provider=strategy_provider,
        strategy_model=strategy_model,
    )
    version_metadata = get_semantic_version_metadata(
        strategy_provider=strategy_provider,
        strategy_model=strategy_model,
    )

    input_json = semantic_input.model_dump_json(indent=2)
    prompt = (
        "You are an expert technical evaluator performing qualitative semantic alignment between a job posting and a candidate's background.\n\n"
        "Deterministic ATS Context Instructions:\n"
        "1. You are provided with authoritative deterministic ATS findings (skills matched/missing, experience years, education level, location compatibility, and employment status).\n"
        "2. Treat these deterministic ATS findings as AUTHORITATIVE for exact criteria.\n"
        "3. DO NOT recalculate, override, or contradict deterministic scores or findings.\n"
        "4. DO NOT infer a missing skill simply from a related technology (e.g., if a skill is marked missing in deterministic ATS findings, do not assume or infer it from another tool).\n\n"
        "Core Semantic Responsibilities:\n"
        "Focus on semantic relationships that deterministic matching cannot reliably establish:\n"
        "1. Evaluate job responsibilities against candidate experience and projects: assess demonstrated depth, complexity, and concrete achievements.\n"
        "2. Evaluate qualification depth and domain relevance: assess the substantive quality of qualifications beyond simple keyword counts.\n"
        "3. Evaluate project relevance: analyze practical implementations, architectures, and technologies applied.\n"
        "4. Evaluate additional requirements: assess alignment against role-specific constraints or requirements.\n"
        "5. Distinguish demonstrated evidence from unsupported claims or buzzwords.\n"
        "6. For 'resume' context: evaluate alignment based strictly on structured resume history.\n"
        "7. For 'application' context: additionally evaluate the candidate's direct application answers (why interested, relevant experience, current role context).\n"
        "8. DO NOT invent, extrapolate, or fabricate skills, experience, qualifications, responsibilities, or evidence.\n"
        "9. DO NOT infer abilities solely from titles, seniority levels, or company names.\n"
        "10. DO NOT treat missing evidence as proof that something is absent; mark alignment as 'unspecified' or note that evidence was not provided.\n"
        "11. DO NOT generate hiring probability, hire/reject recommendations, rankings, or selection predictions.\n"
        "12. Assign realistic semantic scores between 0.0 and 100.0 based on substantive relevance and depth of demonstrated work.\n\n"
        f"Input Data:\n{input_json}"
    )

    try:
        validated, actual_prov, actual_mod = generate_structured_output(
            prompt=prompt,
            response_schema=SemanticMatchOutput,
            preferred_provider=preferred_provider,
        )
        result = validated.model_dump()
        result["status"] = "success"
        result["fingerprint"] = fingerprint
        result["version_metadata"] = get_semantic_version_metadata(
            actual_provider=actual_prov,
            actual_model=actual_mod,
            strategy_provider=strategy_provider,
            strategy_model=strategy_model,
        )
        result["provider"] = actual_prov
        result["model"] = actual_mod
        return result
    except Exception as e:
        err_str = str(e).lower()
        if "quota" in err_str or "429" in err_str or "resource_exhausted" in err_str:
            last_error_code = "RATE_LIMITED"
        elif "validation" in err_str or "pydantic" in err_str or "json" in err_str:
            last_error_code = "SCHEMA_VALIDATION_ERROR"
        elif "not configured" in err_str or "config" in err_str:
            last_error_code = "CONFIG_ERROR"
        else:
            last_error_code = "API_ERROR"

        logger.error(f"Semantic matching failed: {e}", exc_info=True)
        return build_controlled_failure_state(
            last_error_code,
            fingerprint=fingerprint,
            version_metadata=version_metadata,
        )


def check_semantic_cache(
    stored_semantic: Optional[Dict[str, Any]],
    job: Job,
    resume: Resume,
    match_type: str = "resume",
    application: Optional[Application] = None,
    ats_report: Optional[Dict[str, Any]] = None,
    strategy_provider: Optional[str] = None,
    strategy_model: Optional[str] = None,
    model_name: Optional[str] = None,
    provider: Optional[str] = None,
) -> Tuple[bool, str, Dict[str, str]]:
    conf_strat_prov, conf_strat_model = get_configured_strategy()
    active_strat_prov = strategy_provider or provider or conf_strat_prov
    active_strat_model = strategy_model or model_name or conf_strat_model

    try:
        semantic_input = extract_semantic_input(
            job=job,
            resume=resume,
            match_type=match_type,
            application=application,
            ats_report=ats_report,
        )
    except Exception as e:
        logger.exception(f"Failed to prepare semantic matching input: {e}")
        return False, "", get_semantic_version_metadata(
            strategy_provider=active_strat_prov,
            strategy_model=active_strat_model,
        )

    fingerprint = compute_semantic_fingerprint(
        semantic_input,
        strategy_provider=active_strat_prov,
        strategy_model=active_strat_model,
    )
    version_metadata = get_semantic_version_metadata(
        strategy_provider=active_strat_prov,
        strategy_model=active_strat_model,
    )

    is_valid = (
        is_semantic_cache_valid(
            stored_semantic=stored_semantic,
            expected_fingerprint=fingerprint,
            strategy_provider=active_strat_prov,
            strategy_model=active_strat_model,
        )
        and stored_semantic is not None
    )
    return is_valid, fingerprint, version_metadata


def get_or_evaluate_semantic_match(
    stored_semantic: Optional[Dict[str, Any]],
    job: Job,
    resume: Resume,
    match_type: str = "resume",
    application: Optional[Application] = None,
    ats_report: Optional[Dict[str, Any]] = None,
) -> Tuple[Dict[str, Any], bool]:
    is_valid, fingerprint, version_metadata = check_semantic_cache(
        stored_semantic=stored_semantic,
        job=job,
        resume=resume,
        match_type=match_type,
        application=application,
        ats_report=ats_report,
    )
    if is_valid and stored_semantic is not None:
        return stored_semantic, False

    result = evaluate_semantic_match(
        job=job,
        resume=resume,
        match_type=match_type,
        application=application,
        ats_report=ats_report,
    )
    if not isinstance(result, dict):
        result = build_controlled_failure_state("API_ERROR", fingerprint=fingerprint, version_metadata=version_metadata)
    else:
        result = dict(result)
        if not result.get("fingerprint"):
            result["fingerprint"] = fingerprint
        if not result.get("version_metadata"):
            result["version_metadata"] = version_metadata

    return result, True
