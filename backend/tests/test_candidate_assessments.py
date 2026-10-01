import math
import uuid
from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.main import app
from backend.models import (
    Application,
    AssessmentAttempt,
    AssessmentAttemptQuestion,
    Candidate,
    Company,
    Job,
    MCQQuestion,
    Recruiter,
    Resume,
    User,
)
from backend.auth import get_current_candidate, get_current_recruiter
from backend.database import SessionLocal

client = TestClient(app)


@pytest.fixture
def db_session():
    db = SessionLocal()
    yield db
    db.close()


@pytest.fixture
def assessment_setup(db_session: Session):
    company = Company(
        id=uuid.uuid4(),
        name=f"Assessment Corp {uuid.uuid4().hex[:6]}",
        industry="Technology",
    )
    db_session.add(company)

    company_other = Company(
        id=uuid.uuid4(),
        name=f"Other Corp {uuid.uuid4().hex[:6]}",
        industry="Finance",
    )
    db_session.add(company_other)

    recruiter_user = User(
        id=uuid.uuid4(),
        auth0_id=f"auth0|recruiter_{uuid.uuid4().hex[:8]}",
        email=f"recruiter-{uuid.uuid4().hex[:6]}@corp.com",
        name="Lead Recruiter",
        role="recruiter",
    )
    db_session.add(recruiter_user)

    recruiter = Recruiter(
        id=uuid.uuid4(),
        user_id=recruiter_user.id,
        company_id=company.id,
    )
    db_session.add(recruiter)

    other_recruiter_user = User(
        id=uuid.uuid4(),
        auth0_id=f"auth0|other_recruiter_{uuid.uuid4().hex[:8]}",
        email=f"other-recruiter-{uuid.uuid4().hex[:6]}@other.com",
        name="Other Recruiter",
        role="recruiter",
    )
    db_session.add(other_recruiter_user)

    other_recruiter = Recruiter(
        id=uuid.uuid4(),
        user_id=other_recruiter_user.id,
        company_id=company_other.id,
    )
    db_session.add(other_recruiter)

    cand_user_1 = User(
        id=uuid.uuid4(),
        auth0_id=f"auth0|candidate1_{uuid.uuid4().hex[:8]}",
        email=f"candidate1-{uuid.uuid4().hex[:6]}@example.com",
        name="Alice Candidate",
        role="candidate",
    )
    db_session.add(cand_user_1)

    cand_1 = Candidate(
        id=uuid.uuid4(),
        user_id=cand_user_1.id,
        name="Alice Candidate",
    )
    db_session.add(cand_1)

    resume_1 = Resume(
        id=uuid.uuid4(),
        candidate_id=cand_1.id,
        file_url="https://storage.example.com/resumes/alice.pdf",
        file_name="alice_resume.pdf",
        parsed_details={},
    )
    db_session.add(resume_1)

    cand_user_2 = User(
        id=uuid.uuid4(),
        auth0_id=f"auth0|candidate2_{uuid.uuid4().hex[:8]}",
        email=f"candidate2-{uuid.uuid4().hex[:6]}@example.com",
        name="Bob Candidate",
        role="candidate",
    )
    db_session.add(cand_user_2)

    cand_2 = Candidate(
        id=uuid.uuid4(),
        user_id=cand_user_2.id,
        name="Bob Candidate",
    )
    db_session.add(cand_2)

    resume_2 = Resume(
        id=uuid.uuid4(),
        candidate_id=cand_2.id,
        file_url="https://storage.example.com/resumes/bob.pdf",
        file_name="bob_resume.pdf",
        parsed_details={},
    )
    db_session.add(resume_2)

    job = Job(
        id=uuid.uuid4(),
        company_id=company.id,
        created_by=recruiter.id,
        title="Fullstack Developer",
        description="Looking for an experienced fullstack engineer.",
        department="Engineering",
        work_mode="Remote",
        employment_type="Full-time",
        location="New York, NY",
        experience_level="Mid",
        assessment_status="NOT_STARTED",
        assessment_duration_minutes=30,
        require_assessment=True,
    )
    db_session.add(job)

    db_session.commit()

    yield {
        "company": company,
        "company_other": company_other,
        "recruiter": recruiter,
        "other_recruiter": other_recruiter,
        "candidate_1": cand_1,
        "resume_1": resume_1,
        "candidate_2": cand_2,
        "resume_2": resume_2,
        "job": job,
    }

    try:
        test_job_ids = [j.id for j in db_session.query(Job.id).filter(Job.company_id.in_([company.id, company_other.id])).all()]
        if test_job_ids:
            test_app_ids = [a.id for a in db_session.query(Application.id).filter(Application.job_id.in_(test_job_ids)).all()]
            test_attempt_ids = [a.id for a in db_session.query(AssessmentAttempt.id).filter(AssessmentAttempt.job_id.in_(test_job_ids)).all()]
            if test_attempt_ids:
                db_session.query(AssessmentAttemptQuestion).filter(AssessmentAttemptQuestion.attempt_id.in_(test_attempt_ids)).delete(synchronize_session=False)
                db_session.query(AssessmentAttempt).filter(AssessmentAttempt.id.in_(test_attempt_ids)).delete(synchronize_session=False)
            if test_app_ids:
                db_session.query(ApplicationStatusHistory).filter(ApplicationStatusHistory.application_id.in_(test_app_ids)).delete(synchronize_session=False)
                db_session.query(CandidateJobMatch).filter(CandidateJobMatch.application_id.in_(test_app_ids)).delete(synchronize_session=False)
                db_session.query(Application).filter(Application.id.in_(test_app_ids)).delete(synchronize_session=False)
            db_session.query(MCQQuestion).filter(MCQQuestion.job_id.in_(test_job_ids)).delete(synchronize_session=False)
            db_session.query(CandidateJobMatch).filter(CandidateJobMatch.job_id.in_(test_job_ids)).delete(synchronize_session=False)
            db_session.query(SavedJob).filter(SavedJob.job_id.in_(test_job_ids)).delete(synchronize_session=False)
            db_session.query(Job).filter(Job.id.in_(test_job_ids)).delete(synchronize_session=False)

        cand_ids = [cand_1.id, cand_2.id]
        user_ids = [recruiter_user.id, other_recruiter_user.id, cand_user_1.id, cand_user_2.id]
        all_test_apps = db_session.query(Application.id).filter(Application.candidate_id.in_(cand_ids)).all()
        if all_test_apps:
            db_session.query(ApplicationStatusHistory).filter(ApplicationStatusHistory.application_id.in_([a.id for a in all_test_apps])).delete(synchronize_session=False)
            db_session.query(Application).filter(Application.id.in_([a.id for a in all_test_apps])).delete(synchronize_session=False)
        db_session.query(Resume).filter(Resume.candidate_id.in_(cand_ids)).delete(synchronize_session=False)
        db_session.query(Candidate).filter(Candidate.id.in_(cand_ids)).delete(synchronize_session=False)
        db_session.query(Recruiter).filter(Recruiter.id.in_([recruiter.id, other_recruiter.id])).delete(synchronize_session=False)
        db_session.query(Company).filter(Company.id.in_([company.id, company_other.id])).delete(synchronize_session=False)
        db_session.query(User).filter(User.id.in_(user_ids)).delete(synchronize_session=False)
        db_session.commit()
    except Exception:
        db_session.rollback()


