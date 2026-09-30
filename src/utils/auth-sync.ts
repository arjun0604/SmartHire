import { syncUserWithBackend, getAvatarUrl } from "./api"
import type { UserBackendResponse } from "./api"

export type UserRole = "candidate" | "recruiter";

export interface UserProfile {
  id: string;
  auth0Id?: string;
  email: string;
  name: string;
  picture?: string;
  role: UserRole;
  company?: string | null;
  companyId?: string | null;
  candidateId?: string | null;
  recruiterId?: string | null;
  phone?: string;
  location?: string;
  dob?: string;
  resumeId?: string;
  resumeName?: string;
  resumeUrl?: string;
  resumeText?: string;
  onboardingCompleted?: boolean;
  createdAt: string;
}

export function extractRoleFromAuth0(auth0User?: Record<string, unknown> | null): UserRole | null {
  const role = auth0User?.["https://smarthire.com/role"];
  if (role === "recruiter" || role === "candidate") {
    return role;
  }
  return null;
}

function formatName(name?: string, email?: string): string {
  const raw = name && !name.includes("@") ? name : email ? email.split("@")[0] : "User";
  const cleaned = raw.replace(/[0-9]/g, "").replace(/[._\-+]/g, " ").trim();
  if (!cleaned) return "User";
  return cleaned
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function applyBackendData(profile: UserProfile, dbUser: UserBackendResponse): UserProfile {
  return {
    ...profile,
    id: dbUser.id,
    name: dbUser.name || profile.name,
    companyId: dbUser.company_id ?? profile.companyId,
    candidateId: dbUser.candidate_id ?? profile.candidateId,
    recruiterId: dbUser.recruiter_id ?? profile.recruiterId,
    company: dbUser.company_name ?? profile.company,
    phone: dbUser.phone ?? profile.phone,
    location: dbUser.location ?? profile.location,
    dob: dbUser.dob ?? profile.dob,
    resumeId: dbUser.resume_id ?? profile.resumeId,
    resumeName: dbUser.resume_name ?? profile.resumeName,
    resumeUrl: dbUser.resume_url ?? profile.resumeUrl,
    picture: dbUser.picture_url !== undefined ? (dbUser.picture_url ? getAvatarUrl(dbUser.picture_url) : undefined) : profile.picture,
    onboardingCompleted: dbUser.onboarding_completed ?? profile.onboardingCompleted,
  };
}

export function buildProfileFromAuth0(
  auth0User: {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
    [key: string]: unknown;
  }
): UserProfile {
  if (!auth0User?.sub) throw new Error("Invalid Auth0 user");

  const roleFromAuth0 = extractRoleFromAuth0(auth0User);
  const assignedRole: UserRole = roleFromAuth0 || "candidate";

  return {
    id: auth0User.sub,
    auth0Id: auth0User.sub,
    email: auth0User.email || "",
    name: formatName(auth0User.name, auth0User.email),
    picture: auth0User.picture,
    role: assignedRole,
    company: assignedRole === "recruiter" ? null : undefined,
    companyId: null,
    candidateId: null,
    recruiterId: null,
    phone: undefined,
    location: undefined,
    dob: undefined,
    resumeId: undefined,
    resumeName: undefined,
    resumeUrl: undefined,
    resumeText: undefined,
    onboardingCompleted: false,
    createdAt: new Date().toISOString(),
  };
}

export async function syncProfileToBackend(
  profile: UserProfile,
  options?: { is_onboarding_completion?: boolean; is_profile_update?: boolean }
): Promise<UserProfile> {
  const dbUser = await syncUserWithBackend({
    auth0_id: profile.auth0Id || profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    company_name: profile.company || undefined,
    phone: profile.phone,
    location: profile.location,
    dob: profile.dob,
    resume_name: profile.resumeName || undefined,
    resume_text: profile.resumeText || undefined,
    picture_url: profile.picture || undefined,
    is_onboarding_completion: options?.is_onboarding_completion,
    is_profile_update: options?.is_profile_update,
  });
  return applyBackendData(profile, dbUser);
}

export function updateCandidateProfile(
  currentProfile: UserProfile,
  data: { name: string; dob?: string; resumeName?: string; resumeUrl?: string; resumeText?: string; phone?: string; location?: string }
): UserProfile {
  return {
    ...currentProfile,
    name: data.name.trim(),
    dob: data.dob !== undefined ? data.dob : currentProfile.dob,
    resumeName: data.resumeName !== undefined ? data.resumeName : currentProfile.resumeName,
    resumeUrl: data.resumeUrl !== undefined ? data.resumeUrl : currentProfile.resumeUrl,
    resumeText: data.resumeText || currentProfile.resumeText,
    phone: data.phone !== undefined ? data.phone : currentProfile.phone,
    location: data.location !== undefined ? data.location : currentProfile.location,
    onboardingCompleted: true,
  };
}

export interface RecruiterOnboardingData {
  name: string;
  company: string;
  industry: string;
  companySize: string;
  headquarters: string;
  description: string;
  foundedYear?: number | null;
  website?: string | null;
  linkedin?: string | null;
  logoUrl?: string | null;
}

export function updateRecruiterProfile(
  currentProfile: UserProfile,
  name: string,
  company: string
): UserProfile {
  return {
    ...currentProfile,
    name: name.trim(),
    company: company.trim(),
    onboardingCompleted: true,
  };
}

export async function syncRecruiterOnboardingToBackend(
  profile: UserProfile,
  data: RecruiterOnboardingData
): Promise<UserProfile> {
  const dbUser = await syncUserWithBackend({
    auth0_id: profile.auth0Id || profile.id,
    email: profile.email,
    name: data.name.trim(),
    role: "recruiter",
    company_name: data.company.trim(),
    industry: data.industry.trim() || undefined,
    company_size: data.companySize.trim() || undefined,
    headquarters: data.headquarters.trim() || undefined,
    description: data.description.trim() || undefined,
    founded_year: data.foundedYear || undefined,
    website: data.website?.trim() || undefined,
    linkedin: data.linkedin?.trim() || undefined,
    logo_url: data.logoUrl || undefined,
  });
  return applyBackendData(
    {
      ...profile,
      name: data.name.trim(),
      company: data.company.trim(),
      onboardingCompleted: true,
    },
    dbUser
  );
}
