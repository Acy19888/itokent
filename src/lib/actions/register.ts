"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { sendEmail, emailVerificationEmail } from "@/lib/email";

/**
 * Self-serve registration — two server actions:
 *
 *   1. `startRegistration(payload)` validates the form, creates an
 *      `EmailVerification` row, and emails the 6-digit code.
 *   2. `confirmRegistration({ email, code })` verifies the code and, if
 *      correct, creates the User row and deletes the staged record.
 *
 * We deliberately do NOT create the User until the code is confirmed.
 * That way an unverified email can never log in, and abandoned sign-ups
 * simply expire (15 min TTL).
 *
 * Locale for the email comes from a client-side hint. The User row gets
 * the same locale as its default.
 */

const VERIFICATION_TTL_MIN = 15;
const MAX_CODE_ATTEMPTS = 6;

// ─── Step 1: start registration ──────────────────────────────────────────

const startSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().min(4).max(30),
  villaNumber: z.number().int().min(1).max(250),
  password: z.string().min(8).max(100),
  locale: z.enum(["tr", "en"]).optional(),
});

export type StartRegistrationInput = z.infer<typeof startSchema>;

/** Generate a zero-padded numeric code, cryptographically sourced. */
function sixDigitCode(): string {
  // Node's crypto.randomInt is available in server runtimes we target.
  const n = Math.floor(Math.random() * 1_000_000);
  return String(n).padStart(6, "0");
}

export async function startRegistration(input: StartRegistrationInput) {
  try {
    const parsed = startSchema.parse(input);
    const locale = parsed.locale ?? "tr";

    // Reject if a real user already exists for this email.
    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.email },
      select: { id: true },
    });
    if (existingUser) {
      return { ok: false as const, error: "EMAIL_TAKEN" as const };
    }

    // Villa must exist. We DON'T reject on "already has residents" —
    // a villa can house a whole family, and admin can clean up duplicates.
    const villa = await prisma.villa.findUnique({
      where: { number: parsed.villaNumber },
      select: { id: true },
    });
    if (!villa) {
      return { ok: false as const, error: "VILLA_NOT_FOUND" as const };
    }

    const code = sixDigitCode();
    const codeHash = await bcrypt.hash(code, 8);
    const passwordHash = await bcrypt.hash(parsed.password, 10);
    const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MIN * 60_000);

    // Kill any prior pending verification rows for this email — otherwise
    // old codes sit in the DB and inflate the attack surface.
    await prisma.emailVerification.deleteMany({
      where: { email: parsed.email },
    });

    await prisma.emailVerification.create({
      data: {
        email: parsed.email,
        code: codeHash,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        phone: parsed.phone,
        villaNumber: parsed.villaNumber,
        passwordHash,
        expiresAt,
      },
    });

    const { subject, html } = emailVerificationEmail({
      locale,
      firstName: parsed.firstName,
      code,
      expiresInMin: VERIFICATION_TTL_MIN,
    });
    // NOT fire-and-forget — we must confirm the email was dispatched,
    // otherwise the user will wait for a code that never arrives.
    const sendRes = await sendEmail({ to: parsed.email, subject, html });
    if (!sendRes.ok) {
      console.error("[register.start] email dispatch failed", sendRes.error);
      // Roll back the staged row so the user can try again cleanly.
      await prisma.emailVerification.deleteMany({
        where: { email: parsed.email },
      });
      return { ok: false as const, error: "EMAIL_SEND_FAILED" as const };
    }

    return { ok: true as const, email: parsed.email };
  } catch (e: any) {
    console.error("[register.start] error", { message: e?.message });
    return { ok: false as const, error: "UNKNOWN" as const };
  }
}

// ─── Step 2: confirm the code ────────────────────────────────────────────

const confirmSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().trim().length(6).regex(/^\d{6}$/),
});

export async function confirmRegistration(
  input: z.infer<typeof confirmSchema>,
) {
  try {
    const parsed = confirmSchema.parse(input);

    const pending = await prisma.emailVerification.findFirst({
      where: { email: parsed.email },
      orderBy: { createdAt: "desc" },
    });
    if (!pending) return { ok: false as const, error: "NOT_FOUND" as const };
    if (pending.expiresAt.getTime() < Date.now()) {
      await prisma.emailVerification.delete({ where: { id: pending.id } });
      return { ok: false as const, error: "EXPIRED" as const };
    }
    if (pending.attempts >= MAX_CODE_ATTEMPTS) {
      await prisma.emailVerification.delete({ where: { id: pending.id } });
      return { ok: false as const, error: "TOO_MANY_ATTEMPTS" as const };
    }

    const matches = await bcrypt.compare(parsed.code, pending.code);
    if (!matches) {
      // Increment attempts so brute-forcing the 6-digit space is bounded.
      await prisma.emailVerification.update({
        where: { id: pending.id },
        data: { attempts: pending.attempts + 1 },
      });
      return { ok: false as const, error: "WRONG_CODE" as const };
    }

    // Resolve the villa by number now (validated earlier, re-validate
    // since someone could have deleted it in between).
    const villa = await prisma.villa.findUnique({
      where: { number: pending.villaNumber },
      select: { id: true },
    });
    if (!villa) return { ok: false as const, error: "VILLA_NOT_FOUND" as const };

    // Last-mile dup check — a concurrent sign-up could have created the
    // user after we staged this verification.
    const existing = await prisma.user.findUnique({
      where: { email: pending.email },
      select: { id: true },
    });
    if (existing) {
      await prisma.emailVerification.delete({ where: { id: pending.id } });
      return { ok: false as const, error: "EMAIL_TAKEN" as const };
    }

    // Create the user and consume the verification row atomically.
    await prisma.$transaction([
      prisma.user.create({
        data: {
          email: pending.email,
          name: `${pending.firstName} ${pending.lastName}`.trim(),
          phone: pending.phone,
          passwordHash: pending.passwordHash,
          role: "RESIDENT",
          villaId: villa.id,
        },
      }),
      prisma.emailVerification.delete({ where: { id: pending.id } }),
    ]);

    return { ok: true as const };
  } catch (e: any) {
    console.error("[register.confirm] error", { message: e?.message });
    return { ok: false as const, error: "UNKNOWN" as const };
  }
}

// ─── Step 1b: resend code ────────────────────────────────────────────────

const resendSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  locale: z.enum(["tr", "en"]).optional(),
});

export async function resendVerification(input: z.infer<typeof resendSchema>) {
  try {
    const parsed = resendSchema.parse(input);
    const pending = await prisma.emailVerification.findFirst({
      where: { email: parsed.email },
      orderBy: { createdAt: "desc" },
    });
    if (!pending) return { ok: false as const, error: "NOT_FOUND" as const };

    const code = sixDigitCode();
    const codeHash = await bcrypt.hash(code, 8);
    const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MIN * 60_000);

    await prisma.emailVerification.update({
      where: { id: pending.id },
      data: { code: codeHash, expiresAt, attempts: 0 },
    });

    const { subject, html } = emailVerificationEmail({
      locale: parsed.locale ?? "tr",
      firstName: pending.firstName,
      code,
      expiresInMin: VERIFICATION_TTL_MIN,
    });
    const sendRes = await sendEmail({ to: parsed.email, subject, html });
    if (!sendRes.ok) {
      return { ok: false as const, error: "EMAIL_SEND_FAILED" as const };
    }
    return { ok: true as const };
  } catch (e: any) {
    console.error("[register.resend] error", { message: e?.message });
    return { ok: false as const, error: "UNKNOWN" as const };
  }
}
