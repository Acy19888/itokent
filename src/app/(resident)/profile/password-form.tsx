"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, KeyRound } from "lucide-react";
import { changeOwnPassword } from "@/lib/actions/users";

export function PasswordForm() {
  const t = useTranslations("Profile");
  const [pending, start] = useTransition();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setFlash(null);
    start(async () => {
      const res = await changeOwnPassword({ currentPassword, newPassword });
      if (res.ok) {
        setFlash(t("passwordChanged"));
        setCurrentPassword("");
        setNewPassword("");
        setTimeout(() => setFlash(null), 3200);
      } else if (res.error === "WRONG_PASSWORD") {
        setError(t("wrongPassword"));
      } else {
        setError(t("saveError"));
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label-luxury" htmlFor="current-password">
          {t("currentPassword")}
        </label>
        <input
          id="current-password"
          type="password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="input-luxury"
          disabled={pending}
          autoComplete="current-password"
        />
      </div>

      <div>
        <label className="label-luxury" htmlFor="new-password">
          {t("newPassword")}
        </label>
        <input
          id="new-password"
          type="password"
          required
          minLength={8}
          maxLength={100}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="input-luxury"
          disabled={pending}
          autoComplete="new-password"
        />
        <p className="mt-1.5 text-xs text-forest-500">{t("passwordMinHint")}</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {flash && (
        <div className="inline-flex items-center gap-2 rounded-full bg-forest-50 border border-forest-100 px-3 py-1.5 text-xs text-forest-700">
          <Check className="w-3.5 h-3.5 text-forest-600" /> {flash}
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={pending || !currentPassword || newPassword.length < 8}
          className="btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-2"
        >
          <KeyRound className="w-4 h-4" /> {pending ? "…" : t("save")}
        </button>
      </div>
    </form>
  );
}
