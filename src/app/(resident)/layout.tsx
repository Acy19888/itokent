import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ResidentShell } from "@/components/resident/shell";

export default async function ResidentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "RESIDENT") {
    if (session.user.role === "ADMIN") redirect("/admin");
    if (session.user.role === "RESTAURANT_STAFF") redirect("/restaurant-app");
  }
  return <ResidentShell user={session.user}>{children}</ResidentShell>;
}
