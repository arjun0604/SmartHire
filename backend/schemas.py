import re
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID
from pydantic import (
    AliasChoices,
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    ValidationInfo,
    field_validator,
    model_validator,
)


def _parse_salary_value(v: Optional[object]) -> Optional[Decimal]:
    if v is None:
        return None
    if isinstance(v, str) and not v.strip():
        return None
    if isinstance(v, bool):
        raise ValueError("Salary must be a numeric value.")
    if isinstance(v, (int, float, Decimal)):
        d = Decimal(str(v))
    elif isinstance(v, str):
        s = v.replace(",", "").strip()
        try:
            d = Decimal(s)
        except Exception:
            raise ValueError("Salary must be a valid number.")
    else:
        raise ValueError("Salary must be a valid number.")
    if d < 0:
        raise ValueError("Salary must be greater than or equal to 0.")
    if d > Decimal("1000000000"):
        raise ValueError("Salary cannot exceed ₹1,000,000,000.")
    return d


def _validate_unicode_name(v: Optional[str], field_label: str = "Name") -> str:
    if v is None:
        raise ValueError(f"{field_label} is required.")
    s = v.strip()
    if not s:
        raise ValueError(f"{field_label} cannot be blank.")
    if len(s) < 2:
        raise ValueError(f"{field_label} must be at least 2 characters.")
    if len(s) > 100:
        raise ValueError(f"{field_label} cannot exceed 100 characters.")
    if not any(c.isalpha() for c in s):
        raise ValueError(f"{field_label} must contain at least one letter.")
    for char in s:
        if not (char.isalpha() or char in " '-."):
            raise ValueError(f"{field_label} contains invalid characters.")
    return s


def _validate_company_name(v: Optional[str]) -> str:
    if v is None:
        raise ValueError("Company name is required.")
    s = v.strip()
    if not s:
        raise ValueError("Company name cannot be blank.")
    if len(s) < 2:
        raise ValueError("Company name must be at least 2 characters.")
    if len(s) > 100:
        raise ValueError("Company name cannot exceed 100 characters.")
    if not any(c.isalnum() for c in s):
        raise ValueError("Company name must contain at least one alphanumeric character.")
    return s


def _validate_location_str(v: Optional[str], field_label: str = "Location") -> str:
    if v is None:
        raise ValueError(f"{field_label} is required.")
    s = v.strip()
    if not s:
        raise ValueError(f"{field_label} cannot be blank.")
    if len(s) < 2:
        raise ValueError(f"{field_label} must be at least 2 characters.")
    if len(s) > 100:
        raise ValueError(f"{field_label} cannot exceed 100 characters.")
    if not any(c.isalnum() for c in s):
        raise ValueError(f"{field_label} must contain at least one letter or number.")
    return s


def _validate_job_title(v: Optional[str]) -> str:
    if v is None:
        raise ValueError("Job title is required.")
    s = v.strip()
    if not s:
        raise ValueError("Job title cannot be blank.")
    if len(s) < 3:
        raise ValueError("Job title must be at least 3 characters.")
    if len(s) > 100:
        raise ValueError("Job title cannot exceed 100 characters.")
    if not any(c.isalpha() for c in s):
        raise ValueError("Job title must contain at least one letter.")
    return s


def _validate_skill_name(v: str) -> str:
    s = str(v).strip()
    if not s:
        raise ValueError("Skill name cannot be empty.")
    if len(s) > 50:
        raise ValueError("Skill name cannot exceed 50 characters.")
    if not any(c.isalnum() for c in s):
        raise ValueError("Skill must contain at least one alphanumeric character.")
    return s


def _validate_bullet_str(v: str, min_len: int = 3, max_len: int = 500) -> str:
    s = str(v).strip()
    if not s:
        raise ValueError("List item cannot be blank.")
    if len(s) < min_len:
        raise ValueError(f"Item must be at least {min_len} characters.")
    if len(s) > max_len:
        raise ValueError(f"Item cannot exceed {max_len} characters.")
    if not any(c.isalnum() for c in s):
        raise ValueError("Item must contain letters or numbers.")
    return s


def _validate_url_str(v: Optional[str], field_label: str = "URL") -> Optional[str]:
    if v is None:
        return None
    s = v.strip()
    if not s:
        return None
    pattern = r"^https?://[^\s/$.?#].[^\s]*$"
    if not re.match(pattern, s, re.IGNORECASE):
        raise ValueError(f"Please enter a valid {field_label} starting with http:// or https://")
    return s


