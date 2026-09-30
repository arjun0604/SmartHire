ALTER TABLE resumes ADD COLUMN IF NOT EXISTS is_baseline BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_resumes_is_baseline ON resumes(is_baseline);

CREATE TABLE IF NOT EXISTS candidate_job_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE RESTRICT,
    ats_score NUMERIC(5, 2),
    ai_score NUMERIC(5, 2),
    overall_score NUMERIC(5, 2),
    match_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_candidate_job_resume_match UNIQUE (candidate_id, job_id, resume_id)
);

CREATE INDEX IF NOT EXISTS idx_candidate_job_matches_candidate ON candidate_job_matches(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_job_matches_job ON candidate_job_matches(job_id);
CREATE INDEX IF NOT EXISTS idx_candidate_job_matches_resume ON candidate_job_matches(resume_id);

INSERT INTO resumes (id, candidate_id, file_url, file_name, parsed_details, uploaded_at, is_baseline)
SELECT
    gen_random_uuid(),
    c.id,
    '/api/storage/resumes/' || c.id || '/baseline_placeholder.pdf',
    'Baseline_Placeholder.pdf',
    '{"is_baseline": true, "is_seeded": true, "parsing_status": "seeded_placeholder", "matchable": false, "raw_text": ""}'::jsonb,
    NOW(),
    TRUE
FROM candidates c
WHERE EXISTS (SELECT 1 FROM applications a WHERE a.candidate_id = c.id AND a.resume_id IS NULL)
  AND NOT EXISTS (SELECT 1 FROM resumes r WHERE r.candidate_id = c.id);

UPDATE applications a
SET resume_id = (
    SELECT r.id FROM resumes r
    WHERE r.candidate_id = a.candidate_id
    ORDER BY r.uploaded_at ASC
    LIMIT 1
)
WHERE a.resume_id IS NULL;

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_resume_id_fkey;
ALTER TABLE applications ADD CONSTRAINT applications_resume_id_fkey FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE RESTRICT;
ALTER TABLE applications ALTER COLUMN resume_id SET NOT NULL;
