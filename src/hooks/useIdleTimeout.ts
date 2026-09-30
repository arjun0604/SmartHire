import { useEffect, useRef, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useUser } from "../context/UserContext";
import { getLogoutReturnToUrl } from "../utils/auth-sync";

interface IdleTimeoutOptions {
  timeoutSeconds?: number;
  onIdle?: () => void;
}

export function useIdleTimeout({
  timeoutSeconds = 15,
  onIdle,
}: IdleTimeoutOptions = {}) {
  const { isAuthenticated, logout } = useAuth0();
  const { clearSession } = useUser();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoutOnIdle = useCallback(() => {
    if (!isAuthenticated) return;

    clearSession();

    if (onIdle) {
      onIdle();
    }

    const returnTo = getLogoutReturnToUrl({ reason: "inactivity" });
    const targetUrl = new URL(returnTo);
    window.history.replaceState(null, "", targetUrl.pathname + targetUrl.search);

    logout({
      logoutParams: {
        returnTo,
      },
    });
  }, [isAuthenticated, logout, clearSession, onIdle]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (isAuthenticated) {
      timerRef.current = setTimeout(handleLogoutOnIdle, timeoutSeconds * 1000);
    }
  }, [isAuthenticated, handleLogoutOnIdle, timeoutSeconds]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
    ];

    resetTimer();

    const handleActivity = () => resetTimer();
    activityEvents.forEach((evt) =>
      window.addEventListener(evt, handleActivity, { passive: true })
    );

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      activityEvents.forEach((evt) =>
        window.removeEventListener(evt, handleActivity)
      );
    };
  }, [isAuthenticated, resetTimer]);
}
