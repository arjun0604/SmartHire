export interface MatchingWeights {
  required_skills: number;
  preferred_skills: number;
  experience: number;
  education: number;
  location_work_mode: number;
  employment_status: number;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  company_id?: string;
  companyId?: string;
  created_by?: string;
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
  updated_at?: string;
  updatedAt?: string;
  applicantCount: number;
  applicants: number;
  shortlisted: number;
  average_match?: number | null;
  averageMatch?: number | null;
  screening?: number;
  rejected?: number;
  matchScore?: number;
  description: string;
  responsibilities: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  qualifications: string[];
  preferredQualifications?: string[];
  skills: string[];
  matching_weights?: MatchingWeights;
  matchingWeights?: MatchingWeights;
  additional_requirements?: string;
  additionalRequirements?: string;
}
