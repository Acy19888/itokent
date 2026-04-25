"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Pencil, KeyRound, Trash2, Check } from "lucide-react";
import {
  adminUpdateUser,
  adminResetPassword,
  adminDeleteUser,
} from "@/lib/actions/users";

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

type Mode = "idle" | "edit" | "reset" | "delete";

export function ResidentRow({ resident }: Props) {
  const t = useTranslations("Admin");
  const tProfile = useTranslations("Profile");
  const tRegister = useTranslations("Register");
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("idle");
  const [pending, start] = useTransition();
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Portal guard — the row renders in server-rendered markup.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Edit form state
  const [name, setName] = useState(resident.name);
  const [email, setEmail] = useState(resident.email);
  const [phone, setPhone] = useState(resident.phone ?? "");
  const [villaNumber, setVillaNumber] = useState(
    resident.villaNumber != null ? String(resident.villaNumber) : "",
  );

  // Reset-password state
  const [newPassword, setNewPassword] = useState("");

  const closeModal = () => {
    if (pending) return;
    setMode("idle");
    setError(null);
    setName(resident.name);
    setEmail(resident.email);
    setPhone(resident.phone ?? "");
    setVillaNumber(
      resident.villaNumber != null ? String(resident.villaNumber) : "",
    );
    setNewPassword("");
  };

  const submitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Villa number: allow empty (detach) or a valid 1–250 number.
    let villaArg: number | null | undefined = undefined;
    if (villaNumber.trim() === "") {
      villaArg = null;
    } else {
      const n = parseInt(villaNumber, 10);
      if (!Number.isFinite(n) || n < 1 || n > 250) {
        setError(tRegister("errVillaNotFound"));
        return;
      }
      villaArg = n;
    }

    start(async () => {
      const res = await adminUpdateUser({
        userId: resident.id,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        villaNumber: villaArg,
      });
      if (res.ok) {
        setMode("idle");
        setFlash(t("residentUpdated"));
        setTimeout(() => setFlash(null), 2800);
        router.refresh();
      } else if (res.error === "EMAIL_TAKEN") {
        setError(tProfile("emailTaken"));
      } else if (res.error === "VILLA_NOT_FOUND") {
        setError(tRegister("errVillaNotFound"));
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

  const submitDelete = () => {
    setError(null);
    start(async () => {
      const res = await adminDeleteUser({ userId: resident.id });
      if (res.ok) {
        setMode("idle");
        setFlash(t("residentDeleted"));
        // Flash disappears when the row disappears on refresh, but keep
        // a safety timeout in case something blocks the refresh.
        setTimeout(() => setFlash(null), 2800);
        router.refresh();
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
            <button
              type="button"
              onClick={() => setMode("delete")}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-red-100 text-red-700 hover:border-red-400 hover:bg-red-50 transition"
              title={t("deleteResident")}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("deleteResident")}</span>
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

      {mode !== "idle" &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-up"
            onClick={() => !pending && closeModal()}
          >
            <div
              className="w-full max-w-md max-h-[85vh] overflow-y-auto bg-ivory-50 rounded-3xl shadow-edel-lg"
              onClick={(e) => e.stopPropagation()}
            >
              {mode === "edit" && (
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
                    <div className="grid grid-cols-2 gap-3">
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
                      <Field label={tRegister("villaNumber")}>
                        <input
                          type="text"
                          inputMode="numeric"
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
              )}

              {mode === "reset" && (
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

              {mode === "delete" && (
                <div>
                  <div className="bg-gradient-to-br from-red-700 to-red-900 px-6 py-5 text-center">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-red-200 mb-1">
                      {resident.villaNumber != null
                        ? `Villa ${String(resident.villaNumber).padStart(3, "0")}`
                        : resident.name}
                    </div>
                    <h3 className="text-ivory-50 font-display text-2xl">
                      {t("deleteResidentConfirmTitle")}
                    </h3>
                  </div>
                  <div className="px-6 py-6 space-y-4">
                    <p className="text-sm text-forest-800 leading-relaxed">
                      {t("deleteResidentConfirmBody", {
                        name: resident.name,
                      })}
                    </p>

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
                        {t("deleteResidentConfirmNo")}
                      </button>
                      <button
                        type="button"
                        onClick={submitDelete}
                        disabled={pending}
                        className="inline-flex items-center justify-center gap-2 py-2.5 text-sm rounded-full bg-red-700 hover:bg-red-800 text-ivory-50 font-medium tracking-wider uppercase transition disabled:opacity-50"
                      >
                        {pending ? "…" : t("deleteResidentConfirmYes")}
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
