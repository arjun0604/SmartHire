# SmartHire

SmartHire is an automated recruitment and hiring platform designed to streamline job discovery, candidate evaluation, screening assessments, and application workflows for both candidates and recruiters.

---

## Overview

SmartHire provides dedicated role-based experiences tailored to the modern hiring lifecycle:

- **Candidates**: Discover open roles, filter opportunities by department and skills, review job specifications with automated candidate-job match scoring, submit structured applications, and complete online screening assessments.
- **Recruiters**: Manage company job postings, configure matching criteria and weights, curate MCQ question banks, manage assessment lifecycles, track candidate applications across pipeline stages, and review candidate assessment results.

---

## Key Features

### Authentication & Role-Based Workflows
- Auth0 authentication supporting distinct candidate and recruiter roles.
- Role-specific onboarding workflows for candidate profile setup and recruiter company workspace creation.
- Route protection, JWT validation, and persistent session management.

### Job Management (Recruiter)
- Create and edit job postings with comprehensive metadata: title, department, employment type, location, work mode, experience level, education, salary range, deadline, required skills, and preferred skills.
- Configurable candidate-job matching weights for required skills, preferred skills, experience, education, work mode, and employment status.
- Job status lifecycle management (`Active`, `Draft`, `Closed`).

### Job Discovery & Application Submission (Candidate)
- Responsive job listings grid with search, department filtering, and work mode filters.
- Detailed job specification pages with role requirements and automated match score indicators.
- Multi-section application form covering contact details, professional background, conditional current employment tracking, resume attachment, application questions, and work eligibility.
- Automated application match evaluation with section-level score breakdowns.

### Screening Assessments & Question Bank
- Recruiter assessment configuration for MCQ screening: question duration, question count selection, and question bank curation.
- Question management supporting single MCQ creation, editing, deletion, and bulk Excel file import.
- Assessment lifecycle controls (`NOT_STARTED`, `CONFIGURED`, `ACTIVE`, `STARTED`, `CLOSED`) with configuration validation before activation.
- Context-aware recruiter candidate actions: provides configuration access (`Configure Assessment`) before an assessment starts and result access (`Assessment Results`) once activated.
- Timed candidate assessment taking interface with countdown timers, question navigation, automatic expiration submission, and result recording.
- Recruiter assessment results view displaying candidate scores, completion status, time taken, and score percentages across applicant stages.

### Candidate Evaluation & Pipeline Management (Recruiter)
- Centralized candidate management per job opening with filtering by pipeline status (`Screening`, `Shortlisted`, `Rejected`), match score ranges, experience, and location.
- Pipeline status transitions with structured rejection reasons.
- In-depth candidate application review modal displaying resume, contact info, answers, skill overlap, and match analysis.

### Candidate Application Tracking & Saved Jobs
- Candidate application tracking view displaying status progression across recruitment stages.
- Historical assessment attempt preservation across status transitions.
- Job bookmarking for saving open positions.

---

## Tech Stack

### Frontend
- **Framework**: React 19, TypeScript, Vite
- **State Management**: Redux Toolkit
- **Styling**: Tailwind CSS, Lucide Icons, RSuite Components
- **Routing**: React Router 7
- **Authentication**: Auth0 SPA SDK

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **ORM & Database**: SQLAlchemy, PostgreSQL (Supabase)
- **Validation**: Pydantic v2
- **Testing**: Pytest

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- Python (v3.11 or higher recommended)
- PostgreSQL database instance
- npm or yarn

### Installation & Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd smart-hire
   ```

2. Frontend Setup:
   ```bash
   npm install
   ```

   Create a `.env` file in the project root:
   ```env
   VITE_AUTH0_DOMAIN=your-auth0-domain
   VITE_AUTH0_CLIENT_ID=your-auth0-client-id
   VITE_AUTH0_AUDIENCE=your-auth0-audience
   VITE_API_URL=http://localhost:8000/api
   ```

3. Backend Setup:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

   Create a `backend/.env` file:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/smarthire
   AUTH0_DOMAIN=your-auth0-domain
   AUTH0_API_AUDIENCE=your-auth0-audience
   AUTH0_ISSUER=https://your-auth0-domain/
   AUTH0_ALGORITHMS=RS256
   ```

4. Run the Development Servers:

   Start the backend:
   ```bash
   # From the backend directory with venv activated
   uvicorn main:app --reload --port 8000
   ```

   Start the frontend:
   ```bash
   # From the project root
   npm run dev
   ```

5. Build for Production:
   ```bash
   npm run build
   ```

---

## Project Structure

```
smart-hire/
├── backend/
│   ├── routers/           # FastAPI API route controllers
│   ├── services/          # Business logic and matching engine
│   ├── tests/             # Backend test suites
│   ├── auth.py            # JWT token validation and Auth0 integration
│   ├── database.py        # Database connection and session management
│   ├── main.py            # FastAPI application entrypoint
│   ├── models.py          # SQLAlchemy database models
│   ├── schemas.py         # Pydantic schemas and serialization
│   └── requirements.txt   # Python dependencies
├── public/                # Static public assets
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── candidate/     # Candidate dashboard, assessments, applications
│   │   ├── recruiter/     # Recruiter dashboard, assessments, questions
│   │   ├── common/        # Shared modals, cards, inputs, match review
│   │   └── ui/            # Base UI primitives
│   ├── context/           # User context and session state
│   ├── pages/             # Page views and route targets
│   ├── store/             # Redux store and slices (jobs, applications)
│   └── utils/             # API client, formatters, validation
├── supabase/
│   └── migrations/        # Database schema migrations
├── index.html             # HTML entry point
├── package.json           # Frontend dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── vite.config.js         # Vite configuration
```
