import { LoginForm } from "./login-form";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { BrandIcon } from "@/components/brand-mark";

export default async function LoginPage() {
  const t = await getTranslations("Auth");
  const brand = await getTranslations("Brand");

  return (
    <main className="min-h-screen bg-itokent-canvas relative overflow-hidden">
      {/* Ambient decorative washes */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-teal-500/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-48 -right-48 w-[600px] h-[600px] bg-itokent-700/30 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-soft-light"
           style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/svg%3E\")" }} />

      {/* Top-right locale switcher */}
      <div className="absolute top-5 right-5 z-20">
        <LocaleSwitcher variant="dark" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-5 py-16">
        <div className="w-full max-w-md animate-fade-up">
          {/* Brand lockup */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center mb-6">
              <BrandIcon size={58} scheme="light" />
            </div>

            <h1 className="font-serif font-semibold tracking-logo text-5xl text-ivory-50 uppercase">
              {brand("name")}
            </h1>
            <div className="font-script text-3xl text-teal-200 italic -mt-2 ml-24">
              {brand("suffix")}
            </div>

            <div className="mt-6 flex items-center justify-center gap-3">
              <span className="h-px w-10 bg-gradient-to-r from-transparent to-brass-400/60" />
              <span className="text-[11px] tracking-widest-plus uppercase text-ivory-200/80">
                {brand("tagline")}
              </span>
              <span className="h-px w-10 bg-gradient-to-l from-transparent to-brass-400/60" />
            </div>
          </div>

          {/* Card */}
          <div className="relative rounded-3xl bg-white/[0.04] backdrop-blur-md
                          border border-ivory-50/10 shadow-edel-lg
                          p-8 sm:p-10">
            {/* Hairline at top */}
            <span className="absolute top-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-brass-400/40 to-transparent" />

            <p className="eyebrow-dark mb-2">{t("signInSubtitle")}</p>
            <h2 className="font-serif text-3xl text-ivory-50 font-medium mb-7 tracking-wide">
              {t("signInTitle")}
            </h2>

            <LoginForm />

            <p className="mt-7 pt-5 border-t border-ivory-50/10
                          text-[11px] text-ivory-300/60 text-center leading-relaxed tracking-wide">
              {t("demoHint")}
            </p>
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-[11px] tracking-widest-plus uppercase text-ivory-300/50">
            {brand("subline")}
          </p>
        </div>
      </div>
    </main>
  );
}
