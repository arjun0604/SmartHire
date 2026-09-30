import re
from pathlib import Path
from typing import Dict, List, Literal, Optional, Set
from dotenv import load_dotenv
from pydantic import BaseModel, Field, field_validator

from backend.services.ai_provider import generate_structured_output
from backend.services.skill_normalizer import is_valid_standalone_skill

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


class SkillItem(BaseModel):
    name: str
    type: Literal["explicit", "inferred"]
    supporting_evidence: Optional[str] = ""

    @field_validator("name", mode="before")
    @classmethod
    def sanitize_name(cls, v):
        if not v:
            return ""
        s = str(v).strip()
        s = re.sub(r"^[\s,.;:!?\-_/\\|*•]+", "", s)
        s = re.sub(r"[\s,.;:!?\-_/\\|*•]+$", "", s)
        s = re.sub(r"\s+", " ", s)
        return s

    @field_validator("type", mode="before")
    @classmethod
    def normalize_type(cls, v):
        if isinstance(v, str) and "infer" in v.lower():
            return "inferred"
        return "explicit"

    @field_validator("supporting_evidence", mode="before")
    @classmethod
    def normalize_supporting_evidence(cls, v):
        if v is None:
            return ""
        return str(v)


class WorkExperienceItem(BaseModel):
    company: Optional[str] = None
    title: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_current: Optional[bool] = False
    description: Optional[str] = None
    responsibilities: List[str] = Field(default_factory=list)

    @field_validator("responsibilities", mode="before")
    @classmethod
    def ensure_responsibilities_list(cls, v):
        if v is None:
            return []
        return v


class EducationItem(BaseModel):
    institution: Optional[str] = None
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    grade: Optional[str] = None


