import { useState, useEffect } from "react"
import { Building2 } from "lucide-react"
import { getBackendUrl } from "../../utils/api"
import { getInitials } from "../../utils/formatters"
import { cn } from "../../utils/cn"

export interface CompanyLogoProps {
  logoUrl?: string | null;
  companyName?: string | null;
  className?: string;
  fallbackClassName?: string;
  alt?: string;
}

export function CompanyLogo({
  logoUrl,
  companyName,
  className,
  fallbackClassName,
  alt,
}: CompanyLogoProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [logoUrl]);

  const cleanUrl = logoUrl ? getBackendUrl(logoUrl) : null;
  const initials = getInitials(companyName || "");

  if (cleanUrl && !hasError) {
    return (
      <img
        src={cleanUrl}
        alt={alt || companyName || "Company logo"}
        onError={() => setHasError(true)}
        className={cn(
          "size-10 rounded-lg object-contain border border-[#E6E0D6] bg-cream p-1 shrink-0",
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "size-10 rounded-lg bg-cream border border-[#E6E0D6] flex items-center justify-center font-serif font-bold text-charcoal shrink-0 shadow-3xs",
        className,
        fallbackClassName
      )}
      aria-label={companyName || "Company"}
    >
      {initials ? (
        <span>{initials}</span>
      ) : (
        <Building2 className="size-1/2 text-[#8E877D]" />
      )}
    </div>
  );
}

