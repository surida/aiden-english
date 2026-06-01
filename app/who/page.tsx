"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Profile = { id: string; display_name: string };

export default function WhoPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/student")
      .then((r) => r.json())
      .then((d) => setProfiles(d.students ?? []))
      .catch(() => setProfiles([]))
      .finally(() => setLoading(false));
  }, []);

  function pick(p: Profile) {
    localStorage.setItem("aiden_student_id", p.id);
    localStorage.setItem("aiden_student_name", p.display_name);
    localStorage.removeItem("aiden_onboarding");
    router.push("/");
  }

  async function create() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const res = await fetch("/api/student", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: trimmed }),
    });
    if (!res.ok) return;
    const { id } = await res.json();
    localStorage.setItem("aiden_student_id", id);
    localStorage.setItem("aiden_student_name", trimmed);
    localStorage.setItem("aiden_onboarding", "1");
    router.push("/select");
  }

  return (
    <main style={{ position: "relative", zIndex: 1, minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 360, display: "grid", gap: 18, animation: "float-in .5s ease both" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, textAlign: "center" }}>누구야? 👋</h1>

        {!loading &&
          profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => pick(p)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: 14,
                borderRadius: 18,
                background: "#fff",
                boxShadow: "0 8px 22px var(--shadow-soft)",
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  color: "#fff",
                  background: "linear-gradient(150deg, var(--rose), var(--coral))",
                }}
              >
                {p.display_name.slice(0, 1)}
              </span>
              {p.display_name}
            </button>
          ))}

        {adding ? (
          <div style={{ display: "grid", gap: 10 }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && create()}
              style={{ padding: 14, fontSize: 18, borderRadius: 14, border: "1px solid #e7d6cf", textAlign: "center" }}
            />
            <button
              onClick={create}
              style={{ padding: 14, borderRadius: 14, fontSize: 16, fontWeight: 600, color: "#fff", background: "linear-gradient(160deg, var(--coral), var(--coral-deep))" }}
            >
              시작하기 →
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            style={{ padding: 14, borderRadius: 18, fontSize: 16, fontWeight: 600, color: "var(--coral-deep)", background: "transparent", border: "2px dashed var(--rose)" }}
          >
            + 새로 시작하기
          </button>
        )}

        <Link
          href="/family?view=family"
          style={{ marginTop: 6, textAlign: "center", fontSize: 14, color: "var(--ink-soft)", textDecoration: "underline" }}
        >
          📊 이번 주 우리 가족
        </Link>
      </div>
    </main>
  );
}
