# AI English Speaking App — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an MVP web PWA where a teen talks to a selectable AI "friend" in English by voice, gets gently corrected, and is silently leveled — first for the author's two daughters.

**Architecture:** Next.js (App Router, TypeScript) full-stack. Browser captures mic audio and streams it to Next.js API routes; the server holds all API keys and orchestrates a composed voice pipeline (OpenAI STT → chat LLM with persona/level-adaptive prompt → OpenAI TTS), plus a separate async correction LLM pass. Persona is data (config objects), not code. Hidden adaptive level and interests live in Supabase (Postgres) and are injected into every prompt for memory/continuity.

**Tech Stack:** Next.js 14+ (App Router), TypeScript, Supabase (Postgres + Auth), OpenAI SDK (transcription + chat + speech), Vitest (unit), MediaRecorder + Web Audio (browser), PWA (manifest + service worker).

> **Verify-at-build note:** Exact OpenAI model names, pricing, and SDK signatures change. Confirm current model IDs (STT / chat / TTS) and the audio API surface against latest OpenAI docs before wiring Tasks 7–10. The claude-api / context7 tooling can fetch current docs.

> **Testing reality:** Voice + LLM calls are non-deterministic external APIs. TDD targets the *deterministic* core (schema access, persona loading, prompt assembly, correction parsing, API contracts with mocked SDK). The end-to-end voice loop is verified by integration + manual browser testing.

---

## Phase 0 — Project setup

### Task 1: Scaffold Next.js + tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `vitest.config.ts`, `.env.local.example`, `.gitignore`, `app/layout.tsx`, `app/page.tsx`

**Step 1:** Scaffold app.
Run: `npx create-next-app@latest . --typescript --app --eslint --no-tailwind --src-dir=false`
(Accept defaults; this is a fresh empty dir with only `docs/` and `.git/`.)

**Step 2:** Add deps.
Run: `npm i openai @supabase/supabase-js` and `npm i -D vitest @vitest/coverage-v8`

**Step 3:** Add test script to `package.json`:
```json
"scripts": { "test": "vitest run", "test:watch": "vitest" }
```

