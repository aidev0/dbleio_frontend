"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Code2, Video, Building2, Workflow, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "./video-simulation/auth/authContext";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar";

const sidebarItems = [
  {
    label: "Developer",
    icon: Code2,
    href: "/app/developer",
    disabled: false,
  },
  {
    label: "Content Generator",
    icon: Video,
    href: "/app/content",
    disabled: true,
  },
  {
    label: "Organizations",
    icon: Building2,
    href: "/app/organizations",
    disabled: false,
  },
];

const menuItems = [
  {
    label: "Developer",
    icon: Code2,
    href: "/app/developer",
  },
  {
    label: "Workflows",
    icon: Workflow,
    href: "/app/workflows",
  },
  {
    label: "Organizations",
    icon: Building2,
    href: "/app/organizations",
  },
];

function TopMenu({ pathname, user, logout }: { pathname: string; user: { email: string } | null; logout: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed top-4 right-5 z-50">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-md bg-background text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-xl bg-background shadow-lg overflow-hidden"
          style={{ animation: 'timeline-card-enter 0.15s ease-out' }}
        >
          <div className="py-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-5 py-3 font-mono text-sm transition-colors ${
                    isActive
                      ? "bg-foreground/5 text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
          {user && (
            <div className="py-2">
              <div className="px-5 py-1.5 font-mono text-[11px] text-muted-foreground/60 truncate">
                {user.email}
              </div>
              <button
                onClick={() => { setOpen(false); logout(); }}
                className="flex w-full items-center gap-3 px-5 py-3 font-mono text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, login, logout } = useAuth();
  const redirected = useRef(false);

  // Check for auth callback code in URL (without useSearchParams to avoid Suspense requirement)
  const isAuthCallback = typeof window !== 'undefined' && window.location.search.includes('code=');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user && !isAuthCallback && !redirected.current) {
      redirected.current = true;
      login();
    }
  }, [loading, user, isAuthCallback, login]);

  // Show loading spinner while checking auth or redirecting
  if (loading || (!user && !isAuthCallback)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-foreground" />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <Sidebar collapsible="icon" variant="sidebar">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="dble">
                <Link href="/app">
                  <Image
                    src="/logo.png"
                    alt="dble"
                    width={16}
                    height={16}
                    className="h-4 w-4 shrink-0"
                  />
                  <span>dble</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              {sidebarItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");

                if (item.disabled) {
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        disabled
                        tooltip={`${item.label} (Coming soon)`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            {user && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={[user.first_name, user.last_name].filter(Boolean).join(' ') || user.email}
                  className="cursor-default hover:bg-transparent active:bg-transparent"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[9px] font-semibold text-background">
                    {user.first_name && user.last_name
                      ? (user.first_name.charAt(0) + user.last_name.charAt(0)).toUpperCase()
                      : user.email.charAt(0).toUpperCase()}
                  </span>
                  <div className="flex flex-col min-w-0">
                    {(user.first_name || user.last_name) && (
                      <span className="truncate text-xs font-medium text-foreground">
                        {[user.first_name, user.last_name].filter(Boolean).join(' ')}
                      </span>
                    )}
                    <span className="truncate font-mono text-[10px] text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton onClick={logout} tooltip="Logout">
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <TopMenu pathname={pathname} user={user} logout={logout} />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
