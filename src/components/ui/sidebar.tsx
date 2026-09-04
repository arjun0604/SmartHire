import * as React from "react"
import { cn } from "@utils/cn"

function SidebarProvider({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex min-h-screen w-full max-w-full min-w-0 overflow-x-hidden bg-cream", className)}
      {...props}
    >
      {children}
    </div>
  );
}

function Sidebar({
  className,
  children,
  collapsible: _collapsible,
  ...props
}: React.ComponentProps<"aside"> & {
  collapsible?: string;
}) {
  return (
    <aside
      className={cn(
        "flex flex-col shrink-0 h-screen sticky top-0 bg-cream z-30",
        className
      )}
      {...props}
    >
      {children}
    </aside>
  );
}

function SidebarHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col shrink-0", className)}
      {...props}
    />
  );
}

function SidebarContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-1 flex-col overflow-auto", className)}
      {...props}
    />
  );
}

function SidebarInset({
  className,
  children,
  ...props
}: React.ComponentProps<"main">) {
  return (
    <main
      className={cn("flex-1 min-w-0 max-w-full flex flex-col overflow-x-hidden", className)}
      {...props}
    >
      {children}
    </main>
  );
}

export {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
}
