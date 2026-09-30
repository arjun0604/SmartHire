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
        "fixed inset-y-0 left-0 flex flex-col shrink-0 h-screen bg-cream z-30",
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
      className={cn("flex-1 min-w-0 max-w-full flex flex-col overflow-x-hidden ml-14 sm:ml-16 lg:ml-20", className)}
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