class ProjectItem(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    technologies: List[str] = Field(default_factory=list)
    link: Optional[str] = None

    @field_validator("technologies", mode="before")
    @classmethod
    def ensure_technologies_list(cls, v):
        if v is None:
            return []
        return v


class CertificationItem(BaseModel):
    name: Optional[str] = None
    issuing_organization: Optional[str] = None
    issue_date: Optional[str] = None
    expiration_date: Optional[str] = None
    credential_id: Optional[str] = None


class StructuredResume(BaseModel):
    current_title: Optional[str] = None
    career_level: Optional[Literal["fresher", "experienced"]] = None
    summary: Optional[str] = None
    skills: List[SkillItem] = Field(default_factory=list)
    work_experience: List[WorkExperienceItem] = Field(default_factory=list)
    education: List[EducationItem] = Field(default_factory=list)
    projects: List[ProjectItem] = Field(default_factory=list)
    certifications: List[CertificationItem] = Field(default_factory=list)

    @field_validator("current_title", mode="before")
    @classmethod
    def normalize_current_title(cls, v):
        if not v:
            return None
        v_str = str(v).strip()
        return v_str if v_str else None

    @field_validator("career_level", mode="before")
    @classmethod
    def normalize_career_level(cls, v):
        if not v:
            return None
        v_str = str(v).strip().lower()
        if "fresher" in v_str or "entry" in v_str:
            return "fresher"
        if "exp" in v_str:
            return "experienced"
        return None

    @field_validator("skills", mode="before")
    @classmethod
    def filter_and_ensure_skills(cls, v):
        if not v:
            return []
        if not isinstance(v, list):
            return []
        valid_items = []
        for item in v:
            name = None
            if isinstance(item, dict):
                name = item.get("name")
            elif hasattr(item, "name"):
                name = getattr(item, "name")
            if name and isinstance(name, str) and is_valid_standalone_skill(name):
                valid_items.append(item)

        explicit_names = set()
        for item in valid_items:
            itype = item.get("type") if isinstance(item, dict) else getattr(item, "type", None)
            name = item.get("name") if isinstance(item, dict) else getattr(item, "name", None)
            if itype == "explicit" and name:
                explicit_names.add(name.strip().lower())

        filtered = []
        seen_names = set()
        for item in valid_items:
            itype = item.get("type") if isinstance(item, dict) else getattr(item, "type", None)
            name = item.get("name") if isinstance(item, dict) else getattr(item, "name", None)
            if not name:
                continue
            norm = name.strip().lower()

            if itype == "inferred":
                if norm in explicit_names:
                    continue
                children = GENERIC_PARENT_RELATIONS.get(norm)
                if children and any(c in explicit_names for c in children):
                    continue

            if norm not in seen_names:
                seen_names.add(norm)
                filtered.append(item)

        return filtered

    @field_validator("work_experience", "education", "projects", "certifications", mode="before")
    @classmethod
    def ensure_list_fields(cls, v):
        if v is None:
            return []
        return v


GENERIC_PARENT_RELATIONS: Dict[str, Set[str]] = {
    "caching": {"redis", "memcached", "hazelcast", "varnish", "ehcache"},
    "containerization": {"docker", "podman", "lxc", "containerd", "kubernetes"},
    "authentication": {"oauth", "oauth2", "jwt", "rbac", "saml", "sso", "openid", "auth0", "keycloak"},
    "authorization": {"rbac", "abac", "oauth", "oauth2"},
    "role-based access control": {"rbac"},
    "rbac": {"role-based access control"},
    "relational database": {"postgresql", "mysql", "oracle", "sqlite", "mariadb", "sql server"},
    "relational databases": {"postgresql", "mysql", "oracle", "sqlite", "mariadb", "sql server"},
    "nosql": {"mongodb", "cassandra", "dynamodb", "couchbase", "redis"},
    "cloud computing": {"aws", "gcp", "azure", "google cloud", "google cloud platform", "amazon web services"},
    "version control": {"git", "github", "gitlab", "svn", "mercurial", "bitbucket"},
    "message broker": {"kafka", "rabbitmq", "activemq", "sqs", "celery"},
    "message brokers": {"kafka", "rabbitmq", "activemq", "sqs", "celery"},
}


def prune_overlapping_inferred_skills(skills: List[SkillItem], raw_text: str = "") -> List[SkillItem]:
    if not skills:
        return []

    lower_raw = raw_text.lower() if raw_text else ""
    explicit_names: Set[str] = set()
    cleaned_skills: List[SkillItem] = []

    for item in skills:
        name = item.name.strip() if item.name else ""
        if not name:
            continue
        norm = name.lower()
        if item.type == "inferred" and lower_raw:
            pattern = r"\b" + re.escape(norm) + r"\b"
            if re.search(pattern, lower_raw):
                item.type = "explicit"
        if item.type == "explicit":
            explicit_names.add(norm)
        cleaned_skills.append(item)

    final_skills: List[SkillItem] = []
    seen_names: Set[str] = set()

    for item in cleaned_skills:
        name = item.name.strip() if item.name else ""
        if not name:
            continue
        norm = name.lower()

        if item.type == "inferred":
            if norm in explicit_names:
                continue
            children = GENERIC_PARENT_RELATIONS.get(norm)
            if children and any(c in explicit_names for c in children):
                continue

        if norm not in seen_names:
            seen_names.add(norm)
            final_skills.append(item)

    return final_skills


def structure_resume_text(raw_text: str) -> StructuredResume:
    if not raw_text or not raw_text.strip():
        return StructuredResume()

    prompt = (
        "Extract structured information from the following resume raw text.\n"
        "Instructions:\n"
        "1. Do not invent or extrapolate information. If any field or section is not in the text, use null for optional scalar fields and [] for lists.\n"
        "2. Resume sections vary; extract information based on meaning rather than fixed headings.\n"
        "3. Extract 'current_title' only when explicitly supported by the resume headline, professional summary, or current/recent job role (e.g., 'Software Engineer', 'Data Analyst'). Never invent, assume, or infer 'current_title' from skills, education, coursework, or projects. If there is no explicitly stated current professional title, set 'current_title' to null.\n"
        "4. Set 'career_level' to 'fresher' when the resume clearly indicates the candidate is a fresher, entry-level candidate, or recent graduate with no current professional title. Set 'career_level' to 'experienced' when professional work experience or job roles are present. If neither applies or cannot be determined, set 'career_level' to null.\n"
        "5. Skills must be concise, standalone technical, operational, or professional skill concepts (such as programming languages, frameworks, libraries, databases, cloud platforms, protocols, standards, tools, or recognized technical disciplines like 'Database Management Systems', 'Computer Networks', 'Machine Learning', 'Database Design', 'REST APIs', 'Microservices', 'CI/CD').\n"
        "   - DO NOT extract responsibilities, duties, achievements, system descriptions, architectural patterns, implementation activities, features, operational tasks, application domains, or contextual phrases as skills.\n"
        "   - Specifically do NOT extract phrases such as 'Cloud-based Backend Systems', 'Database Optimization', 'Asynchronous Processing', 'Cloud Deployment', 'Multi-tenant Application Architecture', 'API Integration', 'SaaS Platform', 'Indexing', 'Query Optimization', 'Email Notifications', 'Session Management', 'Automated Testing', 'Document Uploads', 'PDF Report Generation', 'Data Export', 'Service-to-Service Communication', 'Task Queues', 'Performance Tuning', 'Error Handling', 'API Contracts', 'API Authorization', 'Debugging', 'Scalable Systems', or similar duty/task phrases.\n"
        "   - For each valid standalone skill, classify it as either 'explicit' or 'inferred':\n"
        "     * Set type to 'explicit' for all skills explicitly mentioned, named, or claimed anywhere in the resume (including skills sections, summaries, experience bullets, projects, or education).\n"
        "     * Set type to 'inferred' ONLY when a legitimate standalone skill is strongly demonstrated by concrete project or work experience evidence, but is NEVER explicitly named in the resume.\n"
        "     * DO NOT duplicate explicitly stated skills as broader or overlapping 'inferred' skills.\n"
        "     * DO NOT infer generic parent or umbrella concepts from explicitly mentioned technologies, tools, frameworks, libraries, protocols, or techniques. For example, if Redis is mentioned, do not additionally infer Caching; if Docker is mentioned, do not additionally infer Containerization; if OAuth2, JWT, or RBAC is mentioned, do not additionally infer generic Authentication or Role-Based Access Control.\n"
        "     * Prevent duplicate or overlapping explicit/inferred concepts. If a specific tool, technology, or standard is explicitly present, omit the broader or synonymous inferred concept.\n"
        "     * Do not infer skills solely from a job title, seniority, company name, degree, or vague wording.\n\n"
        f"Resume text:\n{raw_text}"
    )

    res, _, _ = generate_structured_output(
        prompt=prompt,
        response_schema=StructuredResume,
    )
    res.skills = prune_overlapping_inferred_skills(res.skills, raw_text)
    return res
