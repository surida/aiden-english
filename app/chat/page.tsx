import Conversation from "@/components/Conversation";
import type { Mode } from "@/lib/prompt";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ persona?: string; mode?: string }>;
}) {
  const { persona = "mia", mode = "free" } = await searchParams;
  return <Conversation personaId={persona} mode={mode as Mode} />;
}
