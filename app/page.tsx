"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getPersona } from "@/lib/personas";

const AVATAR: Record<string, string> = { mia: "🎀", luna: "🌙" };

export default function Home() {
  const router = useRouter();
  const [profile, setProfile] = useState<{ name: string; personaId: string } | null>(null);

  useEffect(() => {
    const studentId = localStorage.getItem("aiden_student_id");
    if (!studentId) return router.replace("/who");
    const personaId = localStorage.getItem("aiden_persona_id");
    if (!personaId) return router.replace("/select");
    setProfile({ name: localStorage.getItem("aiden_student_name") ?? "", personaId });
  }, [router]);

  if (!profile) return null;

  let persona;
  try {
    persona = getPersona(profile.personaId);
  } catch {
    persona = getPersona("mia");
  }
  const avatar = AVATAR[profile.personaId] ?? "🎀";

  return (
    <main style={{ position: "relative", zIndex: 1, minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
      <div style={{ display: "grid", justifyItems: "center", gap: 22, animation: "float-in .6s ease both" }}>
        <div
          style={{
            width: 110,
            height: 110,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            fontSize: 56,
            background: "linear-gradient(150deg, var(--peach), var(--rose) 60%, var(--coral))",
            boxShadow: "0 18px 44px var(--shadow-coral)",
            animation: "breathe 3.6s ease-in-out infinite",
          }}
        >
          {avatar}
        </div>

        <div>
          <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>
            {profile.name ? `안녕, ${profile.name}!` : "Aiden English"}
          </h1>
          <p style={{ color: "var(--ink-soft)", fontSize: 16, marginTop: 6 }}>
            {persona.name}가 너한테 물어볼 게 있대 👀
          </p>
        </div>

        <Link
          href="/chat"
          style={{
            padding: "15px 30px",
            borderRadius: 999,
            fontFamily: "var(--font-display)",
            fontSize: 18,
            fontWeight: 600,
            color: "#fff",
            background: "linear-gradient(160deg, var(--coral), var(--coral-deep))",
            boxShadow: "0 14px 32px var(--shadow-coral)",
          }}
        >
          {persona.name}랑 얘기하기 →
        </Link>

        <Link href="/who" style={{ fontSize: 14, color: "var(--ink-soft)", textDecoration: "underline" }}>
          프로필 바꾸기
        </Link>
      </div>
    </main>
  );
}
