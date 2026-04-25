"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/auth";
import { feeForCategory } from "@/lib/maintenance-catalog";

const schema = z.object({
  category: z.enum(["ELECTRIC", "PLUMBING", "GARDEN", "POOL", "OTHER"]),
  title: z.string().min(3).max(120),
  description: z.string().min(5).max(2000),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]).default("NORMAL"),
  // Resident has seen and accepted the catalog price upfront.
  acceptFee: z.boolean().optional(),
});

export async function createMaintenanceTicket(input: z.infer<typeof schema>) {
  const user = await requireUser();
  const parsed = schema.parse(input);
  const fee = feeForCategory(parsed.category);

  // Paid categories require explicit consent on the form so the resident
  // cannot claim they were billed by surprise.
  if (fee.amount > 0 && !parsed.acceptFee) {
    return { ok: false as const, error: "FEE_NOT_ACCEPTED" as const };
  }

  await prisma.maintenanceTicket.create({
    data: {
      userId: user.id,
      category: parsed.category,
      title: parsed.title,
      description: parsed.description,
      priority: parsed.priority,
      // Snapshot the fee onto the row — protects against catalog changes.
      feeAmount: fee.amount > 0 ? fee.amount : null,
      feeCurrency: fee.amount > 0 ? fee.currency : null,
    },
  });
  revalidatePath("/maintenance");
  revalidatePath("/admin");
  revalidatePath("/payments");
  return { ok: true as const };
}

export async function updateTicketStatus(id: string, status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED") {
  await requireRole("ADMIN");
  await prisma.maintenanceTicket.update({
    where: { id },
    data: {
      status,
      resolvedAt: status === "RESOLVED" ? new Date() : null,
    },
  });
  revalidatePath("/admin");
  revalidatePath("/maintenance");
  revalidatePath("/payments");
  return { ok: true as const };
}
