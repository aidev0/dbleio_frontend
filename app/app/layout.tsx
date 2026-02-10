"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Code2, Video, Building2, Workflow, LogOut } from "lucide-react";
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

const navItems = [
  {
    label: "Developer",
    icon: Code2,
    href: "/app/developer",
    disabled: false,
  },
  {
    label: "Workflows",
    icon: Workflow,
    href: "/app/workflows",
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
              {navItems.map((item) => {
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
                  tooltip={user.email}
                  className="cursor-default hover:bg-transparent active:bg-transparent"
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-foreground text-[9px] font-medium text-background">
                    {user.email.charAt(0).toUpperCase()}
                  </span>
                  <span className="truncate font-mono text-xs text-muted-foreground">
                    {user.email}
                  </span>
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

      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
