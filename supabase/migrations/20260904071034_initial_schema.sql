CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth0_id VARCHAR(128) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('candidate', 'recruiter'))
);

CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    logo_url TEXT
);

CREATE TABLE recruiters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT
);

CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(32),
    location VARCHAR(255)
);

CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    parsed_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    created_by UUID NOT NULL REFERENCES recruiters(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    work_mode VARCHAR(20) NOT NULL CHECK (work_mode IN ('Remote', 'Hybrid', 'On-site')),
    employment_type VARCHAR(30) NOT NULL CHECK (employment_type IN ('Full-time', 'Part-time', 'Contract', 'Internship')),
    location VARCHAR(255) NOT NULL,
    experience_level VARCHAR(50) NOT NULL,
    education_level VARCHAR(100),
    salary_min NUMERIC(12, 2),
    salary_max NUMERIC(12, 2),
    description TEXT NOT NULL,
    responsibilities JSONB NOT NULL DEFAULT '[]'::jsonb,
    qualifications JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Draft', 'Closed')),
    deadline DATE,
    posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE skills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE candidate_skills (
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    skill_id INT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    PRIMARY KEY (candidate_id, skill_id)
);

CREATE TABLE job_skills (
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    skill_id INT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (job_id, skill_id)
);

CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Applied' CHECK (status IN ('Applied', 'Screening', 'Shortlisted', 'Rejected')),
    current_job_title VARCHAR(255),
    years_experience VARCHAR(50),
    highest_education VARCHAR(100),
    why_interested TEXT,
    relevant_experience TEXT,
    is_currently_employed BOOLEAN NOT NULL DEFAULT FALSE,
    current_notice_period VARCHAR(50),
    is_work_authorized BOOLEAN NOT NULL,
    is_work_arrangement_confirmed BOOLEAN NOT NULL,
    additional_information TEXT,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_candidate_job UNIQUE (candidate_id, job_id)
);
