"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Conversation from "@/components/Conversation";

export default function DiagnosePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [ids, setIds] = useState<{ studentId: string; personaId: string }>({ studentId: "", personaId: "" });

  useEffect(() => {
    const studentId = localStorage.getItem("aiden_student_id");
    const personaId = localStorage.getItem("aiden_persona_id");
    if (!studentId) return router.replace("/who");
    if (!personaId) return router.replace("/select");
    setIds({ studentId, personaId });
    setReady(true);
  }, [router]);

  async function onComplete(sessionId: string | null) {
    const studentId = localStorage.getItem("aiden_student_id");
    if (sessionId && studentId) {
      await fetch("/api/diagnose", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, studentId }),
      }).catch(() => {});
    }
    localStorage.removeItem("aiden_onboarding");
    router.push("/");
  }

  if (!ready) return null;

  return (
    <Conversation
      personaId={ids.personaId}
      studentId={ids.studentId}
      mode="diagnostic"
      maxStudentTurns={4}
      onComplete={onComplete}
    />
  );
}
