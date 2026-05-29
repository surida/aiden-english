import { createServerClient } from "@/lib/db";
import { createStudent, listStudents } from "@/lib/students";

export const runtime = "nodejs";

export async function GET() {
  const db = createServerClient();
  return Response.json({ students: await listStudents(db) });
}

export async function POST(req: Request) {
  const { displayName } = (await req.json()) as { displayName?: string };
  if (!displayName?.trim()) {
    return Response.json({ error: "missing displayName" }, { status: 400 });
  }
  const db = createServerClient();
  const id = await createStudent(db, displayName.trim());
  return Response.json({ id });
}
