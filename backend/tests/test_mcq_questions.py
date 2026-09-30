import uuid
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.main import app
from backend.database import get_db, SessionLocal
from backend.models import (
    Application,
    AssessmentAttempt,
    AssessmentAttemptQuestion,
    Candidate,
    CandidateJobMatch,
    Company,
    Job,
    MCQQuestion,
    Recruiter,
    Resume,
    User,
)
from backend.auth import get_current_candidate, get_current_recruiter, get_current_user

client = TestClient(app)


@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    yield db
    db.close()


@pytest.fixture(scope="module")
def test_setup(db_session: Session):
    company_a = Company(
        id=uuid.uuid4(),
        name=f"Test Assessment Company A {uuid.uuid4().hex[:6]}",
        industry="Technology",
    )
    company_b = Company(
        id=uuid.uuid4(),
        name=f"Test Assessment Company B {uuid.uuid4().hex[:6]}",
        industry="Finance",
    )
    db_session.add_all([company_a, company_b])
    db_session.flush()

    user_a = User(
        id=uuid.uuid4(),
        auth0_id=f"auth0|recruiter_a_{uuid.uuid4().hex[:8]}",
        email=f"recruiter_a_{uuid.uuid4().hex[:6]}@example.com",
        name="Recruiter A",
        role="recruiter",
    )
    user_b = User(
        id=uuid.uuid4(),
        auth0_id=f"auth0|recruiter_b_{uuid.uuid4().hex[:8]}",
        email=f"recruiter_b_{uuid.uuid4().hex[:6]}@example.com",
        name="Recruiter B",
        role="recruiter",
    )
    db_session.add_all([user_a, user_b])
    db_session.flush()

    recruiter_a = Recruiter(
        id=uuid.uuid4(),
        user_id=user_a.id,
        company_id=company_a.id,
    )
    recruiter_b = Recruiter(
        id=uuid.uuid4(),
        user_id=user_b.id,
        company_id=company_b.id,
    )
    db_session.add_all([recruiter_a, recruiter_b])
    db_session.flush()

    job_a = Job(
        id=uuid.uuid4(),
        company_id=company_a.id,
        created_by=recruiter_a.id,
        title="Backend Software Engineer",
        department="Engineering",
        work_mode="Remote",
        employment_type="Full-time",
        location="Remote",
        experience_level="Mid-Level",
        education_level="Bachelor's Degree",
        description="Test Job Description for MCQ assessment bank",
        responsibilities=["Build backend APIs"],
        qualifications=["Python proficiency"],
        preferred_qualifications=["FastAPI experience"],
        status="Active",
        require_assessment=True,
    )
    db_session.add(job_a)
    db_session.commit()

    yield {
        "company_a": company_a,
        "company_b": company_b,
        "user_a": user_a,
        "user_b": user_b,
        "recruiter_a": recruiter_a,
        "recruiter_b": recruiter_b,
        "job_a": job_a,
    }

    try:
        db_session.query(MCQQuestion).filter(
            MCQQuestion.job_id.in_(
                db_session.query(Job.id).filter(Job.company_id.in_([company_a.id, company_b.id]))
            )
        ).delete(synchronize_session=False)
        db_session.query(Job).filter(Job.company_id.in_([company_a.id, company_b.id])).delete(synchronize_session=False)
        db_session.query(Recruiter).filter(Recruiter.id.in_([recruiter_a.id, recruiter_b.id])).delete(synchronize_session=False)
        db_session.query(User).filter(User.id.in_([user_a.id, user_b.id])).delete(synchronize_session=False)
        db_session.query(Company).filter(Company.id.in_([company_a.id, company_b.id])).delete(synchronize_session=False)
        db_session.commit()
    except Exception:
        db_session.rollback()


