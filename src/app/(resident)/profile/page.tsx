import { auth, signOut } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { LogOut } from "lucide-react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";

async function logout() {
  "use server";
  await signOut({ redirectTo: "/login" });
  redirect("/login");
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const t = await getTranslations("Profile");

  // Read the user fresh from the DB so edits aren't bottlenecked by JWT refresh.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      phone: true,
      villa: { select: { number: true } },
    },
  });
  if (!user) return null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-forest-900">{t("title")}</h1>
      </header>

      {/* Personal info card */}
      <section className="card-luxury p-6">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-display text-lg text-forest-900">
            {t("personalInfo")}
          </h2>
          {user.villa && (
            <span className="text-xs font-mono text-forest-500">
              {t("villa")} · {String(user.villa.number).padStart(3, "0")}
            </span>
          )}
        </div>
        <ProfileForm
          initial={{
            name: user.name,
            email: user.email,
            phone: user.phone ?? "",
          }}
        />
      </section>

      {/* Language card */}
      <section className="card-luxury p-6">
        <label className="label-luxury mb-2 block">{t("language")}</label>
        <LocaleSwitcher />
      </section>

      {/* Password card */}
      <section className="card-luxury p-6">
        <h2 className="font-display text-lg text-forest-900 mb-4">
          {t("changePassword")}
        </h2>
        <PasswordForm />
      </section>

      <form action={logout}>
        <button
          type="submit"
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-red-200 text-red-700 bg-white hover:bg-red-50 transition"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </form>
    </div>
  );
}
