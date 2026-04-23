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

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await createEvent({
        titleTr, titleEn, descTr, descEn, location,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      });
      if (res.ok) {
        setOk(true);
        setTitleTr(""); setTitleEn(""); setDescTr(""); setDescEn("");
        setLocation(""); setStartsAt(""); setEndsAt("");
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
