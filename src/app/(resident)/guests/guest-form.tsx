"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { addGuest } from "@/lib/actions/guests";
import { Check } from "lucide-react";

export function GuestForm() {
  const t = useTranslations("Guests");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [ok, setOk] = useState(false);

  const [name, setName] = useState("");
  const [plate, setPlate] = useState("");
  const [arrives, setArrives] = useState("");
  const [purpose, setPurpose] = useState("");

  const minDatetime = new Date(Date.now() - 60 * 60 * 1000).toISOString().slice(0, 16);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await addGuest({
        name,
        plate: plate || undefined,
        arrivesAt: new Date(arrives).toISOString(),
        purpose: purpose || undefined,
      });
      if (res.ok) {
        setOk(true);
        setName(""); setPlate(""); setArrives(""); setPurpose("");
        router.refresh();
        setTimeout(() => setOk(false), 3000);
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="label-luxury">{t("name")}</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} className="input-luxury" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-luxury">{t("plate")}</label>
          <input value={plate} onChange={(e) => setPlate(e.target.value)} className="input-luxury" placeholder="34 ABC 123" />
        </div>
        <div>
          <label className="label-luxury">{t("arrivesAt")}</label>
          <input
            required
            type="datetime-local"
            min={minDatetime}
            value={arrives}
            onChange={(e) => setArrives(e.target.value)}
            className="input-luxury"
          />
        </div>
      </div>
      <div>
        <label className="label-luxury">{t("purpose")}</label>
        <input value={purpose} onChange={(e) => setPurpose(e.target.value)} className="input-luxury" />
      </div>
      <button type="submit" disabled={pending} className="btn-gold w-full">
        {pending ? "..." : t("submit")}
      </button>
      {ok && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-forest-50 text-forest-700 text-sm">
          <Check className="w-4 h-4" /> ✓
        </div>
      )}
    </form>
  );
}
