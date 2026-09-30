ALTER TABLE jobs ADD COLUMN IF NOT EXISTS matching_weights JSONB NOT NULL DEFAULT '{"required_skills": 40, "preferred_skills": 15, "experience": 20, "education": 10, "location_work_mode": 10, "employment_status": 5}'::jsonb;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS additional_requirements TEXT;

ALTER TABLE candidate_job_matches ADD COLUMN IF NOT EXISTS match_type VARCHAR(20) NOT NULL DEFAULT 'resume';
ALTER TABLE candidate_job_matches ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES applications(id) ON DELETE CASCADE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_match_type'
    ) THEN
        ALTER TABLE candidate_job_matches ADD CONSTRAINT check_match_type CHECK (match_type IN ('resume', 'application'));
    END IF;
END $$;

ALTER TABLE candidate_job_matches DROP CONSTRAINT IF EXISTS uq_candidate_job_resume_match;

CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_candidate_job_resume_match ON candidate_job_matches (candidate_id, job_id, resume_id) WHERE match_type = 'resume';
CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_application_match ON candidate_job_matches (application_id) WHERE match_type = 'application';

CREATE INDEX IF NOT EXISTS idx_candidate_job_matches_application ON candidate_job_matches (application_id);
CREATE INDEX IF NOT EXISTS idx_candidate_job_matches_type ON candidate_job_matches (match_type);
