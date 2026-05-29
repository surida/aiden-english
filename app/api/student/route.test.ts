import { test, expect, vi, beforeEach } from "vitest";

const createStudent = vi.fn();
const listStudents = vi.fn();

vi.mock("@/lib/db", () => ({ createServerClient: () => ({}) }));
vi.mock("@/lib/students", () => ({
  createStudent: (...a: unknown[]) => createStudent(...a),
  listStudents: (...a: unknown[]) => listStudents(...a),
}));

import { GET, POST } from "./route";

beforeEach(() => {
  createStudent.mockReset();
  listStudents.mockReset();
});

test("GET lists students", async () => {
  listStudents.mockResolvedValue([{ id: "s1", display_name: "A" }]);
  const res = await GET();
  expect(res.status).toBe(200);
  expect((await res.json()).students).toEqual([{ id: "s1", display_name: "A" }]);
});

test("POST creates a student from a trimmed name", async () => {
  createStudent.mockResolvedValue("s9");
  const req = new Request("http://localhost/api/student", {
    method: "POST",
    body: JSON.stringify({ displayName: "  Mina  " }),
  });
  const res = await POST(req);
  expect(res.status).toBe(200);
  expect((await res.json()).id).toBe("s9");
  expect(createStudent).toHaveBeenCalledWith(expect.anything(), "Mina");
});

test("POST 400 on empty name", async () => {
  const req = new Request("http://localhost/api/student", {
    method: "POST",
    body: JSON.stringify({ displayName: "   " }),
  });
  expect((await POST(req)).status).toBe(400);
  expect(createStudent).not.toHaveBeenCalled();
});
