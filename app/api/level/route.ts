import { createServerClient } from "@/lib/db";
import { getStudent, setLevel } from "@/lib/students";
import { clampLevel } from "@/lib/level";

export const runtime = "nodejs";

type Body = { studentId?: string; direction?: "easier" | "harder" };

export async function POST(req: Request) {
  const { studentId, direction } = (await req.json()) as Body;
  if (!studentId || (direction !== "easier" && direction !== "harder")) {
    return Response.json({ error: "missing studentId or direction" }, { status: 400 });
  }
  const db = createServerClient();
  // getStudent throws PGRST116 when the row is missing; treat that as 404.
  const student = await getStudent(db, studentId).catch(() => null);
  if (!student) return Response.json({ error: "not found" }, { status: 404 });
  const next = clampLevel(student.level + (direction === "easier" ? -1 : 1));
  await setLevel(db, studentId, next);
  return Response.json({ level: next });
}
