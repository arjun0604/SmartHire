export interface Job {
  id: string;
  title: string;
  company: string;
  department: string;
  jobType: string;
  employmentType: string;
  location: string;
  workMode: string;
  experience: string;
  experienceLevel: string;
  education: string;
  salaryMin: string;
  salaryMax: string;
  postedDate: string;
  postedRelative?: string;
  companyLogo?: string;
  deadline: string;
  requireAssessment: boolean;
  status: "Active" | "Draft";
  createdAt: string;
  applicantCount: number;
  applicants: number;
  shortlisted: number;
  screening?: number;
  rejected?: number;
  matchScore?: number;
  description: string;
  responsibilities: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  qualifications: string[];
  skills: string[];
}

export interface JobCandidate {
  id: string;
  name: string;
  jobId: string;
  stage: "Applied" | "Screening" | "Shortlisted" | "Interview" | "Offer";
  appliedDate: string;
  appliedRelative: string;
  matchScore?: number;
}

export const CANDIDATES_DATA: JobCandidate[] = [
  {
    id: "cand-1",
    name: "Alex Morgan",
    jobId: "senior-react-engineer",
    stage: "Shortlisted",
    appliedDate: "Aug 31, 2026",
    appliedRelative: "Applied 2 days ago",
    matchScore: 94,
  },
  {
    id: "cand-2",
    name: "Sarah Williams",
    jobId: "senior-react-engineer",
    stage: "Screening",
    appliedDate: "Aug 30, 2026",
    appliedRelative: "Applied 3 days ago",
    matchScore: 89,
  },
  {
    id: "cand-3",
    name: "David Thomas",
    jobId: "senior-react-engineer",
    stage: "Applied",
    appliedDate: "Aug 28, 2026",
    appliedRelative: "Applied 5 days ago",
  },
  {
    id: "cand-4",
    name: "Priya Sharma",
    jobId: "senior-react-engineer",
    stage: "Screening",
    appliedDate: "Aug 25, 2026",
    appliedRelative: "Applied 1 week ago",
    matchScore: 86,
  },
  {
    id: "cand-5",
    name: "Elena Rostova",
    jobId: "lead-backend-architect",
    stage: "Shortlisted",
    appliedDate: "Sep 01, 2026",
    appliedRelative: "Applied 1 day ago",
    matchScore: 88,
  },
  {
    id: "cand-6",
    name: "Marcus Vance",
    jobId: "lead-backend-architect",
    stage: "Screening",
    appliedDate: "Aug 29, 2026",
    appliedRelative: "Applied 4 days ago",
    matchScore: 85,
  },
  {
    id: "cand-7",
    name: "Carlos Mendez",
    jobId: "lead-backend-architect",
    stage: "Applied",
    appliedDate: "Aug 27, 2026",
    appliedRelative: "Applied 6 days ago",
  },
  {
    id: "cand-8",
    name: "Savannah Nguyen",
    jobId: "full-stack-ai-engineer",
    stage: "Shortlisted",
    appliedDate: "Aug 31, 2026",
    appliedRelative: "Applied 2 days ago",
    matchScore: 88,
  },
  {
    id: "cand-9",
    name: "Aarav Patel",
    jobId: "full-stack-ai-engineer",
    stage: "Screening",
    appliedDate: "Aug 30, 2026",
    appliedRelative: "Applied 3 days ago",
    matchScore: 82,
  },
  {
    id: "cand-10",
    name: "Jordan Lee",
    jobId: "devops-cloud-architect",
    stage: "Screening",
    appliedDate: "Aug 29, 2026",
    appliedRelative: "Applied 4 days ago",
  },
  {
    id: "cand-11",
    name: "Liam O'Connor",
    jobId: "devops-cloud-architect",
    stage: "Applied",
    appliedDate: "Aug 26, 2026",
    appliedRelative: "Applied 1 week ago",
  },
];

