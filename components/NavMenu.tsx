"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Code2, Building2, LogOut, Menu, X, Pencil } from "lucide-react";
import { useAuth } from "@/app/app/video-simulation/auth/authContext";

const menuItems = [
  { label: "Content Generation", icon: Pencil, href: "/app/content-generator" },
  { label: "Developer", icon: Code2, href: "/app/developer" },
  { label: "Organizations", icon: Building2, href: "/app/organizations" },
];

export default function NavMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 mt-2 w-56 rounded-xl bg-background shadow-lg overflow-hidden z-50"
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
        </>
      )}
    </div>
  );
}
