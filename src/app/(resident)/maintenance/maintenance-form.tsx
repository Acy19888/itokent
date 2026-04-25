"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { createMaintenanceTicket } from "@/lib/actions/maintenance";
import { Check, Info } from "lucide-react";
import { MAINTENANCE_FEES } from "@/lib/maintenance-catalog";

const CATEGORIES = ["ELECTRIC", "PLUMBING", "GARDEN", "POOL", "OTHER"] as const;
const PRIORITIES = ["LOW", "NORMAL", "HIGH"] as const;

export function MaintenanceForm() {
  const t = useTranslations("Maintenance");
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("OTHER");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>("NORMAL");
  const [acceptFee, setAcceptFee] = useState(false);

  const fee = MAINTENANCE_FEES[category];
  const hasFee = fee.amount > 0;
  const feeDisplay = new Intl.NumberFormat(locale === "en" ? "en-GB" : "tr-TR", {
    style: "currency",
    currency: fee.currency,
    minimumFractionDigits: 0,
  }).format(fee.amount / 100);

  // Reset acceptance whenever the chargeable category changes — the user
  // shouldn't be able to "carry over" consent from a previous selection.
  const onCategoryChange = (c: (typeof CATEGORIES)[number]) => {
    setCategory(c);
    setAcceptFee(false);
    setError(null);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await createMaintenanceTicket({
        category,
        title,
        description,
        priority,
        acceptFee,
      });
      if (res.ok) {
        setOk(true);
        setTitle("");
        setDescription("");
        setCategory("OTHER");
        setPriority("NORMAL");
        setAcceptFee(false);
        router.refresh();
        setTimeout(() => setOk(false), 3000);
      } else if (res.error === "FEE_NOT_ACCEPTED") {
        setError(t("errFeeNotAccepted"));
      } else {
        setError(t("errSubmit"));
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="label-luxury">{t("category")}</label>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((c) => {
            const cFee = MAINTENANCE_FEES[c].amount;
            return (
              <button
                type="button"
                key={c}
                onClick={() => onCategoryChange(c)}
                className={
                  "px-2 py-2 rounded-lg border text-xs font-medium transition relative " +
                  (category === c
                    ? "bg-forest-900 text-cream-50 border-transparent"
                    : "bg-white border-forest-200 text-forest-700 hover:border-gold-400")
                }
              >
                {t(`categories.${c}`)}
                {cFee > 0 && (
                  <span
                    className={
                      "absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center " +
                      (category === c
                        ? "bg-gold-400 text-forest-950"
                        : "bg-gold-100 text-gold-700 border border-gold-300")
                    }
                    title={t("paidCategoryHint")}
                  >
                    ₺
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {hasFee && (
        <div className="rounded-lg border border-gold-300 bg-gold-50 px-3 py-3">
          <div className="flex items-start gap-2 text-gold-900">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="text-xs leading-relaxed">
              <div className="font-semibold">
                {t("feeNotice", { amount: feeDisplay })}
              </div>
              <div className="mt-1 text-gold-800">{t("feeNoticeBody")}</div>
            </div>
          </div>
          <label className="flex items-start gap-2 mt-3 text-xs text-gold-900 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptFee}
              onChange={(e) => setAcceptFee(e.target.checked)}
              className="mt-0.5 accent-forest-700"
            />
            <span>{t("feeAccept", { amount: feeDisplay })}</span>
          </label>
        </div>
      )}

      <div>
        <label className="label-luxury">{t("title_field")}</label>
        <input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} className="input-luxury" />
      </div>

      <div>
        <label className="label-luxury">{t("description")}</label>
        <textarea required rows={4} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} className="input-luxury" />
      </div>

      <div>
        <label className="label-luxury">{t("priority")}</label>
        <div className="grid grid-cols-3 gap-2">
          {PRIORITIES.map((p) => (
            <button
              type="button"
              key={p}
              onClick={() => setPriority(p)}
              className={
                "px-2 py-2 rounded-lg border text-xs font-medium transition " +
                (priority === p
                  ? "bg-gradient-gold text-forest-950 border-transparent"
                  : "bg-white border-forest-200 text-forest-700 hover:border-gold-400")
              }
            >
              {t(`priorities.${p}`)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending || (hasFee && !acceptFee)}
        className="btn-gold w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? "..." : t("submit")}
      </button>

      {ok && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-forest-50 text-forest-700 text-sm">
          <Check className="w-4 h-4" /> {t("submitted")}
        </div>
      )}
    </form>
  );
}
