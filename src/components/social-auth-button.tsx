import * as React from "react"

export function SocialAuthDivider({ label = "OR" }: { label?: string }) {
  return (
    <div className="relative my-4 flex items-center justify-center">
      <div className="w-full border-t border-[#E6E0D6]" />
      <span className="absolute bg-cream px-3 text-[11px] font-mono uppercase tracking-wider text-[#A8A199]">
        {label}
      </span>
    </div>
  );
}

interface GoogleAuthButtonProps {
  onClick: () => void;
  disabled?: boolean;
  text?: string;
}

export function GoogleAuthButton({
  onClick,
  disabled = false,
  text = "Continue with Google",
}: GoogleAuthButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2.5 rounded-md border border-[#E6E0D6] bg-white px-4 py-3 text-xs font-medium text-charcoal shadow-2xs transition-colors hover:bg-stone-50 hover:border-stone-300 disabled:opacity-50 cursor-pointer"
    >
      <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#EA4335"
          d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
        />
        <path
          fill="#4285F4"
          d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
        />
        <path
          fill="#FBBC05"
          d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2c0 2.8.7 5.5 1.9 7.9l3.7-2.9z"
        />
        <path
          fill="#34A853"
          d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
        />
      </svg>
      <span>{text}</span>
    </button>
  );
}