def create_application_in_status(db_session: Session, candidate_id: uuid.UUID, job_id: uuid.UUID, resume_id: uuid.UUID, target_status: str = "Screening") -> Application:
    app_record = Application(
        id=uuid.uuid4(),
        candidate_id=candidate_id,
        job_id=job_id,
        resume_id=resume_id,
        status="Applied",
    )
    db_session.add(app_record)
    db_session.commit()
    if target_status == "Screening":
        app_record.status = "Screening"
        db_session.commit()
    elif target_status == "Shortlisted":
        app_record.status = "Screening"
        db_session.commit()
        app_record.status = "Shortlisted"
        db_session.commit()
    elif target_status == "Rejected":
        app_record.status = "Rejected"
        db_session.commit()
    return app_record


def test_cannot_start_without_application(assessment_setup, db_session: Session):
    job = assessment_setup["job"]
    cand_1 = assessment_setup["candidate_1"]

    job.assessment_status = "ACTIVE"
    q1 = MCQQuestion(
        id=uuid.uuid4(),
        job_id=job.id,
        question_text="What is TypeScript?",
        option_a="Typed JS",
        option_b="CSS framework",
        option_c="Database",
        option_d="Browser",
        correct_option="A",
        marks=1,
    )
    db_session.add(q1)
    db_session.commit()

    app.dependency_overrides[get_current_candidate] = lambda: cand_1
    try:
        res = client.post(f"/api/jobs/{job.id}/assessment/start")
        assert res.status_code == 400
        assert "application" in res.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()


def test_candidate_eligibility_status_gates(assessment_setup, db_session: Session):
    job = assessment_setup["job"]
    cand_1 = assessment_setup["candidate_1"]
    resume_1 = assessment_setup["resume_1"]

    q1 = MCQQuestion(
        id=uuid.uuid4(),
        job_id=job.id,
        question_text="Eligibility test question?",
        option_a="Yes",
        option_b="No",
        option_c="Maybe",
        option_d="Never",
        correct_option="A",
        marks=1,
    )
    db_session.add(q1)

    app_record = Application(
        id=uuid.uuid4(),
        candidate_id=cand_1.id,
        job_id=job.id,
        resume_id=resume_1.id,
        status="Applied",
    )
    db_session.add(app_record)
    db_session.commit()

    app.dependency_overrides[get_current_candidate] = lambda: cand_1
    try:
        job.assessment_status = "ACTIVE"
        db_session.commit()
        res_applied = client.post(f"/api/jobs/{job.id}/assessment/start")
        assert res_applied.status_code == 400
        assert "screening" in res_applied.json()["detail"].lower()

        app_record.status = "Screening"
        db_session.commit()
        app_record.status = "Shortlisted"
        db_session.commit()
        res_shortlisted = client.post(f"/api/jobs/{job.id}/assessment/start")
        assert res_shortlisted.status_code == 400
        assert "screening" in res_shortlisted.json()["detail"].lower()

        app_record.status = "Screening"
        job.assessment_status = "NOT_STARTED"
        db_session.commit()
        res_not_started = client.post(f"/api/jobs/{job.id}/assessment/start")
        assert res_not_started.status_code == 400
        assert "not active" in res_not_started.json()["detail"].lower()

        job.assessment_status = "CONFIGURED"
        db_session.commit()
        res_configured = client.post(f"/api/jobs/{job.id}/assessment/start")
        assert res_configured.status_code == 400
        assert "not active" in res_configured.json()["detail"].lower()

        job.assessment_status = "ACTIVE"
        db_session.commit()
        res_active = client.post(f"/api/jobs/{job.id}/assessment/start")
        assert res_active.status_code == 200
        attempt_data = res_active.json()
        assert attempt_data["status"] == "IN_PROGRESS"

        res_started = client.post(f"/api/jobs/{job.id}/assessment/start")
        assert res_started.status_code == 200
        assert res_started.json()["id"] == attempt_data["id"]

        job.assessment_status = "CLOSED"
        db_session.commit()

        cand_2 = assessment_setup["candidate_2"]
        resume_2 = assessment_setup["resume_2"]
        app_2 = create_application_in_status(db_session, cand_2.id, job.id, resume_2.id, "Screening")

        app.dependency_overrides[get_current_candidate] = lambda: cand_2
        res_closed_new = client.post(f"/api/jobs/{job.id}/assessment/start")
        assert res_closed_new.status_code == 400
        assert "closed" in res_closed_new.json()["detail"].lower()

    finally:
        app.dependency_overrides.clear()


