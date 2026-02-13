"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Code2, Tag, LayoutDashboard, Building2, LogOut,
  CalendarDays, FileText, CheckSquare, ImageIcon, Sparkles,
  ChevronRight,
} from "lucide-react";

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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Top-level items (no children)
const topItems = [
  { label: "Developer", icon: Code2, href: "/app/developer" },
  { label: "Brands", icon: Tag, href: "/app/brands" },
];

// Control Center with sub-items
const controlCenterItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/app/content-generator" },
  { label: "Content", icon: FileText, href: "/app/content-generator/content" },
  { label: "Calendar", icon: CalendarDays, href: "/app/content-generator/calendar" },
  { label: "Reviews", icon: CheckSquare, href: "/app/content-generator/reviews" },
  { label: "Assets", icon: ImageIcon, href: "/app/content-generator/assets" },
  { label: "AI Generation", icon: Sparkles, href: "/app/content-generator/ai" },
];

// Bottom items
const bottomItems = [
  { label: "Organizations", icon: Building2, href: "/app/organizations" },
];


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, login, logout } = useAuth();
  const redirected = useRef(false);

  const isControlCenterActive = pathname.startsWith("/app/content-generator");
  const [controlOpen, setControlOpen] = useState(isControlCenterActive);

  // Keep collapsible open when navigating within control center
  useEffect(() => {
    if (isControlCenterActive) setControlOpen(true);
  }, [isControlCenterActive]);

  const isAuthCallback = typeof window !== 'undefined' && window.location.search.includes('code=');

  useEffect(() => {
    if (!loading && !user && !isAuthCallback && !redirected.current) {
      redirected.current = true;
      login();
    }
  }, [loading, user, isAuthCallback, login]);

  if (loading || (!user && !isAuthCallback)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-foreground" />
      </div>
    );
  }

  const renderItem = (item: { label: string; icon: React.ComponentType<{ className?: string }>; href: string }) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
    return (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
          <Link href={item.href}>
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <Sidebar collapsible="icon" variant="sidebar">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="dble">
                <Link href="/app">
                  <Image src="/logo.png" alt="dble" width={16} height={16} className="h-4 w-4 shrink-0" />
                  <span>dble</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              {/* Top items */}
              {topItems.map(renderItem)}

              {/* Control Center - collapsible */}
              <Collapsible open={controlOpen} onOpenChange={setControlOpen} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      asChild
                      tooltip="Content Generator"
                      isActive={isControlCenterActive}
                    >
                      <Link href="/app/content-generator">
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Content Generator</span>
                        <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </Link>
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {controlCenterItems.map((sub) => {
                        const isSubActive = pathname === sub.href ||
                          (sub.href !== "/app/content-generator" && pathname.startsWith(sub.href + "/"));
                        return (
                          <SidebarMenuSubItem key={sub.href}>
                            <SidebarMenuSubButton asChild isActive={isSubActive}>
                              <Link href={sub.href}>
                                <sub.icon className="h-3.5 w-3.5" />
                                <span>{sub.label}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Bottom items */}
              {bottomItems.map(renderItem)}
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
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
