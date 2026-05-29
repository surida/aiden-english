"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listPersonas } from "@/lib/personas";

const AVATAR: Record<string, string> = { mia: "🎀", luna: "🌙" };
const BLURB: Record<string, string> = {
  mia: "또래 친구처럼 발랄해. K-pop이랑 게임 좋아해!",
  luna: "다정한 언니 같아. 천천히 더 말하게 도와줘.",
};

export default function SelectPage() {
  const router = useRouter();
  const personas = listPersonas();
  const [studentName, setStudentName] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("aiden_student_id")) {
      router.replace("/who");
      return;
    }
    setStudentName(localStorage.getItem("aiden_student_name") ?? "");
  }, [router]);

  function choose(id: string) {
    localStorage.setItem("aiden_persona_id", id);
    const onboarding = localStorage.getItem("aiden_onboarding");
    router.push(onboarding ? "/diagnose" : "/chat");
  }

  return (
    <main style={{ position: "relative", zIndex: 1, minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 380, display: "grid", gap: 18, animation: "float-in .5s ease both" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 26, fontWeight: 700 }}>
            {studentName ? `${studentName}, ` : ""}누구랑 얘기할래?
          </h1>
          <p style={{ color: "var(--ink-soft)", marginTop: 6, fontSize: 14 }}>친구를 골라봐 (나중에 바꿀 수 있어)</p>
        </div>

        {personas.map((p) => (
          <button
            key={p.id}
            onClick={() => choose(p.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: 18,
              borderRadius: 22,
              background: "#fff",
              boxShadow: "0 10px 26px var(--shadow-soft)",
              textAlign: "left",
            }}
          >
            <span
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                fontSize: 30,
                background: "linear-gradient(150deg, var(--peach), var(--rose))",
                flexShrink: 0,
              }}
            >
              {AVATAR[p.id] ?? "💗"}
            </span>
            <span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, display: "block" }}>{p.name}</span>
              <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>{BLURB[p.id] ?? p.personality}</span>
            </span>
          </button>
        ))}
      </div>
    </main>
  );
}
