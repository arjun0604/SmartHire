import { useState } from "react"
import { Link } from "react-router-dom"
import { useAuth0 } from "@auth0/auth0-react"
import { AlertCircle, Loader2, ArrowRight } from "lucide-react"
import { SocialAuthDivider, GoogleAuthButton } from "@components/social-auth-button"

export function LoginForm() {
  const { loginWithPopup, isLoading, isAuthenticated } = useAuth0();
  const [authLoading, setAuthLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isInactiveTimeout] = useState(() => {
    return window.location.search.includes("reason=inactivity");
  });

  const handleLogin = async (connection?: string): Promise<void> => {
    try {
      setAuthLoading(true);
      setErrorMsg("");

      await loginWithPopup(
        connection
          ? {
              authorizationParams: { connection },
            }
          : undefined
      );
    } catch (err: unknown) {
      console.error("Auth0 Login Error:", err);
      const authError = err as { error?: string; message?: string; error_description?: string };
      setErrorMsg(authError?.error_description || authError?.message || "Authentication failed. Please check browser console.");
    } finally {
      setAuthLoading(false);
    }
  };

  const busy = isLoading || authLoading || isAuthenticated;

  if (isAuthenticated) {
    return (
      <div className="w-full max-w-md flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="size-6 animate-spin text-terracotta" />
        <p className="text-xs font-medium text-[#78716C]">Signing you in...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal tracking-tight mt-1.5">
          Welcome back
        </h1>
        <p className="text-xs sm:text-sm text-[#78716C] mt-2 leading-relaxed">
          Sign in to your dashboard to review pending candidatures and manage interviews.
        </p>
      </div>

      {isInactiveTimeout && (
        <div className="mb-6 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-800">
          <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-600" />
          <p>You have been logged out due to inactivity.</p>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 flex items-start gap-2 rounded-md border border-red-200 bg-red-50/80 p-3 text-xs text-red-700">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <p>{errorMsg}</p>
        </div>
      )}

      <div className="space-y-4">
        <button
          type="button"
          disabled={busy}
          onClick={() => handleLogin()}
          className="w-full rounded-md bg-terracotta py-3 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-terracotta-dark active:bg-[#652D18] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin text-white" />
          ) : (
            <>
              <span>Sign in to dashboard</span>
              <ArrowRight className="size-4" />
            </>
          )}
        </button>

        <SocialAuthDivider />

        <GoogleAuthButton
          disabled={busy}
          onClick={() => handleLogin("google-oauth2")}
        />
      </div>

      <div className="mt-6 text-center text-xs text-[#78716C]">
        Don&apos;t have an account?{" "}
        <Link
          to="/signup"
          className="font-medium text-terracotta hover:text-terracotta-dark underline underline-offset-4"
        >
          Create one
        </Link>
      </div>
    </div>
  );
}
