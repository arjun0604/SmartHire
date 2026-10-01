import axios from "axios"
import type { Job } from "../data/jobs"

const rawApiUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "";
export const API_BASE_URL = rawApiUrl
  ? (rawApiUrl.endsWith("/api") ? rawApiUrl : `${rawApiUrl.replace(/\/+$/, "")}/api`)
  : "";

export function getBackendUrl(path?: string | null): string {
  if (!path) return "";
  const trimmed = path.trim();
  if (!trimmed) return "";

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  const backendBase = API_BASE_URL ? API_BASE_URL.replace(/\/api\/?$/, "") : "";
  if (!backendBase) return trimmed;

  if (trimmed.startsWith("/api/")) {
    return `${backendBase}${trimmed}`;
  }
  if (trimmed.startsWith("api/")) {
    return `${backendBase}/${trimmed}`;
  }

  const cleanPath = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
  return `${backendBase}/api/${cleanPath}`;
}

const initialToken = typeof window !== "undefined" ? localStorage.getItem("smarthire_token") : null;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

if (initialToken) {
  apiClient.defaults.headers.common["Authorization"] = `Bearer ${initialToken}`;
}

apiClient.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("smarthire_token") : null;
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

export function clearAuthSession() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("smarthire_token");
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("@@auth0spajs@@") || key.startsWith("smarthire_"))) {
        localStorage.removeItem(key);
      }
    }
  }
  delete apiClient.defaults.headers["Authorization"];
  if (apiClient.defaults.headers.common) {
    delete apiClient.defaults.headers.common["Authorization"];
  }
}

export function setAuthToken(token: string | null) {
  if (token) {
    if (typeof window !== "undefined") {
      localStorage.setItem("smarthire_token", token);
    }
    apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    delete apiClient.defaults.headers["Authorization"];
  } else {
    clearAuthSession();
  }
}

export interface UserSyncPayload {
  auth0_id: string;
  email: string;
  name: string;
  role: "candidate" | "recruiter";
  company_name?: string | null;
  industry?: string | null;
  company_size?: string | null;
  headquarters?: string | null;
  description?: string | null;
  founded_year?: number | null;
  website?: string | null;
  linkedin?: string | null;
  phone?: string | null;
  location?: string | null;
  dob?: string | null;
  resume_name?: string | null;
  resume_text?: string | null;
  picture_url?: string | null;
  is_onboarding_completion?: boolean | null;
  is_profile_update?: boolean | null;
}

export interface UserBackendResponse {
  id: string;
  auth0_id: string;
  email: string;
  name: string;
  role: "candidate" | "recruiter";
  company_id?: string | null;
  company_name?: string | null;
  candidate_id?: string | null;
  recruiter_id?: string | null;
  phone?: string | null;
  location?: string | null;
  dob?: string | null;
  resume_id?: string | null;
  resume_name?: string | null;
  resume_url?: string | null;
  picture_url?: string | null;
  onboarding_completed?: boolean;
}

export interface AccountUpdatePayload {
  auth0_id: string;
  name: string;
  picture_url?: string | null;
}

function normalizeUser(user: UserBackendResponse): UserBackendResponse {
  if (!user) return user;
  return {
    ...user,
    picture_url: user.picture_url ? getBackendUrl(user.picture_url) : user.picture_url,
    resume_url: user.resume_url ? getBackendUrl(user.resume_url) : user.resume_url,
  };
}

export async function syncUserWithBackend(payload: UserSyncPayload): Promise<UserBackendResponse> {
  const response = await apiClient.post<UserBackendResponse>("/auth/sync", payload);
  return normalizeUser(response.data);
}

export async function updateAccountProfileApi(payload: AccountUpdatePayload): Promise<UserBackendResponse> {
  const response = await apiClient.put<UserBackendResponse>("/auth/account", payload);
  return normalizeUser(response.data);
}

