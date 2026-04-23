"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { markReservation } from "@/lib/actions/restaurant";
import { CheckCircle2, UserX } from "lucide-react";

export function ReservationActions({ id }: { id: string }) {
  const t = useTranslations("RestaurantApp");
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-1.5">
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            await markReservation(id, "CHECK_IN");
            router.refresh();
          })
        }
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-gold text-forest-950 text-xs font-medium"
      >
        <CheckCircle2 className="w-3.5 h-3.5" /> {t("checkIn")}
      </button>
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            await markReservation(id, "NO_SHOW");
            router.refresh();
          })
        }
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-500/40 text-red-300 text-xs hover:bg-red-500/10"
      >
        <UserX className="w-3.5 h-3.5" /> {t("noShow")}
      </button>
    </div>
  );
}
