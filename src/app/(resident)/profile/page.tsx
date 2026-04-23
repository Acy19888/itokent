import { auth, signOut } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { LogOut } from "lucide-react";
import { redirect } from "next/navigation";

async function logout() {
  "use server";
  await signOut({ redirectTo: "/login" });
  redirect("/login");
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) return null;
  const t = await getTranslations("Profile");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-forest-900">{t("title")}</h1>
      </header>

      <div className="card-luxury p-6 space-y-4">
        <Field label={t("name")} value={session.user.name} />
        <Field label={t("email")} value={session.user.email} />
        {session.user.villaNumber && (
          <Field label={t("villa")} value={String(session.user.villaNumber).padStart(3, "0")} />
        )}
        <div className="pt-2">
          <label className="label-luxury">{t("language")}</label>
          <LocaleSwitcher />
        </div>
      </div>

      <form action={logout}>
        <button type="submit" className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-red-200 text-red-700 bg-white hover:bg-red-50 transition">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </form>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-forest-400">{label}</div>
      <div className="text-base text-forest-900 font-medium">{value}</div>
    </div>
  );
}
