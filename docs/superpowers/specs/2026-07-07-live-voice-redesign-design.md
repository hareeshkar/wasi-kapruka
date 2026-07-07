# Live Voice UI Redesign

## Problem

The Gemini Live voice mode (`useGeminiLive.ts` + `LiveSessionPanel.tsx`) currently:

1. Renders as a full-screen `backdrop-blur` bottom sheet that visually obscures the chat behind it while talking.
2. Keeps its own separate transcript feed (`liveTranscripts` state in `App.tsx`), so spoken conversation never becomes part of the real message history — it vanishes on `onEnd` (`setLiveTranscripts([])`) and never persists to Supabase.
3. Has no entry point from the empty/landing state (`EmptyStatePlaceholder.tsx`) — Live can only be started from `ChatSection`'s composer, i.e. only after the user has already sent a first message.
4. Uses a generic violet waveform-bars visual with no distinctive identity of its own.

## Goals

- Live and text conversation are one continuous, persisted thread.
- No full-screen blur or separate overlay panel while a Live session is active — the rest of the chat stays visible.
- User can start Live directly from the empty/landing state.
- Visual identity for the "live" state is distinctive and drawn from Wasi's existing brand (the mascot's gold "soul" glow), not a generic bars widget or a literal copy of Apple's Siri orb.
- Graceful, in-thread fallback to text chat on Live errors — no lost context.
- Works within the app's existing mobile layout (no new bottom-sheet safe-area logic).

## Non-goals

- Changing the Live API connection/config logic (already fixed separately — see the ephemeral-token constraint-config fix in `server.ts` / `useGeminiLive.ts`).
- Adding function-calling/tool support to the Live session (out of scope; `useGeminiLive.ts` doesn't declare `tools` today and this spec doesn't add them).
- Video or screen-share modalities.

## Design

### 1. Transcripts become real messages

`App.tsx` currently wires `useGeminiLive`'s `onUserTranscript` / `onModelTranscript` callbacks to a standalone `liveTranscripts` array rendered only inside `LiveSessionPanel`. This changes to route through the same `addMessage` / `updateMessage` used by typed chat (from `useSupabaseChat`), so spoken turns are ordinary `Message` rows — persisted, shown in `ChatSection`'s existing bubble rendering, and present in `buildLiveHistory()` context on the next session.

Gemini streams transcription in fragments, not full sentences. Track one in-progress message id per role per turn in `App.tsx` (`liveUserMsgIdRef`, `liveModelMsgIdRef`):

- First fragment of a turn → `addMessage({ id: crypto.randomUUID(), role, content: fragment, timestamp })`, store the id in the ref.
- Subsequent fragments in the same turn → `updateMessage(id, { content: prevContent + fragment })`.
- On `turnComplete` (or role switch, or `onEnd`) → clear the ref so the next turn starts a new message.

`liveTranscripts` state and the `TranscriptEntry` renderer in `LiveSessionPanel.tsx` are removed — `ChatSection`'s existing message list is the only transcript surface.

### 2. `LiveSessionPanel.tsx` → `LiveControlBar.tsx`

Delete the bottom-sheet component. Replace with a small control bar that renders **in place of the composer row**, in both `EmptyStatePlaceholder.tsx` and `ChatSection.tsx`, gated on `isLiveActive`. No backdrop, no fixed overlay, no independent `AnimatePresence` sheet — it occupies the same layout slot the text `<input>` currently uses, so it inherits the existing responsive/safe-area handling of that row instead of introducing new mobile logic.

Contents (single row, same height as the composer it replaces):
- Soul orb (see §3) + state label ("Listening…" / "Speaking…" / "Connecting…")
- Session timer (`mm:ss`, reuses existing `useSessionTimer` logic)
- Mute/unmute toggle (`Mic`/`MicOff`, existing icon choice)
- End-call button (`PhoneOff`, existing rose styling)

Props: `state: LiveState`, `isMuted`, `onToggleMic`, `onEnd`, `elapsedLabel`. Purely presentational — no transcript rendering, no scroll region.

