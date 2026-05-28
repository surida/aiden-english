// Edge-safe auth helpers: usable from both Node route handlers and the Edge
// middleware. Uses Web Crypto only (no node:crypto, no Buffer).

export const authCookieName = "aiden_auth";
const MESSAGE = "aiden-auth-v1";

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// A constant token derived from the PIN via HMAC. Proves knowledge of the PIN
// without ever storing the PIN itself in the cookie.
export async function computeToken(pin: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(MESSAGE));
  return toHex(sig);
}

// Constant-time string comparison to avoid leaking match progress via timing.
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
