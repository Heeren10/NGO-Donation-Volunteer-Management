"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, HeartHandshake, Users, Megaphone, CalendarDays, Sparkles, UserRound, LogOut, CircleDollarSign } from "lucide-react";
import { logoutAction } from "@/lib/auth-actions";

const ADMIN_TABS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/donors", label: "Donors", icon: HeartHandshake },
  { href: "/volunteers", label: "Volunteers", icon: Users },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/donate", label: "Donate page", icon: CircleDollarSign },
];

const VOLUNTEER_TABS = [
  { href: "/my", label: "My Dashboard", icon: UserRound },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/events", label: "Events", icon: CalendarDays },
];

export default function NavBar({ role }: { role: "admin" | "volunteer" }) {
  const pathname = usePathname();
  const tabs = role === "admin" ? ADMIN_TABS : VOLUNTEER_TABS;

  return (
    <nav className="sticky top-0 z-20 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center gap-1 px-6 py-3 sm:px-8">
        <span className="mr-5 flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Sparkles size={16} className="text-primary" strokeWidth={2.5} />
          NGO Platform
        </span>
        {tabs.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
                active ? "bg-primary text-primary-foreground" : "text-muted hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <Icon size={15} strokeWidth={2.25} />
              {tab.label}
            </Link>
          );
        })}
        <form action={logoutAction} className="ml-auto">
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
          >
            <LogOut size={15} strokeWidth={2.25} />
            Log out
          </button>
        </form>
      </div>
    </nav>
  );
}
