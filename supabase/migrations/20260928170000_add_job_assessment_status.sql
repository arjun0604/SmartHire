ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS assessment_status VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_job_assessment_status'
    ) THEN
        ALTER TABLE jobs
            ADD CONSTRAINT check_job_assessment_status
            CHECK (assessment_status IN ('NOT_STARTED', 'CONFIGURED', 'ACTIVE', 'STARTED', 'CLOSED'));
    END IF;
END $$;