def test_randomization_stability_and_option_mapping(assessment_setup, db_session: Session):
    job = assessment_setup["job"]
    cand_1 = assessment_setup["candidate_1"]
    resume_1 = assessment_setup["resume_1"]

    create_application_in_status(db_session, cand_1.id, job.id, resume_1.id, "Screening")

    job.assessment_status = "ACTIVE"

    questions = [
        MCQQuestion(
            id=uuid.uuid4(),
            job_id=job.id,
            question_text=f"Question {i}?",
            option_a="Alpha",
            option_b="Bravo",
            option_c="Charlie",
            option_d="Delta",
            correct_option="B",
            marks=1,
        )
        for i in range(1, 8)
    ]
    for q in questions:
        db_session.add(q)
    db_session.commit()

    app.dependency_overrides[get_current_candidate] = lambda: cand_1
    try:
        res = client.post(f"/api/jobs/{job.id}/assessment/start")
        assert res.status_code == 200
        data1 = res.json()
        attempt_id = data1["id"]

        order1 = [q["question_id"] for q in data1["questions"]]
        options1 = {q["question_id"]: [opt["text"] for opt in q["options"]] for q in data1["questions"]}

        for q in data1["questions"]:
            assert "correct_option" not in q
            assert "answer_key" not in q
            assert "explanation" not in q

        res_fetch = client.get(f"/api/assessment-attempts/{attempt_id}")
        assert res_fetch.status_code == 200
        data_fetch = res_fetch.json()
        order_fetch = [q["question_id"] for q in data_fetch["questions"]]
        options_fetch = {q["question_id"]: [opt["text"] for opt in q["options"]] for q in data_fetch["questions"]}

        assert order1 == order_fetch
        assert options1 == options_fetch

        res_resume = client.post(f"/api/jobs/{job.id}/assessment/start")
        assert res_resume.status_code == 200
        data_resume = res_resume.json()
        order_resume = [q["question_id"] for q in data_resume["questions"]]
        options_resume = {q["question_id"]: [opt["text"] for opt in q["options"]] for q in data_resume["questions"]}

        assert order1 == order_resume
        assert options1 == options_resume

    finally:
        app.dependency_overrides.clear()


def test_timer_scoring_and_auto_submission(assessment_setup, db_session: Session):
    job = assessment_setup["job"]
    cand_1 = assessment_setup["candidate_1"]
    resume_1 = assessment_setup["resume_1"]

    create_application_in_status(db_session, cand_1.id, job.id, resume_1.id, "Screening")

    job.assessment_status = "ACTIVE"
    job.assessment_duration_minutes = 20

    q1 = MCQQuestion(
        id=uuid.uuid4(),
        job_id=job.id,
        question_text="What does CSS stand for?",
        option_a="Cascading Style Sheets",
        option_b="Computer Style Sheets",
        option_c="Creative Style System",
        option_d="Colorful Style Sheets",
        correct_option="A",
        marks=1,
    )
    q2 = MCQQuestion(
        id=uuid.uuid4(),
        job_id=job.id,
        question_text="Which language runs in browser?",
        option_a="Java",
        option_b="C",
        option_c="Python",
        option_d="JavaScript",
        correct_option="D",
        marks=1,
    )
    db_session.add(q1)
    db_session.add(q2)
    db_session.commit()

    app.dependency_overrides[get_current_candidate] = lambda: cand_1
    try:
        res = client.post(f"/api/jobs/{job.id}/assessment/start")
        assert res.status_code == 200
        attempt_data = res.json()
        attempt_id = attempt_data["id"]

        assert attempt_data["started_at"] is not None
        assert attempt_data["expires_at"] is not None
        assert attempt_data["duration_minutes"] == 20

        attempt_qs = (
            db_session.query(AssessmentAttemptQuestion)
            .filter(AssessmentAttemptQuestion.attempt_id == attempt_id)
            .all()
        )

        q1_aq = next(aq for aq in attempt_qs if aq.question_id == q1.id)
        q1_disp_correct = next(
            disp for disp, orig in q1_aq.option_order.items() if orig == "A"
        )

        q2_aq = next(aq for aq in attempt_qs if aq.question_id == q2.id)
        q2_disp_wrong = next(
            disp for disp, orig in q2_aq.option_order.items() if orig != "D"
        )

        res_ans_1 = client.post(
            f"/api/assessment-attempts/{attempt_id}/answer",
            json={"question_id": str(q1.id), "selected_option": q1_disp_correct},
        )
        assert res_ans_1.status_code == 200
        assert res_ans_1.json()["selected_option"] == q1_disp_correct

        res_rev = client.post(
            f"/api/assessment-attempts/{attempt_id}/review",
            json={"question_id": str(q1.id), "is_marked_for_review": True},
        )
        assert res_rev.status_code == 200
        assert res_rev.json()["is_marked_for_review"] is True

        res_ans_2 = client.post(
            f"/api/assessment-attempts/{attempt_id}/answer",
            json={"question_id": str(q2.id), "selected_option": q2_disp_wrong},
        )
        assert res_ans_2.status_code == 200

        res_clear = client.post(
            f"/api/assessment-attempts/{attempt_id}/answer",
            json={"question_id": str(q2.id), "selected_option": ""},
        )
        assert res_clear.status_code == 200
        assert res_clear.json()["selected_option"] is None

        res_ans_2_again = client.post(
            f"/api/assessment-attempts/{attempt_id}/answer",
            json={"question_id": str(q2.id), "selected_option": q2_disp_wrong},
        )
        assert res_ans_2_again.status_code == 200

        res_sub = client.post(f"/api/assessment-attempts/{attempt_id}/submit")
        assert res_sub.status_code == 200
        sub_data = res_sub.json()
        assert sub_data["status"] == "SUBMITTED"
        assert sub_data["score"] == 1
        assert sub_data["percentage"] == 50.0

        res_after = client.get(f"/api/assessment-attempts/{attempt_id}")
        assert res_after.status_code == 200
        assert res_after.json()["score"] == 1
        assert res_after.json()["percentage"] == 50.0

        res_repeat_start = client.post(f"/api/jobs/{job.id}/assessment/start")
        assert res_repeat_start.status_code == 400

    finally:
        app.dependency_overrides.clear()


def test_timer_expiration_blocks_answers(assessment_setup, db_session: Session):
    job = assessment_setup["job"]
    cand_1 = assessment_setup["candidate_1"]
    resume_1 = assessment_setup["resume_1"]

    create_application_in_status(db_session, cand_1.id, job.id, resume_1.id, "Screening")

    job.assessment_status = "ACTIVE"
    q1 = MCQQuestion(
        id=uuid.uuid4(),
        job_id=job.id,
        question_text="Timeout test question?",
        option_a="A",
        option_b="B",
        option_c="C",
        option_d="D",
        correct_option="A",
        marks=1,
    )
    db_session.add(q1)
    db_session.commit()

    app.dependency_overrides[get_current_candidate] = lambda: cand_1
    try:
        res = client.post(f"/api/jobs/{job.id}/assessment/start")
        assert res.status_code == 200
        attempt_id = res.json()["id"]

        attempt = db_session.query(AssessmentAttempt).filter(AssessmentAttempt.id == attempt_id).first()
        attempt.expires_at = datetime.now(timezone.utc) - timedelta(minutes=5)
        db_session.commit()

        res_ans = client.post(
            f"/api/assessment-attempts/{attempt_id}/answer",
            json={"question_id": str(q1.id), "selected_option": "A"},
        )
        assert res_ans.status_code == 400
        assert "expired" in res_ans.json()["detail"].lower()

        db_session.refresh(attempt)
        assert attempt.status == "SUBMITTED"

    finally:
        app.dependency_overrides.clear()


