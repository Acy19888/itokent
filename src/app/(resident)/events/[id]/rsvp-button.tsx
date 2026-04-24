"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, UserPlus, CreditCard, X } from "lucide-react";
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
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Portal target guard — don't try to render the modal during SSR.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const paymentPending = attending && hasFee && !paid;

  const doRsvp = () => {
    setError(null);
    start(async () => {
      const res = await toggleEventAttendance({ eventId });
      if (!res.ok) {
        setError(t("rsvpError"));
        return;
      }
      setAttending(res.attending);
      if (res.attending && res.needsPayment) {
        router.push(`/events/${eventId}/checkout`);
        return;
      }
      router.refresh();
    });
  };

  const doCancel = () => {
    setError(null);
    start(async () => {
      const res = await toggleEventAttendance({ eventId });
      if (!res.ok) {
        setError(t("rsvpError"));
        return;
      }
      setAttending(false);
      setConfirmOpen(false);
      router.refresh();
    });
  };

  // ─── NOT attending: single CTA ──────────────────────────────────
  if (!attending) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={doRsvp}
          disabled={pending}
          className="btn-gold w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium shadow-sm"
        >
          {pending ? (
            "..."
          ) : (
            <>
              <UserPlus className="w-4 h-4" /> {t("rsvp")}
              {hasFee && feeDisplay ? (
                <span className="text-xs opacity-80">· {feeDisplay}</span>
              ) : null}
            </>
          )}
        </button>
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    );
  }

  // ─── Attending: status pill + secondary cancel + optional pay-now ─
  return (
    <div className="space-y-2">
      <div className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-forest-50 text-forest-800 border border-forest-200 font-medium">
        <Check className="w-4 h-4 text-forest-700" />
        {t("attendingYou")}
      </div>

      {paymentPending && (
        <Link
          href={`/events/${eventId}/checkout`}
          className="btn-gold w-full flex items-center justify-center gap-2"
        >
          <CreditCard className="w-4 h-4" />
          {t("payNow")} {feeDisplay ? `· ${feeDisplay}` : null}
        </Link>
      )}

      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={pending}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-forest-200 text-forest-600 text-sm hover:border-red-300 hover:text-red-700 hover:bg-red-50 transition"
      >
        <X className="w-4 h-4" />
        {t("cancelRsvp")}
      </button>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Cancel confirmation modal — portaled so it escapes the article's
          stacking context. Matches the tennis cancel dialog in tone. */}
      {confirmOpen && mounted && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => !pending && setConfirmOpen(false)}
        >
          <div
            className="w-full max-w-md bg-ivory-50 rounded-3xl overflow-hidden shadow-edel-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="px-6 py-5 text-center"
              style={{
                background:
                  "linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #7f1d1d 100%)",
              }}
            >
              <div className="text-[10px] uppercase tracking-[0.2em] text-red-200 mb-1">
                {t("title")}
              </div>
              <h3 className="text-ivory-50 font-display text-2xl">
                {t("cancelRsvpConfirmTitle")}
              </h3>
            </div>
            <div className="px-6 py-6">
              <p className="text-sm text-forest-700 leading-relaxed mb-6">
                {t("cancelRsvpConfirmBody")}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setConfirmOpen(false)}
                  disabled={pending}
                  className="btn-outline py-3 text-sm"
                >
                  {t("cancelRsvpConfirmNo")}
                </button>
                <button
                  onClick={doCancel}
                  disabled={pending}
                  className={cn(
                    "py-3 text-sm rounded-full font-semibold text-white",
                    "bg-red-700 hover:bg-red-800 transition",
                    "disabled:opacity-60 disabled:cursor-not-allowed",
                  )}
                >
                  {pending ? "…" : t("cancelRsvpConfirmYes")}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
