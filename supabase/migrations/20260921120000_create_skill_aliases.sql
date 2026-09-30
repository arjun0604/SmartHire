CREATE UNIQUE INDEX IF NOT EXISTS uq_skills_lower_name ON skills (LOWER(TRIM(name)));

CREATE TABLE IF NOT EXISTS skill_aliases (
    id SERIAL PRIMARY KEY,
    skill_id INT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    alias VARCHAR(100) NOT NULL,
    normalized_alias VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_skill_aliases_normalized UNIQUE (normalized_alias)
);

CREATE INDEX IF NOT EXISTS idx_skill_aliases_normalized ON skill_aliases(normalized_alias);
CREATE INDEX IF NOT EXISTS idx_skill_aliases_skill_id ON skill_aliases(skill_id);

INSERT INTO skill_aliases (skill_id, alias, normalized_alias)
SELECT s.id, a.alias, a.normalized_alias
FROM (
    VALUES
        ('React', 'React.js', 'react.js'),
        ('React', 'ReactJS', 'reactjs'),
        ('React', 'React JS', 'react js'),
        ('PostgreSQL', 'postgres', 'postgres'),
        ('PostgreSQL', 'postgresql', 'postgresql'),
        ('Python', 'Python3', 'python3')
) AS a(skill_name, alias, normalized_alias)
JOIN skills s ON LOWER(TRIM(s.name)) = LOWER(TRIM(a.skill_name))
ON CONFLICT (normalized_alias) DO NOTHING;