### 3. Signature visual — the soul orb

A ~28px circular badge, replacing the generic waveform bars:

- Base: violet radial/conic gradient matching the composer's existing send-button gradient (`#5B3E8A → #402970 → #2D1B69`) — visually continuous with the button it's replacing.
- Overlaid: a slow-rotating conic sheen in gold + violet (`GOLD_SOUL #E8C96B` from `WasiRobot.tsx`, not a full rainbow), animated with `motion`'s `rotate` transform.
- State mapping:
  - `connecting`: slow, dim rotation.
  - `active` + listening (user speaking): idle-speed pulse. No real audio-level data is available client-side today, so the pulse reuses the same randomized-timing approach `VoiceWaveform` already uses, applied to one orb's scale/opacity instead of 16 bars.
  - `active` + model speaking: faster rotation + brighter glow.
  - `error`: rotation stops, orb dims to rose tint.
- Respects `prefers-reduced-motion`: falls back to a static glow, no rotation/pulse.

This is intentionally *not* a literal copy of iOS 26's rainbow Siri orb — it reuses Wasi's own established "gold soul" motif so the live indicator reads as the same character, just active.

### 4. Empty-state entry point

`EmptyStatePlaceholder.tsx` gets the same `Radio` icon button `ChatSection.tsx` already has in its composer (`onLiveToggle` / `isLiveActive`), in the same position relative to the send button. Both components receive `onLiveToggle`/`isLiveActive` as props from `App.tsx` (already computed there for `ChatSection`; just also passed to `EmptyStatePlaceholder`).

Starting Live from the empty state works without new routing: once the first transcript lands via `addMessage`, `messages.length` goes from 0 to 1, and `App.tsx`'s existing `messages.length === 0 ? <EmptyStatePlaceholder> : <ChatSection>` branch swaps to `ChatSection` on its own. The `LiveControlBar` must therefore also render inside `EmptyStatePlaceholder` up until that swap happens, so there's no visual gap.

### 5. Error handling → in-thread fallback

`onError(msg, shouldFallback)` in `App.tsx` today ends the session and shows a toast. This changes to, when `shouldFallback` is true:

1. End the Live session (unchanged).
2. Insert one `role: 'assistant'` message into the same thread: *"Voice ended — {reason}. Keep typing, I've got the full conversation."* — written in Wasi's own voice per the interface's error tone (plain, not apologetic), not a generic system toast.
3. Keep the existing toast for non-fallback (recoverable) errors, since those don't end the session.

Because transcripts already live in the main thread, this is a continuation, not a reset — nothing spoken is lost when falling back to text.

## Components touched

| File | Change |
|---|---|
| `src/components/LiveSessionPanel.tsx` | Deleted |
| `src/components/LiveControlBar.tsx` | New — replaces composer row when live |
| `src/components/EmptyStatePlaceholder.tsx` | Add `onLiveToggle`/`isLiveActive` props, Radio button, render `LiveControlBar` in place of composer when active |
| `src/components/ChatSection.tsx` | Render `LiveControlBar` in place of composer when active (Radio button already exists) |
| `src/App.tsx` | Route `onUserTranscript`/`onModelTranscript` through `addMessage`/`updateMessage` instead of `liveTranscripts`; add fallback message on error; pass live props to `EmptyStatePlaceholder` |
| `src/hooks/useGeminiLive.ts` | No change beyond what's already fixed (ephemeral token config) |

## Testing

- Manual: start Live from empty state → speak → confirm bubbles appear in the (now-visible) `ChatSection`, audio plays, no blur/overlay.
- Manual: start Live from an existing conversation → confirm transcripts append to existing history, not a separate feed.
- Manual: force a Live error (e.g. kill network mid-session) → confirm the fallback message appears in-thread and text chat still works.
- Manual: mobile viewport (iOS Safari + Android Chrome) → confirm the control bar sits correctly in the composer's existing safe-area without layout shift.
- `prefers-reduced-motion` → confirm orb has no rotation/pulse.
