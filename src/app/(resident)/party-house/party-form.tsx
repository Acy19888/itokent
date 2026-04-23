"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { requestPartyBooking } from "@/lib/actions/party-house";
import { Check, AlertCircle } from "lucide-react";

export function PartyForm({ takenDates }: { takenDates: string[] }) {
  const t = useTranslations("PartyHouse");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [dateKey, setDateKey] = useState("");
  const [occasion, setOccasion] = useState("");
  const [guestCount, setGuestCount] = useState(30);
  const [notes, setNotes] = useState("");

  const taken = new Set(takenDates);
  const isTaken = dateKey && taken.has(dateKey);

  const todayKey = new Date().toISOString().slice(0, 10);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isTaken) return;
    start(async () => {
      const res = await requestPartyBooking({
        dateKey,
        occasion,
        guestCount,
        notes: notes || undefined,
      });
      if (res.ok) {
        setMsg({ type: "ok", text: t("requestSubmitted") });
        setOccasion("");
        setNotes("");
        setGuestCount(30);
        setDateKey("");
        router.refresh();
      } else {
        setMsg({ type: "err", text: res.error === "DATE_TAKEN" ? t("dateTaken") : "—" });
      }
      setTimeout(() => setMsg(null), 3000);
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label-luxury">{t("selectDate")}</label>
        <input
          type="date"
          required
          min={todayKey}
          value={dateKey}
          onChange={(e) => setDateKey(e.target.value)}
          className="input-luxury"
        />
        {isTaken && (
          <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> {t("dateTaken")}
          </p>
        )}
      </div>

      <div>
        <label className="label-luxury">{t("occasion")}</label>
        <input
          required
          maxLength={120}
          value={occasion}
          onChange={(e) => setOccasion(e.target.value)}
          className="input-luxury"
          placeholder="—"
        />
      </div>

      <div>
        <label className="label-luxury">{t("guestCount")}</label>
        <input
          type="number"
          required
          min={1}
          max={300}
          value={guestCount}
          onChange={(e) => setGuestCount(Number(e.target.value))}
          className="input-luxury"
        />
      </div>

      <div>
        <label className="label-luxury">{t("notes")}</label>
        <textarea
          rows={3}
          maxLength={500}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input-luxury"
        />
      </div>

      <button type="submit" disabled={pending || !!isTaken} className="btn-gold w-full">
        {pending ? "..." : t("submit")}
      </button>

      {msg && (
        <div
          className={
            "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm " +
            (msg.type === "ok"
              ? "bg-forest-50 text-forest-700"
              : "bg-red-50 text-red-700")
          }
        >
          {msg.type === "ok" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}
    </form>
  );
}