def test_recruiter_results_and_access_control(assessment_setup, db_session: Session):
    job = assessment_setup["job"]
    cand_1 = assessment_setup["candidate_1"]
    resume_1 = assessment_setup["resume_1"]
    recruiter = assessment_setup["recruiter"]
    other_recruiter = assessment_setup["other_recruiter"]

    create_application_in_status(db_session, cand_1.id, job.id, resume_1.id, "Screening")

    job.assessment_status = "ACTIVE"
    q1 = MCQQuestion(
        id=uuid.uuid4(),
        job_id=job.id,
        question_text="Recruiter results question?",
        option_a="Opt1",
        option_b="Opt2",
        option_c="Opt3",
        option_d="Opt4",
        correct_option="C",
        marks=1,
    )
    db_session.add(q1)
    db_session.commit()

    app.dependency_overrides[get_current_candidate] = lambda: cand_1
    try:
        res_start = client.post(f"/api/jobs/{job.id}/assessment/start")
        assert res_start.status_code == 200
        attempt_id = res_start.json()["id"]

        client.post(f"/api/assessment-attempts/{attempt_id}/submit")
    finally:
        app.dependency_overrides.clear()

    app.dependency_overrides[get_current_recruiter] = lambda: other_recruiter
    try:
        res_unauth = client.get(f"/api/jobs/{job.id}/assessment/results")
        assert res_unauth.status_code == 403
    finally:
        app.dependency_overrides.clear()

    app.dependency_overrides[get_current_recruiter] = lambda: recruiter
    try:
        res_results = client.get(f"/api/jobs/{job.id}/assessment/results")
        assert res_results.status_code == 200
        data = res_results.json()
        assert data["job_id"] == str(job.id)
        assert data["overview"]["total_eligible"] == 1
        assert data["overview"]["started"] == 1
        assert data["overview"]["completed"] == 1
        assert data["overview"]["not_started"] == 0
        assert len(data["candidates"]) == 1
        assert data["candidates"][0]["status"] == "Completed"

        res_detail = client.get(f"/api/jobs/{job.id}/assessment/results/{attempt_id}")
        assert res_detail.status_code == 200
        detail_data = res_detail.json()
        assert detail_data["attempt_id"] == attempt_id
        assert len(detail_data["questions"]) == 1
        assert detail_data["questions"][0]["correct_option"] == "C"
    finally:
        app.dependency_overrides.clear()


