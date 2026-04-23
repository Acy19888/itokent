"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { updateTicketStatus } from "@/lib/actions/maintenance";

export function TicketActions({ id, status }: { id: string; status: "OPEN" | "IN_PROGRESS" }) {
  const t = useTranslations("Admin");
  const [pending, start] = useTransition();
  const router = useRouter();

  const act = (next: "IN_PROGRESS" | "RESOLVED") => {
    start(async () => {
      await updateTicketStatus(id, next);
      router.refresh();
    });
  };

  return (
    <div className="flex gap-2">
      {status === "OPEN" && (
        <button
          disabled={pending}
          onClick={() => act("IN_PROGRESS")}
          className="px-3 py-1.5 rounded-lg bg-forest-800 text-cream-50 text-xs hover:bg-forest-700"
        >
          {t("markInProgress")}
        </button>
      )}
      <button
        disabled={pending}
        onClick={() => act("RESOLVED")}
        className="px-3 py-1.5 rounded-lg bg-gradient-gold text-forest-950 text-xs font-medium"
      >
        {t("markResolved")}
      </button>
    </div>
  );
}
