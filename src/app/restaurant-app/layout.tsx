import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RestaurantShell } from "@/components/restaurant-app/shell";

export default async function RestaurantAppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "RESTAURANT_STAFF" && session.user.role !== "ADMIN") {
    redirect("/home");
  }
  return <RestaurantShell user={session.user}>{children}</RestaurantShell>;
}