def test_cross_candidate_unauthorized_access(assessment_setup, db_session: Session):
    job = assessment_setup["job"]
    cand_1 = assessment_setup["candidate_1"]
    resume_1 = assessment_setup["resume_1"]
    cand_2 = assessment_setup["candidate_2"]

    create_application_in_status(db_session, cand_1.id, job.id, resume_1.id, "Screening")

    job.assessment_status = "ACTIVE"
    q1 = MCQQuestion(
        id=uuid.uuid4(),
        job_id=job.id,
        question_text="Security check question",
        option_a="1",
        option_b="2",
        option_c="3",
        option_d="4",
        correct_option="A",
        marks=1,
    )
    db_session.add(q1)
    db_session.commit()

    app.dependency_overrides[get_current_candidate] = lambda: cand_1
    try:
        res = client.post(f"/api/jobs/{job.id}/assessment/start")
        assert res.status_code == 200
        attempt_id = res.json()["id"]
    finally:
        app.dependency_overrides.clear()

    app.dependency_overrides[get_current_candidate] = lambda: cand_2
    try:
        res_get = client.get(f"/api/assessment-attempts/{attempt_id}")
        assert res_get.status_code == 403

        res_ans = client.post(
            f"/api/assessment-attempts/{attempt_id}/answer",
            json={"question_id": str(q1.id), "selected_option": "A"},
        )
        assert res_ans.status_code == 403

        res_sub = client.post(f"/api/assessment-attempts/{attempt_id}/submit")
        assert res_sub.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_assessment_results_metric_calculations(assessment_setup, db_session: Session):
    recruiter = assessment_setup["recruiter"]
    cand_1 = assessment_setup["candidate_1"]
    resume_1 = assessment_setup["resume_1"]
    cand_2 = assessment_setup["candidate_2"]
    resume_2 = assessment_setup["resume_2"]

    new_job = Job(
        id=uuid.uuid4(),
        company_id=assessment_setup["company"].id,
        created_by=recruiter.id,
        title="Metric Calculations Test Engineer",
        description="Testing metrics",
        department="Engineering",
        work_mode="Remote",
        employment_type="Full-time",
        location="San Francisco, CA",
        experience_level="Mid",
        status="Active",
        assessment_status="ACTIVE",
        assessment_duration_minutes=30,
        require_assessment=True,
    )
    db_session.add(new_job)
    q1 = MCQQuestion(
        id=uuid.uuid4(),
        job_id=new_job.id,
        question_text="Sample Q1",
        option_a="1",
        option_b="2",
        option_c="3",
        option_d="4",
        correct_option="A",
        marks=1,
    )
    db_session.add(q1)
    db_session.commit()

    app.dependency_overrides[get_current_recruiter] = lambda: recruiter
    try:
        res_1 = client.get(f"/api/jobs/{new_job.id}/assessment/results")
        assert res_1.status_code == 200
        ov_1 = res_1.json()["overview"]
        assert ov_1["total_eligible"] == 0
        assert ov_1["started"] == 0
        assert ov_1["completed"] == 0
        assert ov_1["not_started"] == 0
        assert ov_1["average_score"] is None
        assert ov_1["completion_rate"] == 0.0
        assert math.isfinite(ov_1["completion_rate"]) and not math.isnan(ov_1["completion_rate"])

        create_application_in_status(db_session, cand_1.id, new_job.id, resume_1.id, "Screening")
        create_application_in_status(db_session, cand_2.id, new_job.id, resume_2.id, "Screening")

        res_2 = client.get(f"/api/jobs/{new_job.id}/assessment/results")
        assert res_2.status_code == 200
        ov_2 = res_2.json()["overview"]
        assert ov_2["total_eligible"] == 2
        assert ov_2["started"] == 0
        assert ov_2["completed"] == 0
        assert ov_2["not_started"] == 2
        assert ov_2["not_started"] == ov_2["total_eligible"] - ov_2["started"]
        assert ov_2["average_score"] is None
        assert ov_2["completion_rate"] == 0.0
        assert math.isfinite(ov_2["completion_rate"]) and not math.isnan(ov_2["completion_rate"])

        app.dependency_overrides[get_current_candidate] = lambda: cand_1
        res_start_1 = client.post(f"/api/jobs/{new_job.id}/assessment/start")
        assert res_start_1.status_code == 200
        attempt_id_1 = res_start_1.json()["id"]

        app.dependency_overrides[get_current_recruiter] = lambda: recruiter
        res_3 = client.get(f"/api/jobs/{new_job.id}/assessment/results")
        assert res_3.status_code == 200
        ov_3 = res_3.json()["overview"]
        assert ov_3["total_eligible"] == 2
        assert ov_3["started"] == 1
        assert ov_3["completed"] == 0
        assert ov_3["not_started"] == 1
        assert ov_3["not_started"] == ov_3["total_eligible"] - ov_3["started"]
        assert ov_3["average_score"] is None
        assert ov_3["completion_rate"] == 0.0
        assert math.isfinite(ov_3["completion_rate"]) and not math.isnan(ov_3["completion_rate"])

        app.dependency_overrides[get_current_candidate] = lambda: cand_1
        q_order_info = res_start_1.json()["questions"][0]
        selected_key = next(opt["key"] for opt in q_order_info["options"] if opt["text"] == "1")
        client.post(
            f"/api/assessment-attempts/{attempt_id_1}/answer",
            json={"question_id": str(q1.id), "selected_option": selected_key},
        )
        res_sub_1 = client.post(f"/api/assessment-attempts/{attempt_id_1}/submit")
        assert res_sub_1.status_code == 200

        app.dependency_overrides[get_current_recruiter] = lambda: recruiter
        res_4 = client.get(f"/api/jobs/{new_job.id}/assessment/results")
        assert res_4.status_code == 200
        ov_4 = res_4.json()["overview"]
        assert ov_4["total_eligible"] == 2
        assert ov_4["started"] == 1
        assert ov_4["completed"] == 1
        assert ov_4["not_started"] == 1
        assert ov_4["not_started"] == ov_4["total_eligible"] - ov_4["started"]
        assert ov_4["average_score"] == 1.0
        assert ov_4["completion_rate"] == 50.0
        assert math.isfinite(ov_4["completion_rate"]) and not math.isnan(ov_4["completion_rate"])

        app.dependency_overrides[get_current_candidate] = lambda: cand_2
        res_start_2 = client.post(f"/api/jobs/{new_job.id}/assessment/start")
        assert res_start_2.status_code == 200
        attempt_id_2 = res_start_2.json()["id"]

        q_order_info_2 = res_start_2.json()["questions"][0]
        selected_key_wrong = next(opt["key"] for opt in q_order_info_2["options"] if opt["text"] == "2")
        client.post(
            f"/api/assessment-attempts/{attempt_id_2}/answer",
            json={"question_id": str(q1.id), "selected_option": selected_key_wrong},
        )
        res_sub_2 = client.post(f"/api/assessment-attempts/{attempt_id_2}/submit")
        assert res_sub_2.status_code == 200

        app.dependency_overrides[get_current_recruiter] = lambda: recruiter
        res_5 = client.get(f"/api/jobs/{new_job.id}/assessment/results")
        assert res_5.status_code == 200
        ov_5 = res_5.json()["overview"]
        assert ov_5["total_eligible"] == 2
        assert ov_5["started"] == 2
        assert ov_5["completed"] == 2
        assert ov_5["not_started"] == 0
        assert ov_5["not_started"] == ov_5["total_eligible"] - ov_5["started"]
        assert ov_5["average_score"] == 0.5
        assert ov_5["completion_rate"] == 100.0
        assert math.isfinite(ov_5["completion_rate"]) and not math.isnan(ov_5["completion_rate"])
    finally:
        app.dependency_overrides.clear()


