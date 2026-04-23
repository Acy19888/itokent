"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setUserLocale } from "@/lib/actions/locale";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ variant = "light" }: { variant?: "light" | "dark" }) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();

  const toggle = (next: "tr" | "en") => {
    if (next === locale || pending) return;
    start(async () => {
      await setUserLocale(next);
      router.refresh();
    });
  };

  const dark = variant === "dark";
  return (
    <div className={cn(
      "inline-flex rounded-full p-0.5 text-[11px] font-medium backdrop-blur-sm",
      dark
        ? "bg-white/5 border border-ivory-50/15"
        : "bg-white/70 border border-ivory-200 shadow-edel",
    )}>
      {(["tr", "en"] as const).map((l) => {
        const active = l === locale;
        return (
          <button
            key={l}
            disabled={pending}
            onClick={() => toggle(l)}
            className={cn(
              "px-3 py-1.5 rounded-full transition-all uppercase tracking-widest",
              active
                ? dark
                  ? "bg-gradient-brass text-ink-900 shadow-edel"
                  : "bg-itokent-800 text-ivory-50 shadow-edel"
                : dark
                  ? "text-ivory-300/80 hover:text-ivory-50"
                  : "text-ink-500 hover:text-itokent-900",
            )}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}
