import type { SupabaseClient } from "@supabase/supabase-js";

const MS_PER_DAY = 86_400_000;
const KST_TZ = "Asia/Seoul";
const WINDOW_DAYS = 7;
const STREAK_LOOKBACK_DAYS = 30;
const TOP_INTERESTS = 5;
const RECENT_TIPS = 5;

export type WeeklyTip = { original: string; fixed: string; note: string };

export type StudentReport = {
  id: string;
  displayName: string;
  level: number;
  sessions7d: number;
  studentTurns7d: number;
  daysActive7d: number;
  streakDays: number;
  topInterests: string[];
  recentTips: WeeklyTip[];
};

export type WeeklyReport = {
  weekStart: string;
  weekEnd: string;
  students: StudentReport[];
};

export function kstDate(value: string | number | Date): string {
  return new Date(value).toLocaleDateString("en-CA", { timeZone: KST_TZ });
}

// Counts consecutive days ending at today or yesterday (KST). Letting the
// streak end yesterday avoids breaking a streak just because the student hasn't
// logged in yet today.
export function computeStreak(dates: Iterable<string>, today: string): number {
  const set = new Set(dates);
  // Anchor noon KST so the cursor is unambiguous across the date boundary.
  let cursor = new Date(`${today}T12:00:00+09:00`);
  if (!set.has(kstDate(cursor))) {
    cursor = new Date(cursor.getTime() - MS_PER_DAY);
  }
  let streak = 0;
  while (set.has(kstDate(cursor))) {
    streak++;
    cursor = new Date(cursor.getTime() - MS_PER_DAY);
  }
  return streak;
}

export async function getWeeklyReport(db: SupabaseClient): Promise<WeeklyReport> {
  const now = new Date();
  const today = kstDate(now);
  const weekStart = kstDate(new Date(now.getTime() - (WINDOW_DAYS - 1) * MS_PER_DAY));
  const weekCutoffIso = new Date(now.getTime() - WINDOW_DAYS * MS_PER_DAY).toISOString();
  const streakCutoffIso = new Date(now.getTime() - STREAK_LOOKBACK_DAYS * MS_PER_DAY).toISOString();

  const { data: studentsData } = await db.from("students").select("id, display_name, level");
  const students = (studentsData ?? []) as { id: string; display_name: string; level: number | null }[];

  const reports: StudentReport[] = [];
  for (const s of students) {
    const { data: sesData } = await db
      .from("sessions")
      .select("id, started_at")
      .eq("student_id", s.id)
      .gte("started_at", weekCutoffIso);
    const sessionsThisWeek = (sesData ?? []) as { id: string; started_at: string }[];
    const sessionIds = sessionsThisWeek.map((r) => r.id);

    let studentTurns7d = 0;
    if (sessionIds.length) {
      const { count } = await db
        .from("session_items")
        .select("id", { count: "exact", head: true })
        .in("session_id", sessionIds)
        .eq("role", "student");
      studentTurns7d = count ?? 0;
    }

    const daysSet = new Set(sessionsThisWeek.map((r) => kstDate(r.started_at)));

    const { data: longSes } = await db
      .from("sessions")
      .select("started_at")
      .eq("student_id", s.id)
      .gte("started_at", streakCutoffIso);
    const longDates = ((longSes ?? []) as { started_at: string }[]).map((r) => kstDate(r.started_at));
    const streakDays = computeStreak(longDates, today);

    const { data: intData } = await db
      .from("interests")
      .select("tag")
      .eq("student_id", s.id)
      .limit(TOP_INTERESTS);
    const topInterests = ((intData ?? []) as { tag: string }[]).map((r) => r.tag);

    let recentTips: WeeklyTip[] = [];
    if (sessionIds.length) {
      const { data: corrData } = await db
        .from("corrections")
        .select("original, fixed, note")
        .in("session_id", sessionIds)
        .order("created_at", { ascending: false })
        .limit(RECENT_TIPS);
      recentTips = ((corrData ?? []) as { original: string; fixed: string; note: string | null }[]).map((r) => ({
        original: r.original,
        fixed: r.fixed,
        note: r.note ?? "",
      }));
    }

    reports.push({
      id: s.id,
      displayName: s.display_name,
      level: s.level ?? 2,
      sessions7d: sessionsThisWeek.length,
      studentTurns7d,
      daysActive7d: daysSet.size,
      streakDays,
      topInterests,
      recentTips,
    });
  }

  return { weekStart, weekEnd: today, students: reports };
}
