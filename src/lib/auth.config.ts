// Edge-compatible NextAuth config (no Prisma / bcrypt imports).
// This is imported by the middleware so it must stay Node-API-free.

import type { NextAuthConfig } from "next-auth";

// SQLite has no enum support, so we express the role as a string union here.
// (When migrating to Postgres, you can regenerate the Prisma enum and import it from @prisma/client.)
export type Role = "RESIDENT" | "ADMIN" | "RESTAURANT_STAFF";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      villaId: string | null;
      villaNumber: number | null;
      locale: string;
    };
  }
}

// NOTE: JWT type augmentation is intentionally omitted. NextAuth v5 beta does
// not expose "next-auth/jwt" as a stable sub-path in its package.json exports,
// which breaks `declare module "next-auth/jwt"` during `next build` on Vercel.
// Instead, we cast token fields inline in the callbacks below.

export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [], // providers are defined in auth.ts (Node runtime)
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as any;
        (token as any).id = u.id;
        (token as any).role = u.role;
        (token as any).villaId = u.villaId;
        (token as any).villaNumber = u.villaNumber;
        (token as any).locale = u.locale;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        const t = token as any;
        session.user.id = t.id;
        session.user.role = t.role;
        session.user.villaId = t.villaId;
        session.user.villaNumber = t.villaNumber;
        session.user.locale = t.locale;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      // Always allow the auth API
      if (pathname.startsWith("/api/auth")) return true;

      // Public: /login + /register (both steps live at /register)
      if (pathname === "/login" || pathname.startsWith("/register")) {
        if (isLoggedIn) {
          const role = auth!.user.role;
          const to = role === "ADMIN" ? "/admin" : role === "RESTAURANT_STAFF" ? "/restaurant-app" : "/home";
          return Response.redirect(new URL(to, nextUrl));
        }
        return true;
      }

      if (!isLoggedIn) return false; // will redirect to /login

      const role = auth!.user.role;
      if (pathname.startsWith("/admin") && role !== "ADMIN") {
        return Response.redirect(new URL("/home", nextUrl));
      }
      if (pathname.startsWith("/restaurant-app") && role !== "RESTAURANT_STAFF" && role !== "ADMIN") {
        return Response.redirect(new URL("/home", nextUrl));
      }
      if (pathname === "/") {
        const to = role === "ADMIN" ? "/admin" : role === "RESTAURANT_STAFF" ? "/restaurant-app" : "/home";
        return Response.redirect(new URL(to, nextUrl));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
