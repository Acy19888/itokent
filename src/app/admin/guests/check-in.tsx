"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkInGuest } from "@/lib/actions/guests";
import { CheckCircle2 } from "lucide-react";

export function CheckInGuest({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      disabled={pending}
      onClick={() => start(async () => { await checkInGuest(id); router.refresh(); })}
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-gold text-forest-950 text-xs font-medium"
    >
      <CheckCircle2 className="w-3.5 h-3.5" />
      Check in
    </button>
  );
}
