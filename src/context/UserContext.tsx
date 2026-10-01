import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import { useAuth0 } from "@auth0/auth0-react"
import { toast } from "sonner"
import {
  buildProfileFromAuth0,
  syncProfileToBackend,
  applyBackendData,
  updateCandidateProfile as buildUpdatedCandidate,
  updateRecruiterProfile as buildUpdatedRecruiter,
  syncRecruiterOnboardingToBackend,
  getLogoutReturnToUrl,
} from "@utils/auth-sync"
import type { UserProfile, RecruiterOnboardingData } from "@utils/auth-sync"
import {
  setAuthToken,
  clearAuthSession,
  fetchSavedJobIdsApi,
  toggleSavedJobApi,
  uploadResumeApi,
  uploadProfilePhotoApi,
  removeProfilePhotoApi,
  updateAccountProfileApi,
  deleteAccountApi,
  getAvatarUrl,
  type ResumeBackendResponse,
} from "@utils/api"

interface UserContextType {
  profile: UserProfile | null;
  isLoading: boolean;
  savedJobIds: string[];
  toggleSaveJob: (jobId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  updateCandidate: (data: { name: string; dob?: string; resumeName?: string; resumeUrl?: string; resumeText?: string; phone?: string; location?: string }, options?: { is_onboarding_completion?: boolean; is_profile_update?: boolean }) => Promise<void>;
  updateRecruiter: (data: RecruiterOnboardingData | string, company?: string) => Promise<void>;
  uploadResume: (file: File) => Promise<ResumeBackendResponse | null>;
  updateAccountProfile: (name: string, pictureUrl?: string | null) => Promise<void>;
  uploadProfilePhoto: (file: File) => Promise<string | null>;
  removeProfilePhoto: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  clearSession: () => void;
}

const UserContext = createContext<UserContextType>({
  profile: null,
  isLoading: true,
  savedJobIds: [],
  toggleSaveJob: async () => { },
  refreshUser: async () => { },
  updateCandidate: async () => { },
  updateRecruiter: async () => { },
  uploadResume: async () => null,
  updateAccountProfile: async () => { },
  uploadProfilePhoto: async () => null,
  removeProfilePhoto: async () => { },
  deleteAccount: async () => { },
  clearSession: () => { },
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user, getAccessTokenSilently, isAuthenticated, isLoading: auth0Loading, logout } = useAuth0();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const isSyncingRef = useRef(false);
  const pendingSavesRef = useRef<Set<string>>(new Set());
  const savedJobIdsRef = useRef<string[]>(savedJobIds);
  useEffect(() => {
    savedJobIdsRef.current = savedJobIds;
  }, [savedJobIds]);

  useEffect(() => {
    if (auth0Loading) return;

    if (!isAuthenticated || !user) {
      setProfile(null);
      setSavedJobIds([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let isMounted = true;

    async function syncAuth() {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;

      try {
        let token = "";
        try {
          token = await getAccessTokenSilently({
            authorizationParams: {
              audience: import.meta.env.VITE_AUTH0_AUDIENCE || "https://api.smarthire.com",
            },
          });
        } catch (tokenErr) {
          console.warn("Silent token with audience failed, trying default:", tokenErr);
          try {
            token = await getAccessTokenSilently();
          } catch {
            token = (user?.sub as string) || "auth0_session_token";
          }
        }
        setAuthToken(token);

        if (!user) throw new Error("User is undefined");
        const signupRole = typeof window !== "undefined" ? (localStorage.getItem("smarthire_signup_role") as UserRole | null) : null;
        const baseProfile = buildProfileFromAuth0(user);
        if (signupRole) {
          baseProfile.role = signupRole;
          if (signupRole === "recruiter") {
            baseProfile.company = null;
          }
        }

        let dbProfile: UserProfile = baseProfile;
        try {
          dbProfile = await syncProfileToBackend(baseProfile);
        } catch (backendErr) {
          console.warn("Backend sync failed, falling back to Auth0 profile:", backendErr);
          dbProfile = {
            ...baseProfile,
            onboardingCompleted: true,
          };
        }

        if (signupRole && typeof window !== "undefined") {
          localStorage.removeItem("smarthire_signup_role");
        }
        if (isMounted) {
          setProfile(dbProfile);
          if (dbProfile.candidateId) {
            try {
              const saved = await fetchSavedJobIdsApi(dbProfile.candidateId);
              if (isMounted) {
                setSavedJobIds(saved);
              }
            } catch (err) {
              console.error("Failed to fetch saved jobs:", err);
            }
          }
        }
      } catch (err) {
        console.error("Auth sync error:", err);
        if (isMounted && user) {
          const fallback = buildProfileFromAuth0(user);
          setProfile({ ...fallback, onboardingCompleted: true });
        }
      } finally {
        isSyncingRef.current = false;
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    syncAuth();

    return () => {
      isMounted = false;
    };
  }, [user, isAuthenticated, auth0Loading, getAccessTokenSilently, logout]);

  const toggleSaveJob = useCallback(
    async (jobId: string) => {
      const strId = String(jobId);

      // Prevent accidental duplicate save requests while the same save operation is already pending
      if (pendingSavesRef.current.has(strId)) {
        return;
      }

      if (!profile?.candidateId) {
        setSavedJobIds((prev) =>
          prev.includes(strId) ? prev.filter((id) => id !== strId) : [...prev, strId]
        );
        return;
      }

      // Snapshot previous state for rollback on error
      const previousState = [...savedJobIdsRef.current];

      // Optimistic update: immediately update frontend state
      setSavedJobIds((prev) =>
        prev.includes(strId) ? prev.filter((id) => id !== strId) : [...prev, strId]
      );

      pendingSavesRef.current.add(strId);

      try {
        const response = await toggleSavedJobApi(profile.candidateId, strId);
        const isSaved = response.saved;
        const targetId = String(response.job_id);
        // Synchronize with confirmed backend state
        setSavedJobIds((prev) => {
          if (isSaved) {
            return prev.includes(targetId) ? prev : [...prev, targetId];
          }
          return prev.filter((id) => id !== targetId);
        });
      } catch (err: any) {
        console.error("Failed to toggle saved job:", err);
        // Rollback on failure
        setSavedJobIds(previousState);
        toast.error("Failed to update saved job. Please try again.");
      } finally {
        pendingSavesRef.current.delete(strId);
      }
    },
    [profile]
  );

  const refreshUser = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setSavedJobIds([]);
      return;
    }
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    try {
      const baseProfile = buildProfileFromAuth0(user);
      const dbProfile = await syncProfileToBackend(baseProfile);
      setProfile(dbProfile);
      if (dbProfile.candidateId) {
        try {
          const saved = await fetchSavedJobIdsApi(dbProfile.candidateId);
          setSavedJobIds(saved);
        } catch (err) {
          console.error("Failed to fetch saved jobs:", err);
        }
      }
    } catch (err) {
      console.error("Failed to refresh user:", err);
    } finally {
      isSyncingRef.current = false;
    }
  }, [user]);

  const updateCandidate = useCallback(
    async (
      data: { name: string; dob?: string; resumeName?: string; resumeUrl?: string; resumeText?: string; phone?: string; location?: string },
      options?: { is_onboarding_completion?: boolean; is_profile_update?: boolean }
    ) => {
      if (!profile) return;
      const updated = buildUpdatedCandidate(profile, data);
      setProfile(updated);
      try {
        const dbProfile = await syncProfileToBackend(updated, { is_profile_update: true, ...options });
        setProfile(dbProfile);
        if (dbProfile.candidateId) {
          try {
            const saved = await fetchSavedJobIdsApi(dbProfile.candidateId);
            setSavedJobIds(saved);
          } catch (err) {
            console.error("Failed to fetch saved jobs:", err);
          }
        }
      } catch (err) {
        console.error("Failed to persist candidate profile to database:", err);
        throw err;
      }
    },
    [profile]
  );

  const updateRecruiter = useCallback(
    async (data: RecruiterOnboardingData | string, company?: string) => {
      if (!profile) return;
      if (typeof data === "string") {
        const updated = buildUpdatedRecruiter(profile, data, company || "");
        setProfile(updated);
        try {
          const dbProfile = await syncProfileToBackend(updated);
          setProfile(dbProfile);
        } catch (err) {
          console.error("Failed to persist recruiter profile to database:", err);
        }
      } else {
        try {
          const dbProfile = await syncRecruiterOnboardingToBackend(profile, data);
          setProfile(dbProfile);
        } catch (err) {
          console.error("Failed to persist recruiter onboarding details to database:", err);
          throw err;
        }
      }
    },
    [profile]
  );

  const uploadResume = useCallback(
    async (file: File): Promise<ResumeBackendResponse | null> => {
      if (!profile?.candidateId) throw new Error("Candidate profile not found");
      const result = await uploadResumeApi(profile.candidateId, file);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              resumeId: result.id,
              resumeName: result.file_name,
              resumeUrl: result.file_url,
            }
          : null
      );
      return result;
    },
    [profile]
  );

  const updateAccountProfile = useCallback(
    async (name: string, pictureUrl?: string | null) => {
      if (!profile) return;
      const auth0Id = profile.auth0Id || profile.id;
      const result = await updateAccountProfileApi({
        auth0_id: auth0Id,
        name,
        picture_url: pictureUrl,
      });
      setProfile((prev) => (prev ? applyBackendData(prev, result) : null));
    },
    [profile]
  );

  const uploadProfilePhoto = useCallback(
    async (file: File): Promise<string | null> => {
      if (!profile) return null;
      const auth0Id = profile.auth0Id || profile.id;
      try {
        const result = await uploadProfilePhotoApi(auth0Id, file);
        const resolvedUrl = getAvatarUrl(result.picture_url);
        setProfile((prev) => (prev ? { ...prev, picture: resolvedUrl } : null));
        return resolvedUrl;
      } catch (err) {
        console.error("Failed to upload profile photo:", err);
        return null;
      }
    },
    [profile]
  );

  const removeProfilePhoto = useCallback(async () => {
    if (!profile) return;
    const auth0Id = profile.auth0Id || profile.id;
    try {
      await removeProfilePhotoApi(auth0Id);
      setProfile((prev) => (prev ? { ...prev, picture: undefined } : null));
    } catch (err) {
      console.error("Failed to remove profile photo:", err);
    }
  }, [profile]);

  const clearSession = useCallback(() => {
    clearAuthSession();
    setProfile(null);
    setSavedJobIds([]);
    setIsLoading(false);
    logout({ openUrl: false }).catch(() => {});
  }, [logout]);

  const deleteAccount = useCallback(async () => {
    if (!profile) return;
    const auth0Id = profile.auth0Id || profile.id;
    await deleteAccountApi(auth0Id);
    clearSession();
  }, [profile, clearSession]);

  return (
    <UserContext.Provider
      value={{
        profile,
        isLoading: isLoading || (isAuthenticated && !profile),
        savedJobIds,
        toggleSaveJob,
        refreshUser,
        updateCandidate,
        updateRecruiter,
        uploadResume,
        updateAccountProfile,
        uploadProfilePhoto,
        removeProfilePhoto,
        deleteAccount,
        clearSession,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextType {
  return useContext(UserContext);
}
