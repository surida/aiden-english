import { createServerClient } from "@/lib/db";
import { getWeeklyReport } from "@/lib/report";

export const runtime = "nodejs";

export async function GET() {
  const db = createServerClient();
  const report = await getWeeklyReport(db);
  return Response.json(report);
}
