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

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    villaId: string | null;
    villaNumber: number | null;
    locale: string;
  }
}

export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [], // providers are defined in auth.ts (Node runtime)
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.villaId = (user as any).villaId;
        token.villaNumber = (user as any).villaNumber;
        token.locale = (user as any).locale;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.villaId = token.villaId;
        session.user.villaNumber = token.villaNumber;
        session.user.locale = token.locale;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      // Always allow the auth API
      if (pathname.startsWith("/api/auth")) return true;

      // Public: /login
      if (pathname === "/login") {
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
