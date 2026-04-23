// Edge-safe middleware: uses only the edge-compatible auth config
// (no Prisma / bcrypt imports).

import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Skip _next internals, static files, and the API auth handler
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|icon-.*|manifest.json|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|json)$).*)",
  ],
};