def test_assessment_visibility_and_persistence_across_statuses(assessment_setup, db_session: Session):
    recruiter = assessment_setup["recruiter"]
    cand_1 = assessment_setup["candidate_1"]
    resume_1 = assessment_setup["resume_1"]
    cand_2 = assessment_setup["candidate_2"]
    resume_2 = assessment_setup["resume_2"]

    new_job = Job(
        id=uuid.uuid4(),
        company_id=recruiter.company_id,
        created_by=recruiter.id,
        title="Data Engineer",
        department="Analytics",
        work_mode="On-site",
        employment_type="Full-time",
        location="Bengaluru, India",
        experience_level="1–3 years",
        description="Data engineering assessment testing",
        status="Active",
        require_assessment=True,
        assessment_status="ACTIVE",
        assessment_duration_minutes=30,
        assessment_question_count=1,
    )
    db_session.add(new_job)
    db_session.commit()

    q1 = MCQQuestion(
        id=uuid.uuid4(),
        job_id=new_job.id,
        question_text="What is SQL?",
        option_a="Structured Query Language",
        option_b="Simple Question List",
        option_c="Standard Query Logic",
        option_d="Sequential Query Language",
        correct_option="A",
        marks=1,
    )
    db_session.add(q1)
    db_session.commit()

    app_1 = create_application_in_status(db_session, cand_1.id, new_job.id, resume_1.id, "Screening")
    app_2 = create_application_in_status(db_session, cand_2.id, new_job.id, resume_2.id, "Shortlisted")

    app.dependency_overrides[get_current_recruiter] = lambda: recruiter
    try:
        res_initial = client.get(f"/api/jobs/{new_job.id}/assessment/results")
        assert res_initial.status_code == 200
        candidate_items = res_initial.json()["candidates"]
        cand_ids = [c["candidate_id"] for c in candidate_items]
        assert str(cand_1.id) in cand_ids
        assert str(cand_2.id) in cand_ids
        cand_1_item = next(c for c in candidate_items if c["candidate_id"] == str(cand_1.id))
        assert cand_1_item["status"] == "Not Started"
        cand_2_item = next(c for c in candidate_items if c["candidate_id"] == str(cand_2.id))
        assert cand_2_item["status"] == "Not Started"

        app.dependency_overrides[get_current_candidate] = lambda: cand_1
        res_start = client.post(f"/api/jobs/{new_job.id}/assessment/start")
        assert res_start.status_code == 200
        attempt_id = res_start.json()["id"]

        q_info = res_start.json()["questions"][0]
        correct_key = next(opt["key"] for opt in q_info["options"] if opt["text"] == "Structured Query Language")
        client.post(
            f"/api/assessment-attempts/{attempt_id}/answer",
            json={"question_id": str(q1.id), "selected_option": correct_key},
        )
        res_submit = client.post(f"/api/assessment-attempts/{attempt_id}/submit")
        assert res_submit.status_code == 200
        assert res_submit.json()["score"] == 1

        app.dependency_overrides[get_current_recruiter] = lambda: recruiter
        res_completed = client.get(f"/api/jobs/{new_job.id}/assessment/results")
        assert res_completed.status_code == 200
        completed_cands = res_completed.json()["candidates"]
        cand_1_completed = next(c for c in completed_cands if c["candidate_id"] == str(cand_1.id))
        assert cand_1_completed["status"] == "Completed"
        assert cand_1_completed["score"] == 1

        app_1.status = "Rejected"
        db_session.commit()

        res_after_reject = client.get(f"/api/jobs/{new_job.id}/assessment/results")
        assert res_after_reject.status_code == 200
        after_reject_cands = res_after_reject.json()["candidates"]
        cand_1_after_reject = next((c for c in after_reject_cands if c["candidate_id"] == str(cand_1.id)), None)
        assert cand_1_after_reject is not None
        assert cand_1_after_reject["status"] == "Completed"
        assert cand_1_after_reject["score"] == 1
        assert cand_1_after_reject["attempt_id"] == attempt_id

        res_detail = client.get(f"/api/jobs/{new_job.id}/assessment/results/{attempt_id}")
        assert res_detail.status_code == 200
        detail_data = res_detail.json()
        assert detail_data["score"] == 1
        assert len(detail_data["questions"]) == 1

        app.dependency_overrides[get_current_candidate] = lambda: cand_1
        res_cand_my_attempt = client.get(f"/api/jobs/{new_job.id}/assessment/my-attempt")
        assert res_cand_my_attempt.status_code == 200
        assert res_cand_my_attempt.json()["has_attempt"] is True
        assert res_cand_my_attempt.json()["score"] == 1
        assert res_cand_my_attempt.json()["can_start"] is False

        res_my_assessments = client.get("/api/candidate/assessments")
        assert res_my_assessments.status_code == 200
        my_list = res_my_assessments.json()
        assert any(item["attempt_id"] == attempt_id and item["status"] == "Completed" for item in my_list)

        cand_user_3 = User(
            id=uuid.uuid4(),
            auth0_id=f"auth0|cand3_{uuid.uuid4().hex[:8]}",
            email=f"cand3-{uuid.uuid4().hex[:6]}@test.com",
            name="Bob Rejected",
            role="candidate",
        )
        db_session.add(cand_user_3)
        cand_3 = Candidate(id=uuid.uuid4(), user_id=cand_user_3.id, name="Bob Rejected")
        db_session.add(cand_3)
        resume_3 = Resume(id=uuid.uuid4(), candidate_id=cand_3.id, file_url="http://example.com/r3.pdf", file_name="r3.pdf")
        db_session.add(resume_3)
        app_3 = create_application_in_status(db_session, cand_3.id, new_job.id, resume_3.id, "Rejected")

        app.dependency_overrides[get_current_candidate] = lambda: cand_3
        res_rejected_start = client.post(f"/api/jobs/{new_job.id}/assessment/start")
        assert res_rejected_start.status_code == 400

        app.dependency_overrides[get_current_recruiter] = lambda: recruiter
        res_results_no_cand3 = client.get(f"/api/jobs/{new_job.id}/assessment/results")
        cand_ids_now = [c["candidate_id"] for c in res_results_no_cand3.json()["candidates"]]
        assert str(cand_3.id) not in cand_ids_now

        app_2.status = "Screening"
        db_session.commit()
        app.dependency_overrides[get_current_candidate] = lambda: cand_2
        res_start_2 = client.post(f"/api/jobs/{new_job.id}/assessment/start")
        assert res_start_2.status_code == 200
        attempt_id_2 = res_start_2.json()["id"]

        app_2.status = "Rejected"
        db_session.commit()

        res_attempt_in_db = db_session.query(AssessmentAttempt).filter(AssessmentAttempt.id == attempt_id_2).first()
        assert res_attempt_in_db is not None
        assert res_attempt_in_db.status == "IN_PROGRESS"

        app.dependency_overrides[get_current_recruiter] = lambda: recruiter
        res_rec_with_inp = client.get(f"/api/jobs/{new_job.id}/assessment/results")
        inp_cands = res_rec_with_inp.json()["candidates"]
        cand_2_item = next((c for c in inp_cands if c["candidate_id"] == str(cand_2.id)), None)
        assert cand_2_item is not None
        assert cand_2_item["status"] == "In Progress"
    finally:
        app.dependency_overrides.clear()


