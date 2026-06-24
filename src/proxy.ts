import nextAuthMiddleware from "next-auth/middleware";
import type { NextRequest } from "next/server";

// Next.js 16 requires a named "proxy" export (previously "middleware")
export function proxy(req: NextRequest) {
  return (nextAuthMiddleware as (req: NextRequest) => unknown)(req);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /login (auth page)
     * - /api/auth (NextAuth endpoints)
     * - /_next (Next.js internals)
     * - /favicon.ico, /logo.png (static assets)
     * - /file.svg, /globe.svg, /next.svg, /vercel.svg, /window.svg (public assets)
     * - /screenshots/* (public screenshots)
     * - /templates/* (public templates)
     * - /docs (docusaurus rewrite)
     */
    "/((?!login|reset-password|api/auth|_next|favicon\\.ico|logo\\.png|file\\.svg|globe\\.svg|next\\.svg|vercel\\.svg|window\\.svg|screenshots|templates|docs).*)",
  ],
};
