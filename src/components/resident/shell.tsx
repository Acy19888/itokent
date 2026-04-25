"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import {
  Home, CalendarCheck, PartyPopper, UtensilsCrossed,
  Sparkles, UserPlus, Megaphone, Wrench, User, LogOut, Menu, X,
  Receipt,
} from "lucide-react";
import { useState } from "react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { BrandIcon } from "@/components/brand-mark";
import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  user: { name: string; email: string; villaNumber: number | null };
}

export function ResidentShell({ children, user }: Props) {
  const t = useTranslations("Nav");
  const brand = useTranslations("Brand");
  const home = useTranslations("Home");
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const mainNav = [
    { href: "/home", label: t("home"), icon: Home },
    { href: "/tennis", label: t("tennis"), icon: CalendarCheck },
    { href: "/restaurant", label: t("restaurant"), icon: UtensilsCrossed },
    { href: "/events", label: t("events"), icon: Sparkles },
    { href: "/profile", label: t("profile"), icon: User },
  ];

  const drawerNav = [
    { href: "/home", label: t("home"), icon: Home },
    { href: "/tennis", label: t("tennis"), icon: CalendarCheck },
    { href: "/party-house", label: t("partyHouse"), icon: PartyPopper },
    { href: "/restaurant", label: t("restaurant"), icon: UtensilsCrossed },
    { href: "/events", label: t("events"), icon: Sparkles },
    { href: "/guests", label: t("guests"), icon: UserPlus },
    { href: "/announcements", label: t("announcements"), icon: Megaphone },
    { href: "/maintenance", label: t("maintenance"), icon: Wrench },
    { href: "/payments", label: t("payments"), icon: Receipt },
    { href: "/profile", label: t("profile"), icon: User },
  ];

  return (
    <div className="min-h-screen bg-ivory-canvas">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-lg border-b border-ivory-200">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2 -ml-2 rounded-full text-itokent-800 hover:bg-ivory-100 transition"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link href="/home" className="flex flex-col items-center leading-none">
            <span className="font-serif font-semibold tracking-logo text-lg text-itokent-900 uppercase">
              {brand("name")}
            </span>
            <span className="font-script text-xs text-teal-600 italic -mt-0.5 ml-6">
              {brand("suffix")}
            </span>
          </Link>

          <LocaleSwitcher variant="light" />
        </div>
        <span className="block h-px bg-gradient-to-r from-transparent via-brass-400/30 to-transparent" />
      </header>

      {/* Drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-itokent-950/60 backdrop-blur-sm" />
          <aside
            className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-itokent-canvas text-ivory-50 flex flex-col animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="p-6 pt-7 border-b border-ivory-50/10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <BrandIcon size={36} scheme="light" />
                  <div className="leading-none">
                    <p className="font-serif tracking-logo text-lg text-ivory-50 uppercase">
                      {brand("name")}
                    </p>
                    <p className="font-script text-sm text-teal-200 italic ml-4 -mt-0.5">
                      {brand("suffix")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-2 -mr-2 hover:bg-white/5 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-6">
                <p className="eyebrow-dark">{home("greeting")}</p>
                <p className="font-serif text-2xl text-ivory-50 mt-1">{user.name.split(" ")[0]}</p>
                {user.villaNumber && (
                  <p className="text-sm text-teal-200/80 mt-0.5 tracking-wide">
                    {home("villa")} {String(user.villaNumber).padStart(3, "0")}
                  </p>
                )}
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto py-3">
              {drawerNav.map((item) => {
                const active = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 pl-6 pr-4 py-3 text-sm transition tracking-wide",
                      active
                        ? "bg-white/5 text-brass-300 border-l-2 border-brass-400"
                        : "text-ivory-200 border-l-2 border-transparent hover:bg-white/5 hover:text-ivory-50",
                    )}
                  >
                    <Icon className="w-5 h-5 opacity-80" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-3 px-6 py-4 text-sm text-ivory-400 hover:bg-white/5 border-t border-ivory-50/10 tracking-wide"
            >
              <LogOut className="w-5 h-5" />
              {t("logout")}
            </button>
          </aside>
        </div>
      )}

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 pb-mobile-nav animate-fade-up">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-lg border-t border-ivory-200
                      shadow-[0_-8px_24px_-12px_rgba(21,48,32,0.08)]">
        <div className="max-w-2xl mx-auto grid grid-cols-5 h-[4.5rem]">
          {mainNav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 text-[10px] uppercase tracking-widest transition",
                  active ? "text-itokent-800" : "text-ink-400 hover:text-itokent-900",
                )}
              >
                <span className={cn(
                  "flex items-center justify-center w-9 h-9 rounded-full transition",
                  active ? "bg-itokent-50" : "bg-transparent",
                )}>
                  <Icon className="w-[18px] h-[18px]" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
