import * as React from "react"
import { cn } from "@utils/cn"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-[#E7E5E4]/70 animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton }
