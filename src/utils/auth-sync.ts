export type UserRole = "candidate" | "recruiter";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: UserRole;
  company?: string | null;
  dob?: string;
  resumeName?: string;
  resumeText?: string;
  onboardingCompleted?: boolean;
  createdAt: string;
}

const USERS_KEY = "smarthire_users";
const SESSION_KEY = "smarthire_session";

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

function getUsers(): Record<string, UserProfile> {
  try {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveUsers(users: Record<string, UserProfile>): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getActiveSession(): UserProfile | null {
  try {
    const userId = localStorage.getItem(SESSION_KEY);
    if (!userId) return null;
    const users = getUsers();
    return users[userId] || null;
  } catch {
    return null;
  }
}

function startSession(user: UserProfile): void {
  localStorage.setItem(SESSION_KEY, user.id);
}

export function syncAuthUser(
  auth0User: {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
    [key: string]: unknown;
  }
): UserProfile {
  if (!auth0User?.sub) throw new Error("Invalid Auth0 user");

  const users = getUsers();
  const existing = users[auth0User.sub];
  const roleFromAuth0 = extractRoleFromAuth0(auth0User);

  if (existing) {
    if (roleFromAuth0) {
      existing.role = roleFromAuth0;
    }
    if (auth0User.email) existing.email = auth0User.email;
    if (auth0User.picture) existing.picture = auth0User.picture;
    users[auth0User.sub] = existing;
    saveUsers(users);
    startSession(existing);
    return existing;
  }

  const assignedRole: UserRole = roleFromAuth0 || "candidate";

  const profile: UserProfile = {
    id: auth0User.sub,
    email: auth0User.email || "",
    name: formatName(auth0User.name, auth0User.email),
    picture: auth0User.picture,
    role: assignedRole,
    company: assignedRole === "recruiter" ? null : undefined,
    onboardingCompleted: false,
    createdAt: new Date().toISOString(),
  };

  users[auth0User.sub] = profile;
  saveUsers(users);
  startSession(profile);
  return profile;
}

export function updateCandidateProfile(
  userId: string,
  data: { name: string; dob: string; resumeName: string; resumeText?: string }
): UserProfile {
  const users = getUsers();
  const user = users[userId];
  if (!user) throw new Error("User not found");

  user.name = data.name.trim();
  user.dob = data.dob;
  user.resumeName = data.resumeName;
  if (data.resumeText) user.resumeText = data.resumeText;
  user.onboardingCompleted = true;

  users[userId] = user;
  saveUsers(users);
  startSession(user);
  return user;
}

export function updateRecruiterProfile(userId: string, name: string, company: string): UserProfile {
  const users = getUsers();
  const user = users[userId];
  if (!user) throw new Error("User not found");

  user.name = name.trim();
  user.company = company.trim();
  user.onboardingCompleted = true;

  users[userId] = user;
  saveUsers(users);
  startSession(user);
  return user;
}

export function clearUserSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
