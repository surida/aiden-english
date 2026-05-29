import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        position: "relative",
        zIndex: 1,
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        textAlign: "center",
      }}
    >
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
          🎀
        </div>

        <div>
          <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>Aiden English</h1>
          <p style={{ color: "var(--ink-soft)", fontSize: 16, marginTop: 6 }}>
            오늘 Mia가 너한테 물어볼 게 있대 👀
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
          Mia랑 얘기하기 →
        </Link>
      </div>
    </main>
  );
}
