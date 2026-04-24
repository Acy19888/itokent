"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CreditCard, Lock, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Reusable dummy-card form.  Collects holder / number / expiry / cvc,
 * formats the card-number input into 4-digit blocks, and hands the
 * raw values back to the caller.  The caller plugs in the server
 * action that actually "pays" (today: a dummy flip of `paid=true`,
 * tomorrow: an Iyzico redirect).
 */
export interface CardInput {
  holder: string;
  number: string;
  expiry: string;
  cvc: string;
}

interface Props {
  feeDisplay: string;
  onPay: (
    card: CardInput,
  ) => Promise<
    { ok: true; alreadyPaid?: boolean } | { ok: false; error: string }
  >;
  onSuccess: () => void;
}

export function CardForm({ feeDisplay, onPay, onSuccess }: Props) {
  const t = useTranslations("Payment");
  const [pending, start] = useTransition();
  const [holder, setHolder] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Format card number into "#### #### #### ####" on input, cap at 19 digits.
  const onNumberChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 19);
    const grouped = digits.match(/.{1,4}/g)?.join(" ") ?? "";
    setNumber(grouped);
  };

  // Auto-insert / between MM and YY.
  const onExpiryChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) setExpiry(digits);
    else setExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await onPay({ holder, number, expiry, cvc });
      if (res.ok) {
        setDone(true);
        // Give the user a beat to see the success state before we redirect.
        setTimeout(() => onSuccess(), 1200);
      } else {
        if (res.error === "CARD_INVALID") setError(t("errCardInvalid"));
        else if (res.error === "CARD_EXPIRED") setError(t("errCardExpired"));
        else if (res.error === "NOT_APPROVED") setError(t("errNotApproved"));
        else setError(t("errGeneric"));
      }
    });
  };

  if (done) {
    return (
      <div className="rounded-xl border-2 border-forest-300 bg-forest-50 p-6 text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-forest-600 text-cream-50 flex items-center justify-center mx-auto">
          <Check className="w-6 h-6" />
        </div>
        <div className="font-display text-xl text-forest-900">
          {t("success")}
        </div>
        <div className="text-sm text-forest-600">{feeDisplay}</div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center justify-between rounded-xl bg-gradient-forest text-cream-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4" /> {t("amount")}
        </div>
        <div className="font-display text-xl">{feeDisplay}</div>
      </div>

      <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        {t("demoBanner")}
      </div>

      <div>
        <label className="label-luxury">{t("holder")}</label>
        <input
          required
          autoComplete="cc-name"
          value={holder}
          onChange={(e) => setHolder(e.target.value)}
          className="input-luxury"
          placeholder="AHMET YILMAZ"
        />
      </div>

      <div>
        <label className="label-luxury flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5" /> {t("number")}
        </label>
        <input
          required
          inputMode="numeric"
          autoComplete="cc-number"
          value={number}
          onChange={(e) => onNumberChange(e.target.value)}
          className="input-luxury font-mono tracking-wide"
          placeholder="4242 4242 4242 4242"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-luxury">{t("expiry")}</label>
          <input
            required
            inputMode="numeric"
            autoComplete="cc-exp"
            value={expiry}
            onChange={(e) => onExpiryChange(e.target.value)}
            className="input-luxury font-mono"
            placeholder="MM/YY"
          />
        </div>
        <div>
          <label className="label-luxury">{t("cvc")}</label>
          <input
            required
            inputMode="numeric"
            autoComplete="cc-csc"
            value={cvc}
            onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="input-luxury font-mono"
            placeholder="123"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className={cn("btn-gold w-full", pending && "opacity-70")}
      >
        {pending ? t("processing") : t("payNow")}
      </button>
    </form>
  );
}
