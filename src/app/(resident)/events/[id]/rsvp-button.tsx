"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Check, UserPlus, UserMinus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleEventAttendance } from "@/lib/actions/events";

interface Props {
  eventId: string;
  initialAttending: boolean;
  initialPaid: boolean;
  hasFee: boolean;
  feeDisplay: string | null;
}

export function RsvpButton({
  eventId,
  initialAttending,
  initialPaid,
  hasFee,
  feeDisplay,
}: Props) {
  const t = useTranslations("Events");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [attending, setAttending] = useState(initialAttending);
  const [paid] = useState(initialPaid);
  const [error, setError] = useState<string | null>(null);

  // For paid events: if the user is RSVP'd but hasn't paid, surface that.
  // Actual checkout integration is wired up once we pick a provider.
  const paymentPending = attending && hasFee && !paid;

  const onToggle = () => {
    setError(null);
    start(async () => {
      const res = await toggleEventAttendance({ eventId });
      if (res.ok) {
        setAttending(res.attending);
        router.refresh();
      } else {
        setError(t("rsvpError"));
      }
    });
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        className={cn(
          "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition shadow-sm",
          attending
            ? "bg-white border border-forest-300 text-forest-700 hover:border-red-300 hover:text-red-700"
            : "btn-gold",
        )}
      >
        {pending ? (
          "..."
        ) : attending ? (
          <>
            <Check className="w-4 h-4" /> {t("attendingYou")}
            <span className="text-xs text-forest-500">· {t("rsvpCancelHint")}</span>
          </>
        ) : (
          <>
            <UserPlus className="w-4 h-4" /> {t("rsvp")}
            {hasFee && feeDisplay ? (
              <span className="text-xs opacity-80">· {feeDisplay}</span>
            ) : null}
          </>
        )}
      </button>

      {paymentPending && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {t("paymentPending")}
          {feeDisplay ? ` (${feeDisplay})` : null}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
