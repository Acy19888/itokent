"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteEvent } from "@/lib/actions/admin";

export function DeleteEvent({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      disabled={pending}
      onClick={() => start(async () => { await deleteEvent(id); router.refresh(); })}
      className="p-2 rounded-lg text-red-600 hover:bg-red-50"
      title="Delete"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