def _validate_phone_str(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    s = v.strip()
    if not s:
        return None
    digits = re.sub(r"\D", "", s)
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    if len(digits) != 10 or digits[0] not in "6789":
        raise ValueError("Please enter a valid 10-digit Indian phone number.")
    return f"+91 {digits[:5]} {digits[5:]}"


def _validate_founded_year_val(v: Optional[int]) -> Optional[int]:
    if v is None:
        return None
    current_year = datetime.now().year
    if v < 1800 or v > current_year:
        raise ValueError(f"Founded year must be between 1800 and {current_year}.")
    return v


def _validate_dob_val(v: Optional[date]) -> Optional[date]:
    if v is None:
        return None
    today = date.today()
    if v > today:
        raise ValueError("Date of birth cannot be in the future.")
    age = (today - v).days / 365.25
    if age < 16:
        raise ValueError("Candidate must be at least 16 years old.")
    if age > 100:
        raise ValueError("Candidate age cannot exceed 100 years.")
    return v


def _validate_deadline_val(v: Optional[date]) -> Optional[date]:
    if v is None:
        return None
    if v < date.today():
        raise ValueError("Application deadline cannot be in the past.")
    return v


class CompanyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    logo_url: Optional[str] = Field(None, max_length=2048)
    industry: Optional[str] = Field(None, max_length=255)
    company_size: Optional[str] = Field(None, max_length=100)
    headquarters: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=10000)
    founded_year: Optional[int] = None
    website: Optional[str] = Field(None, max_length=500)
    linkedin: Optional[str] = Field(None, max_length=500)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        return _validate_company_name(v)

    @field_validator("headquarters")
    @classmethod
    def validate_hq(cls, v: Optional[str]) -> Optional[str]:
        if v is None or not v.strip():
            return None
        return _validate_location_str(v, "Headquarters")

    @field_validator("founded_year")
    @classmethod
    def validate_year(cls, v: Optional[int]) -> Optional[int]:
        return _validate_founded_year_val(v)

    @field_validator("website")
    @classmethod
    def validate_web(cls, v: Optional[str]) -> Optional[str]:
        return _validate_url_str(v, "website URL")

    @field_validator("linkedin")
    @classmethod
    def validate_li(cls, v: Optional[str]) -> Optional[str]:
        return _validate_url_str(v, "LinkedIn URL")


class CompanyResponse(CompanyBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


class CompanyUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    logo_url: Optional[str] = Field(None, max_length=2048)
    industry: Optional[str] = Field(None, max_length=255)
    company_size: Optional[str] = Field(None, max_length=100)
    headquarters: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=10000)
    founded_year: Optional[int] = None
    website: Optional[str] = Field(None, max_length=500)
    linkedin: Optional[str] = Field(None, max_length=500)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return _validate_company_name(v)

    @field_validator("headquarters")
    @classmethod
    def validate_hq(cls, v: Optional[str]) -> Optional[str]:
        if v is None or not v.strip():
            return None
        return _validate_location_str(v, "Headquarters")

    @field_validator("founded_year")
    @classmethod
    def validate_year(cls, v: Optional[int]) -> Optional[int]:
        return _validate_founded_year_val(v)

    @field_validator("website")
    @classmethod
    def validate_web(cls, v: Optional[str]) -> Optional[str]:
        return _validate_url_str(v, "website URL")

    @field_validator("linkedin")
    @classmethod
    def validate_li(cls, v: Optional[str]) -> Optional[str]:
        return _validate_url_str(v, "LinkedIn URL")


class CandidateCompanyJobItem(BaseModel):
    id: UUID
    title: str
    department: str
    work_mode: str
    employment_type: str
    location: str
    experience_level: str
    salary_min: Optional[str] = None
    salary_max: Optional[str] = None
    posted_date: Optional[str] = None
    deadline: Optional[date] = None
    status: str
    model_config = ConfigDict(from_attributes=True)


class CandidateCompanyDetailsResponse(CompanyResponse):
    active_jobs: List[CandidateCompanyJobItem] = Field(default_factory=list)


