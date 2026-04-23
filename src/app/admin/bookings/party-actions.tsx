"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { approveParty, rejectParty } from "@/lib/actions/admin";

export function PartyActions({ id }: { id: string }) {
  const t = useTranslations("Admin");
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="flex gap-2">
      <button
        disabled={pending}
        onClick={() => start(async () => { await approveParty(id); router.refresh(); })}
        className="px-3 py-1.5 rounded-lg bg-forest-800 text-cream-50 text-xs hover:bg-forest-700"
      >
        {t("approve")}
      </button>
      <button
        disabled={pending}
        onClick={() => start(async () => { await rejectParty(id); router.refresh(); })}
        className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs hover:bg-red-50"
      >
        {t("reject")}
      </button>
    </div>
  );
}
