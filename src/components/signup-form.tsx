import { useState } from "react"
import { Link } from "react-router-dom"
import { useAuth0 } from "@auth0/auth0-react"
import { AlertCircle, Loader2, ArrowRight } from "lucide-react"
import { useUser } from "@context/UserContext"
import { SocialAuthDivider, GoogleAuthButton } from "@components/social-auth-button"

export function SignupForm() {
  const { refreshUser } = useUser();
  const { loginWithPopup, isLoading } = useAuth0();
  const [authLoading, setAuthLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [role, setRole] = useState<"candidate" | "recruiter">("candidate");

  const handleRoleSelect = (selectedRole: "candidate" | "recruiter") => {
    setRole(selectedRole);
  };

  const handleSignup = async (connection?: string): Promise<void> => {
    try {
      setAuthLoading(true);
      setErrorMsg("");

      await loginWithPopup({
        authorizationParams: {
          screen_hint: "signup",
          role: role,
          ...(connection ? { connection } : {}),
        },
      });

      refreshUser();
    } catch (err: unknown) {
      const authError = err as { error?: string; message?: string; error_description?: string };
      if (authError?.error !== "cancelled") {
        setErrorMsg(authError?.error_description || authError?.message || "");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const busy = isLoading || authLoading;

  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal tracking-tight mt-1.5">
          Create your account
        </h1>
        <p className="text-xs sm:text-sm text-[#78716C] mt-2 leading-relaxed">
          Access the leading ecosystem for vetted high-growth career placements.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 flex items-start gap-2 rounded-md border border-red-200 bg-red-50/80 p-3 text-xs text-red-700">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <p className="flex-1">{errorMsg}</p>
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-charcoal mb-2.5">
            I am registering as a
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleRoleSelect("candidate")}
              className={`flex items-center gap-2.5 rounded-md border px-3.5 py-3 text-xs font-medium transition-all text-left cursor-pointer ${
                role === "candidate"
                  ? "border-terracotta bg-white text-charcoal ring-1 ring-terracotta/20 shadow-2xs"
                  : "border-stone-200 bg-transparent text-stone-500 hover:border-stone-400"
              }`}
            >
              <span
                className={`flex size-3.5 items-center justify-center rounded-full border ${
                  role === "candidate"
                    ? "border-terracotta"
                    : "border-stone-300"
                }`}
              >
                {role === "candidate" && (
                  <span className="size-1.5 rounded-full bg-terracotta" />
                )}
              </span>
              <span>Candidate</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect("recruiter")}
              className={`flex items-center gap-2.5 rounded-md border px-3.5 py-3 text-xs font-medium transition-all text-left cursor-pointer ${
                role === "recruiter"
                  ? "border-terracotta bg-white text-neutral-900 ring-1 ring-terracotta/20 shadow-2xs"
                  : "border-[#E6E0D6] bg-transparent text-[#78716C] hover:border-stone-400"
              }`}
            >
              <span
                className={`flex size-3.5 items-center justify-center rounded-full border ${
                  role === "recruiter"
                    ? "border-terracotta"
                    : "border-[#A8A199]"
                }`}
              >
                {role === "recruiter" && (
                  <span className="size-1.5 rounded-full bg-terracotta" />
                )}
              </span>
              <span>Recruiter</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => handleSignup()}
          className="w-full rounded-md bg-terracotta py-3 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-terracotta-dark active:bg-[#652D18] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin text-white" />
          ) : (
            <>
              <span>Create platform account</span>
              <ArrowRight className="size-4" />
            </>
          )}
        </button>

        <SocialAuthDivider />

        <GoogleAuthButton
          disabled={busy}
          onClick={() => handleSignup("google-oauth2")}
        />
      </div>

      <div className="mt-6 text-center text-xs text-[#78716C]">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-medium text-terracotta hover:text-terracotta-dark underline underline-offset-4"
        >
          Log in instead
        </Link>
      </div>
    </div>
  );
}
