import pytest
from datetime import datetime, timezone
from backend.services.matcher import (
    parse_date_full,
    parse_date_to_year_month,
    parse_experience_months_from_string,
    calculate_resume_experience_months,
    calculate_resume_experience_years,
    format_months_to_display,
    calculate_match_report,
)
from backend.services.semantic_matcher import (
    SemanticMatchOutput,
    build_controlled_failure_state,
    AlignmentCriterion,
)
from backend.models import Job, Candidate, Resume, Application, JobSkill, Skill
from backend.routers.matches import format_match_response
from backend.models import CandidateJobMatch
from uuid import uuid4
from decimal import Decimal


def test_1_one_month_internship_calculates_exactly_one_month():
    parsed_details = {
        "career_level": "fresher",
        "work_experience": [
            {
                "title": "Cybersecurity Intern",
                "company": "Netstratum Technologies",
                "start_date": "June 2025",
                "end_date": None,
                "is_current": None,
            }
        ]
    }
    months = calculate_resume_experience_months(parsed_details)
    assert months == 1
    assert calculate_resume_experience_years(parsed_details) == 0.1

    range_details = {
        "work_experience": [
            {
                "title": "Cybersecurity Intern",
                "company": "Netstratum Technologies",
                "start_date": "May 29, 2025 - June 30, 2025",
                "end_date": None,
                "is_current": False,
            }
        ]
    }
    assert calculate_resume_experience_months(range_details) == 1


def test_2_multiple_overlapping_internships_and_jobs():
    parsed_details = {
        "work_experience": [
            {
                "title": "Intern A",
                "company": "Company A",
                "start_date": "Jan 2024",
                "end_date": "June 2024",
                "is_current": False,
            },
            {
                "title": "Intern B",
                "company": "Company B",
                "start_date": "March 2024",
                "end_date": "August 2024",
                "is_current": False,
            }
        ]
    }
    months = calculate_resume_experience_months(parsed_details)
    assert months == 8
    assert calculate_resume_experience_years(parsed_details) == round(8 / 12.0, 1)


def test_3_consecutive_non_overlapping_internships():
    parsed_details = {
        "work_experience": [
            {
                "title": "Intern A",
                "company": "Company A",
                "start_date": "Jan 2024",
                "end_date": "March 2024",
                "is_current": False,
            },
            {
                "title": "Intern B",
                "company": "Company B",
                "start_date": "July 2024",
                "end_date": "September 2024",
                "is_current": False,
            }
        ]
    }
    months = calculate_resume_experience_months(parsed_details)
    assert months == 6


def test_4_candidate_with_only_education():
    parsed_details = {
        "career_level": "fresher",
        "education": [
            {
                "degree": "Bachelor of Technology in Computer Science",
                "institution": "University of Technology",
                "start_date": "2020",
                "end_date": "2024",
            }
        ],
        "work_experience": []
    }
    months = calculate_resume_experience_months(parsed_details)
    assert months == 0
    assert calculate_resume_experience_years(parsed_details) == 0.0


def test_5_candidate_with_only_projects():
    parsed_details = {
        "career_level": "fresher",
        "projects": [
            {
                "name": "E-Commerce Microservices Platform",
                "description": "Built using React, Node.js, and Docker for 2 years",
                "technologies": ["React", "Node.js", "Docker", "PostgreSQL"],
            }
        ],
        "work_experience": []
    }
    months = calculate_resume_experience_months(parsed_details)
    assert months == 0
    assert calculate_resume_experience_years(parsed_details) == 0.0


def test_6_candidate_with_skills_and_technologies_mentioned_in_projects():
    parsed_details = {
        "career_level": "fresher",
        "skills": ["Python", "Machine Learning", "FastAPI"],
        "projects": [
            {
                "name": "AI Vision Analyzer",
                "description": "5-year long research project at university",
                "technologies": ["Python", "PyTorch"],
            }
        ],
        "certifications": [
            {
                "name": "AWS Certified Solutions Architect",
                "issuing_organization": "Amazon Web Services",
            }
        ]
    }
    months = calculate_resume_experience_months(parsed_details)
    assert months == 0
    assert calculate_resume_experience_years(parsed_details) == 0.0


