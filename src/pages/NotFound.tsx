import { useNavigate } from "react-router-dom"
import { useUser } from "@context/UserContext"
import { SmartHireLogo } from "@components/smart-hire-logo"
import { ArrowRight } from "lucide-react"
import fishGif from "../assets/fish.gif"
import rouletteGif from "../assets/roulette.gif"

export default function NotFound() {
  const navigate = useNavigate();
  const { profile } = useUser();

  const getDestination = () => {
    if (!profile) return "/login";
    if (!profile.onboardingCompleted) {
      return profile.role === "recruiter" ? "/recruiter-onboarding" : "/candidate-onboarding";
    }
    return "/dashboard";
  };

  return (
    <div className="min-h-screen w-full bg-[#E2E1DD] text-[#111111] flex flex-col justify-between font-sans selection:bg-terracotta selection:text-white relative overflow-hidden">
      <header className="w-full px-6 sm:px-10 md:px-14 lg:px-16 py-6 sm:py-8 flex items-center justify-between z-20">
        <SmartHireLogo />
        <div className="flex items-center gap-6 text-[11px] font-mono uppercase tracking-widest text-[#78716C]">
          <button
            type="button"
            onClick={() => navigate(getDestination())}
            className="hover:text-[#111111] transition-colors cursor-pointer flex items-center gap-1.5 group"
          >
            <span>{profile ? "Dashboard" : "Return Home"}</span>
            <ArrowRight className="size-3 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-10 py-4 sm:py-10 z-10 w-full">
        <div className="w-full max-w-6xl mx-auto flex flex-col justify-center select-none font-nib text-[clamp(4.25rem,13.5vw,11.5rem)] leading-[0.88] text-[#111111] tracking-tight">
          <div className="w-full flex justify-end pr-2 sm:pr-8">
            <span className="font-nib italic">This page</span>
          </div>

          <div className="w-full flex items-center gap-20">
            <span className="font-nib italic">does not</span>
            <img
              src={rouletteGif}
              alt="404 roulette"
              style={{ height: "1.75em", mixBlendMode: "multiply" }}
              className="inline-block object-contain align-middle blend-multiply subtle-gif shrink-0 select-none pointer-events-none"
            />
          </div>

          <div className="w-full flex items-center gap-[0.25em] pl-[18%] sm:pl-[24%]">
            <img
              src={fishGif}
              alt="404 fish"
              style={{ height: "1em", mixBlendMode: "multiply" }}
              className="inline-block object-contain align-middle blend-multiply subtle-gif shrink-0 select-none pointer-events-none"
            />
            <span className="font-nib italic">exist</span>
          </div>
        </div>
      </main>
    </div>
  );
}
