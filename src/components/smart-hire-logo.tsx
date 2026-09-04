import smartHireLogoImg from "../assets/SmartHire_Logo_only.png"

export function SmartHireIcon({ className = "size-6" }: { className?: string }) {
  return (
    <img
      src={smartHireLogoImg}
      alt="SmartHire"
      className={`object-contain select-none pointer-events-none ${className}`}
    />
  );
}

export function SmartHireLogo({
  className = "flex items-center gap-2.5",
  iconClassName = "size-7",
  textClassName = "font-serif text-lg font-bold tracking-tight text-charcoal",
  brandText = "SmartHire",
}: {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  brandText?: string;
}) {
  return (
    <div className={className}>
      <SmartHireIcon className={iconClassName} />
      <span className={textClassName}>{brandText}</span>
    </div>
  );
}