def test_employment_validation_persistence_and_matching(assessment_setup, db_session: Session):
    from backend.services.matcher import get_or_create_application_match

    cand_1 = assessment_setup["candidate_1"]
    resume_1 = assessment_setup["resume_1"]
    job = assessment_setup["job"]

    app.dependency_overrides[get_current_candidate] = lambda: cand_1
    try:
        res_invalid = client.post(
            "/api/applications",
            json={
                "job_id": str(job.id),
                "resume_id": str(resume_1.id),
                "is_currently_employed": True,
                "current_job_title": "",
            },
        )
        assert res_invalid.status_code == 422

        res_invalid_spaces = client.post(
            "/api/applications",
            json={
                "job_id": str(job.id),
                "resume_id": str(resume_1.id),
                "is_currently_employed": True,
                "current_job_title": "   ",
            },
        )
        assert res_invalid_spaces.status_code == 422

        res_valid_employed = client.post(
            "/api/applications",
            json={
                "job_id": str(job.id),
                "resume_id": str(resume_1.id),
                "is_currently_employed": True,
                "current_job_title": "Lead Software Engineer",
                "years_experience": "3–5 years",
                "highest_education": "Bachelor's Degree",
            },
        )
        assert res_valid_employed.status_code == 201
        data = res_valid_employed.json()
        assert data["is_currently_employed"] is True
        assert data["current_job_title"] == "Lead Software Engineer"

        app_id = uuid.UUID(data["id"])
        persisted_app = db_session.query(Application).filter(Application.id == app_id).first()
        assert persisted_app is not None
        assert persisted_app.is_currently_employed is True
        assert persisted_app.current_job_title == "Lead Software Engineer"

        match = get_or_create_application_match(db_session, persisted_app)
        assert match is not None
        emp_breakdown = match.match_details.get("breakdown", {}).get("employment_status", {})
        assert emp_breakdown.get("currently_employed") is True
        assert emp_breakdown.get("current_job") == "Lead Software Engineer"
        assert emp_breakdown.get("score") == 100.0

        cand_user_4 = User(
            id=uuid.uuid4(),
            auth0_id=f"auth0|cand4_{uuid.uuid4().hex[:8]}",
            email=f"cand4-{uuid.uuid4().hex[:6]}@test.com",
            name="Dana Unemployed",
            role="candidate",
        )
        db_session.add(cand_user_4)
        cand_4 = Candidate(id=uuid.uuid4(), user_id=cand_user_4.id, name="Dana Unemployed", location="Bengaluru, India")
        db_session.add(cand_4)
        resume_4 = Resume(id=uuid.uuid4(), candidate_id=cand_4.id, file_url="http://example.com/r4.pdf", file_name="r4.pdf")
        db_session.add(resume_4)
        db_session.commit()

        app.dependency_overrides[get_current_candidate] = lambda: cand_4
        res_valid_unemployed = client.post(
            "/api/applications",
            json={
                "job_id": str(job.id),
                "resume_id": str(resume_4.id),
                "is_currently_employed": False,
                "current_job_title": None,
                "years_experience": "1–2 years",
                "highest_education": "Master's Degree",
            },
        )
        assert res_valid_unemployed.status_code == 201
        data_unemp = res_valid_unemployed.json()
        assert data_unemp["is_currently_employed"] is False
        assert data_unemp["current_job_title"] is None

        app_4_id = uuid.UUID(data_unemp["id"])
        persisted_app_4 = db_session.query(Application).filter(Application.id == app_4_id).first()
        assert persisted_app_4 is not None
        assert persisted_app_4.is_currently_employed is False
        assert persisted_app_4.current_job_title is None

        match_4 = get_or_create_application_match(db_session, persisted_app_4)
        assert match_4 is not None
        emp_breakdown_4 = match_4.match_details.get("breakdown", {}).get("employment_status", {})
        assert emp_breakdown_4.get("currently_employed") is False
        assert emp_breakdown_4.get("current_job") is None
        assert emp_breakdown_4.get("score") == 60.0
        assert persisted_app_4.candidate.location == "Bengaluru, India"
    finally:
        app.dependency_overrides.clear()


