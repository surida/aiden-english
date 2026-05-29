"use client";

import { useRef, useState } from "react";
import { getPersona } from "@/lib/personas";
import type { Mode } from "@/lib/prompt";
import MicButton from "./MicButton";

type Msg = { id: string; role: "student" | "ai"; text: string };
type Status = "idle" | "transcribing" | "thinking" | "speaking";

const AVATAR: Record<string, string> = { mia: "🎀", luna: "🌙" };

const STATUS_HINT: Record<Status, string> = {
  idle: "눌러서 말해봐 🎤",
  transcribing: "듣는 중… ✍️",
  thinking: "생각하는 중… 💭",
  speaking: "말하는 중… 💬",
};

export default function Conversation({
  personaId = "mia",
  mode = "free",
}: {
  personaId?: string;
  mode?: Mode;
}) {
  const persona = getPersona(personaId);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [pendingAudio, setPendingAudio] = useState<string | null>(null);

  const messagesRef = useRef<Msg[]>([]);
  const sessionRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

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
      // Autoplay blocked — surface a tap-to-play affordance.
      setPendingAudio(url);
    }
  }

  async function handleAudio(blob: Blob) {
    setError("");
    const priorHistory = messagesRef.current.map((m) => ({ role: m.role, text: m.text }));

    try {
      // 1. transcribe (filename extension must match the actual codec so
      // OpenAI detects the format correctly)
      setStatus("transcribing");
      const t = blob.type;
      const ext = t.includes("mp4") || t.includes("m4a")
        ? "mp4"
        : t.includes("ogg")
          ? "ogg"
          : t.includes("wav")
            ? "wav"
            : "webm";
      const fd = new FormData();
      fd.append("audio", blob, `clip.${ext}`);
      const tr = await fetch("/api/transcribe", { method: "POST", body: fd });
      if (!tr.ok) throw new Error("transcribe");
      const { text: userText } = (await tr.json()) as { text: string };
      if (!userText?.trim()) {
        setStatus("idle");
        setError("잘 안 들렸어, 다시 말해줄래? 👂");
        return;
      }
      sync([...messagesRef.current, { id: crypto.randomUUID(), role: "student", text: userText }]);

      // 2. chat (stream tokens into a live bubble)
      setStatus("thinking");
      const chat = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          personaId,
          mode,
          userText,
          history: priorHistory,
          sessionId: sessionRef.current ?? undefined,
        }),
      });
      if (!chat.ok || !chat.body) throw new Error("chat");
      const sid = chat.headers.get("x-session-id");
      if (sid) sessionRef.current = sid;

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

      // 3. speak
      if (full.trim()) {
        setStatus("speaking");
        const sp = await fetch("/api/speak", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: full, voice: persona.voice }),
        });
        if (sp.ok) {
          const url = URL.createObjectURL(await sp.blob());
          await playAudio(url);
        }
      }
      setStatus("idle");
    } catch {
      setStatus("idle");
      setError("앗, 잠깐 문제가 생겼어. 다시 해볼래?");
    }
  }

  const busy = status !== "idle";

  return (
    <main
      style={{
        position: "relative",
        zIndex: 1,
        minHeight: "100dvh",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        maxWidth: 520,
        margin: "0 auto",
      }}
    >
      {/* header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "18px 20px",
          animation: "float-in .5s ease both",
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            fontSize: 26,
            background: "linear-gradient(150deg, var(--peach), var(--rose))",
            boxShadow: "0 8px 20px var(--shadow-soft)",
          }}
        >
          {AVATAR[personaId] ?? "💗"}
        </div>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 600, lineHeight: 1.1 }}>{persona.name}</h1>
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>
            {busy ? STATUS_HINT[status] : "온라인 · 너랑 얘기하고 싶어 해"}
          </p>
        </div>
      </header>

      {/* messages */}
      <div
        ref={scrollRef}
        style={{ overflowY: "auto", padding: "8px 18px 18px", display: "grid", gap: 12, alignContent: "start" }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              color: "var(--ink-soft)",
              marginTop: "18vh",
              animation: "float-in .6s ease both",
            }}
          >
            <div style={{ fontSize: 54, marginBottom: 10 }}>{AVATAR[personaId] ?? "💗"}</div>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--ink)" }}>
              Hi! I&apos;m {persona.name} 👋
            </p>
            <p style={{ fontSize: 14, marginTop: 4 }}>마이크를 누르고 편하게 영어로 말해봐</p>
          </div>
        )}

        {messages.map((m) => (
          <Bubble key={m.id} role={m.role} text={m.text} avatar={AVATAR[personaId] ?? "💗"} />
        ))}
      </div>

      {/* mic dock */}
      <footer
        style={{
          padding: "10px 20px 30px",
          display: "grid",
          justifyItems: "center",
          gap: 10,
          background: "linear-gradient(to top, var(--cream) 30%, transparent)",
        }}
      >
        {pendingAudio && (
          <button
            onClick={() => playAudio(pendingAudio)}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              background: "var(--lavender)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            🔊 {persona.name} 목소리 듣기
          </button>
        )}
        <MicButton onAudio={handleAudio} busy={busy} hint={error || undefined} />
      </footer>
    </main>
  );
}

function Bubble({ role, text, avatar }: { role: "student" | "ai"; text: string; avatar: string }) {
  const isAi = role === "ai";
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "flex-end",
        flexDirection: isAi ? "row" : "row-reverse",
        animation: "bubble-in .3s ease both",
      }}
    >
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
