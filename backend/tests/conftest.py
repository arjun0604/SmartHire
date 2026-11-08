import pytest
from backend.database import SessionLocal
from backend.models import (
    User, Company, Recruiter, Candidate, Job, Application,
    CandidateJobMatch, Resume, AssessmentAttempt, MCQQuestion, AssessmentAttemptQuestion,
    JobSkill, CandidateSkill, ApplicationStatusHistory, SavedJob
)

REAL_COMPANY_IDS = {
    'c326f213-26b4-4c9d-b02a-32bbb9806ed8',
    'cd77c303-673c-45ad-8d06-8f9745348610'
}
REAL_USER_EMAILS = {
    'abdu@gmail.com', 'sahal@gmail.com', 'sam@gmail.com',
    'neha@gmail.com', 'rahul@gmail.com', 'aravind@gmail.com', 'arjun@gmail.com'
}

def purge_test_data(db):
    real_users = db.query(User).filter(User.email.in_(REAL_USER_EMAILS)).all()
    real_user_ids = {u.id for u in real_users}
    real_candidates = db.query(Candidate).filter(Candidate.user_id.in_(real_user_ids)).all()
    real_candidate_ids = {c.id for c in real_candidates}
    real_recruiters = db.query(Recruiter).filter(Recruiter.user_id.in_(real_user_ids)).all()
    real_recruiter_ids = {r.id for r in real_recruiters}
    real_jobs = db.query(Job).filter(Job.company_id.in_(REAL_COMPANY_IDS)).all()
    real_job_ids = {j.id for j in real_jobs}

    dummy_jobs = db.query(Job.id).filter(~Job.id.in_(real_job_ids)).all()
    dummy_job_ids = [j[0] for j in dummy_jobs]

    dummy_attempts = db.query(AssessmentAttempt.id).filter(
        (AssessmentAttempt.job_id.in_(dummy_job_ids)) | (~AssessmentAttempt.candidate_id.in_(real_candidate_ids))
    ).all()
    dummy_attempt_ids = [a[0] for a in dummy_attempts]
    if dummy_attempt_ids:
        db.query(AssessmentAttemptQuestion).filter(AssessmentAttemptQuestion.attempt_id.in_(dummy_attempt_ids)).delete(synchronize_session=False)
        db.query(AssessmentAttempt).filter(AssessmentAttempt.id.in_(dummy_attempt_ids)).delete(synchronize_session=False)

    dummy_apps = db.query(Application.id).filter(
        (Application.job_id.in_(dummy_job_ids)) | (~Application.candidate_id.in_(real_candidate_ids))
    ).all()
    dummy_app_ids = [a[0] for a in dummy_apps]
    if dummy_app_ids:
        db.query(ApplicationStatusHistory).filter(ApplicationStatusHistory.application_id.in_(dummy_app_ids)).delete(synchronize_session=False)
        db.query(CandidateJobMatch).filter(CandidateJobMatch.application_id.in_(dummy_app_ids)).delete(synchronize_session=False)
        db.query(Application).filter(Application.id.in_(dummy_app_ids)).delete(synchronize_session=False)

    db.query(CandidateJobMatch).filter(~CandidateJobMatch.job_id.in_(real_job_ids)).delete(synchronize_session=False)
    db.query(CandidateJobMatch).filter(~CandidateJobMatch.candidate_id.in_(real_candidate_ids)).delete(synchronize_session=False)

    db.query(MCQQuestion).filter(~MCQQuestion.job_id.in_(real_job_ids)).delete(synchronize_session=False)
    db.query(JobSkill).filter(~JobSkill.job_id.in_(real_job_ids)).delete(synchronize_session=False)
    db.query(SavedJob).filter(~SavedJob.job_id.in_(real_job_ids)).delete(synchronize_session=False)
    db.query(SavedJob).filter(~SavedJob.candidate_id.in_(real_candidate_ids)).delete(synchronize_session=False)

    db.query(Job).filter(~Job.id.in_(real_job_ids)).delete(synchronize_session=False)

    db.query(Resume).filter(~Resume.candidate_id.in_(real_candidate_ids)).delete(synchronize_session=False)
    db.query(CandidateSkill).filter(~CandidateSkill.candidate_id.in_(real_candidate_ids)).delete(synchronize_session=False)
    db.query(Candidate).filter(~Candidate.id.in_(real_candidate_ids)).delete(synchronize_session=False)
    db.query(Recruiter).filter(~Recruiter.id.in_(real_recruiter_ids)).delete(synchronize_session=False)
    db.query(Company).filter(~Company.id.in_(REAL_COMPANY_IDS)).delete(synchronize_session=False)
    db.query(User).filter(~User.id.in_(real_user_ids)).delete(synchronize_session=False)
    db.commit()

@pytest.fixture(scope="session", autouse=True)
def clean_test_data_fixture():
    db_pre = SessionLocal()
    try:
        purge_test_data(db_pre)
    finally:
        db_pre.close()
    yield
    db_post = SessionLocal()
    try:
        purge_test_data(db_post)
    finally:
        db_post.close()
