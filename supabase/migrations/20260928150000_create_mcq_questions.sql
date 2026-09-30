CREATE TABLE IF NOT EXISTS mcq_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_option VARCHAR(1) NOT NULL,
    marks INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_mcq_correct_option CHECK (correct_option IN ('A', 'B', 'C', 'D')),
    CONSTRAINT check_mcq_positive_marks CHECK (marks > 0)
);

CREATE INDEX IF NOT EXISTS idx_mcq_questions_job_id ON mcq_questions(job_id);
