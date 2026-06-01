"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { WeeklyReport, StudentReport } from "@/lib/report";

type View = "mine" | "family";

export default function FamilyPage() {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<View>("mine");

  useEffect(() => {
    const id = localStorage.getItem("aiden_student_id");
    setActiveId(id);
    // ?view=family forces the family view (e.g. when coming from /who).
    const forced = new URLSearchParams(window.location.search).get("view") as View | null;
    setView(forced === "family" || forced === "mine" ? forced : id ? "mine" : "family");
    fetch("/api/report")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`http ${r.status}`))))
      .then((data: WeeklyReport) => setReport(data))
      .catch(() => setError("리포트를 못 가져왔어요"));
  }, []);

  function updateStudent(id: string, patch: Partial<StudentReport>) {
    setReport((r) => (r ? { ...r, students: r.students.map((s) => (s.id === id ? { ...s, ...patch } : s)) } : r));
  }

  async function addInterest(studentId: string, tag: string) {
    const t = tag.trim().toLowerCase();
    if (!t) return;
    const me = report?.students.find((s) => s.id === studentId);
    if (!me || me.topInterests.includes(t)) return;
    const prev = me.topInterests;
    updateStudent(studentId, { topInterests: [...prev, t] });
    const res = await fetch("/api/interest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ studentId, tag: t }),
    });
    if (!res.ok) updateStudent(studentId, { topInterests: prev });
  }

  async function removeInterest(studentId: string, tag: string) {
    const me = report?.students.find((s) => s.id === studentId);
    if (!me) return;
    const prev = me.topInterests;
    updateStudent(studentId, { topInterests: prev.filter((t) => t !== tag) });
    const res = await fetch("/api/interest", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ studentId, tag }),
    });
    if (!res.ok) updateStudent(studentId, { topInterests: prev });
  }

  async function nudgeLevel(studentId: string, direction: "easier" | "harder") {
    const me = report?.students.find((s) => s.id === studentId);
    if (!me) return;
    const prev = me.level;
    const optimistic = Math.max(1, Math.min(6, prev + (direction === "easier" ? -1 : 1)));
    updateStudent(studentId, { level: optimistic });
    const res = await fetch("/api/level", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ studentId, direction }),
    });
    if (!res.ok) {
      updateStudent(studentId, { level: prev });
    } else {
      const { level } = (await res.json()) as { level: number };
      updateStudent(studentId, { level });
    }
  }

  const me = report?.students.find((s) => s.id === activeId) ?? null;
  const visible: StudentReport[] = report ? (view === "mine" && me ? [me] : report.students) : [];
  const canToggle = !!(activeId && me && report && report.students.length > 1);

  return (
    <main style={{ position: "relative", zIndex: 1, minHeight: "100dvh", padding: "22px 18px 60px", maxWidth: 560, margin: "0 auto" }}>
      <Link href="/" style={{ fontSize: 14, color: "var(--ink-soft)" }}>← 홈</Link>
      <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.4, marginTop: 10 }}>
        {view === "mine" && me ? `이번 주, ${me.displayName} ✨` : "이번 주 우리 가족 ✨"}
      </h1>
      {report && (
        <p style={{ color: "var(--ink-soft)", fontSize: 14, marginTop: 4 }}>
          {report.weekStart} – {report.weekEnd}
        </p>
      )}
      {error && <p style={{ color: "var(--coral-deep)", marginTop: 20 }}>{error}</p>}
      {!report && !error && <p style={{ color: "var(--ink-soft)", marginTop: 20 }}>불러오는 중…</p>}

      <div style={{ display: "grid", gap: 16, marginTop: 22 }}>
        {visible.map((s) => (
          <Card
            key={s.id}
            s={s}
            editable={s.id === activeId}
            onAdd={(tag) => addInterest(s.id, tag)}
            onRemove={(tag) => removeInterest(s.id, tag)}
            onNudge={(dir) => nudgeLevel(s.id, dir)}
          />
        ))}
        {report && report.students.length === 0 && (
          <p style={{ color: "var(--ink-soft)" }}>아직 프로필이 없어요</p>
        )}
      </div>

      {canToggle && (
        <button
          onClick={() => setView(view === "mine" ? "family" : "mine")}
          style={{ marginTop: 24, width: "100%", padding: 12, borderRadius: 14, fontSize: 14, fontWeight: 600, color: "var(--ink-soft)", background: "transparent", border: "1px dashed var(--rose)" }}
        >
          {view === "mine" ? "가족 전체 보기 →" : "← 내 카드만"}
        </button>
      )}
    </main>
  );
}

