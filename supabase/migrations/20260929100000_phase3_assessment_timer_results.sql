ALTER TABLE jobs ADD COLUMN IF NOT EXISTS assessment_duration_minutes INTEGER NOT NULL DEFAULT 30;

ALTER TABLE assessment_attempts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NULL;
ALTER TABLE assessment_attempts ADD COLUMN IF NOT EXISTS time_taken_seconds INTEGER NULL;
ALTER TABLE assessment_attempts ADD COLUMN IF NOT EXISTS percentage NUMERIC(5, 2) NULL;

ALTER TABLE assessment_attempt_questions ADD COLUMN IF NOT EXISTS is_marked_for_review BOOLEAN NOT NULL DEFAULT FALSE;
