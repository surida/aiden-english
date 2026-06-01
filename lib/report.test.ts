import { test, expect } from "vitest";
import { computeStreak, kstDate } from "./report";

test("kstDate: maps UTC to Asia/Seoul calendar day (UTC+9)", () => {
  // 15:30 UTC on June 1 is 00:30 KST on June 2.
  expect(kstDate("2026-06-01T15:30:00Z")).toBe("2026-06-02");
  // 14:00 UTC on June 1 is 23:00 KST on June 1.
  expect(kstDate("2026-06-01T14:00:00Z")).toBe("2026-06-01");
});

test("computeStreak: counts consecutive days ending today", () => {
  expect(computeStreak(["2026-06-01", "2026-05-31", "2026-05-30"], "2026-06-01")).toBe(3);
});

test("computeStreak: allows the streak to end yesterday", () => {
  // Today not in set but yesterday is -> streak still counts (no login yet today).
  expect(computeStreak(["2026-05-31", "2026-05-30"], "2026-06-01")).toBe(2);
});

test("computeStreak: a gap breaks the streak", () => {
  // Today is in but yesterday isn't -> streak of 1.
  expect(computeStreak(["2026-06-01", "2026-05-30"], "2026-06-01")).toBe(1);
});

test("computeStreak: 0 when there's no recent activity", () => {
  expect(computeStreak(["2026-05-20"], "2026-06-01")).toBe(0);
  expect(computeStreak([], "2026-06-01")).toBe(0);
});

test("computeStreak: duplicates within a day still count as one", () => {
  // Two sessions on the same day shouldn't inflate the streak.
  expect(computeStreak(["2026-06-01", "2026-06-01", "2026-05-31"], "2026-06-01")).toBe(2);
});
