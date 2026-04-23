"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Pencil, KeyRound, Check } from "lucide-react";
import { adminUpdateUser, adminResetPassword } from "@/lib/actions/users";

interface Resident {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  villaNumber: number | null;
  counts: {
    tennis: number;
    restaurant: number;
    tickets: number;
  };
}

interface Props {
  resident: Resident;
}

export function ResidentRow({ resident }: Props) {
  const t = useTranslations("Admin");
  const tProfile = useTranslations("Profile");
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "edit" | "reset">("idle");
  const [pending, start] = useTransition();
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [name, setName] = useState(resident.name);
  const [email, setEmail] = useState(resident.email);
  const [phone, setPhone] = useState(resident.phone ?? "");

  // Reset-password state
  const [newPassword, setNewPassword] = useState("");

  const closeModal = () => {
    if (pending) return;
    setMode("idle");
    setError(null);
    setName(resident.name);
    setEmail(resident.email);
    setPhone(resident.phone ?? "");
    setNewPassword("");
  };

  const submitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await adminUpdateUser({
        userId: resident.id,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      if (res.ok) {
        setMode("idle");
        setFlash(t("residentUpdated"));
        setTimeout(() => setFlash(null), 2800);
        router.refresh();
      } else if (res.error === "EMAIL_TAKEN") {
        setError(tProfile("emailTaken"));
      } else {
        setError(tProfile("saveError"));
      }
    });
  };

  const submitReset = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await adminResetPassword({
        userId: resident.id,
        newPassword,
      });
      if (res.ok) {
        setMode("idle");
        setNewPassword("");
        setFlash(t("passwordResetDone"));
        setTimeout(() => setFlash(null), 2800);
      } else {
        setError(tProfile("saveError"));
      }
    });
  };

  return (
    <>
      <tr className="hover:bg-cream-50/30">
        <td className="py-2.5 px-4 font-mono text-forest-600">
          {resident.villaNumber != null
            ? String(resident.villaNumber).padStart(3, "0")
            : "—"}
        </td>
        <td className="py-2.5 px-4 font-medium text-forest-900">
          {resident.name}
        </td>
        <td className="py-2.5 px-4 text-forest-600 break-all">
          {resident.email}
        </td>
        <td className="py-2.5 px-4 text-forest-600 font-mono">
          {resident.phone || "—"}
        </td>
        <td className="py-2.5 px-4 text-center text-forest-600">
          {resident.counts.tennis}
        </td>
        <td className="py-2.5 px-4 text-center text-forest-600">
          {resident.counts.restaurant}
        </td>
        <td className="py-2.5 px-4 text-center text-forest-600">
          {resident.counts.tickets}
        </td>
        <td className="py-2.5 px-4 text-right whitespace-nowrap">
          <div className="inline-flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setMode("edit")}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-forest-100 text-forest-700 hover:border-gold-400 hover:text-forest-900 transition"
              title={t("edit")}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("edit")}</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("reset")}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-forest-100 text-forest-700 hover:border-gold-400 hover:text-forest-900 transition"
              title={t("resetPassword")}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("resetPassword")}</span>
            </button>
          </div>
        </td>
      </tr>

      {flash && mode === "idle" && (
        <tr className="bg-forest-50/60">
          <td
            colSpan={8}
            className="px-4 py-1.5 text-xs text-forest-700 border-b border-forest-100"
          >
            <span className="inline-flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-forest-600" /> {flash}
            </span>
          </td>
        </tr>
      )}

      {mode !== "idle" && (
        <tr>
          <td colSpan={8} className="p-0">
            <div
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-up"
              onClick={() => !pending && closeModal()}
            >
              <div
                className="w-full sm:max-w-md bg-ivory-50 rounded-t-3xl sm:rounded-3xl shadow-edel-lg overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {mode === "edit" ? (
                  <form onSubmit={submitEdit}>
                    <ModalHeader
                      eyebrow={
                        resident.villaNumber != null
                          ? `Villa ${String(resident.villaNumber).padStart(3, "0")}`
                          : undefined
                      }
                      title={t("editResident")}
                    />
                    <div className="px-6 py-6 space-y-4">
                      <Field label={tProfile("name")}>
                        <input
                          type="text"
                          required
                          minLength={2}
                          maxLength={80}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="input-luxury"
                          disabled={pending}
                        />
                      </Field>
                      <Field label={tProfile("email")}>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="input-luxury"
                          disabled={pending}
                        />
                      </Field>
                      <Field label={tProfile("phone")}>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="input-luxury"
                          disabled={pending}
                          placeholder="+90 5xx xxx xx xx"
                        />
                      </Field>

                      {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                          {error}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                          type="button"
                          onClick={closeModal}
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
                    </div>
                  </form>
                ) : (
                  <form onSubmit={submitReset}>
                    <ModalHeader
                      eyebrow={resident.name}
                      title={t("resetPasswordTitle")}
                    />
                    <div className="px-6 py-6 space-y-4">
                      <p className="text-sm text-forest-700 leading-relaxed">
                        {t("resetPasswordBody")}
                      </p>
                      <Field label={t("newPassword")}>
                        <input
                          type="text"
                          required
                          minLength={8}
                          maxLength={100}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="input-luxury font-mono"
                          disabled={pending}
                          autoComplete="off"
                        />
                        <p className="mt-1.5 text-xs text-forest-500">
                          {tProfile("passwordMinHint")}
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
                          onClick={closeModal}
                          disabled={pending}
                          className="btn-outline py-2.5 text-sm"
                        >
                          {t("cancel")}
                        </button>
                        <button
                          type="submit"
                          disabled={pending || newPassword.length < 8}
                          className="btn-primary py-2.5 text-sm"
                        >
                          {pending ? "…" : t("save")}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </td>
        </tr>
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

function ModalHeader({
  eyebrow,
  title,
}: {
  eyebrow?: string;
  title: string;
}) {
  return (
    <div className="bg-gradient-itokent px-6 py-5 text-center">
      {eyebrow && (
        <div className="text-[10px] uppercase tracking-[0.2em] text-brass-400 mb-1">
          {eyebrow}
        </div>
      )}
      <h3 className="text-ivory-50 font-display text-2xl">{title}</h3>
    </div>
  );
}
