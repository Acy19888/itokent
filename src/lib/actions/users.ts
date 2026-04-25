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
  // Optional — only residents have a villa. Admins/staff may send null.
  villaNumber: z.number().int().min(1).max(250).nullable().optional(),
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

    // Resolve villa if the admin supplied a number. `undefined` = leave
    // villa unchanged; `null` = detach.
    let villaId: string | null | undefined = undefined;
    if (parsed.villaNumber === null) {
      villaId = null;
    } else if (typeof parsed.villaNumber === "number") {
      const villa = await prisma.villa.findUnique({
        where: { number: parsed.villaNumber },
        select: { id: true },
      });
      if (!villa) return { ok: false as const, error: "VILLA_NOT_FOUND" as const };
      villaId = villa.id;
    }

    await prisma.user.update({
      where: { id: parsed.userId },
      data: {
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone?.trim() || null,
        ...(villaId !== undefined ? { villaId } : {}),
      },
    });
    revalidatePath("/admin/residents");
    return { ok: true as const };
  } catch (e: any) {
    console.error("[users.adminUpdateUser] error", { message: e?.message });
    return { ok: false as const, error: "UNKNOWN" as const };
  }
}

// ─── Admin: create a new resident manually ───────────────────────────────
// No email verification for admin-created accounts — the admin is acting
// as the trust anchor. We still require a password (used as the initial
// credential) and the admin should share it with the resident manually,
// or use the reset-password flow afterwards.

const adminCreateSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: z.string().email().toLowerCase(),
  phone: z.string().max(30).optional().or(z.literal("")),
  password: z.string().min(8).max(100),
  villaNumber: z.number().int().min(1).max(250).nullable().optional(),
  role: z.enum(["RESIDENT", "ADMIN", "RESTAURANT_STAFF"]).default("RESIDENT"),
});

export async function adminCreateUser(
  input: z.infer<typeof adminCreateSchema>,
) {
  try {
    await requireRole("ADMIN");
    const parsed = adminCreateSchema.parse(input);

    const existing = await prisma.user.findUnique({
      where: { email: parsed.email },
      select: { id: true },
    });
    if (existing) return { ok: false as const, error: "EMAIL_TAKEN" as const };

    let villaId: string | null = null;
    if (parsed.role === "RESIDENT" && parsed.villaNumber != null) {
      const villa = await prisma.villa.findUnique({
        where: { number: parsed.villaNumber },
        select: { id: true },
      });
      if (!villa) return { ok: false as const, error: "VILLA_NOT_FOUND" as const };
      villaId = villa.id;
    }

    const passwordHash = await bcrypt.hash(parsed.password, 10);
    await prisma.user.create({
      data: {
        email: parsed.email,
        name: `${parsed.firstName} ${parsed.lastName}`.trim(),
        phone: parsed.phone?.trim() || null,
        passwordHash,
        role: parsed.role,
        villaId,
      },
    });

    revalidatePath("/admin/residents");
    return { ok: true as const };
  } catch (e: any) {
    console.error("[users.adminCreateUser] error", { message: e?.message });
    return { ok: false as const, error: "UNKNOWN" as const };
  }
}

// ─── Admin: delete a user ────────────────────────────────────────────────
// Hard-delete. All their bookings, RSVPs, tickets, guests go with them —
// enforced at the DB level by `onDelete: Cascade` where applicable, and
// by explicit cleanup here for models that don't cascade (tennis /
// restaurant / party bookings). We keep this order strict because a
// resident may have lots of historical bookings and we don't want to
// orphan rows with a dangling userId.

const adminDeleteSchema = z.object({
  userId: z.string().min(1),
});

export async function adminDeleteUser(
  input: z.infer<typeof adminDeleteSchema>,
) {
  try {
    const admin = await requireRole("ADMIN");
    const parsed = adminDeleteSchema.parse(input);

    // Safety: don't let an admin delete themselves — use another admin
    // account or edit their role first.
    if (parsed.userId === admin.id) {
      return { ok: false as const, error: "CANNOT_DELETE_SELF" as const };
    }

    // Some relations in schema.prisma don't have onDelete cascade on the
    // FK (TennisBooking, PartyHouseBooking, RestaurantReservation, Guest,
    // MaintenanceTicket, Event createdById, Announcement authorId). Clean
    // them up explicitly. EventAttendee already cascades.
    await prisma.$transaction(async (tx) => {
      await tx.tennisBooking.deleteMany({ where: { userId: parsed.userId } });
      await tx.partyHouseBooking.deleteMany({ where: { userId: parsed.userId } });
      await tx.restaurantReservation.deleteMany({
        where: { userId: parsed.userId },
      });
      await tx.guest.deleteMany({ where: { hostId: parsed.userId } });
      await tx.maintenanceTicket.deleteMany({
        where: { userId: parsed.userId },
      });
      // Events/announcements authored by this user: keep the content but
      // reassign authorship to the acting admin so FKs stay valid.
      await tx.event.updateMany({
        where: { createdById: parsed.userId },
        data: { createdById: admin.id },
      });
      await tx.announcement.updateMany({
        where: { authorId: parsed.userId },
        data: { authorId: admin.id },
      });
      await tx.user.delete({ where: { id: parsed.userId } });
    });

    revalidatePath("/admin/residents");
    return { ok: true as const };
  } catch (e: any) {
    console.error("[users.adminDeleteUser] error", { message: e?.message });
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