export const JOBS_DATA: Job[] = [
  {
    id: "senior-react-engineer",
    title: "Senior React Engineer",
    company: "Meridian Labs",
    department: "Engineering",
    jobType: "Full-time",
    employmentType: "Full-time",
    location: "Remote (US)",
    workMode: "Remote",
    experience: "5–8 years",
    experienceLevel: "5-8 years",
    education: "Bachelor's in Computer Science or equivalent",
    salaryMin: "12,00,000",
    salaryMax: "18,00,000",
    postedDate: "Aug 28, 2026",
    postedRelative: "2 days ago",
    deadline: "Sep 30, 2026",
    requireAssessment: true,
    status: "Active",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    applicantCount: 14,
    applicants: 14,
    shortlisted: 4,
    screening: 6,
    rejected: 2,
    matchScore: 94,
    skills: ["React", "TypeScript", "Tailwind CSS", "State Architecture"],
    description:
      "We are seeking an experienced Senior React Engineer to spearhead frontend engineering initiatives at Meridian Labs. In this role, you will architect modular client applications, establish resilient state-management patterns, and mentor engineers across cross-functional product teams.",
    responsibilities: [
      "Architect and maintain modern single-page applications using React 19, TypeScript, and modern component systems.",
      "Collaborate with product designers to implement accessible, responsive design systems with sub-millisecond interaction latency.",
      "Profile and optimize browser runtime performance, bundle splitting, and client-side rendering bottlenecks.",
      "Conduct thorough code reviews and establish engineering standards for unit, integration, and end-to-end testing.",
      "Partner with platform backend architects to design clean, type-safe REST and GraphQL contract interfaces."
    ],
    requiredSkills: [
      "React",
      "TypeScript",
      "Tailwind CSS",
      "REST APIs",
      "Next.js",
      "State Management"
    ],
    preferredSkills: [
      "GraphQL",
      "WebSockets",
      "Vite Build Tooling",
      "Docker",
      "Design Systems"
    ],
    qualifications: [
      "Bachelor's degree in Computer Science, Software Engineering, or equivalent practical industry experience.",
      "5+ years of production experience building high-traffic, customer-facing web applications in React.",
      "Demonstrated mastery of JavaScript (ES2024+), TypeScript typing systems, and browser DOM performance optimization.",
      "Demonstrated experience writing comprehensive automated test suites using Vitest, Jest, or Playwright."
    ]
  },
  {
    id: "lead-backend-architect",
    title: "Lead Backend Architect",
    company: "Meridian Labs",
    department: "Platform",
    jobType: "Full-time",
    employmentType: "Full-time",
    location: "Austin, TX",
    workMode: "On-site",
    experience: "8+ years",
    experienceLevel: "8+ years",
    education: "Master's or Bachelor's in Computer Science",
    salaryMin: "15,00,000",
    salaryMax: "24,00,000",
    postedDate: "Aug 24, 2026",
    postedRelative: "3 days ago",
    deadline: "Oct 15, 2026",
    requireAssessment: true,
    status: "Active",
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    applicantCount: 9,
    applicants: 9,
    shortlisted: 3,
    screening: 4,
    rejected: 1,
    matchScore: 78,
    skills: ["Go", "gRPC", "PostgreSQL", "Kafka"],
    description:
      "Meridian Labs is hiring a Lead Backend Architect to own our core microservices ecosystem. You will lead distributed architecture decisions, optimize data access topologies across multi-region databases, and ensure our foundational services achieve five-nines reliability.",
    responsibilities: [
      "Architect high-throughput microservices using Go, gRPC, and message-driven event streams.",
      "Lead database modeling, index tuning, and partition strategies across distributed PostgreSQL clusters.",
      "Define telemetry, distributed tracing, and automated fault-tolerance mechanisms across cloud services.",
      "Guide team technical roadmaps and evaluate tradeoffs between latency, consistency, and operational simplicity.",
      "Oversee cloud infrastructure migrations and containerized deployments orchestrated on Kubernetes."
    ],
    requiredSkills: [
      "Go",
      "PostgreSQL",
      "gRPC",
      "Distributed Systems",
      "Docker",
      "Kubernetes"
    ],
    preferredSkills: [
      "Apache Kafka",
      "Redis Caching",
      "Terraform",
      "AWS Cloud Architecture",
      "OpenTelemetry"
    ],
    qualifications: [
      "8+ years of production backend engineering with deep experience in Go, C++, or Rust.",
      "Proven track record designing distributed platforms handling tens of thousands of concurrent requests.",
      "Deep understanding of ACID transaction semantics, database isolation levels, and event-driven patterns.",
      "Strong verbal and written technical communication skills for authoring architecture design proposals."
    ]
  },
  {
    id: "full-stack-ai-engineer",
    title: "Full Stack AI Engineer",
    company: "Nova Systems",
    department: "Data & AI",
    jobType: "Full-time",
    employmentType: "Full-time",
    location: "Bengaluru, India",
    workMode: "Hybrid",
    experience: "3–5 years",
    experienceLevel: "3-5 years",
    education: "Bachelor's in Computer Science, Data Science, or related field",
    salaryMin: "18,00,000",
    salaryMax: "28,00,000",
    postedDate: "Aug 30, 2026",
    postedRelative: "4 days ago",
    deadline: "Oct 01, 2026",
    requireAssessment: true,
    status: "Active",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    applicantCount: 22,
    applicants: 22,
    shortlisted: 6,
    screening: 8,
    rejected: 3,
    matchScore: 88,
    skills: ["Python", "React", "TypeScript", "FastAPI"],
    description:
      "Nova Systems is building next-generation cognitive recruitment workflows. As a Full Stack AI Engineer, you will bridge the gap between foundation model integrations, backend vector search infrastructure, and clean interactive user interfaces.",
    responsibilities: [
      "Design and deploy high-performance Python FastAPI services integrating LLMs and vector database retrieval.",
      "Build interactive dashboard interfaces using modern React, TypeScript, and responsive CSS.",
      "Implement prompt evaluation pipelines, embedding index maintenance, and semantic cache layers.",
      "Collaborate with machine learning researchers to productionize proprietary scoring algorithms.",
      "Monitor latency, token consumption, and response accuracy across real-time user sessions."
    ],
    requiredSkills: [
      "Python",
      "FastAPI",
      "React",
      "TypeScript",
      "Vector Databases",
      "REST APIs"
    ],
    preferredSkills: [
      "LangChain",
      "LlamaIndex",
      "Qdrant / Pinecone",
      "PostgreSQL pgvector",
      "Docker"
    ],
    qualifications: [
      "3+ years of professional full-stack development experience combining Python and modern JavaScript/TypeScript.",
      "Hands-on experience deploying Retrieval-Augmented Generation (RAG) pipelines in production environments.",
      "Strong understanding of modern frontend asynchronous state patterns and streaming responses.",
      "Familiarity with cloud platforms (AWS, GCP) and containerized service deployment."
    ]
  },
  {
    id: "devops-cloud-architect",
    title: "DevOps & Cloud Architect",
    company: "Scale Infrastructure",
    department: "Operations",
    jobType: "Contract",
    employmentType: "Contract",
    location: "San Francisco, CA",
    workMode: "Hybrid",
    experience: "5–8 years",
    experienceLevel: "5-8 years",
    education: "Bachelor's in Computer Science or Information Systems",
    salaryMin: "16,00,000",
    salaryMax: "22,00,000",
    postedDate: "Aug 20, 2026",
    postedRelative: "1 week ago",
    deadline: "Nov 10, 2026",
    requireAssessment: false,
    status: "Active",
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    applicantCount: 5,
    applicants: 5,
    shortlisted: 2,
    screening: 2,
    rejected: 0,
    matchScore: 42,
    skills: ["Kubernetes", "AWS Terraform", "Docker", "CI/CD"],
    description:
      "Scale Infrastructure is seeking a DevOps & Cloud Architect to lead infrastructure automation, secure zero-trust network boundaries, and optimize cloud cluster utilization across multi-tenant deployments.",
    responsibilities: [
      "Provision and manage infrastructure as code using Terraform across AWS and GCP environments.",
      "Architect and operate production Kubernetes clusters with automated canary rollouts and autoscaling.",
      "Build hardened CI/CD pipelines incorporating static code analysis, vulnerability scanning, and automated artifact publishing.",
      "Implement comprehensive observability stacks utilizing Prometheus, Grafana, and structured logging.",
      "Establish disaster recovery runbooks, multi-region failover protocols, and automated backup schedules."
    ],
    requiredSkills: [
      "Kubernetes",
      "Terraform",
      "AWS",
      "Docker",
      "CI/CD Pipelines",
      "Linux Administration"
    ],
    preferredSkills: [
      "Helm",
      "ArgoCD",
      "Vault",
      "Prometheus & Grafana",
      "Cloudflare Zero Trust"
    ],
    qualifications: [
      "5+ years operating production cloud infrastructure supporting mission-critical SaaS workloads.",
      "Extensive experience with Terraform module design, state locking, and multi-account AWS architectures.",
      "Certified Kubernetes Administrator (CKA) or AWS Solutions Architect Professional certification preferred.",
      "Strong scripting proficiency in Bash, Python, or Go for administrative automation."
    ]
  }
];

export function getJobById(id: string): Job | undefined {
  return JOBS_DATA.find((job) => job.id === id);
}

export function getAllJobs(): Job[] {
  return JOBS_DATA;
}

export function getCandidatesByJobId(jobId: string): JobCandidate[] {
  return CANDIDATES_DATA.filter((candidate) => candidate.jobId === jobId);
}