**Step 4:** Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node", include: ["**/*.test.ts"] } });
```

**Step 5:** Create `.env.local.example` (never commit real `.env.local`):
```
OPENAI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_PIN=
```
Confirm `.gitignore` contains `.env*.local`.

**Step 6:** Sanity test. Create `lib/health.ts` with `export const ok = () => true;` and `lib/health.test.ts`:
```ts
import { test, expect } from "vitest";
import { ok } from "./health";
test("health ok", () => expect(ok()).toBe(true));
```
Run: `npm test` → Expected: PASS.

**Step 7: Commit**
```bash
git add -A && git commit -m "chore: scaffold Next.js + vitest + deps"
```

---

## Phase 1 — Data model & persona config

### Task 2: Supabase schema

**Files:**
- Create: `supabase/migrations/0001_init.sql`

**Step 1:** Write schema:
```sql
create table students (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  level int not null default 2,          -- hidden 1..6 internal scale
  diagnosed_at timestamptz,
  created_at timestamptz default now()
);
create table interests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  tag text not null,                      -- e.g. "kpop","games"
  note text                               -- recent topic memory, e.g. "exam on Fri"
);
create table sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  persona_id text not null,
  mode text not null,                     -- "free" | "daily_q" | "diagnostic"
  started_at timestamptz default now(),
  ended_at timestamptz
);
create table session_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  role text not null,                     -- "student" | "ai"
  text text not null,
  correction jsonb,                       -- {original, fixed, note} when present
  created_at timestamptz default now()
);
```

**Step 2:** Apply via Supabase dashboard SQL editor (or `supabase db push` if CLI configured). Verify tables exist.

**Step 3: Commit**
```bash
git add supabase/migrations/0001_init.sql && git commit -m "feat: add supabase schema"
```

> **Level scale:** internal 1–6 (never shown to the student). 1≈absolute beginner, 6≈fluent. Used to drive vocabulary, sentence complexity, TTS speed, Korean-scaffolding amount.

### Task 3: Persona config as data + loader

**Files:**
- Create: `lib/personas.ts`, `lib/personas.test.ts`

**Step 1: Write the failing test** (`lib/personas.test.ts`):
```ts
import { test, expect } from "vitest";
import { getPersona, listPersonas } from "./personas";

test("lists 2-3 presets", () => {
  expect(listPersonas().length).toBeGreaterThanOrEqual(2);
});
test("getPersona returns shape with voice + personality + correctionStyle", () => {
  const p = getPersona("mia");
  expect(p.voice).toBeTruthy();
  expect(p.personality).toBeTruthy();
  expect(p.correctionStyle).toBe("gentle");
});
test("unknown persona throws", () => {
  expect(() => getPersona("nope")).toThrow();
});
```

**Step 2:** Run `npm test` → Expected: FAIL (module not found).

**Step 3: Implement** (`lib/personas.ts`):
```ts
export type Persona = {
  id: string; name: string; voice: string;
  age: "peer" | "older-sister" | "tutor";
  personality: string; correctionStyle: "gentle";
};
const PRESETS: Persona[] = [
  { id: "mia", name: "Mia", voice: "shimmer", age: "peer",
    personality: "Bright, loves K-pop and games. Big reactions, talks like a same-age friend.",
    correctionStyle: "gentle" },
  { id: "luna", name: "Luna", voice: "nova", age: "older-sister",
    personality: "Warm, cool older-sister energy. Encouraging, gently nudges you to say more.",
    correctionStyle: "gentle" },
];
export const listPersonas = () => PRESETS;
export const getPersona = (id: string): Persona => {
  const p = PRESETS.find(x => x.id === id);
  if (!p) throw new Error(`unknown persona: ${id}`);
  return p;
};
```

**Step 4:** Run `npm test` → Expected: PASS.

**Step 5: Commit** `git add lib/personas.ts lib/personas.test.ts && git commit -m "feat: persona config + loader"`

### Task 4: Supabase data access (students, interests)

**Files:**
- Create: `lib/db.ts` (server-only Supabase client using service role key), `lib/students.ts`, `lib/students.test.ts`

**Step 1: Write failing test** with a mocked supabase client — assert `setLevel`/`getStudent`/`addInterest` call the right table/columns. (Inject the client so the test never hits network.)

**Step 2:** Run `npm test` → FAIL.

**Step 3:** Implement thin functions over the injected client (`from("students").update({level})...`, etc.).

**Step 4:** Run `npm test` → PASS.

**Step 5: Commit** `git commit -m "feat: student + interest data access"`

---

## Phase 2 — Prompt assembly (deterministic, TDD core)

### Task 5: System prompt builder

This is the brain config: it fuses persona + hidden level + interests/memory + mode + the **recast** rule + **level-based Korean scaffolding** rule.

**Files:**
- Create: `lib/prompt.ts`, `lib/prompt.test.ts`

**Step 1: Write failing tests** (`lib/prompt.test.ts`):
```ts
import { test, expect } from "vitest";
import { buildSystemPrompt } from "./prompt";
import { getPersona } from "./personas";

const base = { persona: getPersona("mia"), interests: ["kpop"], memory: ["math exam on Friday"] };

test("includes persona personality + name", () => {
  const p = buildSystemPrompt({ ...base, level: 2, mode: "free" });
  expect(p).toContain("Mia");
  expect(p).toMatch(/K-pop/i);
});
test("low level allows a Korean hint, high level does not", () => {
  expect(buildSystemPrompt({ ...base, level: 1, mode: "free" })).toMatch(/Korean/i);
  expect(buildSystemPrompt({ ...base, level: 6, mode: "free" })).not.toMatch(/Korean hint/i);
});
test("always instructs recast, never explicit correction mid-chat", () => {
  const p = buildSystemPrompt({ ...base, level: 3, mode: "free" });
  expect(p).toMatch(/recast/i);
  expect(p).toMatch(/do not.*correct/i);
});
test("injects memory so AI can reference last topic", () => {
  expect(buildSystemPrompt({ ...base, level: 3, mode: "free" })).toContain("math exam on Friday");
});
test("diagnostic mode asks to probe level naturally", () => {
  expect(buildSystemPrompt({ ...base, level: 2, mode: "diagnostic" })).toMatch(/assess|probe/i);
});
```

**Step 2:** Run `npm test` → FAIL.

**Step 3: Implement** `buildSystemPrompt` assembling sections:
- Identity (persona name/personality/age register)
- Hard rules: speak like a friend; **recast** errors naturally; **never** flag mistakes mid-conversation; keep turns short, end with a question.
- Level adaptation: map `level` → vocabulary band + sentence length + speaking style; for `level <= 2` allow "one short Korean hint if the student is stuck or silent"; for `level >= 5` English only.
- Memory/interests block (inject `interests` + `memory`).
- Mode block (free / daily_q / diagnostic instructions).

**Step 4:** Run `npm test` → PASS.

**Step 5: Commit** `git commit -m "feat: level/persona/memory-aware system prompt builder"`

### Task 6: Conversation modes + correction prompt

**Files:**
- Create: `lib/modes.ts`, `lib/correction.ts`, plus `.test.ts` for each

**Step 1:** Tests: `getMode("daily_q")` returns an opener template; `parseCorrections(llmJson)` returns an array of `{original, fixed, note}` capped at 3, and tolerates empty/malformed input (returns `[]`).

**Step 2–4:** Implement minimal mode templates and a correction-prompt builder + a strict JSON parser. Run tests to red→green.

**Step 5: Commit** `git commit -m "feat: conversation modes + correction parsing"`

---

## Phase 3 — Server API routes (the orchestrator)

> All routes are server-side (`app/api/.../route.ts`); keys never reach the browser. Mock the OpenAI SDK in tests; one manual smoke test per route with a real key.

### Task 7: `/api/transcribe` (STT)

**Files:** Create `app/api/transcribe/route.ts`, `app/api/transcribe/route.test.ts`

- **Test (mocked SDK):** POST with a fake audio blob → returns `{ text }`; SDK called with the configured STT model.
- **Implement:** read multipart audio, call `openai.audio.transcriptions.create({ model, file })`, return text. (Verify model id at build time.)
- **Manual smoke:** record 3s, confirm transcript.
- **Commit:** `feat: STT transcribe route`

### Task 8: `/api/chat` (conversation LLM, streaming)

**Files:** Create `app/api/chat/route.ts`, test

- **Test (mocked):** given `{studentId, personaId, mode, history, userText}` → loads student level + interests, calls `buildSystemPrompt`, calls chat completion with `stream:true`; persists student + ai turns to `session_items`.
- **Implement:** assemble prompt (Task 5), stream tokens back to client (ReadableStream), store turns.
- **Manual smoke:** send text, see streamed reply.
- **Commit:** `feat: streaming chat route with prompt assembly + persistence`

### Task 9: `/api/speak` (TTS, streaming)

**Files:** Create `app/api/speak/route.ts`, test

- **Test (mocked):** POST `{text, voice}` → returns audio stream; SDK called with persona voice.
- **Implement:** `openai.audio.speech.create({ model, voice, input })`, stream audio bytes.
- **Manual smoke:** hear the voice.
- **Commit:** `feat: TTS speak route`

### Task 10: `/api/correct` (async correction pass)

**Files:** Create `app/api/correct/route.ts`, test

- **Test (mocked):** given a session's student turns → returns ≤3 `{original, fixed, note}`; stores them on `session_items.correction`.
- **Implement:** correction-prompt (Task 6) over the session transcript, parse JSON, persist. Runs after session end (not mid-chat).
- **Commit:** `feat: async correction route`

### Task 11: Minimal PIN auth

**Files:** Create `app/api/auth/route.ts` + middleware

- **Test:** wrong PIN → 401; correct `APP_PIN` → sets a signed cookie.
- **Implement:** compare against `APP_PIN`, set httpOnly cookie; gate `/api/*` and app pages.
- **Commit:** `feat: simple PIN auth for daughters`

---

## Phase 4 — Frontend (conversation loop + screens)

> These are integration/manual-tested in the browser. Build incrementally; commit per task.

### Task 12: Push-to-talk mic capture
- `components/MicButton.tsx`: `getUserMedia` + `MediaRecorder`; hold-to-talk; emits audio blob. Handle permission-denied + HTTPS requirement.
- Manual: blob produced on release. Commit.

### Task 13: Wire the loop (STT → chat → TTS)
- `components/Conversation.tsx`: on blob → `/api/transcribe` → `/api/chat` (stream text into a bubble) → `/api/speak` (autoplay). Stream both directions so first audio starts ~1s.
- Manual: full spoken round-trip works. Commit.

### Task 14: Persona selection screen
- `app/select/page.tsx`: list `listPersonas()`, simple avatar/emoji, store choice. Commit.

### Task 15: First-run diagnostic flow
- `app/diagnose/page.tsx`: run 3–5 turns in `mode:"diagnostic"`; then one LLM call analyzes the transcript → returns internal level (1–6) → `setLevel`. Level never shown. Commit.

### Task 16: Interest intake
- During/after diagnostic, AI asks about interests conversationally; extract tags via an LLM call → `addInterest`. Commit.

### Task 17: Session-end "Today's tips"
- On end, call `/api/correct`, show ≤3 gentle tip cards. No red marks mid-chat. Commit.

### Task 18: Help / hint escape hatch
- "도와줘 / hint" button → injects a one-time "give a Korean hint / model answer" instruction for the next turn. Commit.

### Task 19: Soft daily invitation + weekly growth report
- Home shows a soft invite ("Mia has something to ask you 👀"). `app/report/page.tsx`: positive-only weekly summary ("new expressions you used"). Commit.

### Task 20: PWA polish
- `public/manifest.json`, icons, minimal service worker; "Add to Home Screen". Verify install on a phone. Commit.

---

## Phase 5 — Wrap-up

### Task 21: End-to-end manual test on a real phone
- iPhone Safari + Android Chrome: mic permission, full voice loop, persona switch, diagnostic, tips, report, install. Record any latency issues; tune streaming.
- Commit any fixes.

---

## Risks / verify checklist (carried from design doc)
- Confirm latest OpenAI model IDs + audio API signatures before Phase 3.
- STT accuracy on Korean-accented English — measure during Task 7 manual smoke.
- Privacy/compliance (minors' voice to overseas API) — fine for two daughters; revisit before any commercialization.
- Latency — rely on streaming (Tasks 8/9/13), not transport tweaks.
