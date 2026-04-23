"use client";

import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import { UtensilsCrossed, LogOut } from "lucide-react";
import { LocaleSwitcher } from "@/components/locale-switcher";

export function RestaurantShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string };
}) {
  const t = useTranslations("RestaurantApp");
  const brand = useTranslations("Brand");

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
        <span className="block h-px bg-gradient-to-r from-transparent via-brass-400/40 to-transparent" />
      </header>

      <main className="max-w-5xl mx-auto p-4 lg:p-8 animate-fade-up">{children}</main>
    </div>
  );
}
