CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs (company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_at ON jobs (posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications (job_id);
CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON applications (applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_resumes_candidate_id ON resumes (candidate_id);
CREATE INDEX IF NOT EXISTS idx_recruiters_company_id ON recruiters (company_id);
