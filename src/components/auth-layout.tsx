import * as React from "react"
import { SmartHireLogo } from "@components/smart-hire-logo"

interface AuthLayoutProps {
  children: React.ReactNode;
  heroBadge: string;
  heroWords: string[];
  heroDescription: string;
  footerText?: string;
}

export function AuthLayout({
  children,
  heroBadge,
  heroWords,
  heroDescription,
  footerText,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-cream grid grid-cols-1 lg:grid-cols-2 font-sans text-charcoal">
      <div className="flex flex-col justify-between p-6 sm:p-10 lg:p-14 min-h-screen">
        <SmartHireLogo />

        <div className="my-auto py-8 flex justify-center">
          {children}
        </div>

        {footerText ? (
          <div className="text-[11px] text-[#A8A199] font-mono">
            {footerText}
          </div>
        ) : (
          <div />
        )}
      </div>

      <div className="hidden lg:flex relative flex-col justify-between p-12 lg:p-16 bg-cream-muted border-l border-[#E6E0D6] overflow-hidden">
        <div className="pointer-events-none absolute inset-0 grid grid-cols-4 grid-rows-4">
          <div className="border-r border-b border-[#E6E0D6]/50" />
          <div className="border-r border-b border-[#E6E0D6]/50" />
          <div className="border-r border-b border-[#E6E0D6]/50" />
          <div className="border-b border-[#E6E0D6]/50" />

          <div className="border-r border-b border-[#E6E0D6]/50" />
          <div className="border-r border-b border-[#E6E0D6]/50" />
          <div className="border-r border-b border-[#E6E0D6]/50" />
          <div className="border-b border-[#E6E0D6]/50" />

          <div className="border-r border-b border-[#E6E0D6]/50" />
          <div className="border-r border-b border-[#E6E0D6]/50" />
          <div className="border-r border-b border-[#E6E0D6]/50" />
          <div className="border-b border-[#E6E0D6]/50" />

          <div className="border-r border-b border-[#E6E0D6]/50" />
          <div className="border-r border-b border-[#E6E0D6]/50" />
          <div className="border-r border-b border-[#E6E0D6]/50" />
          <div />
        </div>

        <div className="pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-[#EAE3D8]/50 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 size-96 rounded-full bg-[#EAE3D8]/60 blur-2xl" />

        <div className="relative z-10 text-center my-auto py-12">
          <span className="text-[10px] font-mono font-semibold tracking-widest text-[#8C827A] uppercase">
            {heroBadge}
          </span>
          <h2 className="font-serif text-5xl xl:text-6xl font-black text-charcoal tracking-tight leading-[1.08] my-4">
            {heroWords.map((word, idx) => (
              <React.Fragment key={word}>
                {word}
                {idx < heroWords.length - 1 && <br />}
              </React.Fragment>
            ))}
          </h2>
          <p className="text-xs text-[#78716C] max-w-xs mx-auto leading-relaxed mt-4">
            {heroDescription}
          </p>
        </div>
      </div>
    </div>
  );
}