export async function uploadProfilePhotoApi(auth0Id: string, file: File): Promise<{ picture_url: string }> {
  const formData = new FormData();
  formData.append("auth0_id", auth0Id);
  formData.append("file", file);
  const response = await apiClient.post<{ picture_url: string }>("/auth/profile-photo", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return {
    picture_url: getBackendUrl(response.data.picture_url),
  };
}

export async function removeProfilePhotoApi(auth0Id: string): Promise<void> {
  await apiClient.delete(`/auth/profile-photo/${auth0Id}`);
}

export async function deleteAccountApi(auth0Id: string): Promise<void> {
  await apiClient.delete(`/auth/account/${auth0Id}`);
}

export interface CandidateCompanyJob {
  id: string;
  title: string;
  department: string;
  work_mode: string;
  employment_type: string;
  location: string;
  experience_level: string;
  salary_min?: string | null;
  salary_max?: string | null;
  posted_date?: string | null;
  deadline?: string | null;
  status: string;
}

export interface CompanyDetails {
  id: string;
  name: string;
  logo_url?: string | null;
  industry?: string | null;
  company_size?: string | null;
  headquarters?: string | null;
  description?: string | null;
  founded_year?: number | null;
  website?: string | null;
  linkedin?: string | null;
  active_jobs?: CandidateCompanyJob[];
}

function normalizeCompany(company: CompanyDetails): CompanyDetails {
  if (!company) return company;
  return {
    ...company,
    logo_url: company.logo_url ? getBackendUrl(company.logo_url) : company.logo_url,
  };
}

function normalizeJob(job: Job): Job {
  if (!job) return job;
  const rawLogo = job.companyLogo || (job as any).company_logo;
  return {
    ...job,
    companyLogo: rawLogo ? getBackendUrl(rawLogo) : job.companyLogo,
  };
}

export async function fetchMyCompanyApi(): Promise<CompanyDetails> {
  const response = await apiClient.get<CompanyDetails>("/companies/my");
  return normalizeCompany(response.data);
}

export async function updateMyCompanyApi(payload: Partial<CompanyDetails>): Promise<CompanyDetails> {
  const response = await apiClient.put<CompanyDetails>("/companies/my", payload);
  return normalizeCompany(response.data);
}

export async function uploadCompanyLogoApi(file: File): Promise<{ logo_url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiClient.post<{ logo_url: string }>("/companies/my/logo", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return {
    logo_url: getBackendUrl(response.data.logo_url),
  };
}

export async function fetchCompanyByIdApi(companyId: string): Promise<CompanyDetails> {
  const response = await apiClient.get<CompanyDetails>(`/companies/${companyId}`);
  return normalizeCompany(response.data);
}

export async function fetchJobsApi(params?: { status?: string }): Promise<Job[]> {
  const response = await apiClient.get<Job[]>("/jobs", { params });
  return (response.data || []).map(normalizeJob);
}

export async function fetchRecruiterJobsApi(params?: { status?: string }): Promise<Job[]> {
  const response = await apiClient.get<Job[]>("/jobs/recruiter", { params });
  return (response.data || []).map(normalizeJob);
}

export async function fetchJobByIdApi(jobId: string): Promise<Job> {
  const response = await apiClient.get<Job>(`/jobs/${jobId}`);
  return normalizeJob(response.data);
}

function toNumericSalary(val: unknown): number | null {
  if (val === undefined || val === null || val === "") return null;
  const num = typeof val === "number" ? val : parseFloat(String(val).replace(/[^0-9.]/g, ""));
  return isNaN(num) ? null : num;
}

export async function createJobApi(jobData: Partial<Job>): Promise<Job> {
  const response = await apiClient.post<Job>("/jobs", {
    title: jobData.title,
    department: jobData.department || "Engineering",
    work_mode: jobData.workMode || "Remote",
    employment_type: jobData.employmentType || "Full-time",
    location: jobData.location || "Remote",
    experience_level: jobData.experienceLevel || jobData.experience || "3–5 years",
    education_level: jobData.education || "Bachelor's Degree",
    salary_min: toNumericSalary(jobData.salaryMin),
    salary_max: toNumericSalary(jobData.salaryMax),
    description: jobData.description || "Job Description",
    responsibilities: jobData.responsibilities || [],
    qualifications: jobData.qualifications || [],
    preferred_qualifications: jobData.preferredQualifications || [],
    status: jobData.status || "Active",
    deadline: jobData.deadline || null,
    require_assessment: jobData.requireAssessment ?? false,
    company_name: jobData.company,
    required_skills: jobData.requiredSkills || jobData.skills || [],
    preferred_skills: jobData.preferredSkills || [],
    matching_weights: jobData.matching_weights || jobData.matchingWeights || {
      required_skills: 40,
      preferred_skills: 15,
      experience: 20,
      education: 10,
      location_work_mode: 10,
      employment_status: 5,
    },
    additional_requirements: jobData.additional_requirements || jobData.additionalRequirements || null,
  });
  return normalizeJob(response.data);
}

export async function updateJobApi(jobId: string, jobData: Partial<Job>): Promise<Job> {
  const payload: Record<string, unknown> = {};

  if (jobData.title !== undefined) payload.title = jobData.title;
  if (jobData.department !== undefined) payload.department = jobData.department;
  if (jobData.workMode !== undefined) payload.work_mode = jobData.workMode;
  if (jobData.employmentType !== undefined || jobData.jobType !== undefined) {
    payload.employment_type = jobData.employmentType || jobData.jobType;
  }
  if (jobData.location !== undefined) payload.location = jobData.location;
  if (jobData.experienceLevel !== undefined || jobData.experience !== undefined) {
    payload.experience_level = jobData.experienceLevel || jobData.experience;
  }
  if (jobData.education !== undefined) payload.education_level = jobData.education;
  if (jobData.salaryMin !== undefined) {
    payload.salary_min = toNumericSalary(jobData.salaryMin);
  }
  if (jobData.salaryMax !== undefined) {
    payload.salary_max = toNumericSalary(jobData.salaryMax);
  }
  if (jobData.description !== undefined) payload.description = jobData.description;
  if (jobData.responsibilities !== undefined) payload.responsibilities = jobData.responsibilities;
  if (jobData.qualifications !== undefined) payload.qualifications = jobData.qualifications;
  if (jobData.preferredQualifications !== undefined) {
    payload.preferred_qualifications = jobData.preferredQualifications;
  }
  if (jobData.status !== undefined) payload.status = jobData.status;
  if (jobData.deadline !== undefined) payload.deadline = jobData.deadline || null;
  if (jobData.requireAssessment !== undefined) {
    payload.require_assessment = jobData.requireAssessment;
  }
  if (jobData.requiredSkills !== undefined || jobData.skills !== undefined) {
    payload.required_skills = jobData.requiredSkills || jobData.skills || [];
  }
  if (jobData.preferredSkills !== undefined) {
    payload.preferred_skills = jobData.preferredSkills;
  }
  if (jobData.matching_weights !== undefined || jobData.matchingWeights !== undefined) {
    payload.matching_weights = jobData.matching_weights || jobData.matchingWeights;
  }
  if (jobData.additional_requirements !== undefined || jobData.additionalRequirements !== undefined) {
    payload.additional_requirements = jobData.additional_requirements || jobData.additionalRequirements;
  }

  const response = await apiClient.put<Job>(`/jobs/${jobId}`, payload);
  return normalizeJob(response.data);
}

export async function deleteJobApi(jobId: string): Promise<void> {
  await apiClient.delete(`/jobs/${jobId}`);
}

export async function fetchSavedJobIdsApi(candidateId: string): Promise<string[]> {
  const response = await apiClient.get<string[]>(`/saved-jobs/${candidateId}`);
  return response.data;
}

export async function toggleSavedJobApi(candidateId: string, jobId: string): Promise<{ saved: boolean; job_id: string }> {
  const response = await apiClient.post<{ saved: boolean; job_id: string }>(`/saved-jobs/toggle`, {
    candidate_id: candidateId,
    job_id: jobId,
  });
  return response.data;
}

export interface Application {
  id: string;
  candidate_id: string;
  job_id: string;
  resume_id?: string | null;
  status: "Applied" | "Screening" | "Shortlisted" | "Rejected";
  status_changed_at?: string | null;
  status_changed_by?: string | null;
  rejection_reason?: string | null;
  current_job_title?: string | null;
  years_experience?: string | null;
  highest_education?: string | null;
  why_interested?: string | null;
  relevant_experience?: string | null;
  is_currently_employed?: boolean;
  additional_information?: string | null;
  applied_at: string;
  candidate_name?: string | null;
  candidate_email?: string | null;
  candidate_phone?: string | null;
  candidate_location?: string | null;
  candidate_dob?: string | null;
  job_title?: string | null;
  company_name?: string | null;
  resume_name?: string | null;
  resume_url?: string | null;
  skills?: string[];
  overall_score?: number | null;
  ats_score?: number | null;
  ai_score?: number | null;
  match_details?: Record<string, any> | null;
  require_assessment?: boolean | null;
  assessment_status?: "Not Started" | "In Progress" | "Completed" | string | null;
  assessment_score?: number | null;
  assessment_total_questions?: number | null;
  assessment_correct_answers?: number | null;
  assessment_percentage?: number | null;
}

export interface ApplicationStatusHistory {
  id: string;
  application_id: string;
  from_status?: string | null;
  to_status: string;
  changed_by?: string | null;
  changed_at: string;
  reason?: string | null;
}

export interface ApplicationCreatePayload {
  job_id: string;
  candidate_id?: string | null;
  resume_id?: string | null;
  current_job_title?: string | null;
  years_experience?: string | null;
  highest_education?: string | null;
  why_interested?: string | null;
  relevant_experience?: string | null;
  is_currently_employed?: boolean;
  additional_information?: string | null;
}

function normalizeApplication(app: Application): Application {
  if (!app) return app;
  return {
    ...app,
    resume_url: app.resume_url ? getBackendUrl(app.resume_url) : app.resume_url,
  };
}

export async function createApplicationApi(payload: ApplicationCreatePayload): Promise<Application> {
  const response = await apiClient.post<Application>("/applications", payload);
  return normalizeApplication(response.data);
}

export async function fetchCandidateApplicationsApi(candidateId: string): Promise<Application[]> {
  const response = await apiClient.get<Application[]>(`/applications/candidate/${candidateId}`);
  return (response.data || []).map(normalizeApplication);
}

export async function fetchJobApplicationsApi(jobId: string): Promise<Application[]> {
  const response = await apiClient.get<Application[]>(`/applications/job/${jobId}`);
  return (response.data || []).map(normalizeApplication);
}

export async function fetchRecruiterApplicationsApi(): Promise<Application[]> {
  const response = await apiClient.get<Application[]>("/applications/recruiter");
  return (response.data || []).map(normalizeApplication);
}

export async function fetchApplicationByIdApi(applicationId: string): Promise<Application> {
  const response = await apiClient.get<Application>(`/applications/${applicationId}`);
  return normalizeApplication(response.data);
}

export async function updateApplicationStatusApi(applicationId: string, status: string, reason?: string | null): Promise<Application> {
  const response = await apiClient.patch<Application>(`/applications/${applicationId}/status`, { status, reason });
  return normalizeApplication(response.data);
}

export interface StatusActionConfig {
  targetStatus: "Applied" | "Screening" | "Shortlisted" | "Rejected";
  label: string;
  variant: "primary" | "secondary" | "danger";
}

export function getRecruiterStatusActions(status: string): StatusActionConfig[] {
  switch (status) {
    case "Applied":
      return [
        { targetStatus: "Screening", label: "Move to Screening", variant: "secondary" },
        { targetStatus: "Rejected", label: "Reject Application", variant: "danger" },
      ];
    case "Screening":
      return [
        { targetStatus: "Shortlisted", label: "Shortlist Candidate", variant: "primary" },
        { targetStatus: "Applied", label: "Move back to Applied", variant: "secondary" },
        { targetStatus: "Rejected", label: "Reject Application", variant: "danger" },
      ];
    case "Shortlisted":
      return [
        { targetStatus: "Screening", label: "Move back to Screening", variant: "secondary" },
        { targetStatus: "Rejected", label: "Reject Application", variant: "danger" },
      ];
    default:
      return [];
  }
}

export async function fetchApplicationStatusHistoryApi(applicationId: string): Promise<ApplicationStatusHistory[]> {
  const response = await apiClient.get<ApplicationStatusHistory[]>(`/applications/${applicationId}/history`);
  return response.data;
}

export interface ParsedSkill {
  name: string;
  type: "explicit" | "inferred";
  supporting_evidence?: string | null;
}

export interface ParsedWorkExperience {
  company?: string | null;
  title?: string | null;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean;
  description?: string | null;
  responsibilities?: string[];
}

export interface ParsedEducation {
  institution?: string | null;
  degree?: string | null;
  field_of_study?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  grade?: string | null;
}

export interface ParsedProject {
  name?: string | null;
  description?: string | null;
  technologies?: string[];
  link?: string | null;
}

export interface ParsedCertification {
  name?: string | null;
  issuing_organization?: string | null;
  issue_date?: string | null;
  expiration_date?: string | null;
  credential_id?: string | null;
}

export interface ParsedDetails {
  storage_path?: string;
  file_size?: number;
  content_type?: string;
  raw_text?: string;
  character_count?: number;
  parsing_status?: "structured" | "processing" | "extracted" | "failed_structuring" | "failed_extraction" | string;
  current_title?: string | null;
  career_level?: "fresher" | "experienced" | string | null;
  summary?: string | null;
  skills?: ParsedSkill[];
  work_experience?: ParsedWorkExperience[];
  education?: ParsedEducation[];
  projects?: ParsedProject[];
  certifications?: ParsedCertification[];
  [key: string]: unknown;
}

export interface ResumeBackendResponse {
  id: string;
  candidate_id: string;
  file_url: string;
  file_name: string;
  parsed_details?: ParsedDetails;
  uploaded_at: string;
  is_baseline?: boolean;
}

function normalizeResume(resume: ResumeBackendResponse): ResumeBackendResponse {
  if (!resume) return resume;
  return {
    ...resume,
    file_url: resume.file_url ? getBackendUrl(resume.file_url) : resume.file_url,
  };
}

export async function uploadResumeApi(candidateId: string, file: File): Promise<ResumeBackendResponse> {
  const formData = new FormData();
  formData.append("candidate_id", candidateId);
  formData.append("file", file);
  const response = await apiClient.post<ResumeBackendResponse>("/resumes/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    timeout: 45000,
  });
  return normalizeResume(response.data);
}

export async function fetchCandidateResumeApi(candidateId: string): Promise<ResumeBackendResponse | null> {
  try {
    const response = await apiClient.get<ResumeBackendResponse>(`/resumes/candidate/${candidateId}`);
    return response.data ? normalizeResume(response.data) : null;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function fetchResumeByIdApi(resumeId: string): Promise<ResumeBackendResponse | null> {
  try {
    const response = await apiClient.get<ResumeBackendResponse>(`/resumes/${resumeId}`);
    return response.data ? normalizeResume(response.data) : null;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export interface CandidateDetails {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  dob?: string | null;
  current_title?: string | null;
  career_level?: "fresher" | "experienced" | string | null;
  resume?: {
    id: string;
    file_url: string;
    file_name: string;
    parsed_details?: ParsedDetails;
  } | null;
}

export async function fetchCandidateDetailsApi(candidateId: string): Promise<CandidateDetails> {
  const response = await apiClient.get<CandidateDetails>(`/candidates/${candidateId}`);
  const data = response.data;
  if (data?.resume?.file_url) {
    data.resume.file_url = getBackendUrl(data.resume.file_url);
  }
  return data;
}

export function getResumeViewUrl(fileUrl?: string | null, storagePath?: string | null): string | null {
  if (storagePath) {
    return getBackendUrl(`/api/storage/resumes/${storagePath}`);
  }
  if (fileUrl) {
    return getBackendUrl(fileUrl);
  }
  return null;
}

export function getAvatarUrl(url?: string | null): string {
  return getBackendUrl(url);
}

export interface MatchReport {
  id?: string;
  job_id: string;
  candidate_id: string;
  resume_id: string;
  application_id?: string | null;
  match_type: "resume" | "application";
  overall_score?: number | null;
  ats_score: number;
  ai_score?: number | null;
  ats?: Record<string, any> | null;
  semantic?: Record<string, any> | null;
  weights_used: {
    configured: Record<string, number>;
    effective: Record<string, number>;
  };
  breakdown: {
    required_skills?: {
      score: number | null;
      weight: number;
      configured_weight: number;
      contribution: number;
      matched: string[];
      missing: string[];
      total: number;
      matched_count: number;
    };
    preferred_skills?: {
      score: number | null;
      weight: number;
      configured_weight: number;
      contribution: number;
      matched: string[];
      missing: string[];
      total: number;
      matched_count: number;
    };
    experience?: {
      score: number | null;
      weight: number;
      configured_weight: number;
      contribution: number;
      required_years: number;
      effective_years: number;
      application_years?: number | null;
      resume_years: number;
      source: "application" | "resume";
      explanation: string;
    };
    education?: {
      score: number | null;
      weight: number;
      configured_weight: number;
      contribution: number;
      required_level: string;
      candidate_level: string;
      explanation: string;
    };
    location_work_mode?: {
      score: number | null;
      weight: number;
      configured_weight: number;
      contribution: number;
      status: "remote" | "same_city" | "relocation" | "incompatible" | "unavailable";
      job_work_mode: string;
      job_location: string;
      candidate_location?: string | null;
      explanation: string;
    };
    employment_status?: {
      score: number | null;
      weight: number;
      configured_weight: number;
      contribution: number;
      status: "employed" | "available" | "unavailable";
      explanation: string;
    };
  };
  strengths: string[];
  gaps: string[];
  is_stale?: boolean;
  created_at?: string;
  updated_at?: string;
}

export async function fetchCurrentJobMatchApi(jobId: string): Promise<MatchReport> {
  const response = await apiClient.get<MatchReport>(`/matches/jobs/${jobId}/current`);
  return response.data;
}

export async function fetchResumeMatchApi(jobId: string): Promise<MatchReport> {
  const response = await apiClient.get<MatchReport>(`/matches/jobs/${jobId}/resume`);
  return response.data;
}

export async function fetchApplicationMatchApi(applicationId: string): Promise<MatchReport> {
  const response = await apiClient.get<MatchReport>(`/matches/applications/${applicationId}`);
  return response.data;
}

export interface MCQQuestion {
  id: string;
  job_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  marks: number;
  created_at?: string;
  updated_at?: string;
}

export interface MCQQuestionCreatePayload {
  job_id?: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  marks?: number;
}

export interface MCQQuestionUpdatePayload {
  question_text?: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_option?: "A" | "B" | "C" | "D";
  marks?: number;
}

export async function fetchJobQuestionsApi(jobId: string): Promise<MCQQuestion[]> {
  const response = await apiClient.get<MCQQuestion[]>(`/jobs/${jobId}/questions`);
  return response.data;
}

export async function createJobQuestionApi(jobId: string, payload: MCQQuestionCreatePayload): Promise<MCQQuestion> {
  const response = await apiClient.post<MCQQuestion>(`/jobs/${jobId}/questions`, payload);
  return response.data;
}

export async function createJobQuestionsBulkApi(jobId: string, payload: MCQQuestionCreatePayload[]): Promise<MCQQuestion[]> {
  const response = await apiClient.post<MCQQuestion[]>(`/jobs/${jobId}/questions/bulk`, payload);
  return response.data;
}

export async function updateQuestionApi(questionId: string, payload: MCQQuestionUpdatePayload): Promise<MCQQuestion> {
  const response = await apiClient.put<MCQQuestion>(`/questions/${questionId}`, payload);
  return response.data;
}

export async function deleteQuestionApi(questionId: string): Promise<void> {
  await apiClient.delete(`/questions/${questionId}`);
}

export type AssessmentStatus = "NOT_STARTED" | "CONFIGURED" | "ACTIVE" | "STARTED" | "CLOSED";

export interface AssessmentStatusResponse {
  job_id: string;
  status: AssessmentStatus;
  question_count: number;
  duration_minutes: number;
  assessment_duration_minutes?: number;
  configured_question_count?: number | null;
  assessment_question_count?: number | null;
  can_activate: boolean;
  can_close: boolean;
  validation_message?: string | null;
}

export async function fetchJobAssessmentStatusApi(jobId: string): Promise<AssessmentStatusResponse> {
  const response = await apiClient.get<AssessmentStatusResponse>(`/jobs/${jobId}/assessment/status`);
  return response.data;
}

export async function activateJobAssessmentApi(jobId: string): Promise<AssessmentStatusResponse> {
  const response = await apiClient.post<AssessmentStatusResponse>(`/jobs/${jobId}/assessment/activate`);
  return response.data;
}

export async function closeJobAssessmentApi(jobId: string): Promise<AssessmentStatusResponse> {
  const response = await apiClient.post<AssessmentStatusResponse>(`/jobs/${jobId}/assessment/close`);
  return response.data;
}

export interface CandidateOptionItem {
  key: string;
  text: string;
}

export interface CandidateAssessmentQuestion {
  question_id: string;
  question_number: number;
  question_text: string;
  options: CandidateOptionItem[];
  selected_option?: string | null;
  is_marked_for_review?: boolean;
}

export interface CandidateAssessmentAttempt {
  id: string;
  job_id: string;
  job_title?: string | null;
  company_name?: string | null;
  status: "IN_PROGRESS" | "SUBMITTED" | "EXPIRED";
  started_at: string;
  expires_at?: string | null;
  submitted_at?: string | null;
  duration_minutes?: number | null;
  server_time?: string | null;
  total_questions: number;
  answered_count: number;
  score?: number | null;
  percentage?: number | null;
  time_taken_seconds?: number | null;
  correct_answers?: number | null;
  questions: CandidateAssessmentQuestion[];
}

export interface CandidateAssessmentSubmitResponse {
  attempt_id: string;
  status: string;
  submitted_at: string;
  total_questions: number;
  score?: number | null;
  percentage?: number | null;
  time_taken_seconds?: number | null;
  correct_answers?: number | null;
}

export interface CandidateAssessmentMyAttemptResponse {
  has_attempt: boolean;
  can_start: boolean;
  assessment_status: AssessmentStatus;
  attempt_id?: string | null;
  attempt_status?: "IN_PROGRESS" | "SUBMITTED" | "EXPIRED" | null;
  started_at?: string | null;
  expires_at?: string | null;
  duration_minutes?: number | null;
  server_time?: string | null;
  submitted_at?: string | null;
  total_questions?: number | null;
  answered_count?: number | null;
  score?: number | null;
  percentage?: number | null;
  time_taken_seconds?: number | null;
  correct_answers?: number | null;
}

export interface CandidateAssessmentListItem {
  application_id: string;
  job_id: string;
  job_title: string;
  company_name: string;
  location?: string | null;
  work_mode?: string | null;
  assessment_type: string;
  total_questions: number;
  status: "Pending" | "In Progress" | "Completed";
  can_start: boolean;
  can_continue: boolean;
  can_view_result: boolean;
  attempt_id?: string | null;
  score?: number | null;
  percentage?: number | null;
  time_taken_seconds?: number | null;
  correct_answers?: number | null;
  submitted_at?: string | null;
}

export interface RecruiterAssessmentOverview {
  total_eligible: number;
  started: number;
  started_count?: number;
  completed: number;
  completed_count?: number;
  not_started: number;
  not_started_count?: number;
  average_score?: number | null;
  average_percentage?: number | null;
  completion_rate?: number | null;
  completion_rate_percentage?: number | null;
  attendance_rate?: number | null;
  attendance_rate_percentage?: number | null;
}

export interface RecruiterCandidateAssessmentItem {
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  application_id: string;
  attempt_id?: string | null;
  assessment_attempt_id?: string | null;
  status: "Completed" | "In Progress" | "Not Started" | string;
  attempt_status?: "Completed" | "In Progress" | "Not Started" | "SUBMITTED" | "IN_PROGRESS" | "TIMED_OUT" | string;
  score?: number | null;
  total_questions: number;
  percentage?: number | null;
  time_taken_seconds?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface RecruiterJobAssessmentResultsResponse {
  job_id: string;
  job_title: string;
  company_name: string;
  assessment_status: AssessmentStatus;
  duration_minutes: number;
  total_questions: number;
  overview: RecruiterAssessmentOverview;
  candidates: RecruiterCandidateAssessmentItem[];
  page?: number;
  limit?: number;
  total?: number;
  total_pages?: number;
}

export interface RecruiterQuestionPerformanceItem {
  question_id: string;
  question_number: number;
  question_text: string;
  options: CandidateOptionItem[];
  candidate_selected_option?: string | null;
  candidate_selected_text?: string | null;
  correct_option: string;
  correct_text?: string | null;
  is_correct?: boolean | null;
  status: "Correct" | "Incorrect" | "Unanswered";
}

export interface RecruiterCandidateDetailResultResponse {
  attempt_id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  job_id: string;
  job_title: string;
  company_name: string;
  status: string;
  score: number;
  total_questions: number;
  percentage: number;
  time_taken_seconds?: number | null;
  started_at: string;
  submitted_at?: string | null;
  questions: RecruiterQuestionPerformanceItem[];
}

export async function fetchCandidateAssessmentsApi(): Promise<CandidateAssessmentListItem[]> {
  const response = await apiClient.get<CandidateAssessmentListItem[]>("/candidate/assessments");
  return response.data;
}

export async function startJobAssessmentApi(jobId: string): Promise<CandidateAssessmentAttempt> {
  const response = await apiClient.post<CandidateAssessmentAttempt>(`/jobs/${jobId}/assessment/start`);
  return response.data;
}

export async function fetchMyJobAssessmentAttemptApi(jobId: string): Promise<CandidateAssessmentMyAttemptResponse> {
  const response = await apiClient.get<CandidateAssessmentMyAttemptResponse>(`/jobs/${jobId}/assessment/my-attempt`);
  return response.data;
}

export async function fetchAssessmentAttemptApi(attemptId: string): Promise<CandidateAssessmentAttempt> {
  const response = await apiClient.get<CandidateAssessmentAttempt>(`/assessment-attempts/${attemptId}`);
  return response.data;
}

export async function saveAssessmentAnswerApi(
  attemptId: string,
  questionId: string,
  selectedOption: string | null,
  isMarkedForReview?: boolean
): Promise<{ status: string; question_id: string; selected_option: string | null; is_marked_for_review?: boolean }> {
  const response = await apiClient.post(`/assessment-attempts/${attemptId}/answer`, {
    question_id: questionId,
    selected_option: selectedOption ?? "",
    is_marked_for_review: isMarkedForReview,
  });
  return response.data;
}

export async function markQuestionReviewApi(
  attemptId: string,
  questionId: string,
  isMarkedForReview: boolean
): Promise<{ status: string; question_id: string; is_marked_for_review: boolean }> {
  const response = await apiClient.post(`/assessment-attempts/${attemptId}/review`, {
    question_id: questionId,
    is_marked_for_review: isMarkedForReview,
  });
  return response.data;
}

export async function submitAssessmentApi(attemptId: string): Promise<CandidateAssessmentSubmitResponse> {
  const response = await apiClient.post<CandidateAssessmentSubmitResponse>(`/assessment-attempts/${attemptId}/submit`);
  return response.data;
}

export async function updateAssessmentSettingsApi(
  jobId: string,
  settings: { duration_minutes?: number; question_count?: number } | number
): Promise<AssessmentStatusResponse> {
  const payload = typeof settings === "number" ? { duration_minutes: settings } : settings;
  const response = await apiClient.patch<AssessmentStatusResponse>(`/jobs/${jobId}/assessment/settings`, payload);
  return response.data;
}

export interface AssessmentResultsQueryParams {
  search?: string;
  status?: string;
  min_score?: number;
  max_score?: number;
  page?: number;
  limit?: number;
}

export async function fetchJobAssessmentResultsApi(
  jobId: string,
  params?: AssessmentResultsQueryParams,
  signal?: AbortSignal
): Promise<RecruiterJobAssessmentResultsResponse> {
  const response = await apiClient.get<RecruiterJobAssessmentResultsResponse>(
    `/jobs/${jobId}/assessment/results`,
    { params, signal }
  );
  return response.data;
}

export async function fetchCandidateAssessmentDetailResultApi(
  jobId: string,
  attemptId: string
): Promise<RecruiterCandidateDetailResultResponse> {
  const response = await apiClient.get<RecruiterCandidateDetailResultResponse>(
    `/jobs/${jobId}/assessment/results/${attemptId}`
  );
  return response.data;
}


