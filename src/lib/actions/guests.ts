"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(2).max(100),
  plate: z.string().max(20).optional(),
  arrivesAt: z.string(), // ISO
  purpose: z.string().max(200).optional(),
});

export async function addGuest(input: z.infer<typeof schema>) {
  const user = await requireUser();
  const parsed = schema.parse(input);
  await prisma.guest.create({
    data: {
      hostId: user.id,
      name: parsed.name,
      plate: parsed.plate || null,
      arrivesAt: new Date(parsed.arrivesAt),
      purpose: parsed.purpose || null,
    },
  });
  revalidatePath("/guests");
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function checkInGuest(id: string) {
  await requireRole("ADMIN");
  await prisma.guest.update({
    where: { id },
    data: { checkedIn: true, checkedInAt: new Date() },
  });
  revalidatePath("/admin");
  return { ok: true as const };
}
