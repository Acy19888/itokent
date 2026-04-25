"use client";

import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import { UtensilsCrossed, LogOut, LayoutDashboard, LayoutGrid } from "lucide-react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function RestaurantShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string };
}) {
  const t = useTranslations("RestaurantApp");
  const brand = useTranslations("Brand");
  const pathname = usePathname();

  const isLayout = pathname?.startsWith("/restaurant-app/layout-config");

  return (
    <div className="min-h-screen bg-itokent-canvas text-ivory-50">
      <header className="sticky top-0 z-30 bg-itokent-950/90 backdrop-blur-md border-b border-ivory-50/10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-brass flex items-center justify-center shadow-edel">
              <UtensilsCrossed className="w-4 h-4 text-ink-900" />
            </div>
            <div className="leading-tight">
              <div className="font-serif font-semibold tracking-logo text-lg uppercase">
                {brand("name")}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-script text-sm text-teal-200 italic leading-none">
                  {brand("suffix")}
                </span>
                <span className="h-3 w-px bg-ivory-50/20" />
                <span className="text-[10px] uppercase tracking-widest-plus text-ivory-300/80">
                  {t("title")}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
        <nav className="max-w-5xl mx-auto px-4 -mt-1 pb-2 flex gap-2 text-sm">
          <Link
            href="/restaurant-app"
            className={
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg transition " +
              (!isLayout
                ? "bg-brass-400/15 text-brass-300 border border-brass-400/30"
                : "text-cream-300 hover:text-cream-50")
            }
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            {t("navReservations")}
          </Link>
          <Link
            href="/restaurant-app/layout-config"
            className={
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg transition " +
              (isLayout
                ? "bg-brass-400/15 text-brass-300 border border-brass-400/30"
                : "text-cream-300 hover:text-cream-50")
            }
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            {t("navLayout")}
          </Link>
        </nav>
        <span className="block h-px bg-gradient-to-r from-transparent via-brass-400/40 to-transparent" />
      </header>

      <main className="max-w-5xl mx-auto p-4 lg:p-8 animate-fade-up">{children}</main>
    </div>
  );
}
