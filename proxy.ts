import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authCookieName, computeToken, safeEqual } from "@/lib/auth";

export const config = {
  // Run on everything except Next internals and static asset files.
  matcher: ["/((?!_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|webmanifest|txt)).*)"],
};

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // The login page and the auth endpoint must always be reachable.
  if (pathname === "/login" || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const pin = process.env.APP_PIN;
  // Not configured -> fail open so local dev isn't locked out. Set APP_PIN in prod.
  if (!pin) return NextResponse.next();

  const cookie = req.cookies.get(authCookieName)?.value;
  const expected = await computeToken(pin);
  if (cookie && safeEqual(cookie, expected)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}
