"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteAnnouncement } from "@/lib/actions/admin";

export function DeleteAnnouncement({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      disabled={pending}
      onClick={() => start(async () => { await deleteAnnouncement(id); router.refresh(); })}
      className="p-2 rounded-lg text-red-600 hover:bg-red-50"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
