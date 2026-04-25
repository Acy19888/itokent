"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserPlus } from "lucide-react";
import { adminCreateUser } from "@/lib/actions/users";

export function CreateResidentButton() {
  const t = useTranslations("Admin");
  const tR = useTranslations("Register");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [villaNumber, setVillaNumber] = useState("");
  const [password, setPassword] = useState("");

  // Portal guard — the trigger renders in server-rendered markup.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const close = () => {
    if (pending) return;
    setOpen(false);
    setError(null);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setVillaNumber("");
    setPassword("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const num = parseInt(villaNumber, 10);
    if (!Number.isFinite(num) || num < 1 || num > 250) {
      setError(tR("errVillaNotFound"));
      return;
    }
    if (password.length < 8) {
      setError(tR("errPasswordTooShort"));
      return;
    }

    start(async () => {
      const res = await adminCreateUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        villaNumber: num,
        role: "RESIDENT",
      });
      if (!res.ok) {
        const map: Record<string, string> = {
          EMAIL_TAKEN: tR("errEmailTaken"),
          VILLA_NOT_FOUND: tR("errVillaNotFound"),
        };
        setError(map[res.error] || tR("errGeneric"));
        return;
      }
      close();
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm"
      >
        <UserPlus className="w-4 h-4" />
        {t("addResident")}
      </button>

      {open && mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => !pending && close()}
          >
            <div
              className="w-full max-w-md max-h-[85vh] overflow-y-auto bg-ivory-50 rounded-3xl shadow-edel-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-itokent px-6 py-5 text-center">
                <div className="text-[10px] uppercase tracking-[0.2em] text-brass-400 mb-1">
                  {t("tabs.residents")}
                </div>
                <h3 className="text-ivory-50 font-display text-2xl">
                  {t("addResidentTitle")}
                </h3>
              </div>

              <form onSubmit={submit} className="px-6 py-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label={tR("firstName")}>
                    <input
                      type="text"
                      required
                      minLength={1}
                      maxLength={60}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="input-luxury"
                      disabled={pending}
                    />
                  </Field>
                  <Field label={tR("lastName")}>
                    <input
                      type="text"
                      required
                      minLength={1}
                      maxLength={60}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="input-luxury"
                      disabled={pending}
                    />
                  </Field>
                </div>
                <Field label={tR("email")}>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-luxury"
                    disabled={pending}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={tR("phone")}>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="input-luxury"
                      disabled={pending}
                      placeholder="+90 5xx…"
                    />
                  </Field>
                  <Field label={tR("villaNumber")}>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={villaNumber}
                      onChange={(e) =>
                        setVillaNumber(
                          e.target.value.replace(/\D/g, "").slice(0, 3),
                        )
                      }
                      className="input-luxury font-mono"
                      disabled={pending}
                      placeholder="42"
                    />
                  </Field>
                </div>
                <Field label={tR("password")}>
                  <input
                    type="text"
                    required
                    minLength={8}
                    maxLength={100}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-luxury font-mono"
                    disabled={pending}
                    placeholder="••••••••"
                    autoComplete="off"
                  />
                  <p className="mt-1.5 text-xs text-forest-500">
                    {t("tempPasswordHint")}
                  </p>
                </Field>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={close}
                    disabled={pending}
                    className="btn-outline py-2.5 text-sm"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="btn-primary py-2.5 text-sm"
                  >
                    {pending ? "…" : t("save")}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label-luxury">{label}</label>
      {children}
    </div>
  );
}
