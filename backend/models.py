import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    auth0_id: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    picture_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint("role IN ('candidate', 'recruiter')", name="check_user_role"),
    )

    recruiter: Mapped[Optional["Recruiter"]] = relationship("Recruiter", back_populates="user", uselist=False, cascade="all, delete")
    candidate: Mapped[Optional["Candidate"]] = relationship("Candidate", back_populates="user", uselist=False, cascade="all, delete")


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    logo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    industry: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    company_size: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    headquarters: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    founded_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    linkedin: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    recruiters: Mapped[List["Recruiter"]] = relationship("Recruiter", back_populates="company")
    jobs: Mapped[List["Job"]] = relationship("Job", back_populates="company")


class Recruiter(Base):
    __tablename__ = "recruiters"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="RESTRICT"), nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="recruiter")
    company: Mapped["Company"] = relationship("Company", back_populates="recruiters")
    jobs: Mapped[List["Job"]] = relationship("Job", back_populates="recruiter")


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    dob: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    __table_args__ = (
        Index("uq_candidates_phone", "phone", unique=True, postgresql_where=text("phone IS NOT NULL")),
    )

    user: Mapped["User"] = relationship("User", back_populates="candidate")
    resumes: Mapped[List["Resume"]] = relationship("Resume", back_populates="candidate", cascade="all, delete")
    skills: Mapped[List["CandidateSkill"]] = relationship("CandidateSkill", back_populates="candidate", cascade="all, delete")
    applications: Mapped[List["Application"]] = relationship("Application", back_populates="candidate", cascade="all, delete")
    matches: Mapped[List["CandidateJobMatch"]] = relationship("CandidateJobMatch", back_populates="candidate", cascade="all, delete")
    assessment_attempts: Mapped[List["AssessmentAttempt"]] = relationship("AssessmentAttempt", back_populates="candidate", cascade="all, delete")


class Resume(Base):
    __tablename__ = "resumes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    file_url: Mapped[str] = mapped_column(Text, nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    parsed_details: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    is_baseline: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    candidate: Mapped["Candidate"] = relationship("Candidate", back_populates="resumes")
    applications: Mapped[List["Application"]] = relationship("Application", back_populates="resume")
    matches: Mapped[List["CandidateJobMatch"]] = relationship("CandidateJobMatch", back_populates="resume")


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="RESTRICT"), nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("recruiters.id", ondelete="RESTRICT"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    work_mode: Mapped[str] = mapped_column(String(20), nullable=False)
    employment_type: Mapped[str] = mapped_column(String(30), nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    experience_level: Mapped[str] = mapped_column(String(50), nullable=False)
    education_level: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    salary_min: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    salary_max: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    responsibilities: Mapped[List[str]] = mapped_column(JSONB, nullable=False, default=list)
    qualifications: Mapped[List[str]] = mapped_column(JSONB, nullable=False, default=list)
    preferred_qualifications: Mapped[List[str]] = mapped_column(JSONB, nullable=False, default=list)
    matching_weights: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=lambda: {"required_skills": 40, "preferred_skills": 15, "experience": 20, "education": 10, "location_work_mode": 10, "employment_status": 5})
    additional_requirements: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="Active")
    deadline: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    require_assessment: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    assessment_status: Mapped[str] = mapped_column(String(20), nullable=False, default="NOT_STARTED")
    assessment_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    assessment_question_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    posted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint("work_mode IN ('Remote', 'Hybrid', 'On-site')", name="check_work_mode"),
        CheckConstraint("employment_type IN ('Full-time', 'Part-time', 'Contract', 'Internship')", name="check_employment_type"),
        CheckConstraint("status IN ('Active', 'Draft', 'Closed')", name="check_status"),
        CheckConstraint("assessment_status IN ('NOT_STARTED', 'CONFIGURED', 'ACTIVE', 'STARTED', 'CLOSED')", name="check_job_assessment_status"),
        CheckConstraint("assessment_question_count IS NULL OR assessment_question_count > 0", name="check_job_assessment_question_count"),
    )

    company: Mapped["Company"] = relationship("Company", back_populates="jobs")
    recruiter: Mapped["Recruiter"] = relationship("Recruiter", back_populates="jobs")
    job_skills: Mapped[List["JobSkill"]] = relationship("JobSkill", back_populates="job", cascade="all, delete")
    applications: Mapped[List["Application"]] = relationship("Application", back_populates="job", cascade="all, delete")
    matches: Mapped[List["CandidateJobMatch"]] = relationship("CandidateJobMatch", back_populates="job", cascade="all, delete")
    mcq_questions: Mapped[List["MCQQuestion"]] = relationship("MCQQuestion", back_populates="job", cascade="all, delete-orphan")
    assessment_attempts: Mapped[List["AssessmentAttempt"]] = relationship("AssessmentAttempt", back_populates="job", cascade="all, delete")