def test_7_application_declared_experience_less_than_one_year():
    job = Job(
        id=uuid4(),
        title="Junior Developer",
        experience_level="1 year",
        work_mode="remote",
        location="Remote",
        matching_weights={},
        job_skills=[],
        description="Role description",
    )
    candidate = Candidate(
        id=uuid4(),
        user_id=uuid4(),
        name="Arjun Santhosh",
        location="Kochi",
    )
    resume = Resume(
        id=uuid4(),
        candidate_id=candidate.id,
        parsed_details={
            "career_level": "fresher",
            "work_experience": [
                {
                    "title": "Cybersecurity Intern",
                    "company": "Netstratum Technologies",
                    "start_date": "June 2025",
                    "end_date": None,
                    "is_current": None,
                }
            ]
        }
    )
    application = Application(
        id=uuid4(),
        candidate_id=candidate.id,
        job_id=job.id,
        resume_id=resume.id,
        years_experience="< 1 year",
    )

    report = calculate_match_report(
        job=job,
        candidate=candidate,
        resume=resume,
        match_type="application",
        application=application,
    )

    exp = report["breakdown"]["experience"]
    assert exp["candidate_months"] == 1
    assert exp["required_months"] == 12
    assert exp["effective_years"] == 0.1
    assert exp["application_declared"] == "< 1 year"
    assert exp["meets_requirement"] is False
    assert exp["difference_months"] == -11
    assert "1 month" in exp["candidate_display"]
    assert "1 yr" in exp["required_display"]


def test_8_30_months_required_vs_1_month_candidate():
    job = Job(
        id=uuid4(),
        title="Full Stack Engineer",
        experience_level="2-3 years",
        work_mode="remote",
        location="Remote",
        matching_weights={},
        job_skills=[],
        description="Role description",
    )
    candidate = Candidate(id=uuid4(), user_id=uuid4(), name="Arjun Santhosh")
    resume = Resume(
        id=uuid4(),
        candidate_id=candidate.id,
        parsed_details={
            "work_experience": [
                {
                    "title": "Cybersecurity Intern",
                    "company": "Netstratum",
                    "start_date": "June 2025",
                }
            ]
        }
    )

    report = calculate_match_report(
        job=job,
        candidate=candidate,
        resume=resume,
        match_type="resume",
    )

    exp = report["breakdown"]["experience"]
    assert exp["required_months"] == 30
    assert exp["candidate_months"] == 1
    assert exp["meets_requirement"] is False
    assert exp["difference_months"] == -29
    assert exp["score"] == pytest.approx(3.3, 0.1)
    assert "below the required" in exp["explanation"]


def test_9_candidate_months_equal_to_required_months():
    job = Job(
        id=uuid4(),
        title="Software Engineer",
        experience_level="1 year",
        work_mode="remote",
        location="Remote",
        matching_weights={},
        job_skills=[],
        description="Role description",
    )
    candidate = Candidate(id=uuid4(), user_id=uuid4(), name="Jane Doe")
    resume = Resume(
        id=uuid4(),
        candidate_id=candidate.id,
        parsed_details={
            "work_experience": [
                {
                    "title": "Software Developer",
                    "company": "Tech Corp",
                    "start_date": "Jan 2024",
                    "end_date": "Dec 2024",
                    "is_current": False,
                }
            ]
        }
    )

    report = calculate_match_report(
        job=job,
        candidate=candidate,
        resume=resume,
        match_type="resume",
    )

    exp = report["breakdown"]["experience"]
    assert exp["required_months"] == 12
    assert exp["candidate_months"] == 12
    assert exp["meets_requirement"] is True
    assert exp["difference_months"] == 0
    assert exp["score"] == 100.0


