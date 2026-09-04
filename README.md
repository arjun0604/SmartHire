# SmartHire

SmartHire is a modern recruitment and hiring platform designed to streamline the job discovery, candidate evaluation, and application workflow for both candidates and recruiters.

---

## Overview

SmartHire provides dedicated role-based experiences tailored to the hiring lifecycle:

- **Candidates**: Discover open roles, filter opportunities by department and skills, review comprehensive job specifications, and submit structured applications.
- **Recruiters**: Manage company job postings, define role requirements, track candidate applications across stages, and review applicant details.

---

## Key Features

### Authentication & Role-Based Onboarding
- Authentication integration supporting distinct candidate and recruiter roles.
- Role-specific onboarding workflows for candidate profile initialization and recruiter workspace setup.
- Route protection and persistent session management across page refreshes.

### Job Management (Recruiter)
- Job posting creation and editing with metadata controls: title, department, employment type, location, work mode, experience level, education, salary range, deadline, and required skills.
- Centralized job status tracking (`Active`, `Draft`, `Closed`).
- Recruiter job details view with recruitment status distribution across application stages.

### Job Discovery & Application (Candidate)
- Uniform 3-column responsive job grid with search and department filtering.
- Information-dense job cards featuring company branding, relative posting timestamps, metadata chips, and skill requirements.
- Unified role-aware Job Details view.
- Multi-section Application Form covering applicant contact details, professional background, resume attachment, application questions, work eligibility, and confirmation.

### Profile & Resume Management
- Candidate profile management with personal details, date of birth, and resume document handling.
- Recruiter company workspace management with company profile configurations.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **State Management**: Redux Toolkit
- **Styling**: Tailwind CSS, Lucide Icons, RSuite Components
- **Routing**: React Router 7
- **Authentication**: Auth0

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd smart-hire
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file in the project root with your Auth0 credentials:
   ```env
   VITE_AUTH0_DOMAIN=your-auth0-domain
   VITE_AUTH0_CLIENT_ID=your-auth0-client-id
   VITE_AUTH0_AUDIENCE=your-auth0-audience
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

---

## Project Structure

```
smart-hire/
├── public/                # Static public assets
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── candidate/     # Candidate dashboard, browse jobs, application modal
│   │   ├── recruiter/     # Recruiter dashboard, candidate tracking, job creation modal
│   │   ├── common/        # Shared components (JobCard, inputs, selectors)
│   │   └── ui/            # Base UI primitives (sidebar, layout components)
│   ├── context/           # User context and session state
│   ├── data/              # Centralized mock and baseline datasets
│   ├── hooks/             # Custom React hooks
│   ├── pages/             # Top-level page views and route targets
│   ├── store/             # Redux store and slices (jobsSlice)
│   └── utils/             # Authentication synchronization and utility helpers
├── index.html             # HTML entry point
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── vite.config.js         # Vite configuration
```
