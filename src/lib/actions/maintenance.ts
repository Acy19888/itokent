"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/auth";

const schema = z.object({
  category: z.enum(["ELECTRIC", "PLUMBING", "GARDEN", "POOL", "OTHER"]),
  title: z.string().min(3).max(120),
  description: z.string().min(5).max(2000),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]).default("NORMAL"),
});

export async function createMaintenanceTicket(input: z.infer<typeof schema>) {
  const user = await requireUser();
  const parsed = schema.parse(input);
  await prisma.maintenanceTicket.create({
    data: {
      userId: user.id,
      category: parsed.category,
      title: parsed.title,
      description: parsed.description,
      priority: parsed.priority,
    },
  });
  revalidatePath("/maintenance");
  revalidatePath("/admin");
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
  return { ok: true as const };
}
