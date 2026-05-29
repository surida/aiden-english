"use client";

import { useRef, useState } from "react";

type Props = {
  onAudio: (blob: Blob) => void;
  busy?: boolean;
  hint?: string;
};

function pickMime(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  if (typeof MediaRecorder === "undefined") return "";
  return candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? "";
}

export default function MicButton({ onAudio, busy = false, hint }: Props) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  // Tracks whether the finger is still down, so a release during the async
  // getUserMedia call doesn't leave a dangling recorder/stream.
  const pressedRef = useRef(false);

  async function start() {
    if (busy || recording) return;
    setError("");
    pressedRef.current = true;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("insecure");
      // Fresh stream per recording: reusing one stream makes Chrome drop the
      // WebM header on 2nd+ recordings, which OpenAI rejects as corrupted.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      if (!pressedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      const mimeType = pickMime();
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        if (blob.size > 1200) onAudio(blob);
        else setError("조금만 더 길게 말해줘 🙂");
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
    } catch (err) {
      const name = (err as Error)?.name;
      if ((err as Error)?.message === "insecure") setError("마이크는 https 또는 localhost에서만 써요");
      else if (name === "NotAllowedError" || name === "SecurityError") setError("마이크 권한을 켜주세요 🙏");
      else setError("마이크를 열 수 없어요");
      setRecording(false);
    }
  }

  function stop() {
    pressedRef.current = false;
    if (!recording) return;
    setRecording(false);
    recRef.current?.stop();
  }

  const disabled = busy;
  const scale = recording ? 1.12 : 1;

  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 14 }}>
      <button
        type="button"
        aria-label={recording ? "녹음 중, 떼면 전송" : "눌러서 말하기"}
        disabled={disabled}
        onPointerDown={(e) => {
          if (disabled) return;
          e.preventDefault();
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          start();
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onPointerLeave={stop}
        style={{
          position: "relative",
          width: 132,
          height: 132,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          transform: `scale(${scale})`,
          transition: "transform 0.18s cubic-bezier(.34,1.56,.64,1)",
          background: disabled
            ? "linear-gradient(160deg, #f3d9cf, #e9cfd2)"
            : "linear-gradient(160deg, var(--rose), var(--coral) 55%, var(--coral-deep))",
          boxShadow: recording
            ? "0 18px 50px var(--shadow-coral), 0 0 0 10px rgba(255,122,133,.14)"
            : "0 14px 34px var(--shadow-coral)",
          opacity: disabled ? 0.7 : 1,
          touchAction: "none",
          animation: recording || disabled ? "none" : "breathe 3.4s ease-in-out infinite",
        }}
      >
        {recording &&
          [0, 0.5].map((delay) => (
            <span
              key={delay}
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "2px solid var(--coral)",
                animation: `ring-pulse 1.6s ease-out ${delay}s infinite`,
              }}
            />
          ))}

        {busy ? (
          <span style={{ display: "flex", gap: 6 }}>
            {[0, 0.15, 0.3].map((d) => (
              <span
                key={d}
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: "#fff",
                  animation: `shimmer-dots 1.1s ease-in-out ${d}s infinite`,
                }}
              />
            ))}
          </span>
        ) : (
          <MicIcon />
        )}
      </button>

      <p style={{ fontFamily: "var(--font-display)", color: "var(--ink-soft)", fontSize: 15 }}>
        {error || hint || (recording ? "듣고 있어… 🎧" : busy ? "잠깐만…" : "눌러서 말해봐 🎤")}
      </p>
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="46" height="46" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="2.5" width="6" height="11.5" rx="3" fill="#fff" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" fill="none" />
      <path d="M12 17.5V21" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M8.5 21h7" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}
