CREATE UNIQUE INDEX IF NOT EXISTS uq_candidates_phone ON candidates (phone) WHERE phone IS NOT NULL;
