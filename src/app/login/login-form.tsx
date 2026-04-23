"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

export function LoginForm() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await signIn("credentials", {
        email: email.toLowerCase(),
        password,
        redirect: false,
      });
      if (res?.error) {
        setError(t("invalidCredentials"));
        return;
      }
      const from = params.get("from") || "/";
      router.push(from);
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="label-dark">{t("email")}</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="input-dark"
          placeholder="admin@villa.com"
        />
      </div>
      <div>
        <label className="label-dark">{t("password")}</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="input-dark"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-400/30 text-red-200 text-sm px-4 py-2.5">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full mt-2 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full
                   bg-gradient-brass text-ink-900 font-medium tracking-wider uppercase text-sm
                   shadow-edel-lg hover:shadow-edel transition-all duration-300 active:scale-[0.98]
                   disabled:opacity-50"
      >
        {pending ? (
          <span className="inline-block h-3 w-3 rounded-full border border-ink-900/30 border-t-ink-900 animate-spin" />
        ) : (
          t("submit")
        )}
      </button>
    </form>
  );
}
