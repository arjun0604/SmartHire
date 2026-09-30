CREATE TABLE IF NOT EXISTS assessment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ NULL,
    score INTEGER NULL,
    total_questions INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NULL,
    CONSTRAINT check_assessment_attempt_status CHECK (status IN ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED')),
    CONSTRAINT uq_attempt_application UNIQUE (application_id)
);

CREATE INDEX IF NOT EXISTS idx_assessment_attempts_job_id ON assessment_attempts(job_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_candidate_id ON assessment_attempts(candidate_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_application_id ON assessment_attempts(application_id);

CREATE TABLE IF NOT EXISTS assessment_attempt_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES mcq_questions(id) ON DELETE CASCADE,
    question_order INTEGER NOT NULL,
    option_order JSONB NOT NULL,
    selected_option VARCHAR(1) NULL,
    is_correct BOOLEAN NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_attempt_selected_option CHECK (selected_option IS NULL OR selected_option IN ('A', 'B', 'C', 'D')),
    CONSTRAINT uq_attempt_question UNIQUE (attempt_id, question_id),
    CONSTRAINT uq_attempt_question_order UNIQUE (attempt_id, question_order)
);

CREATE INDEX IF NOT EXISTS idx_attempt_questions_attempt_id ON assessment_attempt_questions(attempt_id);
