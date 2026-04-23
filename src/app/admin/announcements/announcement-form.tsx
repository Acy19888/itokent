"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createAnnouncement } from "@/lib/actions/admin";
import { Check } from "lucide-react";

type Priority = "NORMAL" | "HIGH" | "URGENT";

export function AnnouncementForm() {
  const router = useRouter();
  const t = useTranslations("Common");
  const ann = useTranslations("Announcements");
  const [pending, start] = useTransition();
  const [ok, setOk] = useState(false);

  const [titleTr, setTitleTr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [bodyTr, setBodyTr] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [priority, setPriority] = useState<Priority>("NORMAL");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await createAnnouncement({ titleTr, titleEn, bodyTr, bodyEn, priority });
      if (res.ok) {
        setOk(true);
        setTitleTr(""); setTitleEn(""); setBodyTr(""); setBodyEn("");
        setPriority("NORMAL");
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
          <label className="label-luxury">İçerik (TR)</label>
          <textarea rows={4} required value={bodyTr} onChange={(e) => setBodyTr(e.target.value)} className="input-luxury" />
        </div>
        <div>
          <label className="label-luxury">Body (EN)</label>
          <textarea rows={4} required value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} className="input-luxury" />
        </div>
      </div>
      <div>
        <label className="label-luxury">Priority</label>
        <div className="grid grid-cols-3 gap-2">
          {(["NORMAL", "HIGH", "URGENT"] as Priority[]).map((p) => (
            <button
              type="button"
              key={p}
              onClick={() => setPriority(p)}
              className={
                "px-3 py-2 rounded-lg border text-sm font-medium transition " +
                (priority === p
                  ? "bg-gradient-gold text-forest-950 border-transparent"
                  : "bg-white border-forest-200 text-forest-700")
              }
            >
              {ann(`priority.${p}`)}
            </button>
          ))}
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
