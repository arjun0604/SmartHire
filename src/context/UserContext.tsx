import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useAuth0 } from "@auth0/auth0-react"
import { syncAuthUser, getActiveSession } from "@utils/auth-sync"
import type { UserProfile } from "@utils/auth-sync"

interface UserContextType {
  profile: UserProfile | null;
  refreshUser: () => void;
}

const UserContext = createContext<UserContextType>({
  profile: null,
  refreshUser: () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth0();
  const [profile, setProfile] = useState<UserProfile | null>(() =>
    user ? syncAuthUser(user) : getActiveSession()
  );

  const refreshUser = useCallback(() => {
    const updated = user ? syncAuthUser(user) : getActiveSession();
    setProfile(updated);
  }, [user]);

  useEffect(() => {
    refreshUser();
  }, [user, refreshUser]);

  useEffect(() => {
    const handlePopState = () => refreshUser();
    const handleStorage = () => refreshUser();
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        refreshUser();
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [refreshUser]);

  return (
    <UserContext.Provider value={{ profile, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextType {
  return useContext(UserContext);
}
