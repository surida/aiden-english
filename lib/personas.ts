export type Persona = {
  id: string;
  name: string;
  voice: string;
  age: "peer" | "older-sister" | "tutor";
  personality: string;
  correctionStyle: "gentle";
};

const PRESETS: Persona[] = [
  {
    id: "mia",
    name: "Mia",
    voice: "shimmer",
    age: "peer",
    personality:
      "Bright, loves K-pop and games. Big reactions, talks like a same-age friend.",
    correctionStyle: "gentle",
  },
  {
    id: "luna",
    name: "Luna",
    voice: "nova",
    age: "older-sister",
    personality:
      "Warm, cool older-sister energy. Encouraging, gently nudges you to say more.",
    correctionStyle: "gentle",
  },
];

export const listPersonas = () => PRESETS;

export const getPersona = (id: string): Persona => {
  const p = PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`unknown persona: ${id}`);
  return p;
};
