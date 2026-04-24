"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { approveParty, markPartyPaid, rejectParty } from "@/lib/actions/admin";

interface Props {
  id: string;
  /** Current status so we hide approve/reject on already-decided rows. */
  status: string;
  /** Existing fee in minor units, if one was set previously. */
  existingFee?: number | null;
  /** Already paid? */
  paid?: boolean;
}

export function PartyActions({ id, status, existingFee, paid }: Props) {
  const t = useTranslations("Admin");
  const [pending, start] = useTransition();
  const router = useRouter();
  const [showFee, setShowFee] = useState(false);
  const [feeTry, setFeeTry] = useState<string>(
    existingFee ? String(existingFee / 100) : "",
  );

  const doApprove = () => {
    start(async () => {
      const fee = feeTry.trim() === "" ? null : Number(feeTry);
      await approveParty(id, fee ?? null);
      setShowFee(false);
      router.refresh();
    });
  };

  const doMarkPaid = () => {
    start(async () => {
      await markPartyPaid(id);
      router.refresh();
    });
  };

  if (status === "APPROVED") {
    // Once approved, let admin flip "paid" manually (e.g. cash / wire).
    return (
      <div className="flex gap-2 items-center">
        {existingFee != null && existingFee > 0 && !paid && (
          <button
            disabled={pending}
            onClick={doMarkPaid}
            className="px-3 py-1.5 rounded-lg bg-gold-500 text-forest-950 text-xs hover:bg-gold-400"
          >
            {t("markPaid")}
          </button>
        )}
      </div>
    );
  }

  if (status !== "PENDING") return null;

  if (showFee) {
    return (
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="number"
          min={0}
          step={1}
          placeholder="TL"
          value={feeTry}
          onChange={(e) => setFeeTry(e.target.value)}
          className="px-2 py-1 rounded border border-forest-200 text-xs w-24"
        />
        <button
          disabled={pending}
          onClick={doApprove}
          className="px-3 py-1.5 rounded-lg bg-forest-800 text-cream-50 text-xs hover:bg-forest-700"
        >
          {t("approveWithFee")}
        </button>
        <button
          type="button"
          onClick={() => setShowFee(false)}
          className="px-3 py-1.5 rounded-lg border border-forest-200 text-forest-600 text-xs hover:bg-forest-50"
        >
          {t("cancel")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        disabled={pending}
        onClick={() => setShowFee(true)}
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