def test_recruiter_assessment_results_search_filter_pagination(assessment_setup, db_session: Session):
    job = assessment_setup["job"]
    recruiter = assessment_setup["recruiter"]
    other_recruiter = assessment_setup["other_recruiter"]
    cand_1 = assessment_setup["candidate_1"]
    resume_1 = assessment_setup["resume_1"]
    cand_2 = assessment_setup["candidate_2"]
    resume_2 = assessment_setup["resume_2"]

    # 1. Create applications
    create_application_in_status(db_session, cand_1.id, job.id, resume_1.id, "Screening")
    create_application_in_status(db_session, cand_2.id, job.id, resume_2.id, "Screening")

    # Add 3rd candidate
    cand_user_3 = User(
        id=uuid.uuid4(),
        auth0_id=f"auth0|cand3_{uuid.uuid4().hex[:8]}",
        email=f"charlie-{uuid.uuid4().hex[:6]}@example.com",
        name="Charlie Screening",
        role="candidate",
    )
    db_session.add(cand_user_3)
    cand_3 = Candidate(id=uuid.uuid4(), user_id=cand_user_3.id, name="Charlie Screening")
    db_session.add(cand_3)
    resume_3 = Resume(id=uuid.uuid4(), candidate_id=cand_3.id, file_url="http://example.com/r3.pdf", file_name="r3.pdf")
    db_session.add(resume_3)
    create_application_in_status(db_session, cand_3.id, job.id, resume_3.id, "Screening")

    job.assessment_status = "ACTIVE"
    q1 = MCQQuestion(
        id=uuid.uuid4(),
        job_id=job.id,
        question_text="Filter Test MCQ?",
        option_a="A",
        option_b="B",
        option_c="C",
        option_d="D",
        correct_option="C",
    )
    db_session.add(q1)
    db_session.commit()

    # Candidate 1 attempts and submits (completed, score=100%)
    app.dependency_overrides[get_current_candidate] = lambda: cand_1
    try:
        res_start = client.post(f"/api/jobs/{job.id}/assessment/start")
        assert res_start.status_code == 200
        attempt_id_1 = res_start.json()["id"]

        q_order_info = res_start.json()["questions"][0]
        q_id = q_order_info["question_id"]
        selected_key = next(opt["key"] for opt in q_order_info["options"] if opt["text"] == "C")
        client.post(
            f"/api/assessment-attempts/{attempt_id_1}/answer",
            json={"question_id": q_id, "selected_option": selected_key},
        )
        client.post(f"/api/assessment-attempts/{attempt_id_1}/submit")
    finally:
        app.dependency_overrides.clear()

    # Candidate 2 attempts (in progress)
    app.dependency_overrides[get_current_candidate] = lambda: cand_2
    try:
        res_start_2 = client.post(f"/api/jobs/{job.id}/assessment/start")
        assert res_start_2.status_code == 200
    finally:
        app.dependency_overrides.clear()

    # Candidate 3 has NOT started

    app.dependency_overrides[get_current_recruiter] = lambda: recruiter
    try:
        # 1. Default request without query parameters
        res_default = client.get(f"/api/jobs/{job.id}/assessment/results")
        assert res_default.status_code == 200
        data_default = res_default.json()
        assert data_default["page"] == 1
        assert data_default["limit"] == 20
        assert data_default["total"] == 3
        assert data_default["total_pages"] == 1
        assert len(data_default["candidates"]) == 3
        assert data_default["overview"]["total_eligible"] == 3
        assert data_default["overview"]["completed"] == 1
        assert data_default["overview"]["started"] == 2
        assert data_default["overview"]["not_started"] == 1

        # 2. Search by candidate name (case-insensitive)
        res_search_name = client.get(f"/api/jobs/{job.id}/assessment/results?search=ALICE")
        assert res_search_name.status_code == 200
        data_search_name = res_search_name.json()
        assert data_search_name["total"] == 1
        assert data_search_name["candidates"][0]["candidate_name"] == "Alice Candidate"

        # 3. Search by candidate email
        res_search_email = client.get(f"/api/jobs/{job.id}/assessment/results?search={cand_user_3.email[:8]}")
        assert res_search_email.status_code == 200
        data_search_email = res_search_email.json()
        assert data_search_email["total"] == 1
        assert data_search_email["candidates"][0]["candidate_name"] == "Charlie Screening"

        # 4. Status filter: completed
        res_status_comp = client.get(f"/api/jobs/{job.id}/assessment/results?status=completed")
        assert res_status_comp.status_code == 200
        assert res_status_comp.json()["total"] == 1
        assert res_status_comp.json()["candidates"][0]["status"] == "Completed"

        # Status filter: in_progress
        res_status_inp = client.get(f"/api/jobs/{job.id}/assessment/results?status=in_progress")
        assert res_status_inp.status_code == 200
        assert res_status_inp.json()["total"] == 1
        assert res_status_inp.json()["candidates"][0]["status"] == "In Progress"

        # Status filter: not_started
        res_status_ns = client.get(f"/api/jobs/{job.id}/assessment/results?status=not_started")
        assert res_status_ns.status_code == 200
        assert res_status_ns.json()["total"] == 1
        assert res_status_ns.json()["candidates"][0]["status"] == "Not Started"

        # Status filter: passed (score >= 60%)
        res_status_pass = client.get(f"/api/jobs/{job.id}/assessment/results?status=passed")
        assert res_status_pass.status_code == 200
        assert res_status_pass.json()["total"] == 1
        assert res_status_pass.json()["candidates"][0]["candidate_name"] == "Alice Candidate"

        # Status filter: failed (score < 60%)
        res_status_fail = client.get(f"/api/jobs/{job.id}/assessment/results?status=failed")
        assert res_status_fail.status_code == 200
        assert res_status_fail.json()["total"] == 0

        # 5. Score filters: min_score and max_score
        res_score_high = client.get(f"/api/jobs/{job.id}/assessment/results?min_score=80")
        assert res_score_high.status_code == 200
        assert res_score_high.json()["total"] == 1

        res_score_low = client.get(f"/api/jobs/{job.id}/assessment/results?max_score=50")
        assert res_score_low.status_code == 200
        assert res_score_low.json()["total"] == 0

        # 6. Combined filters
        res_multi = client.get(f"/api/jobs/{job.id}/assessment/results?search=alice&status=completed&min_score=60")
        assert res_multi.status_code == 200
        assert res_multi.json()["total"] == 1
        assert res_multi.json()["candidates"][0]["candidate_name"] == "Alice Candidate"

        # 7. Pagination
        res_p1 = client.get(f"/api/jobs/{job.id}/assessment/results?page=1&limit=2")
        assert res_p1.status_code == 200
        data_p1 = res_p1.json()
        assert data_p1["page"] == 1
        assert data_p1["limit"] == 2
        assert data_p1["total"] == 3
        assert data_p1["total_pages"] == 2
        assert len(data_p1["candidates"]) == 2

        res_p2 = client.get(f"/api/jobs/{job.id}/assessment/results?page=2&limit=2")
        assert res_p2.status_code == 200
        data_p2 = res_p2.json()
        assert data_p2["page"] == 2
        assert data_p2["total_pages"] == 2
        assert len(data_p2["candidates"]) == 1

        # 8. Empty search
        res_empty = client.get(f"/api/jobs/{job.id}/assessment/results?search=NonExistentCandXyz")
        assert res_empty.status_code == 200
        assert res_empty.json()["total"] == 0
        assert len(res_empty.json()["candidates"]) == 0

        # 9. Validation: min_score > max_score
        res_invalid_score = client.get(f"/api/jobs/{job.id}/assessment/results?min_score=90&max_score=60")
        assert res_invalid_score.status_code == 400

        # 10. Validation: invalid status
        res_invalid_status = client.get(f"/api/jobs/{job.id}/assessment/results?status=unknown_status")
        assert res_invalid_status.status_code == 400

        # 11. Attendance rate and average score percentage verification
        assert data_default["overview"]["attendance_rate"] == 66.7
        assert data_default["overview"]["average_percentage"] == 100.0

        # 12. Unauthorized recruiter
        app.dependency_overrides[get_current_recruiter] = lambda: other_recruiter
        res_unauth = client.get(f"/api/jobs/{job.id}/assessment/results")
        assert res_unauth.status_code == 403
    finally:
        app.dependency_overrides.clear()
        try:
            cand_3_apps = [a.id for a in db_session.query(Application.id).filter(Application.candidate_id == cand_3.id).all()]
            if cand_3_apps:
                db_session.query(ApplicationStatusHistory).filter(ApplicationStatusHistory.application_id.in_(cand_3_apps)).delete(synchronize_session=False)
                db_session.query(Application).filter(Application.id.in_(cand_3_apps)).delete(synchronize_session=False)
            db_session.query(Resume).filter(Resume.candidate_id == cand_3.id).delete(synchronize_session=False)
            db_session.query(Candidate).filter(Candidate.id == cand_3.id).delete(synchronize_session=False)
            db_session.query(User).filter(User.id == cand_user_3.id).delete(synchronize_session=False)
            db_session.commit()
        except Exception:
            db_session.rollback()

