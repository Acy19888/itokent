"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createEvent } from "@/lib/actions/admin";
import { Check } from "lucide-react";

export function EventForm() {
  const router = useRouter();
  const t = useTranslations("Common");
  const [pending, start] = useTransition();
  const [ok, setOk] = useState(false);

  const [titleTr, setTitleTr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [descTr, setDescTr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  // Fee in whole-TRY (e.g. "50" for 50 TL). Empty string = free event.
  const [feeTry, setFeeTry] = useState<string>("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      // Convert TRY → kuruş (minor units) for the server.
      const feeAmount =
        feeTry.trim() === "" ? null : Math.round(Number(feeTry) * 100);
      const res = await createEvent({
        titleTr, titleEn, descTr, descEn, location,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        feeAmount,
        feeCurrency: "TRY",
      });
      if (res.ok) {
        setOk(true);
        setTitleTr(""); setTitleEn(""); setDescTr(""); setDescEn("");
        setLocation(""); setStartsAt(""); setEndsAt(""); setFeeTry("");
        router.refresh();
        setTimeout(() => setOk(false), 2500);
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="label-luxury">Başlık (TR)</label>
          <input required value={titleTr} onChange={(e) => setTitleTr(e.target.value)} className="input-luxury" />
        </div>
        <div>
          <label className="label-luxury">Title (EN)</label>
          <input required value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className="input-luxury" />
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="label-luxury">Açıklama (TR)</label>
          <textarea rows={3} required value={descTr} onChange={(e) => setDescTr(e.target.value)} className="input-luxury" />
        </div>
        <div>
          <label className="label-luxury">Description (EN)</label>
          <textarea rows={3} required value={descEn} onChange={(e) => setDescEn(e.target.value)} className="input-luxury" />
        </div>
      </div>
      <div>
        <label className="label-luxury">Location</label>
        <input required value={location} onChange={(e) => setLocation(e.target.value)} className="input-luxury" />
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="label-luxury">Starts</label>
          <input required type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="input-luxury" />
        </div>
        <div>
          <label className="label-luxury">Ends</label>
          <input required type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="input-luxury" />
        </div>
      </div>
      <div>
        <label className="label-luxury">
          Ücret (TL) · optional — boş bırakırsanız ücretsiz
        </label>
        <input
          type="number"
          min={0}
          step={1}
          placeholder="0 = ücretsiz"
          value={feeTry}
          onChange={(e) => setFeeTry(e.target.value)}
          className="input-luxury"
        />
      </div>
      <button type="submit" disabled={pending} className="btn-gold w-full md:w-auto">
        {pending ? "..." : t("save")}
      </button>
      {ok && (
        <div className="flex items-center gap-2 text-sm text-forest-700">
          <Check className="w-4 h-4" /> ✓
        </div>
      )}
    </form>
  );
}
