"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  startRegistration,
  confirmRegistration,
  resendVerification,
} from "@/lib/actions/register";

type Stage = "form" | "verify" | "done";

export function RegisterFlow() {
  const t = useTranslations("Register");
  const router = useRouter();
  const locale = useLocale();
  const localeKey = (locale === "en" ? "en" : "tr") as "tr" | "en";

  const [stage, setStage] = useState<Stage>("form");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Step-1 form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [villaNumber, setVillaNumber] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  // Step-2 state
  const [code, setCode] = useState("");

  const errorLabel = (key: string | null): string => {
    if (!key) return "";
    // Map server error codes to human strings; fall back to generic.
    const map: Record<string, string> = {
      EMAIL_TAKEN: t("errEmailTaken"),
      VILLA_NOT_FOUND: t("errVillaNotFound"),
      EMAIL_SEND_FAILED: t("errEmailSendFailed"),
      WRONG_CODE: t("errWrongCode"),
      EXPIRED: t("errExpired"),
      TOO_MANY_ATTEMPTS: t("errTooManyAttempts"),
      NOT_FOUND: t("errExpired"),
      PASSWORD_MISMATCH: t("errPasswordMismatch"),
      PASSWORD_TOO_SHORT: t("errPasswordTooShort"),
    };
    return map[key] || t("errGeneric");
  };

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (password.length < 8) {
      setError(errorLabel("PASSWORD_TOO_SHORT"));
      return;
    }
    if (password !== passwordConfirm) {
      setError(errorLabel("PASSWORD_MISMATCH"));
      return;
    }
    const villaNum = parseInt(villaNumber, 10);
    if (!Number.isFinite(villaNum) || villaNum < 1 || villaNum > 250) {
      setError(errorLabel("VILLA_NOT_FOUND"));
      return;
    }

    start(async () => {
      const res = await startRegistration({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        villaNumber: villaNum,
        password,
        locale: localeKey,
      });
      if (!res.ok) {
        setError(errorLabel(res.error));
        return;
      }
      setStage("verify");
    });
  };

  const submitCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!/^\d{6}$/.test(code)) {
      setError(errorLabel("WRONG_CODE"));
      return;
    }
    start(async () => {
      const res = await confirmRegistration({
        email: email.trim().toLowerCase(),
        code,
      });
      if (!res.ok) {
        setError(errorLabel(res.error));
        return;
      }
      setStage("done");
      // Small delay so the success banner is visible, then send them in.
      setTimeout(() => router.push("/login"), 1800);
    });
  };

  const doResend = () => {
    setError(null);
    setInfo(null);
    start(async () => {
      const res = await resendVerification({
        email: email.trim().toLowerCase(),
        locale: localeKey,
      });
      if (!res.ok) {
        setError(errorLabel(res.error));
        return;
      }
      setInfo(t("codeResent"));
    });
  };

  // ─── STAGE: final success ───────────────────────────────────────────
  if (stage === "done") {
    return (
      <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-200 text-sm px-4 py-4 text-center">
        <div className="font-medium mb-1">{t("successTitle")}</div>
        <div className="text-xs opacity-80">{t("successBody")}</div>
      </div>
    );
  }

  // ─── STAGE: verify code ─────────────────────────────────────────────
  if (stage === "verify") {
    return (
      <form onSubmit={submitCode} className="space-y-5">
        <div className="text-[12px] text-ivory-200/80 leading-relaxed">
          {t("verifyBody", { email })}
        </div>

        <div>
          <label className="label-dark">{t("code")}</label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            className="input-dark font-mono tracking-[0.5em] text-center text-lg"
            placeholder="••••••"
            maxLength={6}
          />
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-400/30 text-red-200 text-sm px-4 py-2.5">
            {error}
          </div>
        )}
        {info && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-200 text-sm px-4 py-2.5">
            {info}
          </div>
        )}

        <button
          type="submit"
          disabled={pending || code.length !== 6}
          className="w-full mt-2 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full
                     bg-gradient-brass text-ink-900 font-medium tracking-wider uppercase text-sm
                     shadow-edel-lg hover:shadow-edel transition-all duration-300 active:scale-[0.98]
                     disabled:opacity-50"
        >
          {pending ? (
            <span className="inline-block h-3 w-3 rounded-full border border-ink-900/30 border-t-ink-900 animate-spin" />
          ) : (
            t("verifyCta")
          )}
        </button>

        <div className="flex items-center justify-between text-[11px] pt-1">
          <button
            type="button"
            onClick={() => {
              setStage("form");
              setError(null);
              setInfo(null);
              setCode("");
            }}
            className="text-ivory-300/70 hover:text-ivory-100 tracking-wider uppercase"
            disabled={pending}
          >
            {t("changeEmail")}
          </button>
          <button
            type="button"
            onClick={doResend}
            className="text-brass-400 hover:text-brass-300 tracking-wider uppercase"
            disabled={pending}
          >
            {t("resend")}
          </button>
        </div>
      </form>
    );
  }

  // ─── STAGE: form ────────────────────────────────────────────────────
  return (
    <form onSubmit={submitForm} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-dark">{t("firstName")}</label>
          <input
            type="text"
            required
            minLength={1}
            maxLength={60}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="input-dark"
            autoComplete="given-name"
          />
        </div>
        <div>
          <label className="label-dark">{t("lastName")}</label>
          <input
            type="text"
            required
            minLength={1}
            maxLength={60}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="input-dark"
            autoComplete="family-name"
          />
        </div>
      </div>

      <div>
        <label className="label-dark">{t("email")}</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-dark"
          autoComplete="email"
          placeholder="ad.soyad@example.com"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-dark">{t("phone")}</label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input-dark"
            autoComplete="tel"
            placeholder="+90 5xx xxx xx xx"
          />
        </div>
        <div>
          <label className="label-dark">{t("villaNumber")}</label>
          <input
            type="text"
            inputMode="numeric"
            required
            value={villaNumber}
            onChange={(e) =>
              setVillaNumber(e.target.value.replace(/\D/g, "").slice(0, 3))
            }
            className="input-dark font-mono"
            placeholder="42"
          />
        </div>
      </div>

      <div>
        <label className="label-dark">{t("password")}</label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-dark"
          autoComplete="new-password"
          placeholder="••••••••"
        />
        <p className="mt-1 text-[10px] text-ivory-300/50 tracking-wide">
          {t("passwordHint")}
        </p>
      </div>

      <div>
        <label className="label-dark">{t("passwordConfirm")}</label>
        <input
          type="password"
          required
          minLength={8}
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          className="input-dark"
          autoComplete="new-password"
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
