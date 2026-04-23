"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, CalendarDays, Sparkles, Megaphone,
  Wrench, UserPlus, Users, LogOut, Menu, X,
} from "lucide-react";
import { useState } from "react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { BrandIcon } from "@/components/brand-mark";
import { cn } from "@/lib/utils";

export function AdminShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string; email: string };
}) {
  const t = useTranslations("Admin");
  const nav = useTranslations("Nav");
  const brand = useTranslations("Brand");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = [
    { href: "/admin", label: t("tabs.overview"), icon: LayoutDashboard },
    { href: "/admin/bookings", label: t("tabs.bookings"), icon: CalendarDays },
    { href: "/admin/events", label: t("tabs.events"), icon: Sparkles },
    { href: "/admin/announcements", label: t("tabs.announcements"), icon: Megaphone },
    { href: "/admin/maintenance", label: t("tabs.maintenance"), icon: Wrench },
    { href: "/admin/guests", label: t("tabs.guests"), icon: UserPlus },
    { href: "/admin/residents", label: t("tabs.residents"), icon: Users },
  ];

  const Logo = (
    <div className="flex items-center gap-3">
      <BrandIcon size={34} scheme="light" />
      <div className="leading-none">
        <div className="font-serif font-semibold tracking-logo text-lg text-ivory-50 uppercase">
          {brand("name")}
        </div>
        <div className="font-script text-sm text-teal-200 italic -mt-0.5 ml-4">
          {brand("suffix")}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ivory-canvas flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex w-64 bg-itokent-canvas text-ivory-50 flex-col border-r border-ivory-50/5">
        <div className="p-6 border-b border-ivory-50/10">
          {Logo}
          <div className="eyebrow-dark mt-4">{nav("admin")}</div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {items.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 pl-6 pr-4 py-3 text-sm tracking-wide transition",
                  active
                    ? "bg-white/5 text-brass-300 border-l-2 border-brass-400"
                    : "text-ivory-200 border-l-2 border-transparent hover:bg-white/5 hover:text-ivory-50",
                )}
              >
                <Icon className="w-4 h-4 opacity-80" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-ivory-50/10 space-y-3">
          <div className="px-2 text-xs">
            <div className="font-medium text-ivory-100">{user.name}</div>
            <div className="truncate text-ivory-400/70">{user.email}</div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <LocaleSwitcher variant="dark" />
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="p-2 rounded-full text-ivory-400 hover:bg-white/5 transition"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Content + mobile header */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-30 bg-itokent-canvas text-ivory-50 border-b border-ivory-50/10">
          <div className="px-4 h-16 flex items-center justify-between">
            <button onClick={() => setOpen(true)} className="p-2 -ml-2 rounded-full hover:bg-white/5">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center leading-none">
              <span className="font-serif font-semibold tracking-logo text-lg uppercase">
                {brand("name")}
              </span>
              <span className="font-script text-xs text-teal-200 italic -mt-0.5 ml-5">
                {brand("suffix")}
              </span>
            </div>
            <LocaleSwitcher variant="dark" />
          </div>
        </header>

        {open && (
          <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setOpen(false)}>
            <div className="absolute inset-0 bg-itokent-950/60 backdrop-blur-sm" />
            <aside
              className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-itokent-canvas text-ivory-50 flex flex-col animate-fade-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 flex items-center justify-between border-b border-ivory-50/10">
                {Logo}
                <button onClick={() => setOpen(false)} className="p-2 rounded-full hover:bg-white/5">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto py-3">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 pl-6 pr-4 py-3 text-sm tracking-wide transition",
                        active
                          ? "bg-white/5 text-brass-300 border-l-2 border-brass-400"
                          : "text-ivory-200 border-l-2 border-transparent hover:bg-white/5",
                      )}
                    >
                      <Icon className="w-4 h-4 opacity-80" /> {item.label}
                    </Link>
                  );
                })}
              </nav>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="p-4 flex items-center gap-3 text-ivory-300 border-t border-ivory-50/10 tracking-wide"
              >
                <LogOut className="w-4 h-4" /> {nav("logout")}
              </button>
            </aside>
          </div>
        )}

        <main className="flex-1 overflow-x-hidden">
          <div className="max-w-6xl mx-auto p-4 lg:p-10 animate-fade-up">{children}</div>
        </main>
      </div>
    </div>
  );
}