class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)

    aliases: Mapped[List["SkillAlias"]] = relationship("SkillAlias", back_populates="skill", cascade="all, delete")


class SkillAlias(Base):
    __tablename__ = "skill_aliases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    skill_id: Mapped[int] = mapped_column(Integer, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    alias: Mapped[str] = mapped_column(String(100), nullable=False)
    normalized_alias: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)

    skill: Mapped["Skill"] = relationship("Skill", back_populates="aliases")


class CandidateSkill(Base):
    __tablename__ = "candidate_skills"

    candidate_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("candidates.id", ondelete="CASCADE"), primary_key=True)
    skill_id: Mapped[int] = mapped_column(Integer, ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True)

    candidate: Mapped["Candidate"] = relationship("Candidate", back_populates="skills")
    skill: Mapped["Skill"] = relationship("Skill")


class JobSkill(Base):
    __tablename__ = "job_skills"

    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), primary_key=True)
    skill_id: Mapped[int] = mapped_column(Integer, ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True)
    is_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    job: Mapped["Job"] = relationship("Job", back_populates="job_skills")
    skill: Mapped["Skill"] = relationship("Skill")


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    resume_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("resumes.id", ondelete="RESTRICT"), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="Applied")
    status_changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    status_changed_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    current_job_title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    years_experience: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    highest_education: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    why_interested: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    relevant_experience: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_currently_employed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    additional_information: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    applied_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("candidate_id", "job_id", name="uq_candidate_job"),
        CheckConstraint("status IN ('Applied', 'Screening', 'Shortlisted', 'Rejected')", name="check_app_status"),
    )

    candidate: Mapped["Candidate"] = relationship("Candidate", back_populates="applications")
    job: Mapped["Job"] = relationship("Job", back_populates="applications")
    resume: Mapped["Resume"] = relationship("Resume", back_populates="applications")
    match: Mapped[Optional["CandidateJobMatch"]] = relationship("CandidateJobMatch", back_populates="application", uselist=False, cascade="all, delete")
    status_history: Mapped[List["ApplicationStatusHistory"]] = relationship("ApplicationStatusHistory", back_populates="application", cascade="all, delete", order_by="ApplicationStatusHistory.changed_at.desc()")
    assessment_attempt: Mapped[Optional["AssessmentAttempt"]] = relationship("AssessmentAttempt", back_populates="application", uselist=False, cascade="all, delete")


class ApplicationStatusHistory(Base):
    __tablename__ = "application_status_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    from_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    to_status: Mapped[str] = mapped_column(String(30), nullable=False)
    changed_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint("from_status IS NULL OR from_status IN ('Applied', 'Screening', 'Shortlisted', 'Rejected')", name="check_from_status"),
        CheckConstraint("to_status IN ('Applied', 'Screening', 'Shortlisted', 'Rejected')", name="check_to_status"),
    )

    application: Mapped["Application"] = relationship("Application", back_populates="status_history")
    actor: Mapped[Optional["User"]] = relationship("User", foreign_keys=[changed_by])