def test_10_candidate_months_greater_than_required_months():
    job = Job(
        id=uuid4(),
        title="Associate Developer",
        experience_level="1 year",
        work_mode="remote",
        location="Remote",
        matching_weights={},
        job_skills=[],
        description="Role description",
    )
    candidate = Candidate(id=uuid4(), user_id=uuid4(), name="John Smith")
    resume = Resume(
        id=uuid4(),
        candidate_id=candidate.id,
        parsed_details={
            "work_experience": [
                {
                    "title": "Software Developer",
                    "company": "Tech Corp",
                    "start_date": "Jan 2023",
                    "end_date": "Dec 2024",
                    "is_current": False,
                }
            ]
        }
    )

    report = calculate_match_report(
        job=job,
        candidate=candidate,
        resume=resume,
        match_type="resume",
    )

    exp = report["breakdown"]["experience"]
    assert exp["required_months"] == 12
    assert exp["candidate_months"] == 24
    assert exp["meets_requirement"] is True
    assert exp["difference_months"] == 12
    assert exp["score"] == 100.0
    assert "exceeding the required" in exp["explanation"]


def test_11_candidate_with_missing_dates_or_unparseable_strings():
    parsed_details = {
        "work_experience": [
            {
                "title": "Freelance",
                "company": "Self",
                "start_date": None,
                "end_date": None,
            },
            {
                "title": "Consultant",
                "company": "XYZ",
                "start_date": "Some Unparseable Date",
                "end_date": "Another Strange Date",
            }
        ]
    }
    months = calculate_resume_experience_months(parsed_details)
    assert months == 0
    assert calculate_resume_experience_years(parsed_details) == 0.0


def test_12_api_backward_compatibility_and_structured_semantic_fields():
    match = CandidateJobMatch(
        id=uuid4(),
        candidate_id=uuid4(),
        job_id=uuid4(),
        resume_id=uuid4(),
        match_type="application",
        ats_score=Decimal("75.0"),
        overall_score=Decimal("80.0"),
        match_details={
            "overall_score": 80.0,
            "ats": {
                "experience": {
                    "required_years": 2.5,
                    "effective_years": 0.1,
                    "explanation": "Test explanation",
                }
            },
            "semantic": {
                "status": "success",
                "semantic_score": 85.0,
                "strengths": ["Strong security basics"],
                "gaps": ["No production Kubernetes experience"],
                "experience_alignment": {
                    "score": 80.0,
                    "level": "moderate",
                    "summary": "Internship provided baseline exposure.",
                    "evidence": [],
                }
            }
        }
    )

    res = format_match_response(match)
    assert res.ats["experience"]["candidate_months"] == 1
    assert res.ats["experience"]["required_months"] == 30
    assert res.ats["experience"]["meets_requirement"] is False
    assert res.ats["experience"]["difference_months"] == -29
    assert res.ats["experience"]["required_years"] == 2.5
    assert res.ats["experience"]["effective_years"] == 0.1

    assert res.semantic["alignment_points"] == ["Strong security basics"]
    assert res.semantic["technical_gaps"] == ["No production Kubernetes experience"]
    assert res.semantic["experience_analysis"] == ["Internship provided baseline exposure."]
    assert "structured_review" in res.semantic
    labels = [item["label"] for item in res.semantic["structured_review"]]
    assert "Relevant background" in labels
    assert "Gaps" in labels

    failure_state = build_controlled_failure_state("API_ERROR")
    assert failure_state["status"] == "failed"
    assert "alignment_points" in failure_state
    assert "technical_gaps" in failure_state
    assert "experience_analysis" in failure_state
    assert "education_analysis" in failure_state


def test_13_persisted_match_returned_without_recalculating_or_resume_requirement():
    from unittest.mock import MagicMock
    from backend.services.matcher import get_or_create_resume_match
    from backend.models import Resume

    db_mock = MagicMock()
    candidate = MagicMock(id=uuid4())
    job = MagicMock(id=uuid4())
    existing_match = MagicMock(id=uuid4(), candidate_id=candidate.id, job_id=job.id, match_type="resume")

    db_mock.query.return_value.filter.return_value.order_by.return_value.first.return_value = existing_match

    result = get_or_create_resume_match(db=db_mock, candidate=candidate, job=job)
    assert result == existing_match
    for call in db_mock.query.call_args_list:
        assert Resume not in call.args
