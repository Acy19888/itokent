"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Check, Pencil, X } from "lucide-react";
import { updateOwnProfile } from "@/lib/actions/users";

interface Props {
  initial: {
    name: string;
    email: string;
    phone: string;
  };
}

export function ProfileForm({ initial }: Props) {
  const t = useTranslations("Profile");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setError(null);
    start(async () => {
      const res = await updateOwnProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      if (res.ok) {
        setFlash(t("saved"));
        setEditing(false);
        setTimeout(() => setFlash(null), 2800);
        router.refresh();
      } else if (res.error === "EMAIL_TAKEN") {
        setError(t("emailTaken"));
      } else {
        setError(t("saveError"));
      }
    });
  };

  const onCancel = () => {
    setName(initial.name);
    setEmail(initial.email);
    setPhone(initial.phone);
    setEditing(false);
    setError(null);
  };

  if (!editing) {
    return (
      <div className="space-y-3">
        <InfoRow label={t("name")} value={initial.name} />
        <InfoRow label={t("email")} value={initial.email} mono />
        <InfoRow label={t("phone")} value={initial.phone || "—"} mono />

        <div className="pt-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 text-sm font-medium text-forest-700 hover:text-forest-900 transition"
          >
            <Pencil className="w-4 h-4" /> {t("edit")}
          </button>
        </div>

        {flash && (
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-forest-50 border border-forest-100 px-3 py-1.5 text-xs text-forest-700">
            <Check className="w-3.5 h-3.5 text-forest-600" /> {flash}
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label-luxury" htmlFor="profile-name">
          {t("name")}
        </label>
        <input
          id="profile-name"
          type="text"
          required
          minLength={2}
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-luxury"
          disabled={pending}
        />
      </div>

      <div>
        <label className="label-luxury" htmlFor="profile-email">
          {t("email")}
        </label>
        <input
          id="profile-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-luxury"
          disabled={pending}
          autoComplete="email"
        />
      </div>

      <div>
        <label className="label-luxury" htmlFor="profile-phone">
          {t("phone")}
        </label>
        <input
          id="profile-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="input-luxury"
          disabled={pending}
          autoComplete="tel"
          placeholder="+90 5xx xxx xx xx"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-2"
        >
          <Check className="w-4 h-4" /> {pending ? "…" : t("save")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="btn-outline px-5 py-2.5 text-sm inline-flex items-center gap-2"
        >
          <X className="w-4 h-4" /> {t("cancel")}
        </button>
      </div>
    </form>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-forest-100 pb-2 last:border-b-0 last:pb-0">
      <span className="text-[11px] uppercase tracking-wider text-forest-500 shrink-0">
        {label}
      </span>
      <span
        className={
          "text-sm font-medium text-forest-900 text-right break-all " +
          (mono ? "font-mono" : "")
        }
      >
        {value}
      </span>
    </div>
  );
}
