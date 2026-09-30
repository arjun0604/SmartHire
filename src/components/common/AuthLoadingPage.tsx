import { SmartHireLogo } from "@components/smart-hire-logo"

export function AuthLoadingPage({
  title = "Verifying your session",
  subtitle = "Connecting your account and preparing your workspace...",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="min-h-screen w-full bg-cream flex flex-col items-center justify-center p-4 sm:p-6 font-sans select-none">
      <div className="w-full max-w-sm rounded-2xl border border-[#E6E0D6] bg-white p-7 sm:p-8 shadow-xs flex flex-col items-center text-center space-y-5">
        <SmartHireLogo
          className="flex items-center gap-2.5"
          iconClassName="size-8"
          textClassName="font-serif text-xl font-bold tracking-tight text-charcoal"
        />

        <div className="space-y-1.5">
          <h2 className="font-serif text-base sm:text-lg font-bold text-charcoal">
            {title}
          </h2>
          <p className="text-xs text-[#78716C] leading-relaxed max-w-xs">
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 pt-1 text-xs text-[#8E877D]">
          <div className="size-4 border-2 border-terracotta border-t-transparent rounded-full animate-spin" />
          <span className="font-medium">Loading workspace</span>
        </div>
      </div>
    </div>
  );
}