def test_create_mcq_question_for_job(test_setup):
    recruiter_a = test_setup["recruiter_a"]
    job_a = test_setup["job_a"]

    app.dependency_overrides[get_current_recruiter] = lambda: recruiter_a

    payload = {
        "question_text": "What is the primary function of an index in a relational database?",
        "option_a": "To encrypt sensitive table data",
        "option_b": "To speed up data retrieval operations",
        "option_c": "To enforce foreign key constraints exclusively",
        "option_d": "To compress storage disk space",
        "correct_option": "B",
    }

    response = client.post(f"/api/jobs/{job_a.id}/questions", json=payload)
    assert response.status_code == 201
    data = response.json()

    assert data["job_id"] == str(job_a.id)
    assert data["question_text"] == payload["question_text"]
    assert data["option_a"] == payload["option_a"]
    assert data["option_b"] == payload["option_b"]
    assert data["option_c"] == payload["option_c"]
    assert data["option_d"] == payload["option_d"]
    assert data["correct_option"] == "B"
    assert data["marks"] == 1
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data

    app.dependency_overrides.clear()


def test_create_mcq_question_with_custom_marks(test_setup):
    recruiter_a = test_setup["recruiter_a"]
    job_a = test_setup["job_a"]

    app.dependency_overrides[get_current_recruiter] = lambda: recruiter_a

    payload = {
        "question_text": "Which of the following is true regarding ACID transactions?",
        "option_a": "Atomicity guarantees all operations succeed or none are applied",
        "option_b": "Consistency means data is always stored in memory",
        "option_c": "Isolation requires single-threaded database execution",
        "option_d": "Durability prevents table schema alterations",
        "correct_option": "A",
        "marks": 5,
    }

    response = client.post(f"/api/jobs/{job_a.id}/questions", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["marks"] == 5
    assert data["correct_option"] == "A"

    app.dependency_overrides.clear()


def test_get_all_mcq_questions_for_job(test_setup):
    recruiter_a = test_setup["recruiter_a"]
    job_a = test_setup["job_a"]

    app.dependency_overrides[get_current_recruiter] = lambda: recruiter_a

    response = client.get(f"/api/jobs/{job_a.id}/questions")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 2
    for item in data:
        assert item["job_id"] == str(job_a.id)

    app.dependency_overrides.clear()


def test_get_one_mcq_question(test_setup):
    recruiter_a = test_setup["recruiter_a"]
    job_a = test_setup["job_a"]

    app.dependency_overrides[get_current_recruiter] = lambda: recruiter_a

    list_resp = client.get(f"/api/jobs/{job_a.id}/questions")
    question_id = list_resp.json()[0]["id"]

    resp = client.get(f"/api/questions/{question_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == question_id

    nested_resp = client.get(f"/api/jobs/{job_a.id}/questions/{question_id}")
    assert nested_resp.status_code == 200
    assert nested_resp.json()["id"] == question_id

    app.dependency_overrides.clear()


def test_update_mcq_question(test_setup):
    recruiter_a = test_setup["recruiter_a"]
    job_a = test_setup["job_a"]

    app.dependency_overrides[get_current_recruiter] = lambda: recruiter_a

    list_resp = client.get(f"/api/jobs/{job_a.id}/questions")
    question_id = list_resp.json()[0]["id"]

    update_payload = {
        "marks": 3,
        "correct_option": "C",
        "option_c": "Updated Option C content",
    }

    resp = client.put(f"/api/questions/{question_id}", json=update_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["marks"] == 3
    assert data["correct_option"] == "C"
    assert data["option_c"] == "Updated Option C content"

    app.dependency_overrides.clear()


def test_delete_mcq_question(test_setup):
    recruiter_a = test_setup["recruiter_a"]
    job_a = test_setup["job_a"]

    app.dependency_overrides[get_current_recruiter] = lambda: recruiter_a

    create_resp = client.post(
        f"/api/jobs/{job_a.id}/questions",
        json={
            "question_text": "Temporary question for deletion test",
            "option_a": "Option A",
            "option_b": "Option B",
            "option_c": "Option C",
            "option_d": "Option D",
            "correct_option": "D",
        },
    )
    temp_id = create_resp.json()["id"]

    del_resp = client.delete(f"/api/questions/{temp_id}")
    assert del_resp.status_code == 204

    get_resp = client.get(f"/api/questions/{temp_id}")
    assert get_resp.status_code == 404

    app.dependency_overrides.clear()


def test_validation_missing_fields_and_invalid_data(test_setup):
    recruiter_a = test_setup["recruiter_a"]
    job_a = test_setup["job_a"]

    app.dependency_overrides[get_current_recruiter] = lambda: recruiter_a

    resp = client.post(
        f"/api/jobs/{job_a.id}/questions",
        json={
            "question_text": "",
            "option_a": "A",
            "option_b": "B",
            "option_c": "C",
            "option_d": "D",
            "correct_option": "A",
        },
    )
    assert resp.status_code == 422

    resp = client.post(
        f"/api/jobs/{job_a.id}/questions",
        json={
            "question_text": "Valid question text?",
            "option_a": "A",
            "option_b": "",
            "option_c": "C",
            "option_d": "D",
            "correct_option": "A",
        },
    )
    assert resp.status_code == 422

    resp = client.post(
        f"/api/jobs/{job_a.id}/questions",
        json={
            "question_text": "Valid question text?",
            "option_a": "A",
            "option_b": "B",
            "option_c": "C",
            "option_d": "D",
            "correct_option": "E",
        },
    )
    assert resp.status_code == 422

    resp = client.post(
        f"/api/jobs/{job_a.id}/questions",
        json={
            "question_text": "Valid question text?",
            "option_a": "A",
            "option_b": "B",
            "option_c": "C",
            "option_d": "D",
            "correct_option": "A",
            "marks": 0,
        },
    )
    assert resp.status_code == 422

    resp_neg = client.post(
        f"/api/jobs/{job_a.id}/questions",
        json={
            "question_text": "Valid question text?",
            "option_a": "A",
            "option_b": "B",
            "option_c": "C",
            "option_d": "D",
            "correct_option": "A",
            "marks": -2,
        },
    )
    assert resp_neg.status_code == 422

    fake_job_id = uuid.uuid4()
    resp_notfound = client.post(
        f"/api/jobs/{fake_job_id}/questions",
        json={
            "question_text": "Valid question text?",
            "option_a": "A",
            "option_b": "B",
            "option_c": "C",
            "option_d": "D",
            "correct_option": "A",
        },
    )
    assert resp_notfound.status_code == 404

    app.dependency_overrides.clear()


def test_recruiter_authorization_across_companies(test_setup):
    recruiter_b = test_setup["recruiter_b"]
    job_a = test_setup["job_a"]

    app.dependency_overrides[get_current_recruiter] = lambda: recruiter_b

    create_resp = client.post(
        f"/api/jobs/{job_a.id}/questions",
        json={
            "question_text": "Unauthorized question attempt?",
            "option_a": "A",
            "option_b": "B",
            "option_c": "C",
            "option_d": "D",
            "correct_option": "A",
        },
    )
    assert create_resp.status_code == 403
    assert "Access denied" in create_resp.json()["detail"]

    get_resp = client.get(f"/api/jobs/{job_a.id}/questions")
    assert get_resp.status_code == 403
    app.dependency_overrides.clear()


def test_create_mcq_questions_bulk(test_setup):
    recruiter_a = test_setup["recruiter_a"]
    job_a = test_setup["job_a"]

    app.dependency_overrides[get_current_recruiter] = lambda: recruiter_a

    bulk_payload = [
        {
            "question_text": "What does CSS stand for?",
            "option_a": "Cascading Style Sheets",
            "option_b": "Computer Style Sheets",
            "option_c": "Creative Style System",
            "option_d": "Colorful Style Sheets",
            "correct_option": "A",
            "marks": 1,
        },
        {
            "question_text": "Which HTML tag is used for images?",
            "option_a": "<image>",
            "option_b": "<img>",
            "option_c": "<pic>",
            "option_d": "<photo>",
            "correct_option": "B",
            "marks": 2,
        },
    ]

    resp = client.post(f"/api/jobs/{job_a.id}/questions/bulk", json=bulk_payload)
    assert resp.status_code == 201
    data = resp.json()
    assert len(data) == 2
    assert data[0]["question_text"] == "What does CSS stand for?"
    assert data[0]["correct_option"] == "A"
    assert data[0]["marks"] == 1
    assert data[1]["question_text"] == "Which HTML tag is used for images?"
    assert data[1]["correct_option"] == "B"
    assert data[1]["marks"] == 2

    empty_resp = client.post(f"/api/jobs/{job_a.id}/questions/bulk", json=[])
    assert empty_resp.status_code == 400

    recruiter_b = test_setup["recruiter_b"]
    app.dependency_overrides[get_current_recruiter] = lambda: recruiter_b
    unauth_resp = client.post(f"/api/jobs/{job_a.id}/questions/bulk", json=bulk_payload)
    assert unauth_resp.status_code == 403

    app.dependency_overrides.clear()


def test_assessment_lifecycle_statuses_and_endpoints(db_session: Session, test_setup: dict):
    recruiter_a = test_setup["recruiter_a"]
    company_a = test_setup["company_a"]
    recruiter_b = test_setup["recruiter_b"]

    job_empty = Job(
        id=uuid.uuid4(),
        company_id=company_a.id,
        created_by=recruiter_a.id,
        title="Empty Assessment Role",
        department="Engineering",
        work_mode="Remote",
        employment_type="Full-time",
        location="Bengaluru",
        experience_level="Mid",
        description="Test role for assessment lifecycle testing",
        status="Active",
    )
    db_session.add(job_empty)
    db_session.commit()

    app.dependency_overrides[get_current_recruiter] = lambda: recruiter_a

    st_resp = client.get(f"/api/jobs/{job_empty.id}/assessment/status")
    assert st_resp.status_code == 200
    st_data = st_resp.json()
    assert st_data["status"] == "NOT_STARTED"
    assert st_data["question_count"] == 0
    assert st_data["can_activate"] is False
    assert st_data["can_close"] is False

    act_fail = client.post(f"/api/jobs/{job_empty.id}/assessment/activate")
    assert act_fail.status_code == 400

    close_fail = client.post(f"/api/jobs/{job_empty.id}/assessment/close")
    assert close_fail.status_code == 400

    q_resp = client.post(
        f"/api/jobs/{job_empty.id}/questions",
        json={
            "job_id": str(job_empty.id),
            "question_text": "What is Python?",
            "option_a": "Language",
            "option_b": "Snake",
            "option_c": "Coffee",
            "option_d": "Car",
            "correct_option": "A",
            "marks": 1,
        },
    )
    assert q_resp.status_code == 201

    st_resp2 = client.get(f"/api/jobs/{job_empty.id}/assessment/status")
    assert st_resp2.status_code == 200
    st_data2 = st_resp2.json()
    assert st_data2["status"] == "CONFIGURED"
    assert st_data2["question_count"] == 1
    assert st_data2["can_activate"] is True
    assert st_data2["can_close"] is False

    app.dependency_overrides[get_current_recruiter] = lambda: recruiter_b
    unauth_act = client.post(f"/api/jobs/{job_empty.id}/assessment/activate")
    assert unauth_act.status_code == 403

    app.dependency_overrides[get_current_recruiter] = lambda: recruiter_a
    act_resp = client.post(f"/api/jobs/{job_empty.id}/assessment/activate")
    assert act_resp.status_code == 200
    act_data = act_resp.json()
    assert act_data["status"] == "ACTIVE"
    assert act_data["can_activate"] is False
    assert act_data["can_close"] is True

    app.dependency_overrides[get_current_recruiter] = lambda: recruiter_b
    unauth_close = client.post(f"/api/jobs/{job_empty.id}/assessment/close")
    assert unauth_close.status_code == 403

    app.dependency_overrides[get_current_recruiter] = lambda: recruiter_a
    close_resp = client.post(f"/api/jobs/{job_empty.id}/assessment/close")
    assert close_resp.status_code == 200
    close_data = close_resp.json()
    assert close_data["status"] == "CLOSED"
    assert close_data["can_activate"] is True
    assert close_data["can_close"] is False

    reopen_resp = client.post(f"/api/jobs/{job_empty.id}/assessment/activate")
    assert reopen_resp.status_code == 200
    assert reopen_resp.json()["status"] == "ACTIVE"

    app.dependency_overrides.clear()

    try:
        db_session.query(MCQQuestion).filter(MCQQuestion.job_id == job_empty.id).delete(synchronize_session=False)
        db_session.query(Job).filter(Job.id == job_empty.id).delete(synchronize_session=False)
        db_session.commit()
    except Exception:
        db_session.rollback()


def test_assessment_configuration_validation_and_candidate_flow(db_session: Session, test_setup: dict):
    recruiter_a = test_setup["recruiter_a"]
    company_a = test_setup["company_a"]

    job = Job(
        id=uuid.uuid4(),
        company_id=company_a.id,
        created_by=recruiter_a.id,
        title="Config Validation Test Job",
        department="Product",
        work_mode="Remote",
        employment_type="Full-time",
        location="Remote",
        experience_level="Senior",
        description="Job for testing configuration validation and candidate sampling",
        status="Active",
        assessment_duration_minutes=30,
        assessment_question_count=None,
    )
    db_session.add(job)
    db_session.commit()

    candidate_user = User(
        id=uuid.uuid4(),
        auth0_id=f"auth0|cand_{uuid.uuid4().hex[:8]}",
        email=f"candidate-{uuid.uuid4().hex[:6]}@example.com",
        name="Candidate One",
        role="candidate",
    )
    db_session.add(candidate_user)
    db_session.flush()

    candidate = Candidate(
        id=uuid.uuid4(),
        user_id=candidate_user.id,
        name="Candidate One",
    )
    db_session.add(candidate)
    db_session.flush()

    resume = Resume(
        id=uuid.uuid4(),
        candidate_id=candidate.id,
        file_url="https://storage.example.com/resumes/cand1.pdf",
        file_name="cand1_resume.pdf",
        parsed_details={},
    )
    db_session.add(resume)
    db_session.flush()

    application = Application(
        id=uuid.uuid4(),
        job_id=job.id,
        candidate_id=candidate.id,
        resume_id=resume.id,
        status="Applied",
    )
    db_session.add(application)
    db_session.commit()

    application.status = "Screening"
    db_session.commit()

    app.dependency_overrides[get_current_recruiter] = lambda: recruiter_a

    act_no_q = client.post(f"/api/jobs/{job.id}/assessment/activate")
    assert act_no_q.status_code == 400
    assert "no MCQ questions configured" in act_no_q.json()["detail"]

    questions_payload = [
        {
            "question_text": f"Question {i} text?",
            "option_a": f"Option A {i}",
            "option_b": f"Option B {i}",
            "option_c": f"Option C {i}",
            "option_d": f"Option D {i}",
            "correct_option": "A",
            "marks": 1,
        }
        for i in range(1, 6)
    ]
    bulk_resp = client.post(f"/api/jobs/{job.id}/questions/bulk", json=questions_payload)
    assert bulk_resp.status_code == 201

    invalid_dur = client.patch(
        f"/api/jobs/{job.id}/assessment/settings",
        json={"duration_minutes": 0},
    )
    assert invalid_dur.status_code == 400
    assert "Duration must be greater than 0" in invalid_dur.json()["detail"]

    invalid_count_zero = client.patch(
        f"/api/jobs/{job.id}/assessment/settings",
        json={"question_count": 0},
    )
    assert invalid_count_zero.status_code == 400
    assert "Number of questions must be greater than 0" in invalid_count_zero.json()["detail"]

    invalid_count_excess = client.patch(
        f"/api/jobs/{job.id}/assessment/settings",
        json={"question_count": 10},
    )
    assert invalid_count_excess.status_code == 400
    assert "cannot exceed available questions" in invalid_count_excess.json()["detail"]

    valid_config = client.patch(
        f"/api/jobs/{job.id}/assessment/settings",
        json={"duration_minutes": 25, "question_count": 3},
    )
    assert valid_config.status_code == 200
    config_data = valid_config.json()
    assert config_data["duration_minutes"] == 25
    assert config_data["configured_question_count"] == 3
    assert config_data["question_count"] == 5
    assert config_data["can_activate"] is True

    app.dependency_overrides.clear()
    app.dependency_overrides[get_current_candidate] = lambda: candidate

    cand_start_before_active = client.post(f"/api/jobs/{job.id}/assessment/start")
    assert cand_start_before_active.status_code == 400
    assert "not active" in cand_start_before_active.json()["detail"].lower()

    app.dependency_overrides.clear()
    app.dependency_overrides[get_current_recruiter] = lambda: recruiter_a

    act_resp = client.post(f"/api/jobs/{job.id}/assessment/activate")
    assert act_resp.status_code == 200
    assert act_resp.json()["status"] == "ACTIVE"

    app.dependency_overrides.clear()
    app.dependency_overrides[get_current_candidate] = lambda: candidate

    start_resp = client.post(f"/api/jobs/{job.id}/assessment/start")
    assert start_resp.status_code == 200
    attempt_data = start_resp.json()
    assert attempt_data["status"] == "IN_PROGRESS"
    assert attempt_data["total_questions"] == 3
    assert len(attempt_data["questions"]) == 3
    assert attempt_data["duration_minutes"] == 25
    assert "expires_at" in attempt_data and attempt_data["expires_at"] is not None

    for q in attempt_data["questions"]:
        assert "correct_option" not in q
        assert "correct_answer" not in q
        assert len(q["options"]) == 4

    attempt_id = attempt_data["id"]
    first_q_order = [q["question_id"] for q in attempt_data["questions"]]
    first_opt_order = [opt["text"] for opt in attempt_data["questions"][0]["options"]]

    refresh_resp = client.post(f"/api/jobs/{job.id}/assessment/start")
    assert refresh_resp.status_code == 200
    refreshed_data = refresh_resp.json()
    assert refreshed_data["id"] == attempt_id
    assert [q["question_id"] for q in refreshed_data["questions"]] == first_q_order
    assert [opt["text"] for opt in refreshed_data["questions"][0]["options"]] == first_opt_order

    for q in refreshed_data["questions"]:
        disp_key = q["options"][0]["key"]
        ans_resp = client.post(
            f"/api/assessment-attempts/{attempt_id}/answer",
            json={"question_id": q["question_id"], "selected_option": disp_key},
        )
        assert ans_resp.status_code == 200

    submit_resp = client.post(f"/api/assessment-attempts/{attempt_id}/submit")
    assert submit_resp.status_code == 200
    submit_data = submit_resp.json()
    assert submit_data["status"] == "SUBMITTED"
    assert submit_data["total_questions"] == 3
    assert submit_data["score"] is not None

    app.dependency_overrides.clear()

    try:
        att_ids = [r[0] for r in db_session.query(AssessmentAttempt.id).filter(AssessmentAttempt.job_id == job.id).all()]
        if att_ids:
            db_session.query(AssessmentAttemptQuestion).filter(AssessmentAttemptQuestion.attempt_id.in_(att_ids)).delete(synchronize_session=False)
            db_session.query(AssessmentAttempt).filter(AssessmentAttempt.id.in_(att_ids)).delete(synchronize_session=False)
        db_session.query(MCQQuestion).filter(MCQQuestion.job_id == job.id).delete(synchronize_session=False)
        db_session.query(CandidateJobMatch).filter(CandidateJobMatch.job_id == job.id).delete(synchronize_session=False)
        db_session.query(Application).filter(Application.job_id == job.id).delete(synchronize_session=False)
        db_session.query(Job).filter(Job.id == job.id).delete(synchronize_session=False)
        db_session.query(Resume).filter(Resume.candidate_id == candidate.id).delete(synchronize_session=False)
        db_session.query(Candidate).filter(Candidate.id == candidate.id).delete(synchronize_session=False)
        db_session.query(User).filter(User.id == candidate_user.id).delete(synchronize_session=False)
        db_session.commit()
    except Exception:
        db_session.rollback()



