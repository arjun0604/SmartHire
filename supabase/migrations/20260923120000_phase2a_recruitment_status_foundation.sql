ALTER TABLE applications ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE applications ADD COLUMN IF NOT EXISTS status_changed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

UPDATE applications a
SET status_changed_at = a.applied_at
WHERE a.status_changed_at IS NULL;

UPDATE applications a
SET status_changed_by = c.user_id
FROM candidates c
WHERE c.id = a.candidate_id AND a.status_changed_by IS NULL;

ALTER TABLE applications ALTER COLUMN status_changed_at SET NOT NULL;

CREATE TABLE IF NOT EXISTS application_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    from_status VARCHAR(30) CHECK (from_status IS NULL OR from_status IN ('Applied', 'Screening', 'Shortlisted', 'Rejected')),
    to_status VARCHAR(30) NOT NULL CHECK (to_status IN ('Applied', 'Screening', 'Shortlisted', 'Rejected')),
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_application_status_history_application_id ON application_status_history(application_id);
CREATE INDEX IF NOT EXISTS idx_application_status_history_changed_at ON application_status_history(changed_at);

CREATE OR REPLACE FUNCTION validate_application_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.status IS NULL THEN
            NEW.status := 'Applied';
        END IF;
        IF NEW.status <> 'Applied' THEN
            RAISE EXCEPTION 'New applications must start with status Applied, got %', NEW.status;
        END IF;
        IF NEW.status_changed_at IS NULL THEN
            NEW.status_changed_at := NOW();
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            IF NOT (
                (OLD.status = 'Applied' AND NEW.status IN ('Screening', 'Rejected')) OR
                (OLD.status = 'Screening' AND NEW.status IN ('Applied', 'Shortlisted', 'Rejected')) OR
                (OLD.status = 'Shortlisted' AND NEW.status IN ('Screening', 'Rejected'))
            ) THEN
                RAISE EXCEPTION 'Invalid application status transition from % to %', OLD.status, NEW.status;
            END IF;
            IF NEW.status_changed_at IS NOT DISTINCT FROM OLD.status_changed_at THEN
                NEW.status_changed_at := NOW();
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_application_status ON applications;
CREATE TRIGGER trg_validate_application_status
BEFORE INSERT OR UPDATE ON applications
FOR EACH ROW
EXECUTE FUNCTION validate_application_status_transition();

INSERT INTO application_status_history (id, application_id, from_status, to_status, changed_by, changed_at, reason)
SELECT gen_random_uuid(), a.id, NULL, a.status, c.user_id, a.applied_at, NULL
FROM applications a
JOIN candidates c ON a.candidate_id = c.id
WHERE NOT EXISTS (
    SELECT 1 FROM application_status_history ash WHERE ash.application_id = a.id
);