function Card({
  s,
  editable,
  onAdd,
  onRemove,
  onNudge,
}: {
  s: StudentReport;
  editable: boolean;
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  onNudge: (direction: "easier" | "harder") => void;
}) {
  const [draft, setDraft] = useState("");

  function submit() {
    if (!draft.trim()) return;
    onAdd(draft);
    setDraft("");
  }

  return (
    <article style={{ background: "#fff", borderRadius: 22, padding: 18, boxShadow: "0 10px 28px var(--shadow-soft)", animation: "float-in .5s ease both" }}>
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <h2 style={{ fontSize: 19, fontWeight: 700 }}>{s.displayName}</h2>
        <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>레벨 {s.level}</span>
      </header>

      {editable && (
        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <button onClick={() => onNudge("easier")} style={pill("#fff")}>더 쉽게 ⬇</button>
          <button onClick={() => onNudge("harder")} style={pill("#fff")}>더 어렵게 ⬆</button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 12 }}>
        <Stat big={String(s.sessions7d)} label="대화" />
        <Stat big={String(s.studentTurns7d)} label="마디" />
        <Stat big={s.streakDays ? `🔥${s.streakDays}` : "–"} label={s.streakDays ? "일 연속" : "쉬는 중"} />
      </div>

      <div style={{ marginTop: 14 }}>
        <p style={{ fontSize: 11, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>관심사</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {s.topInterests.length === 0 && !editable && <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>아직 없어요</span>}
          {s.topInterests.map((t) => (
            <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, padding: "4px 10px", borderRadius: 999, background: "var(--cream)", color: "var(--ink)" }}>
              {t}
              {editable && (
                <button onClick={() => onRemove(t)} aria-label={`${t} 삭제`} style={{ fontSize: 14, lineHeight: 1, color: "var(--ink-soft)", padding: 0, background: "transparent" }}>×</button>
              )}
            </span>
          ))}
          {editable && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
                placeholder="관심사"
                enterKeyHint="done"
                autoCapitalize="off"
                autoCorrect="off"
                style={{ fontSize: 12, padding: "4px 10px", borderRadius: 999, border: "1px dashed var(--rose)", background: "transparent", width: 80 }}
              />
              <button
                onClick={submit}
                disabled={!draft.trim()}
                aria-label="관심사 추가"
                style={{ fontSize: 16, lineHeight: 1, padding: "2px 10px", borderRadius: 999, color: "var(--coral-deep)", background: "#fff", opacity: draft.trim() ? 1 : 0.4, boxShadow: "0 4px 12px var(--shadow-soft)" }}
              >
                +
              </button>
            </span>
          )}
        </div>
      </div>

      {s.recentTips.length > 0 && (
        <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
          <p style={{ fontSize: 11, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: 0.6 }}>자주 나온 표현</p>
          {s.recentTips.slice(0, 3).map((t, i) => (
            <div key={i} style={{ background: "var(--cream)", borderRadius: 12, padding: 10 }}>
              <p style={{ fontSize: 12, color: "var(--ink-soft)", textDecoration: "line-through" }}>{t.original}</p>
              <p style={{ fontSize: 15, color: "var(--coral-deep)", fontWeight: 600 }}>{t.fixed}</p>
              {t.note && <p style={{ fontSize: 12, marginTop: 2 }}>{t.note}</p>}
            </div>
          ))}
        </div>
      )}

      {s.sessions7d === 0 && s.topInterests.length === 0 && !editable && (
        <p style={{ marginTop: 14, color: "var(--ink-soft)", fontSize: 13 }}>이번 주엔 아직 대화가 없어요</p>
      )}
    </article>
  );
}

function Stat({ big, label }: { big: string; label: string }) {
  return (
    <div style={{ textAlign: "center", background: "var(--cream)", borderRadius: 14, padding: "10px 6px" }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700 }}>{big}</div>
      <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function pill(bg: string): React.CSSProperties {
  return {
    fontSize: 12,
    fontWeight: 600,
    padding: "6px 12px",
    borderRadius: 999,
    background: bg,
    boxShadow: "0 4px 12px var(--shadow-soft)",
    color: "var(--coral-deep)",
  };
}
