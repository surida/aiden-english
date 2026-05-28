import { test, expect, beforeEach } from "vitest";
import { POST } from "./route";

beforeEach(() => {
  process.env.APP_PIN = "1234";
});

test("wrong PIN returns 401 and sets no cookie", async () => {
  const req = new Request("http://localhost/api/auth", {
    method: "POST",
    body: JSON.stringify({ pin: "0000" }),
  });
  const res = await POST(req);
  expect(res.status).toBe(401);
  expect(res.headers.get("set-cookie")).toBeNull();
});

test("correct PIN returns 200 and sets an httpOnly cookie", async () => {
  const req = new Request("http://localhost/api/auth", {
    method: "POST",
    body: JSON.stringify({ pin: "1234" }),
  });
  const res = await POST(req);
  expect(res.status).toBe(200);
  const cookie = res.headers.get("set-cookie");
  expect(cookie).toContain("aiden_auth=");
  expect(cookie).toMatch(/HttpOnly/i);
});