class UserSyncRequest(BaseModel):
    auth0_id: str = Field(..., min_length=1, max_length=128)
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=255)
    role: Literal["candidate", "recruiter"]
    company_name: Optional[str] = Field(None, max_length=255)
    industry: Optional[str] = Field(None, max_length=255)
    company_size: Optional[str] = Field(None, max_length=100)
    headquarters: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=10000)
    founded_year: Optional[int] = None
    website: Optional[str] = Field(None, max_length=500)
    linkedin: Optional[str] = Field(None, max_length=500)
    logo_url: Optional[str] = Field(None, max_length=2048)
    phone: Optional[str] = Field(None, max_length=32)
    location: Optional[str] = Field(None, max_length=255)
    dob: Optional[date] = None
    resume_name: Optional[str] = Field(None, max_length=255)
    resume_text: Optional[str] = Field(None, max_length=500000)
    picture_url: Optional[str] = Field(None, max_length=2048)
    is_onboarding_completion: Optional[bool] = None
    is_profile_update: Optional[bool] = None

    @field_validator("name")
    @classmethod
    def validate_user_name(cls, v: str) -> str:
        return _validate_unicode_name(v, "Name")

    @field_validator("auth0_id")
    @classmethod
    def validate_auth0_id(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("auth0_id cannot be blank.")
        return s

    @field_validator("company_name")
    @classmethod
    def validate_comp_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None or not v.strip():
            return None
        return _validate_company_name(v)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        return _validate_phone_str(v)

    @field_validator("location", "headquarters")
    @classmethod
    def validate_loc(cls, v: Optional[str]) -> Optional[str]:
        if v is None or not v.strip():
            return None
        return _validate_location_str(v)

    @field_validator("founded_year")
    @classmethod
    def validate_year(cls, v: Optional[int]) -> Optional[int]:
        return _validate_founded_year_val(v)

    @field_validator("website")
    @classmethod
    def validate_web(cls, v: Optional[str]) -> Optional[str]:
        return _validate_url_str(v, "website URL")

    @field_validator("linkedin")
    @classmethod
    def validate_li(cls, v: Optional[str]) -> Optional[str]:
        return _validate_url_str(v, "LinkedIn URL")

    @field_validator("dob")
    @classmethod
    def validate_dob(cls, v: Optional[date]) -> Optional[date]:
        return _validate_dob_val(v)


class UpdateAccountRequest(BaseModel):
    auth0_id: str = Field(..., min_length=1, max_length=128)
    name: str = Field(..., min_length=1, max_length=255)
    picture_url: Optional[str] = Field(None, max_length=2048)

    @field_validator("auth0_id")
    @classmethod
    def validate_auth0_id(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("auth0_id cannot be blank.")
        return s

    @field_validator("name")
    @classmethod
    def validate_account_name(cls, v: str) -> str:
        return _validate_unicode_name(v, "Name")


class UserResponse(BaseModel):
    id: UUID
    auth0_id: str
    email: str
    name: str
    role: str
    company_id: Optional[UUID] = None
    company_name: Optional[str] = None
    candidate_id: Optional[UUID] = None
    recruiter_id: Optional[UUID] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    dob: Optional[date] = None
    resume_id: Optional[UUID] = None
    resume_name: Optional[str] = None
    resume_url: Optional[str] = None
    picture_url: Optional[str] = None
    onboarding_completed: bool = False
    model_config = ConfigDict(from_attributes=True)


class MatchingWeights(BaseModel):
    required_skills: int = Field(40, ge=0, le=100, validation_alias=AliasChoices("required_skills", "requiredSkills"))
    preferred_skills: int = Field(15, ge=0, le=100, validation_alias=AliasChoices("preferred_skills", "preferredSkills"))
    experience: int = Field(20, ge=0, le=100)
    education: int = Field(10, ge=0, le=100)
    location_work_mode: int = Field(10, ge=0, le=100, validation_alias=AliasChoices("location_work_mode", "locationWorkMode"))
    employment_status: int = Field(5, ge=0, le=100, validation_alias=AliasChoices("employment_status", "employmentStatus"))

    @model_validator(mode="after")
    def validate_sum(self):
        total = self.required_skills + self.preferred_skills + self.experience + self.education + self.location_work_mode + self.employment_status
        if total != 100:
            raise ValueError(f"Matching weights must sum to 100, got {total}")
        return self


class JobBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    department: str = Field(..., min_length=1, max_length=100)
    work_mode: Literal["Remote", "Hybrid", "On-site"]
    employment_type: Literal["Full-time", "Part-time", "Contract", "Internship"]
    location: str = Field(..., min_length=1, max_length=255)
    experience_level: str = Field(..., min_length=1, max_length=50)
    education_level: Optional[str] = Field(None, max_length=100)
    salary_min: Optional[Decimal] = None
    salary_max: Optional[Decimal] = None
    description: str = Field(..., max_length=10000)
    responsibilities: List[str] = Field(default_factory=list, max_length=50)
    qualifications: List[str] = Field(default_factory=list, max_length=50)
    preferred_qualifications: List[str] = Field(default_factory=list, max_length=50, validation_alias=AliasChoices("preferred_qualifications", "preferredQualifications"))
    status: Literal["Active", "Draft", "Closed"] = "Active"
    deadline: Optional[date] = None
    require_assessment: bool = Field(False, validation_alias=AliasChoices("require_assessment", "requireAssessment"))
    matching_weights: MatchingWeights = Field(default_factory=lambda: MatchingWeights(required_skills=40, preferred_skills=15, experience=20, education=10, location_work_mode=10, employment_status=5), validation_alias=AliasChoices("matching_weights", "matchingWeights"))
    additional_requirements: Optional[str] = Field(None, max_length=2000, validation_alias=AliasChoices("additional_requirements", "additionalRequirements"))

    @field_validator("location", mode="before")
    @classmethod
    def resolve_location(cls, v):
        if v is None:
            return "Remote"
        s = str(v).strip()
        return s if s else "Remote"

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        return _validate_job_title(v)

    @field_validator("department")
    @classmethod
    def validate_dept(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Department cannot be blank.")
        if not any(c.isalnum() for c in s):
            raise ValueError("Department must contain letters or numbers.")
        return s

    @field_validator("deadline")
    @classmethod
    def validate_deadline_field(cls, v: Optional[date]) -> Optional[date]:
        return _validate_deadline_val(v)

    @field_validator("salary_min", "salary_max", mode="before")
    @classmethod
    def parse_salary(cls, v):
        return _parse_salary_value(v)

    @model_validator(mode="after")
    def validate_job_base_constraints(self):
        if self.salary_min is not None and self.salary_max is not None:
            if self.salary_min > self.salary_max:
                raise ValueError("salary_min cannot be greater than salary_max.")
        if self.work_mode != "Remote":
            loc = self.location.strip()
            if not loc or loc.lower() == "remote":
                raise ValueError("Physical location is required for On-site or Hybrid jobs.")
        else:
            if not self.location.strip():
                self.location = "Remote"
        return self

    @field_validator("responsibilities", "qualifications", "preferred_qualifications")
    @classmethod
    def validate_bullet_items(cls, v: List[str]) -> List[str]:
        cleaned = []
        seen = set()
        for item in v:
            s = str(item).strip()
            if s:
                validated = _validate_bullet_str(s, min_len=3, max_len=500)
                norm = validated.lower()
                if norm not in seen:
                    seen.add(norm)
                    cleaned.append(validated)
        return cleaned


class JobCreate(JobBase):
    description: str = Field(..., min_length=10, max_length=10000)
    company_name: Optional[str] = Field(None, max_length=255)
    required_skills: List[str] = Field(default_factory=list, max_length=50)
    preferred_skills: List[str] = Field(default_factory=list, max_length=50)

    @field_validator("required_skills", "preferred_skills")
    @classmethod
    def validate_skills(cls, v: List[str]) -> List[str]:
        cleaned = []
        seen = set()
        for item in v:
            s = str(item).strip()
            if s:
                validated = _validate_skill_name(s)
                norm = validated.lower()
                if norm not in seen:
                    seen.add(norm)
                    cleaned.append(validated)
        return cleaned

    @model_validator(mode="after")
    def validate_job_create_cross_fields(self):
        if not self.required_skills:
            raise ValueError("At least one required skill must be specified.")
        req_skills_set = {s.lower() for s in self.required_skills}
        for s in self.preferred_skills:
            if s.lower() in req_skills_set:
                raise ValueError(f"'{s}' cannot be both a required skill and a preferred skill.")
        qual_set = {q.lower() for q in self.qualifications}
        for q in self.preferred_qualifications:
            if q.lower() in qual_set:
                raise ValueError(f"'{q}' cannot be both a basic qualification and a preferred qualification.")
        return self


class JobUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=255)
    department: Optional[str] = Field(None, min_length=1, max_length=100)
    work_mode: Optional[Literal["Remote", "Hybrid", "On-site"]] = Field(None, validation_alias=AliasChoices("work_mode", "workMode"))
    employment_type: Optional[Literal["Full-time", "Part-time", "Contract", "Internship"]] = Field(None, validation_alias=AliasChoices("employment_type", "employmentType", "jobType"))
    location: Optional[str] = Field(None, min_length=1, max_length=255)
    experience_level: Optional[str] = Field(None, min_length=1, max_length=50, validation_alias=AliasChoices("experience_level", "experienceLevel", "experience"))
    education_level: Optional[str] = Field(None, max_length=100, validation_alias=AliasChoices("education_level", "education"))
    salary_min: Optional[Decimal] = Field(None, validation_alias=AliasChoices("salary_min", "salaryMin"))
    salary_max: Optional[Decimal] = Field(None, validation_alias=AliasChoices("salary_max", "salaryMax"))
    description: Optional[str] = Field(None, min_length=10, max_length=10000)
    responsibilities: Optional[List[str]] = Field(None, max_length=50)
    qualifications: Optional[List[str]] = Field(None, max_length=50)
    preferred_qualifications: Optional[List[str]] = Field(None, max_length=50, validation_alias=AliasChoices("preferred_qualifications", "preferredQualifications"))
    status: Optional[Literal["Active", "Draft", "Closed"]] = None
    deadline: Optional[date] = None
    require_assessment: Optional[bool] = Field(None, validation_alias=AliasChoices("require_assessment", "requireAssessment"))
    matching_weights: Optional[MatchingWeights] = Field(None, validation_alias=AliasChoices("matching_weights", "matchingWeights"))
    additional_requirements: Optional[str] = Field(None, max_length=2000, validation_alias=AliasChoices("additional_requirements", "additionalRequirements"))
    required_skills: Optional[List[str]] = Field(None, max_length=50, validation_alias=AliasChoices("required_skills", "requiredSkills", "skills"))
    preferred_skills: Optional[List[str]] = Field(None, max_length=50, validation_alias=AliasChoices("preferred_skills", "preferredSkills"))

    @field_validator("title")
    @classmethod
    def validate_title_opt(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return _validate_job_title(v)

    @field_validator("department")
    @classmethod
    def validate_dept_opt(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        s = v.strip()
        if not s:
            raise ValueError("Department cannot be blank.")
        if not any(c.isalnum() for c in s):
            raise ValueError("Department must contain letters or numbers.")
        return s

    @field_validator("deadline")
    @classmethod
    def validate_deadline_opt(cls, v: Optional[date]) -> Optional[date]:
        return _validate_deadline_val(v)

    @field_validator("salary_min", "salary_max", mode="before")
    @classmethod
    def parse_salary(cls, v):
        return _parse_salary_value(v)

    @model_validator(mode="after")
    def validate_job_update_constraints(self):
        if self.salary_min is not None and self.salary_max is not None:
            if self.salary_min > self.salary_max:
                raise ValueError("salary_min cannot be greater than salary_max.")
        if self.work_mode is not None and self.location is not None:
            if self.work_mode != "Remote":
                loc = self.location.strip()
                if not loc or loc.lower() == "remote":
                    raise ValueError("Physical location is required for On-site or Hybrid jobs.")
        if self.required_skills is not None:
            if len(self.required_skills) == 0:
                raise ValueError("At least one required skill must be specified.")
        if self.required_skills is not None and self.preferred_skills is not None:
            req_set = {s.lower() for s in self.required_skills}
            for s in self.preferred_skills:
                if s.lower() in req_set:
                    raise ValueError(f"'{s}' cannot be both a required skill and a preferred skill.")
        if self.qualifications is not None and self.preferred_qualifications is not None:
            qual_set = {q.lower() for q in self.qualifications}
            for q in self.preferred_qualifications:
                if q.lower() in qual_set:
                    raise ValueError(f"'{q}' cannot be both a basic qualification and a preferred qualification.")
        return self

    @field_validator("responsibilities", "qualifications", "preferred_qualifications")
    @classmethod
    def validate_bullet_items(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return None
        cleaned = []
        seen = set()
        for item in v:
            s = str(item).strip()
            if s:
                validated = _validate_bullet_str(s, min_len=3, max_len=500)
                norm = validated.lower()
                if norm not in seen:
                    seen.add(norm)
                    cleaned.append(validated)
        return cleaned

    @field_validator("required_skills", "preferred_skills")
    @classmethod
    def validate_skills(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return None
        cleaned = []
        seen = set()
        for item in v:
            s = str(item).strip()
            if s:
                validated = _validate_skill_name(s)
                norm = validated.lower()
                if norm not in seen:
                    seen.add(norm)
                    cleaned.append(validated)
        return cleaned


class JobResponse(JobBase):
    id: UUID
    company_id: UUID
    company_name: str
    company_logo: Optional[str] = None
    created_by: UUID
    posted_at: datetime
    description: str = Field(default="")
    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    applicant_count: int = 0
    match_score: Optional[int] = 85
    assessment_status: Optional[str] = "NOT_STARTED"
    updated_at: Optional[datetime] = None
    updatedAt: Optional[str] = None

    company: Optional[str] = None
    companyLogo: Optional[str] = None
    workMode: Optional[str] = None
    employmentType: Optional[str] = None
    jobType: Optional[str] = None
    experience: Optional[str] = None
    experienceLevel: Optional[str] = None
    education: Optional[str] = None
    salaryMin: Optional[str] = None
    salaryMax: Optional[str] = None
    postedDate: Optional[str] = None
    postedRelative: Optional[str] = None
    createdAt: Optional[str] = None
    requireAssessment: bool = False
    preferredQualifications: List[str] = Field(default_factory=list)
    requiredSkills: List[str] = Field(default_factory=list)
    preferredSkills: List[str] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)
    applicants: int = 0
    applicantCount: int = 0
    shortlisted: int = 0
    average_match: Optional[float] = None
    averageMatch: Optional[float] = None
    matchingWeights: Optional[Dict[str, Any]] = None
    additionalRequirements: Optional[str] = None

    @field_validator("description", mode="before")
    @classmethod
    def resolve_desc(cls, v):
        if v is None:
            return ""
        return str(v)

    model_config = ConfigDict(from_attributes=True)


class SavedJobToggleRequest(BaseModel):
    candidate_id: UUID
    job_id: UUID


class SavedJobToggleResponse(BaseModel):
    saved: bool
    job_id: UUID
    candidate_id: UUID


class ApplicationCreate(BaseModel):
    job_id: UUID
    candidate_id: Optional[UUID] = Field(None, description="Optional candidate ID; if omitted, resolved from authenticated candidate")
    resume_id: Optional[UUID] = None
    current_job_title: Optional[str] = Field(
        None,
        max_length=255,
        validation_alias=AliasChoices("current_job_title", "current_job", "currentJobTitle", "currentJob"),
    )
    years_experience: Optional[str] = Field(None, max_length=50)
    highest_education: Optional[str] = Field(None, max_length=100)
    why_interested: Optional[str] = Field(None, max_length=5000)
    relevant_experience: Optional[str] = Field(None, max_length=5000)
    is_currently_employed: bool = Field(
        False,
        validation_alias=AliasChoices("is_currently_employed", "currently_employed", "isCurrentlyEmployed", "currentlyEmployed"),
    )
    additional_information: Optional[str] = Field(None, max_length=5000)

    @field_validator("current_job_title")
    @classmethod
    def validate_current_title(cls, v: Optional[str]) -> Optional[str]:
        if v is None or not v.strip():
            return None
        s = v.strip()
        if not any(c.isalpha() for c in s):
            raise ValueError("Job title must contain at least one letter.")
        return s

    @model_validator(mode="after")
    def validate_conditional_employment(self) -> "ApplicationCreate":
        if self.is_currently_employed:
            if not self.current_job_title or not self.current_job_title.strip():
                raise ValueError("Current job title is required when currently employed.")
        else:
            self.current_job_title = None
        return self

    @field_validator("why_interested", "relevant_experience", "additional_information")
    @classmethod
    def validate_text_fields(cls, v: Optional[str]) -> Optional[str]:
        if v is None or not v.strip():
            return None
        s = v.strip()
        if not any(c.isalnum() for c in s):
            raise ValueError("Content must contain letters or numbers.")
        return s


class ApplicationStatusUpdate(BaseModel):
    status: Literal["Applied", "Screening", "Shortlisted", "Rejected"]
    reason: Optional[str] = None


class ApplicationResponse(BaseModel):
    id: UUID
    candidate_id: UUID
    job_id: UUID
    resume_id: Optional[UUID] = None
    status: str
    status_changed_at: Optional[datetime] = None
    status_changed_by: Optional[UUID] = None
    rejection_reason: Optional[str] = None
    current_job_title: Optional[str] = None
    years_experience: Optional[str] = None
    highest_education: Optional[str] = None
    why_interested: Optional[str] = None
    relevant_experience: Optional[str] = None
    is_currently_employed: bool = False
    additional_information: Optional[str] = None
    applied_at: datetime
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    candidate_phone: Optional[str] = None
    candidate_location: Optional[str] = None
    candidate_dob: Optional[date] = None
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    resume_name: Optional[str] = None
    resume_url: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    overall_score: Optional[float] = None
    ats_score: Optional[float] = None
    ai_score: Optional[float] = None
    match_details: Optional[dict] = None
    require_assessment: Optional[bool] = None
    assessment_status: Optional[str] = None
    assessment_score: Optional[int] = None
    assessment_total_questions: Optional[int] = None
    assessment_correct_answers: Optional[int] = None
    assessment_percentage: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class ApplicationStatusHistoryResponse(BaseModel):
    id: UUID
    application_id: UUID
    from_status: Optional[str] = None
    to_status: str
    changed_by: Optional[UUID] = None
    changed_at: datetime
    reason: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ResumeResponse(BaseModel):
    id: UUID
    candidate_id: UUID
    file_url: str
    file_name: str
    parsed_details: dict = Field(default_factory=dict)
    uploaded_at: datetime
    is_baseline: bool = False
    model_config = ConfigDict(from_attributes=True)


class CandidateJobMatchResponse(BaseModel):
    id: UUID
    candidate_id: UUID
    job_id: UUID
    resume_id: UUID
    match_type: str = "resume"
    application_id: Optional[UUID] = None
    overall_score: Optional[Decimal] = None
    ats_score: Optional[Decimal] = None
    ai_score: Optional[Decimal] = None
    match_details: dict = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class SkillResponse(BaseModel):
    id: int
    name: str
    model_config = ConfigDict(from_attributes=True)


class MatchReportResponse(BaseModel):
    id: Optional[UUID] = None
    job_id: UUID
    candidate_id: UUID
    resume_id: UUID
    application_id: Optional[UUID] = None
    match_type: str
    overall_score: Optional[float] = None
    ats_score: float
    ai_score: Optional[float] = None
    ats: Dict[str, Any] = Field(default_factory=dict)
    semantic: Optional[Dict[str, Any]] = None
    strengths: List[str] = Field(default_factory=list)
    gaps: List[str] = Field(default_factory=list)
    weights_used: Dict[str, Any] = Field(default_factory=dict)
    breakdown: Dict[str, Any] = Field(default_factory=dict)
    is_stale: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class MCQQuestionBase(BaseModel):
    question_text: str = Field(..., min_length=1, description="Question text")
    option_a: str = Field(..., min_length=1, description="Option A")
    option_b: str = Field(..., min_length=1, description="Option B")
    option_c: str = Field(..., min_length=1, description="Option C")
    option_d: str = Field(..., min_length=1, description="Option D")
    correct_option: Literal["A", "B", "C", "D"] = Field(..., description="Correct option (A, B, C, or D)")
    marks: int = Field(default=1, gt=0, description="Marks allocated for this question (must be positive integer)")

    @field_validator("question_text", "option_a", "option_b", "option_c", "option_d", mode="before")
    @classmethod
    def validate_non_empty_text(cls, v: Any, info: ValidationInfo) -> str:
        if v is None or not isinstance(v, str) or not v.strip():
            raise ValueError(f"{info.field_name} must not be empty or whitespace only")
        return v.strip()

    @field_validator("correct_option", mode="before")
    @classmethod
    def validate_correct_option(cls, v: Any) -> str:
        if isinstance(v, str):
            v_upper = v.strip().upper()
            if v_upper in ("A", "B", "C", "D"):
                return v_upper
        raise ValueError("correct_option must be one of: A, B, C, D")

    @field_validator("marks")
    @classmethod
    def validate_marks(cls, v: Any) -> int:
        if v is None or int(v) <= 0:
            raise ValueError("marks must be a positive integer greater than 0")
        return int(v)


class MCQQuestionCreate(MCQQuestionBase):
    job_id: Optional[UUID] = Field(None, description="Associated job ID (optional if specified in path)")


class MCQQuestionUpdate(BaseModel):
    question_text: Optional[str] = Field(None, min_length=1)
    option_a: Optional[str] = Field(None, min_length=1)
    option_b: Optional[str] = Field(None, min_length=1)
    option_c: Optional[str] = Field(None, min_length=1)
    option_d: Optional[str] = Field(None, min_length=1)
    correct_option: Optional[Literal["A", "B", "C", "D"]] = None
    marks: Optional[int] = Field(None, gt=0)

    @field_validator("question_text", "option_a", "option_b", "option_c", "option_d", mode="before")
    @classmethod
    def validate_non_empty_text_opt(cls, v: Any, info: ValidationInfo) -> Optional[str]:
        if v is None:
            return None
        if not isinstance(v, str) or not v.strip():
            raise ValueError(f"{info.field_name} must not be empty or whitespace only")
        return v.strip()

    @field_validator("correct_option", mode="before")
    @classmethod
    def validate_correct_option_opt(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        if isinstance(v, str):
            v_upper = v.strip().upper()
            if v_upper in ("A", "B", "C", "D"):
                return v_upper
        raise ValueError("correct_option must be one of: A, B, C, D")

    @field_validator("marks")
    @classmethod
    def validate_marks_opt(cls, v: Any) -> Optional[int]:
        if v is None:
            return None
        if int(v) <= 0:
            raise ValueError("marks must be a positive integer greater than 0")
        return int(v)


class MCQQuestionResponse(BaseModel):
    id: UUID
    job_id: UUID
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_option: str
    marks: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class AssessmentStatusResponse(BaseModel):
    job_id: UUID
    status: str
    question_count: int
    duration_minutes: int = 30
    configured_question_count: Optional[int] = Field(None, validation_alias=AliasChoices("configured_question_count", "assessment_question_count"))
    can_activate: bool
    can_close: bool
    validation_message: Optional[str] = None
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class AssessmentConfigurePayload(BaseModel):
    duration_minutes: Optional[int] = Field(None, validation_alias=AliasChoices("duration_minutes", "durationMinutes"))
    question_count: Optional[int] = Field(None, validation_alias=AliasChoices("question_count", "questionCount", "assessment_question_count", "assessmentQuestionCount"))


class CandidateOptionItem(BaseModel):
    key: str
    text: str


class CandidateAssessmentQuestionResponse(BaseModel):
    question_id: UUID
    question_number: int
    question_text: str
    options: List[CandidateOptionItem]
    selected_option: Optional[str] = None
    is_marked_for_review: bool = False


class CandidateAssessmentAttemptResponse(BaseModel):
    id: UUID
    job_id: UUID
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    status: str
    started_at: datetime
    expires_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    server_time: Optional[datetime] = None
    total_questions: int
    answered_count: int
    score: Optional[int] = None
    percentage: Optional[float] = None
    time_taken_seconds: Optional[int] = None
    correct_answers: Optional[int] = None
    questions: List[CandidateAssessmentQuestionResponse]
    model_config = ConfigDict(from_attributes=True)


class AssessmentAnswerPayload(BaseModel):
    question_id: UUID
    selected_option: Optional[str] = None
    is_marked_for_review: Optional[bool] = None


class MarkReviewPayload(BaseModel):
    question_id: UUID
    is_marked_for_review: bool


class CandidateAssessmentSubmitResponse(BaseModel):
    attempt_id: UUID
    status: str
    submitted_at: datetime
    total_questions: int
    score: Optional[int] = None
    percentage: Optional[float] = None
    time_taken_seconds: Optional[int] = None
    correct_answers: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)


class CandidateAssessmentMyAttemptResponse(BaseModel):
    has_attempt: bool
    can_start: bool
    assessment_status: str
    attempt_id: Optional[UUID] = None
    attempt_status: Optional[str] = None
    started_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    server_time: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    total_questions: Optional[int] = None
    answered_count: Optional[int] = None
    score: Optional[int] = None
    percentage: Optional[float] = None
    time_taken_seconds: Optional[int] = None
    correct_answers: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)


class CandidateAssessmentListItem(BaseModel):
    application_id: UUID
    job_id: UUID
    job_title: str
    company_name: str
    location: Optional[str] = None
    work_mode: Optional[str] = None
    assessment_type: str = "MCQ"
    total_questions: int
    status: str
    can_start: bool
    can_continue: bool
    can_view_result: bool
    attempt_id: Optional[UUID] = None
    score: Optional[int] = None
    percentage: Optional[float] = None
    time_taken_seconds: Optional[int] = None
    correct_answers: Optional[int] = None
    submitted_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class RecruiterAssessmentOverview(BaseModel):
    total_eligible: int
    started: int
    started_count: Optional[int] = None
    completed: int
    completed_count: Optional[int] = None
    not_started: int
    not_started_count: Optional[int] = None
    average_score: Optional[float] = None
    average_percentage: Optional[float] = None
    completion_rate: Optional[float] = None
    completion_rate_percentage: Optional[float] = None
    attendance_rate: Optional[float] = None
    attendance_rate_percentage: Optional[float] = None


class RecruiterCandidateAssessmentItem(BaseModel):
    candidate_id: UUID
    candidate_name: str
    candidate_email: str
    application_id: UUID
    attempt_id: Optional[UUID] = None
    assessment_attempt_id: Optional[UUID] = None
    status: str
    attempt_status: Optional[str] = None
    application_status: Optional[str] = None
    score: Optional[int] = None
    total_questions: int
    percentage: Optional[float] = None
    time_taken_seconds: Optional[int] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class RecruiterJobAssessmentResultsResponse(BaseModel):
    job_id: UUID
    job_title: str
    company_name: str
    assessment_status: str
    duration_minutes: int
    total_questions: int
    overview: RecruiterAssessmentOverview
    candidates: List[RecruiterCandidateAssessmentItem]
    page: int = 1
    limit: int = 20
    total: int = 0
    total_pages: int = 0


class RecruiterQuestionPerformanceItem(BaseModel):
    question_id: UUID
    question_number: int
    question_text: str
    options: List[CandidateOptionItem]
    candidate_selected_option: Optional[str] = None
    candidate_selected_text: Optional[str] = None
    correct_option: str
    correct_text: Optional[str] = None
    is_correct: Optional[bool] = None
    status: str


class RecruiterCandidateDetailResultResponse(BaseModel):
    attempt_id: UUID
    candidate_id: UUID
    candidate_name: str
    candidate_email: str
    job_id: UUID
    job_title: str
    company_name: str
    status: str
    score: int
    total_questions: int
    percentage: float
    time_taken_seconds: Optional[int] = None
    started_at: datetime
    submitted_at: Optional[datetime] = None
    questions: List[RecruiterQuestionPerformanceItem]



