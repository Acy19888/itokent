"use server";

import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { locales, defaultLocale, type Locale } from "@/i18n/config";

const COOKIE_NAME = "NEXT_LOCALE";

export async function setUserLocale(next: Locale) {
  if (!locales.includes(next)) return;
  const store = await cookies();
  store.set(COOKIE_NAME, next, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  // Persist for logged-in users
  const session = await auth();
  if (session?.user?.id) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { locale: next },
    });
  }
}

export async function getServerLocale(): Promise<Locale> {
  const store = await cookies();
  const cookie = store.get(COOKIE_NAME)?.value;
  if (cookie && locales.includes(cookie as Locale)) return cookie as Locale;
  return defaultLocale;
}
