import type { Mode } from "./prompt";

export type ModeConfig = {
  id: Mode;
  label: string;
  opener: string; // how the AI opens the session in this mode
};

const MODES: Record<Mode, ModeConfig> = {
  free: {
    id: "free",
    label: "Free chat",
    opener: "Hey! So good to see you 😊 What's up with you today?",
  },
  daily_q: {
    id: "daily_q",
    label: "Daily question",
    opener:
      "I've got a fun little question for you today — ready? What's the best thing that happened this week?",
  },
  diagnostic: {
    id: "diagnostic",
    label: "Getting to know you",
    opener: "Hi! I'm so happy to meet you. Let's just chat a bit — tell me about yourself!",
  },
};

export function getMode(mode: Mode): ModeConfig {
  const m = MODES[mode];
  if (!m) throw new Error(`unknown mode: ${mode}`);
  return m;
}

export function listModes(): ModeConfig[] {
  return Object.values(MODES);
}
