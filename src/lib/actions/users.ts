"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/auth";

// ─── Own profile update (any signed-in user) ─────────────────────────────

const ownProfileSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().toLowerCase(),
  phone: z.string().max(30).optional().or(z.literal("")),
});

export async function updateOwnProfile(input: z.infer<typeof ownProfileSchema>) {
  try {
    const session = await requireUser();
    const parsed = ownProfileSchema.parse(input);

    // Reject if another user already has that email.
    const conflict = await prisma.user.findFirst({
      where: { email: parsed.email, NOT: { id: session.id } },
      select: { id: true },
    });
    if (conflict) return { ok: false as const, error: "EMAIL_TAKEN" as const };

    await prisma.user.update({
      where: { id: session.id },
      data: {
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone?.trim() || null,
      },
    });

    revalidatePath("/profile");
    revalidatePath("/home");
    return { ok: true as const };
  } catch (e: any) {
    console.error("[users.updateOwnProfile] error", { message: e?.message });
    return { ok: false as const, error: "UNKNOWN" as const };
  }
}

const ownPasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

export async function changeOwnPassword(
  input: z.infer<typeof ownPasswordSchema>,
) {
  try {
    const session = await requireUser();
    const parsed = ownPasswordSchema.parse(input);

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { passwordHash: true },
    });
    if (!user) return { ok: false as const, error: "NOT_FOUND" as const };

    const ok = await bcrypt.compare(parsed.currentPassword, user.passwordHash);
    if (!ok) return { ok: false as const, error: "WRONG_PASSWORD" as const };

    const hash = await bcrypt.hash(parsed.newPassword, 10);
    await prisma.user.update({
      where: { id: session.id },
      data: { passwordHash: hash },
    });
    return { ok: true as const };
  } catch (e: any) {
    console.error("[users.changeOwnPassword] error", { message: e?.message });
    return { ok: false as const, error: "UNKNOWN" as const };
  }
}

// ─── Admin: edit any user ────────────────────────────────────────────────

const adminEditSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(2).max(80),
  email: z.string().email().toLowerCase(),
  phone: z.string().max(30).optional().or(z.literal("")),
});

export async function adminUpdateUser(input: z.infer<typeof adminEditSchema>) {
  try {
    await requireRole("ADMIN");
    const parsed = adminEditSchema.parse(input);

    const conflict = await prisma.user.findFirst({
      where: { email: parsed.email, NOT: { id: parsed.userId } },
      select: { id: true },
    });
    if (conflict) return { ok: false as const, error: "EMAIL_TAKEN" as const };

    await prisma.user.update({
      where: { id: parsed.userId },
      data: {
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone?.trim() || null,
      },
    });
    revalidatePath("/admin/residents");
    return { ok: true as const };
  } catch (e: any) {
    console.error("[users.adminUpdateUser] error", { message: e?.message });
    return { ok: false as const, error: "UNKNOWN" as const };
  }
}

const adminResetPasswordSchema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

export async function adminResetPassword(
  input: z.infer<typeof adminResetPasswordSchema>,
) {
  try {
    await requireRole("ADMIN");
    const parsed = adminResetPasswordSchema.parse(input);
    const hash = await bcrypt.hash(parsed.newPassword, 10);
    await prisma.user.update({
      where: { id: parsed.userId },
      data: { passwordHash: hash },
    });
    revalidatePath("/admin/residents");
    return { ok: true as const };
  } catch (e: any) {
    console.error("[users.adminResetPassword] error", { message: e?.message });
    return { ok: false as const, error: "UNKNOWN" as const };
  }
}
