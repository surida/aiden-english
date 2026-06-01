"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getPersona } from "@/lib/personas";
import type { Mode } from "@/lib/prompt";
import type { Correction } from "@/lib/correction";
import MicButton from "./MicButton";

type Msg = { id: string; role: "student" | "ai"; text: string };
type Status = "idle" | "transcribing" | "thinking" | "speaking";

const AVATAR: Record<string, string> = { mia: "🎀", luna: "🌙" };

const STATUS_HINT: Record<Status, string> = {
  idle: "눌러서 말하거나, 아래에 적어도 돼 ✍️",
  transcribing: "듣는 중… ✍️",
  thinking: "생각하는 중… 💭",
  speaking: "말하는 중… 💬",
};

export default function Conversation({
  personaId = "mia",
  mode = "free",
  studentId,
  maxStudentTurns,
  onComplete,
}: {
  personaId?: string;
  mode?: Mode;
  studentId?: string;
  maxStudentTurns?: number;
  onComplete?: (sessionId: string | null) => void;
}) {
  const persona = getPersona(personaId);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [pendingAudio, setPendingAudio] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [draft, setDraft] = useState("");
  const [tips, setTips] = useState<Correction[] | null>(null);
  const [ending, setEnding] = useState(false);

  const router = useRouter();
  const messagesRef = useRef<Msg[]>([]);
  const sessionRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMuted(localStorage.getItem("aiden_muted") === "1");
  }, []);

  function toggleMute() {
    setMuted((m) => {
      const next = !m;
      localStorage.setItem("aiden_muted", next ? "1" : "0");
      return next;
    });
  }

  // End the session: runs the correction pass (also nudges level + saves
  // memories server-side) and shows gentle tip cards.
  async function finishSession() {
    if (status !== "idle" || finishing || ending) return;
    if (!sessionRef.current) {
      router.push("/");
      return;
    }
    setEnding(true);
    try {
      const res = await fetch("/api/correct", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: sessionRef.current }),
      });
      const data = res.ok ? ((await res.json()) as { corrections: Correction[] }) : { corrections: [] };
      setTips(data.corrections ?? []);
    } catch {
      setTips([]);
    } finally {
      setEnding(false);
    }
  }

  function sync(next: Msg[]) {
    messagesRef.current = next;
    setMessages(next);
    queueMicrotask(() => scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }));
  }

  async function playAudio(url: string) {
    const audio = new Audio(url);
    try {
      await audio.play();
      setPendingAudio(null);
    } catch {
      setPendingAudio(url);
    }
  }

  // Calls chat, streams tokens into a fresh AI bubble, then speaks (unless muted).
  // Shared by keyboard, mic, and the opener.
  async function streamReply(body: Record<string, unknown>) {
    setStatus("thinking");
    const chat = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, sessionId: sessionRef.current ?? undefined }),
    });
    if (!chat.ok || !chat.body) throw new Error("chat");
    const sid = chat.headers.get("x-session-id");
    if (sid) sessionRef.current = sid;
    const levelHeader = chat.headers.get("x-level");
    const level = levelHeader ? Number(levelHeader) : undefined;

    const aiId = crypto.randomUUID();
    sync([...messagesRef.current, { id: aiId, role: "ai", text: "" }]);
    const reader = chat.body.getReader();
    const dec = new TextDecoder();
    let full = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      full += dec.decode(value, { stream: true });
      sync(messagesRef.current.map((m) => (m.id === aiId ? { ...m, text: full } : m)));
    }

    if (full.trim() && !muted) {
      setStatus("speaking");
      const sp = await fetch("/api/speak", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: full, voice: persona.voice, level }),
      });
      if (sp.ok) await playAudio(URL.createObjectURL(await sp.blob()));
    }
    setStatus("idle");
  }

  // Shared by every input method (mic, keyboard, hands-free): runs one student turn.
  async function sendText(userText: string) {
    const text = userText.trim();
    if (!text || status !== "idle" || finishing) return;
    setError("");
    const priorHistory = messagesRef.current.map((m) => ({ role: m.role, text: m.text }));
    sync([...messagesRef.current, { id: crypto.randomUUID(), role: "student", text }]);
    try {
      await streamReply({ studentId, personaId, mode, userText: text, history: priorHistory });
      const studentTurns = messagesRef.current.filter((m) => m.role === "student").length;
      if (mode === "diagnostic" && onComplete && studentTurns >= (maxStudentTurns ?? 4)) {
        setFinishing(true);
        onComplete(sessionRef.current);
      }
    } catch {
      setStatus("idle");
      setError("앗, 잠깐 문제가 생겼어. 다시 해볼래?");
    }
  }

  // On open, the AI greets first using the student's interests/memory (not in
  // diagnostic mode, and only for a known profile).
  const openerRan = useRef(false);
  useEffect(() => {
    if (openerRan.current || mode === "diagnostic" || !studentId) return;
    openerRan.current = true;
    streamReply({ studentId, personaId, mode, opener: true }).catch(() => setStatus("idle"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAudio(blob: Blob) {
    setError("");
    try {
      setStatus("transcribing");
      const t = blob.type;
      const ext = t.includes("mp4") || t.includes("m4a") ? "mp4" : t.includes("ogg") ? "ogg" : t.includes("wav") ? "wav" : "webm";
      const fd = new FormData();
      fd.append("audio", blob, `clip.${ext}`);
      if (studentId) fd.append("studentId", studentId);
      fd.append("personaId", personaId);
      const tr = await fetch("/api/transcribe", { method: "POST", body: fd });
      if (!tr.ok) throw new Error("transcribe");
      const { text: userText } = (await tr.json()) as { text: string };
      if (!userText?.trim()) {
        setStatus("idle");
        setError("잘 안 들렸어, 다시 말해줄래? 👂");
        return;
      }
      setStatus("idle");
      await sendText(userText);
    } catch {
      setStatus("idle");
      setError("앗, 잠깐 문제가 생겼어. 다시 해볼래?");
    }
  }

  function submitDraft() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    void sendText(text);
  }

  const busy = status !== "idle" || finishing;

  return (
    <main style={{ position: "relative", zIndex: 1, minHeight: "100dvh", display: "grid", gridTemplateRows: "auto 1fr auto", maxWidth: 520, margin: "0 auto" }}>
      {tips !== null && (
        <div style={{ position: "fixed", inset: 0, zIndex: 20, background: "rgba(58,46,51,.35)", backdropFilter: "blur(3px)", display: "grid", placeItems: "center", padding: 22 }}>
          <div style={{ width: "100%", maxWidth: 440, maxHeight: "86dvh", overflowY: "auto", background: "var(--cream)", borderRadius: 26, padding: 24, boxShadow: "0 24px 60px rgba(0,0,0,.25)", display: "grid", gap: 14, animation: "bubble-in .35s ease both" }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, textAlign: "center" }}>오늘의 팁 ✨</h2>
            {tips.length === 0 ? (
              <p style={{ textAlign: "center", color: "var(--ink-soft)", padding: "8px 0" }}>오늘은 완벽했어! 또 얘기하자 🎉</p>
            ) : (
              tips.map((t, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 16, padding: 14, boxShadow: "0 6px 16px var(--shadow-soft)" }}>
                  <p style={{ fontSize: 13, color: "var(--ink-soft)", textDecoration: "line-through" }}>{t.original}</p>
                  <p style={{ fontSize: 17, fontWeight: 600, color: "var(--coral-deep)", margin: "2px 0 6px" }}>{t.fixed}</p>
                  {t.note && <p style={{ fontSize: 14 }}>{t.note}</p>}
                </div>
              ))
            )}
            <button onClick={() => router.push("/")} style={{ padding: 14, borderRadius: 14, fontSize: 16, fontWeight: 600, color: "#fff", background: "linear-gradient(160deg, var(--coral), var(--coral-deep))" }}>
              홈으로 →
            </button>
          </div>
        </div>
      )}
      <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 20px", animation: "float-in .5s ease both" }}>
        <div style={{ width: 50, height: 50, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 26, background: "linear-gradient(150deg, var(--peach), var(--rose))", boxShadow: "0 8px 20px var(--shadow-soft)" }}>
          {AVATAR[personaId] ?? "💗"}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 21, fontWeight: 600, lineHeight: 1.1 }}>{persona.name}</h1>
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>
            {finishing ? "다 됐어! 잠깐만… ✨" : busy ? STATUS_HINT[status] : mode === "diagnostic" ? "편하게 너 얘기 들려줘" : "온라인 · 너랑 얘기하고 싶어 해"}
          </p>
        </div>
        <button onClick={toggleMute} aria-label={muted ? "소리 켜기" : "소리 끄기"} style={{ fontSize: 22, padding: 6, lineHeight: 1 }}>
          {muted ? "🔇" : "🔊"}
        </button>
        {mode !== "diagnostic" && (
          <button
            onClick={finishSession}
            disabled={ending || finishing}
            aria-label="오늘 여기까지"
            style={{ fontSize: 13, fontWeight: 600, padding: "7px 12px", borderRadius: 999, color: "var(--coral-deep)", background: "#fff", boxShadow: "0 4px 12px var(--shadow-soft)" }}
          >
            {ending ? "정리 중…" : "끝내기"}
          </button>
        )}
      </header>

      <div ref={scrollRef} style={{ overflowY: "auto", padding: "8px 18px 18px", display: "grid", gap: 12, alignContent: "start" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--ink-soft)", marginTop: "16vh", animation: "float-in .6s ease both" }}>
            <div style={{ fontSize: 54, marginBottom: 10 }}>{AVATAR[personaId] ?? "💗"}</div>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--ink)" }}>Hi! I&apos;m {persona.name} 👋</p>
            <p style={{ fontSize: 14, marginTop: 4 }}>말해도 되고, 아래에 적어도 돼</p>
          </div>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} role={m.role} text={m.text} avatar={AVATAR[personaId] ?? "💗"} />
        ))}
      </div>

      <footer style={{ padding: "8px 16px 24px", display: "grid", justifyItems: "center", gap: 12, background: "linear-gradient(to top, var(--cream) 35%, transparent)" }}>
        {pendingAudio && (
          <button onClick={() => playAudio(pendingAudio)} style={{ padding: "8px 16px", borderRadius: 999, background: "var(--lavender)", color: "#fff", fontSize: 14, fontWeight: 600 }}>
            🔊 {persona.name} 목소리 듣기
          </button>
        )}

        <div style={{ display: "flex", gap: 8, width: "100%", maxWidth: 460 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitDraft()}
            placeholder="여기에 적어도 돼…"
            disabled={busy}
            style={{ flex: 1, padding: "12px 16px", fontSize: 15, borderRadius: 999, border: "1px solid #ecd9d1", background: "#fff", outline: "none" }}
          />
          <button
            onClick={submitDraft}
            disabled={busy || !draft.trim()}
            aria-label="보내기"
            style={{ width: 46, height: 46, flexShrink: 0, borderRadius: "50%", color: "#fff", fontSize: 18, background: draft.trim() && !busy ? "linear-gradient(160deg, var(--coral), var(--coral-deep))" : "#e6cfc8" }}
          >
            ↑
          </button>
        </div>

        <MicButton onAudio={handleAudio} busy={busy} hint={error || undefined} />
      </footer>
    </main>
  );
}

function Bubble({ role, text, avatar }: { role: "student" | "ai"; text: string; avatar: string }) {
  const isAi = role === "ai";
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexDirection: isAi ? "row" : "row-reverse", animation: "bubble-in .3s ease both" }}>
      {isAi && (
        <div style={{ fontSize: 22, lineHeight: 1, marginBottom: 2 }} aria-hidden>
          {avatar}
        </div>
      )}
      <div
        style={{
          maxWidth: "78%",
          padding: "11px 15px",
          fontSize: 16,
          lineHeight: 1.45,
          borderRadius: isAi ? "20px 20px 20px 6px" : "20px 20px 6px 20px",
          color: isAi ? "var(--ink)" : "#fff",
          background: isAi ? "var(--bubble-ai)" : "linear-gradient(160deg, var(--coral), var(--coral-deep))",
          boxShadow: isAi ? "0 6px 18px var(--shadow-soft)" : "0 8px 20px var(--shadow-coral)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          minHeight: 22,
        }}
      >
        {text || (isAi ? "…" : "")}
      </div>
    </div>
  );
}
