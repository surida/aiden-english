import { createServerClient } from "@/lib/db";
import { addInterest, removeInterest } from "@/lib/students";

export const runtime = "nodejs";

type Body = { studentId?: string; tag?: string };

function normalize(tag: string): string {
  return tag.trim().toLowerCase().slice(0, 24);
}

export async function POST(req: Request) {
  const { studentId, tag } = (await req.json()) as Body;
  const t = tag ? normalize(tag) : "";
  if (!studentId || !t) {
    return Response.json({ error: "missing studentId or tag" }, { status: 400 });
  }
  const db = createServerClient();
  await addInterest(db, studentId, t);
  return Response.json({ ok: true, tag: t });
}

export async function DELETE(req: Request) {
  const { studentId, tag } = (await req.json()) as Body;
  const t = tag ? normalize(tag) : "";
  if (!studentId || !t) {
    return Response.json({ error: "missing studentId or tag" }, { status: 400 });
  }
  const db = createServerClient();
  await removeInterest(db, studentId, t);
  return Response.json({ ok: true });
}
