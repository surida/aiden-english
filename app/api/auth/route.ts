import { authCookieName, computeToken, safeEqual } from "@/lib/auth";

export const runtime = "nodejs";

type AuthBody = { pin: string };

export async function POST(req: Request) {
  const { pin } = (await req.json()) as AuthBody;
  const expected = process.env.APP_PIN;

  if (!expected) {
    return Response.json({ error: "server PIN not configured" }, { status: 500 });
  }
  if (!pin || !safeEqual(pin, expected)) {
    return Response.json({ error: "invalid pin" }, { status: 401 });
  }

  const token = await computeToken(expected);
  const maxAge = 60 * 60 * 24 * 30; // 30 days
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  const res = Response.json({ ok: true });
  res.headers.append(
    "Set-Cookie",
    `${authCookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`,
  );
  return res;
}
