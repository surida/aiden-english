# STT improvement — Whisper prompt bias + audio capture polish

## Problem

Phone testing surfaced that `gpt-4o-transcribe` occasionally misses
common phrases (reported case: "traditional Korean food" was not
recognized at all). The current STT call passes only `model`, `file`,
and `language: "en"` — no domain or speaker context, no per-student
vocabulary bias.

## Decision

Stay on Whisper (`gpt-4o-transcribe`). Add a dynamic `prompt` and
tighten audio capture. Defer OpenAI Realtime / Gemini Live until this
isn't enough.

Cost driver: Whisper improvements are free; Realtime is ~10× per
conversation (~$4/mo → ~$40/mo for two daughters × 5 min × 22 days).

## Architecture

```
MicButton (capture)            Conversation (audio handler)
  getUserMedia({EC,NS,AGC})  →  POST /api/transcribe
  MediaRecorder(128 kbps)        FormData: audio + studentId + personaId
                                       │
                                       ▼
                                /api/transcribe
                                  loads student + interests + memories
                                  buildTranscribePrompt(...)
                                  openai.audio.transcriptions.create({
                                    file, language: "en", prompt
                                  })
                                       │
                                       ▼
                                  text → client → /api/chat (unchanged)
```

## Backend

**New helper: `lib/sttPrompt.ts`**

```ts
export function buildTranscribePrompt(ctx: {
  studentName?: string;
  personaName?: string;
  interests: string[];
  memories: string[];
}): string;
```

Produces one paragraph (~150 tokens, capped under Whisper's 224 limit):
"A Korean teen named {studentName} is chatting in English with their
friend {personaName}. They like {interests}. {memories}. Common topics:
school, family, food, friends, weekends, holidays, traditional Korean
food, K-dramas, K-pop."

If `studentId` is absent (diagnostic / pre-onboarding), falls back to
the generic paragraph (everything except the personalized parts).

**Route change: `app/api/transcribe/route.ts`**

- Read `studentId` (optional) and `personaId` from the form.
- If `studentId` present: load student + interests + recent memories
  using existing helpers (`getStudent`, `getInterests`,
  `getRecentMemories`). No new DB calls beyond what `/api/chat` already
  does.
- Pass `prompt` to `openai.audio.transcriptions.create`.
- 422 fallback for bad audio stays as is.

## Frontend

**`components/Conversation.tsx::handleAudio`**

Append `studentId` (when set) and `personaId` to the FormData. No other
change.

**`components/MicButton.tsx`**

- `getUserMedia({ audio: { echoCancellation, noiseSuppression,
  autoGainControl: true } })` — explicit so Android browsers don't drop
  AGC silently.
- `new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128000 })`.

## Testing

- **Unit (`lib/sttPrompt.test.ts`)**: full context, missing parts,
  empty interests/memories, token-length cap, generic fallback.
- **Real smoke**: small mjs script that POSTs the same audio file
  twice (with and without studentId in form) and prints both
  transcriptions for visual diff.
- **Phone**: re-test the previously failing utterances ("traditional
  Korean food", short clips with proper nouns) on the Vercel URL.

## Out of scope

- OpenAI Realtime API / Gemini Live (separate design when warranted).
- Show-transcription-before-send confirmation UX (option 2 from
  brainstorming — adds friction; not needed if option 1 works).
- Silence-trim / minimum-clip-length on the client.

## Rollout

Branch → push → Preview URL on Vercel → phone test → merge to main →
production auto-deploy. Same flow as Task 19+.
