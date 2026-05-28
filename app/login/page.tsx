"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError("PIN이 올바르지 않아요");
    }
  }

  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100dvh", fontFamily: "system-ui" }}>
      <form onSubmit={submit} style={{ display: "grid", gap: 12, width: 240 }}>
        <h1 style={{ fontSize: 20, textAlign: "center", margin: 0 }}>Aiden English</h1>
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="PIN"
          autoFocus
          style={{ padding: 12, fontSize: 18, textAlign: "center", borderRadius: 10, border: "1px solid #ccc" }}
        />
        <button
          type="submit"
          style={{ padding: 12, fontSize: 16, borderRadius: 10, border: "none", background: "#6c5ce7", color: "#fff" }}
        >
          들어가기
        </button>
        {error && <p style={{ color: "#e74c3c", textAlign: "center", margin: 0 }}>{error}</p>}
      </form>
    </main>
  );
}