class SavedJob(Base):
    __tablename__ = "saved_jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    saved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("candidate_id", "job_id", name="uq_candidate_saved_job"),
    )

    candidate: Mapped["Candidate"] = relationship("Candidate")
    job: Mapped["Job"] = relationship("Job")


class CandidateJobMatch(Base):
    __tablename__ = "candidate_job_matches"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    resume_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("resumes.id", ondelete="RESTRICT"), nullable=False)
    match_type: Mapped[str] = mapped_column(String(20), nullable=False, default="resume")
    application_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), nullable=True)
    ats_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    ai_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    overall_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    match_details: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint("match_type IN ('resume', 'application')", name="check_match_type"),
    )

    candidate: Mapped["Candidate"] = relationship("Candidate", back_populates="matches")
    job: Mapped["Job"] = relationship("Job", back_populates="matches")
    resume: Mapped["Resume"] = relationship("Resume", back_populates="matches")
    application: Mapped[Optional["Application"]] = relationship("Application", back_populates="match")


class MCQQuestion(Base):
    __tablename__ = "mcq_questions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    option_a: Mapped[str] = mapped_column(Text, nullable=False)
    option_b: Mapped[str] = mapped_column(Text, nullable=False)
    option_c: Mapped[str] = mapped_column(Text, nullable=False)
    option_d: Mapped[str] = mapped_column(Text, nullable=False)
    correct_option: Mapped[str] = mapped_column(String(1), nullable=False)
    marks: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint("correct_option IN ('A', 'B', 'C', 'D')", name="check_mcq_correct_option"),
        CheckConstraint("marks > 0", name="check_mcq_positive_marks"),
        Index("idx_mcq_questions_job_id", "job_id"),
    )

    job: Mapped["Job"] = relationship("Job", back_populates="mcq_questions")


class AssessmentAttempt(Base):
    __tablename__ = "assessment_attempts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    candidate_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    application_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="IN_PROGRESS")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    time_taken_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    percentage: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    correct_answers: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    __table_args__ = (
        CheckConstraint("status IN ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED')", name="check_assessment_attempt_status"),
        UniqueConstraint("application_id", name="uq_attempt_application"),
        Index("idx_assessment_attempts_job_id", "job_id"),
        Index("idx_assessment_attempts_candidate_id", "candidate_id"),
        Index("idx_assessment_attempts_application_id", "application_id"),
    )

    job: Mapped["Job"] = relationship("Job", back_populates="assessment_attempts")
    candidate: Mapped["Candidate"] = relationship("Candidate", back_populates="assessment_attempts")
    application: Mapped["Application"] = relationship("Application", back_populates="assessment_attempt")
    attempt_questions: Mapped[List["AssessmentAttemptQuestion"]] = relationship("AssessmentAttemptQuestion", back_populates="attempt", cascade="all, delete-orphan", order_by="AssessmentAttemptQuestion.question_order.asc()")


class AssessmentAttemptQuestion(Base):
    __tablename__ = "assessment_attempt_questions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attempt_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("assessment_attempts.id", ondelete="CASCADE"), nullable=False)
    question_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("mcq_questions.id", ondelete="CASCADE"), nullable=False)
    question_order: Mapped[int] = mapped_column(Integer, nullable=False)
    option_order: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False)
    selected_option: Mapped[Optional[str]] = mapped_column(String(1), nullable=True)
    is_correct: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    is_marked_for_review: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint("selected_option IS NULL OR selected_option IN ('A', 'B', 'C', 'D')", name="check_attempt_selected_option"),
        UniqueConstraint("attempt_id", "question_id", name="uq_attempt_question"),
        UniqueConstraint("attempt_id", "question_order", name="uq_attempt_question_order"),
        Index("idx_attempt_questions_attempt_id", "attempt_id"),
    )

    attempt: Mapped["AssessmentAttempt"] = relationship("AssessmentAttempt", back_populates="attempt_questions")
    question: Mapped["MCQQuestion"] = relationship("MCQQuestion")

