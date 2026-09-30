import os
import sys
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

from backend.database import Base
from backend.models import (
    Application,
    Candidate,
    CandidateSkill,
    Company,
    Job,
    JobSkill,
    Recruiter,
    Resume,
    Skill,
    User,
)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set.")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def seed():
    session = SessionLocal()
    try:
        existing_jobs = session.query(Job).count()
        if existing_jobs > 0:
            print(f"Database already contains {existing_jobs} jobs. Re-seeding clean dataset...")
            session.query(Application).delete()
            session.query(JobSkill).delete()
            session.query(CandidateSkill).delete()
            session.query(Resume).delete()
            session.query(Job).delete()
            session.query(Recruiter).delete()
            session.query(Candidate).delete()
            session.query(Company).delete()
            session.query(User).filter(User.auth0_id.like("demo|%")).delete(synchronize_session=False)
            session.commit()

        skills_dict = {}
        all_skill_names = [
            "React", "TypeScript", "JavaScript", "Python", "FastAPI", "SQLAlchemy",
            "PostgreSQL", "Node.js", "GraphQL", "Tailwind CSS", "Next.js", "Docker",
            "Kubernetes", "AWS", "Terraform", "CI/CD", "PyTorch", "LangChain",
            "Vector Databases", "C++", "Low Latency", "Algorithms", "Cloud Security",
            "Zero Trust", "Go", "Figma", "Design Systems", "UX Research", "ROS2",
            "Computer Vision", "Linux", "Redis"
        ]

        for name in all_skill_names:
            skill = session.query(Skill).filter_by(name=name).first()
            if not skill:
                skill = Skill(name=name)
                session.add(skill)
                session.flush()
            skills_dict[name] = skill

        companies_data = [
            {
                "key": "meridian",
                "name": "Meridian Labs",
                "logo_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80",
                "industry": "Artificial Intelligence & Software",
                "company_size": "51–200 employees",
                "headquarters": "Bengaluru, India",
                "description": "Meridian Labs builds intelligent enterprise workflow automation and applied AI solutions. Our engineering teams specialize in high-throughput data processing and cutting-edge machine learning systems.",
                "founded_year": 2021,
                "website": "https://meridianlabs.example.com",
                "linkedin": "https://linkedin.com/company/meridian-labs",
                "recruiter": {
                    "auth0_id": "demo|recruiter_meridian",
                    "email": "elena.vance@meridianlabs.com",
                    "name": "Elena Vance",
                },
            },
            {
                "key": "apex",
                "name": "Apex Cloud Systems",
                "logo_url": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=128&auto=format&fit=crop&q=80",
                "industry": "Cloud Infrastructure & DevOps",
                "company_size": "201–500 employees",
                "headquarters": "Hyderabad, India",
                "description": "Apex Cloud Systems provides multi-cloud reliability engineering, automated Kubernetes scaling, and zero-trust perimeter security for modern financial and technology enterprises.",
                "founded_year": 2018,
                "website": "https://apexcloud.example.com",
                "linkedin": "https://linkedin.com/company/apex-cloud-systems",
                "recruiter": {
                    "auth0_id": "demo|recruiter_apex",
                    "email": "marcus.thorne@apexcloud.io",
                    "name": "Marcus Thorne",
                },
            },
            {
                "key": "pulse",
                "name": "Pulse Dynamics",
                "logo_url": "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=128&auto=format&fit=crop&q=80",
                "industry": "Quantitative Finance & Analytics",
                "company_size": "11–50 employees",
                "headquarters": "Mumbai, India",
                "description": "Pulse Dynamics engineers ultra-low-latency financial analytics and trading systems powered by algorithmic research and distributed high-performance computing.",
                "founded_year": 2020,
                "website": "https://pulsedynamics.example.com",
                "linkedin": "https://linkedin.com/company/pulse-dynamics",
                "recruiter": {
                    "auth0_id": "demo|recruiter_pulse",
                    "email": "sophia.lin@pulsedynamics.com",
                    "name": "Sophia Lin",
                },
            },
            {
                "key": "starlight",
                "name": "Starlight Robotics",
                "logo_url": "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=128&auto=format&fit=crop&q=80",
                "industry": "Robotics & Embedded Systems",
                "company_size": "51–200 employees",
                "headquarters": "Pune, India",
                "description": "Starlight Robotics manufactures autonomous industrial rovers and spatial vision software for smart warehouse logistics and autonomous manufacturing plants.",
                "founded_year": 2019,
                "website": "https://starlightrobotics.example.com",
                "linkedin": "https://linkedin.com/company/starlight-robotics",
                "recruiter": {
                    "auth0_id": "demo|recruiter_starlight",
                    "email": "david.kim@starlightrobotics.ai",
                    "name": "David Kim",
                },
            },
        ]

        companies = {}
        recruiters = {}

        for c_info in companies_data:
            company = Company(
                name=c_info["name"],
                logo_url=c_info["logo_url"],
                industry=c_info["industry"],
                company_size=c_info["company_size"],
                headquarters=c_info["headquarters"],
                description=c_info["description"],
                founded_year=c_info["founded_year"],
                website=c_info["website"],
                linkedin=c_info["linkedin"],
            )
            session.add(company)
            session.flush()
            companies[c_info["key"]] = company

            rec_user = User(
                auth0_id=c_info["recruiter"]["auth0_id"],
                email=c_info["recruiter"]["email"],
                name=c_info["recruiter"]["name"],
                role="recruiter",
            )
            session.add(rec_user)
            session.flush()

            recruiter = Recruiter(user_id=rec_user.id, company_id=company.id)
            session.add(recruiter)
            session.flush()
            recruiters[c_info["key"]] = recruiter

        candidates_data = [
            {
                "auth0_id": "demo|cand_alex",
                "name": "Alex Morgan",
                "email": "alex.morgan@example.com",
                "dob": date(1996, 4, 12),
                "phone": "+1 (555) 234-5678",
                "location": "San Francisco, CA",
                "skills": ["React", "TypeScript", "Tailwind CSS", "Next.js"],
            },
            {
                "auth0_id": "demo|cand_sarah",
                "name": "Sarah Williams",
                "email": "sarah.williams@example.com",
                "dob": date(1994, 8, 23),
                "phone": "+1 (555) 345-6789",
                "location": "Seattle, WA",
                "skills": ["Python", "FastAPI", "PostgreSQL", "Docker"],
            },
            {
                "auth0_id": "demo|cand_priya",
                "name": "Priya Sharma",
                "email": "priya.sharma@example.com",
                "dob": date(1998, 11, 5),
                "phone": "+1 (555) 456-7890",
                "location": "Austin, TX",
                "skills": ["Python", "PyTorch", "LangChain", "Vector Databases"],
            },
            {
                "auth0_id": "demo|cand_marcus",
                "name": "Marcus Vance",
                "email": "marcus.vance@example.com",
                "dob": date(1992, 2, 17),
                "phone": "+1 (555) 567-8901",
                "location": "New York, NY",
                "skills": ["AWS", "Kubernetes", "Terraform", "CI/CD"],
            },
        ]

        candidates = []
        for cand_info in candidates_data:
            c_user = User(
                auth0_id=cand_info["auth0_id"],
                email=cand_info["email"],
                name=cand_info["name"],
                role="candidate",
            )
            session.add(c_user)
            session.flush()

            cand = Candidate(
                user_id=c_user.id,
                name=cand_info["name"],
                dob=cand_info.get("dob"),
                phone=cand_info["phone"],
                location=cand_info["location"],
            )
            session.add(cand)
            session.flush()

            for sk_name in cand_info["skills"]:
                if sk_name in skills_dict:
                    session.add(CandidateSkill(candidate_id=cand.id, skill_id=skills_dict[sk_name].id))

            candidates.append(cand)

        now = datetime.now(timezone.utc)
        today = date.today()

        jobs_list = [
            {
                "company_key": "meridian",
                "title": "Senior React Engineer",
                "department": "Engineering",
                "work_mode": "Remote",
                "employment_type": "Full-time",
                "location": "Remote (US)",
                "experience_level": "5-8 years",
                "education_level": "Bachelor's in Computer Science or equivalent",
                "salary_min": Decimal("130000"),
                "salary_max": Decimal("175000"),
                "description": "Architect modular, accessible, and high-performance frontend interfaces for Meridian's enterprise intelligence suite. You will lead UI component architecture, state management optimization, and mentor engineers across cross-functional squads.",
                "responsibilities": [
                    "Architect and maintain scalable single-page web applications using React 19, TypeScript, and modern component primitives.",
                    "Collaborate closely with product designers to implement accessible design systems with sub-millisecond interaction latency.",
                    "Audit and optimize client-side bundle footprints, runtime rendering pipelines, and memory profiles.",
                    "Enforce strict unit, integration, and end-to-end testing standards across development teams.",
                ],
                "qualifications": [
                    "5+ years of production experience building complex React and TypeScript applications.",
                    "Demonstrated mastery of modern frontend build toolchains, bundlers, and state-management patterns.",
                    "Strong background in web accessibility (WCAG 2.1 AA) and cross-browser performance profiling.",
                ],
                "required_skills": ["React", "TypeScript", "Tailwind CSS", "Next.js"],
                "preferred_skills": ["GraphQL", "Docker"],
                "status": "Active",
                "deadline": today + timedelta(days=30),
                "posted_at": now - timedelta(days=2),
            },
            {
                "company_key": "meridian",
                "title": "Lead Backend Architect",
                "department": "Platform Engineering",
                "work_mode": "Hybrid",
                "employment_type": "Full-time",
                "location": "San Francisco, CA",
                "experience_level": "8+ years",
                "education_level": "Bachelor's or Master's in Computer Science",
                "salary_min": Decimal("160000"),
                "salary_max": Decimal("215000"),
                "description": "Lead the architectural roadmap for core backend services, data ingestion pipelines, and distributed APIs handling high-throughput event streams.",
                "responsibilities": [
                    "Design, implement, and maintain resilient microservices in Python (FastAPI) and PostgreSQL.",
                    "Optimize distributed caching layers, connection pools, and database indexing strategies.",
                    "Establish architectural RFC standards, disaster recovery strategies, and SLA monitoring benchmarks.",
                    "Partner with infrastructure and security teams to maintain zero-trust access controls.",
                ],
                "qualifications": [
                    "8+ years architecting and operating distributed backend systems at scale.",
                    "Deep mastery of PostgreSQL query tuning, concurrency control, and schema migration strategies.",
                    "Hands-on expertise with asynchronous programming, message brokers, and containerization.",
                ],
                "required_skills": ["Python", "FastAPI", "PostgreSQL", "Redis"],
                "preferred_skills": ["Docker", "Kubernetes", "AWS"],
                "status": "Active",
                "deadline": today + timedelta(days=45),
                "posted_at": now - timedelta(days=3),
            },
            {
                "company_key": "meridian",
                "title": "Full-Stack AI Engineer",
                "department": "AI Research & Development",
                "work_mode": "Remote",
                "employment_type": "Full-time",
                "location": "Remote (Global)",
                "experience_level": "4-7 years",
                "education_level": "Master's or equivalent experience in Computer Science / AI",
                "salary_min": Decimal("145000"),
                "salary_max": Decimal("195000"),
                "description": "Bridge the gap between state-of-the-art LLM capabilities and customer-facing workflow automation tools. Build retrieval-augmented systems and interactive AI copilot interfaces.",
                "responsibilities": [
                    "Build RAG pipelines integrating dense vector retrieval, reranking, and semantic search.",
                    "Construct full-stack feature prototypes connecting frontend React components with async AI backend services.",
                    "Evaluate model latency, token economy, and hallucination reduction strategies.",
                ],
                "qualifications": [
                    "Strong background building production AI applications using Python, PyTorch, and LangChain.",
                    "Proficiency in frontend development with React, TypeScript, and streaming UI responses.",
                    "Experience with vector database indexing (pgvector, Pinecone, or Qdrant).",
                ],
                "required_skills": ["Python", "PyTorch", "LangChain", "Vector Databases", "React"],
                "preferred_skills": ["TypeScript", "FastAPI"],
                "status": "Active",
                "deadline": today + timedelta(days=25),
                "posted_at": now - timedelta(days=1),
            },
            {
                "company_key": "apex",
                "title": "Cloud & DevOps Architect",
                "department": "Infrastructure",
                "work_mode": "Remote",
                "employment_type": "Full-time",
                "location": "Remote (US)",
                "experience_level": "6-10 years",
                "education_level": "Bachelor's in Engineering or related technical field",
                "salary_min": Decimal("150000"),
                "salary_max": Decimal("195000"),
                "description": "Architect and automate cloud infrastructure provisioning, multi-region Kubernetes clusters, and automated continuous deployment workflows for Apex Cloud Systems.",
                "responsibilities": [
                    "Manage immutable infrastructure-as-code across AWS environments using Terraform.",
                    "Maintain multi-tenant Kubernetes clusters with automated canary deployments and service mesh routing.",
                    "Build self-healing CI/CD pipelines ensuring high developer deployment velocity.",
                    "Drive cloud cost optimization and infrastructure security compliance.",
                ],
                "qualifications": [
                    "Extensive experience running mission-critical workloads on AWS and Kubernetes.",
                    "Deep knowledge of Terraform, Docker, Linux internals, and infrastructure monitoring (Prometheus/Grafana).",
                    "Strong scripting skills in Python, Go, or Bash.",
                ],
                "required_skills": ["AWS", "Kubernetes", "Terraform", "Docker", "CI/CD"],
                "preferred_skills": ["Python", "Linux"],
                "status": "Active",
                "deadline": today + timedelta(days=40),
                "posted_at": now - timedelta(days=4),
            },
            {
                "company_key": "apex",
                "title": "Staff Security Engineer",
                "department": "Information Security",
                "work_mode": "Remote",
                "employment_type": "Full-time",
                "location": "Seattle, WA",
                "experience_level": "7+ years",
                "education_level": "Bachelor's in Computer Science or Cybersecurity",
                "salary_min": Decimal("165000"),
                "salary_max": Decimal("215000"),
                "description": "Spearhead threat modeling, application security assessments, and identity governance across Apex's multi-cloud enterprise platform.",
                "responsibilities": [
                    "Execute vulnerability assessments, dynamic penetration testing, and code audits.",
                    "Architect zero-trust security postures and secure authentication/authorization pipelines.",
                    "Collaborate with engineering teams to embed automated SAST/DAST tooling into continuous integration.",
                ],
                "qualifications": [
                    "Proven track record securing enterprise cloud platforms and microservices.",
                    "Familiarity with OAuth2, OIDC, SAML, and cryptography primitives.",
                    "Experience automating security controls in Go or Python.",
                ],
                "required_skills": ["Cloud Security", "Zero Trust", "Go", "Python"],
                "preferred_skills": ["Docker", "Kubernetes", "AWS"],
                "status": "Active",
                "deadline": today + timedelta(days=35),
                "posted_at": now - timedelta(days=5),
            },
            {
                "company_key": "pulse",
                "title": "Quantitative Software Engineer",
                "department": "Trading Systems",
                "work_mode": "On-site",
                "employment_type": "Full-time",
                "location": "New York, NY",
                "experience_level": "4-8 years",
                "education_level": "Master's or PhD in Computer Science, Math, or Physics",
                "salary_min": Decimal("180000"),
                "salary_max": Decimal("250000"),
                "description": "Design deterministic, microsecond-latency trading execution software and automated market data feeds for Pulse Dynamics.",
                "responsibilities": [
                    "Implement low-latency order execution pipelines in modern C++.",
                    "Profile hardware cache misses, memory alignment, and kernel bypass networking.",
                    "Collaborate with quantitative researchers to turn mathematical models into production code.",
                ],
                "qualifications": [
                    "Exceptional C++20 programming skills and understanding of systems architecture.",
                    "Strong background in concurrent programming, lock-free data structures, and algorithms.",
                    "Familiarity with financial exchange protocols (FIX, ITCH, OUCH).",
                ],
                "required_skills": ["C++", "Low Latency", "Algorithms", "Linux"],
                "preferred_skills": ["Python", "PostgreSQL"],
                "status": "Active",
                "deadline": today + timedelta(days=20),
                "posted_at": now - timedelta(days=2),
            },
            {
                "company_key": "pulse",
                "title": "Principal Product Designer",
                "department": "Product Design",
                "work_mode": "Hybrid",
                "employment_type": "Full-time",
                "location": "New York, NY",
                "experience_level": "6-10 years",
                "education_level": "Degree in Human-Computer Interaction, Design, or equivalent",
                "salary_min": Decimal("135000"),
                "salary_max": Decimal("175000"),
                "description": "Lead UX and visual design for high-density financial analytics interfaces, data visualization dashboards, and mobile applications.",
                "responsibilities": [
                    "Design intuitive, responsive user workflows for data-dense professional platforms.",
                    "Maintain and expand comprehensive design systems and component libraries in Figma.",
                    "Conduct qualitative usability studies and translate feedback into iterative design improvements.",
                ],
                "qualifications": [
                    "Extensive portfolio showing design leadership for complex, data-heavy B2B products.",
                    "Mastery of Figma, design systems, and rapid interactive prototyping.",
                    "Strong communication skills and empathy for developer implementation constraints.",
                ],
                "required_skills": ["Figma", "Design Systems", "UX Research"],
                "preferred_skills": ["Tailwind CSS", "JavaScript"],
                "status": "Active",
                "deadline": today + timedelta(days=50),
                "posted_at": now - timedelta(days=6),
            },
            {
                "company_key": "starlight",
                "title": "Embedded Robotics Software Engineer",
                "department": "Robotics & Hardware",
                "work_mode": "On-site",
                "employment_type": "Full-time",
                "location": "Austin, TX",
                "experience_level": "4-8 years",
                "education_level": "Degree in Robotics, Electrical Engineering, or Computer Science",
                "salary_min": Decimal("140000"),
                "salary_max": Decimal("185000"),
                "description": "Develop onboard firmware, motion planning controllers, and vision-guided manipulation pipelines for autonomous industrial robotics.",
                "responsibilities": [
                    "Write real-time C++ control software using ROS2 on embedded Linux platforms.",
                    "Integrate perception sensors including LiDAR, depth cameras, and IMUs.",
                    "Perform rigorous bench testing and hardware-in-the-loop simulation.",
                ],
                "qualifications": [
                    "Solid understanding of kinematics, dynamics, and real-time operating systems.",
                    "Strong background in C++, ROS2, and Linux kernel drivers.",
                    "Hands-on experience with sensor fusion and computer vision pipelines.",
                ],
                "required_skills": ["C++", "ROS2", "Linux", "Computer Vision"],
                "preferred_skills": ["Python", "Algorithms"],
                "status": "Active",
                "deadline": today + timedelta(days=60),
                "posted_at": now - timedelta(days=1),
            },
        ]

        seeded_jobs = []
        for j_data in jobs_list:
            company = companies[j_data["company_key"]]
            recruiter = recruiters[j_data["company_key"]]

            job = Job(
                company_id=company.id,
                created_by=recruiter.id,
                title=j_data["title"],
                department=j_data["department"],
                work_mode=j_data["work_mode"],
                employment_type=j_data["employment_type"],
                location=j_data["location"],
                experience_level=j_data["experience_level"],
                education_level=j_data["education_level"],
                salary_min=j_data["salary_min"],
                salary_max=j_data["salary_max"],
                description=j_data["description"],
                responsibilities=j_data["responsibilities"],
                qualifications=j_data["qualifications"],
                status=j_data["status"],
                deadline=j_data["deadline"],
                posted_at=j_data["posted_at"],
            )
            session.add(job)
            session.flush()

            for sk_name in j_data["required_skills"]:
                if sk_name in skills_dict:
                    session.add(JobSkill(job_id=job.id, skill_id=skills_dict[sk_name].id, is_required=True))

            for sk_name in j_data["preferred_skills"]:
                if sk_name in skills_dict:
                    session.add(JobSkill(job_id=job.id, skill_id=skills_dict[sk_name].id, is_required=False))

            seeded_jobs.append(job)

        sample_apps = [
            (candidates[0], seeded_jobs[0], "Shortlisted"),
            (candidates[1], seeded_jobs[1], "Screening"),
            (candidates[2], seeded_jobs[2], "Applied"),
            (candidates[3], seeded_jobs[3], "Screening"),
        ]

        for cand, job_obj, status_val in sample_apps:
            app = Application(
                candidate_id=cand.id,
                job_id=job_obj.id,
                status=status_val,
                current_job_title="Software Engineer",
                years_experience="4 years",
                highest_education="Bachelor of Science",
                why_interested="Excited about the technological mission and team culture.",
                relevant_experience="Built and maintained production web services and distributed systems.",
                is_currently_employed=True,
                applied_at=datetime.now(timezone.utc) - timedelta(days=1),
            )
            session.add(app)

        session.commit()
        print(f"Successfully seeded database:")
        print(f"- {len(companies)} Companies")
        print(f"- {len(recruiters)} Recruiters")
        print(f"- {len(candidates)} Candidates")
        print(f"- {len(seeded_jobs)} Production-Grade Jobs")
        print(f"- {len(sample_apps)} Sample Candidate Applications")
        print(f"- {len(skills_dict)} Normalized Skills")

    except Exception as exc:
        session.rollback()
        print(f"Failed to seed database: {exc}")
        raise exc
    finally:
        session.close()


if __name__ == "__main__":
    seed()
