CREATE TABLE IF NOT EXISTS saved_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_candidate_saved_job UNIQUE (candidate_id, job_id)
);

ALTER TABLE applications
    DROP COLUMN IF EXISTS is_work_authorized,
    DROP COLUMN IF EXISTS current_notice_period,
    DROP COLUMN IF EXISTS is_work_arrangement_confirmed;
