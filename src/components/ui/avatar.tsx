import * as React from "react"
import { cn } from "@utils/cn"
import { getBackendUrl } from "@utils/api"

function Avatar({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full select-none items-center justify-center",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function AvatarImage({ className, src, alt, ...props }: React.ComponentProps<"img">) {
  const [hasError, setHasError] = React.useState(false);

  const resolvedSrc = src ? getBackendUrl(src) : "";

  React.useEffect(() => {
    setHasError(false);
  }, [resolvedSrc]);

  if (!resolvedSrc || hasError) return null;

  return (
    <img
      src={resolvedSrc}
      alt={alt || ""}
      onError={() => setHasError(true)}
      className={cn(
        "absolute inset-0 aspect-square size-full object-cover rounded-full z-10",
        className
      )}
      {...props}
    />
  );
}

function AvatarFallback({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-charcoal",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { Avatar, AvatarImage, AvatarFallback }
