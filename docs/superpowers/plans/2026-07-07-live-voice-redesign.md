# Live Voice UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge Gemini Live voice transcripts into the main chat thread and replace the full-screen blurred bottom sheet with a premium, brand-consistent in-composer control bar, reachable from the empty/landing state.

**Architecture:** `App.tsx` routes `useGeminiLive`'s transcript callbacks through the existing `addMessage`/`updateMessage` (from `useSupabaseChat`) instead of a standalone `liveTranscripts` array, so spoken turns are ordinary persisted `Message` rows rendered by `ChatSection`'s existing bubble UI. A new presentational `LiveControlBar` component replaces the text composer row (in both `EmptyStatePlaceholder` and `ChatSection`) while a session is active — no overlay, no backdrop blur.

**Tech Stack:** React + TypeScript, Tailwind utility classes + inline style objects (existing pattern), `motion/react` for animation, `lucide-react` icons, Node's built-in `assert`/`node --test` style scripts (this repo has no Jest/Vitest — see `tests/mcp-live.test.js` for the existing plain-Node test convention), Playwright (already a devDependency) for one mock browser-flow smoke test.

## Global Constraints

- No live network/WebSocket calls in any automated test — the user will do the real live-audio test manually. Automated tests must mock `fetch('/api/live-token')` and must not require a real Gemini connection.
- Reuse Wasi's existing violet gradient family (`#5B3E8A`, `#402970`, `#2D1B69`) and gold soul accent (`#E8C96B`, from `WasiRobot.tsx`) for the live orb — no literal rainbow, no new brand colors.
- The control bar must occupy the same layout slot as the composer it replaces — no new fixed/overlay positioning, no new mobile safe-area logic.
- `prefers-reduced-motion` must disable the orb's rotation/pulse (static glow fallback).
- `npm run lint` (`tsc --noEmit`) must pass after every task.

---

### Task 1: Extract the live-transcript turn router (pure, testable logic)

**Files:**
- Create: `src/lib/liveTranscriptRouter.ts`
- Test: `tests/live-transcript-router.test.js`

**Interfaces:**
- Produces: `createLiveTranscriptRouter(handlers)` where `handlers = { addMessage: (msg: { id: string; role: 'user'|'assistant'; content: string; timestamp: string }) => void; updateMessage: (id: string, updates: { content: string }) => void; newId: () => string; now: () => string }`. Returns `{ onFragment(role: 'user'|'model', text: string): void; endTurn(role: 'user'|'model'): void; reset(): void }`.
- Consumed by: Task 3 (`App.tsx`).

This isolates the "accumulate streaming fragments into one message, start a new message on the next turn" logic from React state, so it can be unit-tested without mounting the app.

- [x] **Step 1: Write the router module**

```typescript
// src/lib/liveTranscriptRouter.ts

/**
 * Routes Gemini Live's streaming transcript fragments into the same
 * addMessage/updateMessage calls typed chat uses, so spoken turns become
 * ordinary persisted Message rows instead of a separate transcript feed.
 * Gemini delivers transcription in fragments (not full sentences) per
 * onmessage event; fragments for the same turn are concatenated into one
 * message until the turn ends.
 */

export type LiveRole = 'user' | 'model';

export interface LiveTranscriptHandlers {
  addMessage: (msg: { id: string; role: 'user' | 'assistant'; content: string; timestamp: string }) => void;
  updateMessage: (id: string, updates: { content: string }) => void;
  newId: () => string;
  now: () => string;
}

export interface LiveTranscriptRouter {
  onFragment: (role: LiveRole, text: string) => void;
  endTurn: (role: LiveRole) => void;
  reset: () => void;
}

const toMessageRole = (role: LiveRole): 'user' | 'assistant' => (role === 'model' ? 'assistant' : 'user');

export function createLiveTranscriptRouter(handlers: LiveTranscriptHandlers): LiveTranscriptRouter {
  const activeIds: Record<LiveRole, string | null> = { user: null, model: null };
  const activeContent: Record<LiveRole, string> = { user: '', model: '' };

  function onFragment(role: LiveRole, text: string) {
    if (!text) return;
    if (!activeIds[role]) {
      const id = handlers.newId();
      activeIds[role] = id;
      activeContent[role] = text;
      handlers.addMessage({ id, role: toMessageRole(role), content: text, timestamp: handlers.now() });
      return;
    }
    activeContent[role] += text;
    handlers.updateMessage(activeIds[role]!, { content: activeContent[role] });
  }

  function endTurn(role: LiveRole) {
    activeIds[role] = null;
    activeContent[role] = '';
  }

  function reset() {
    activeIds.user = null;
    activeIds.model = null;
    activeContent.user = '';
    activeContent.model = '';
  }

  return { onFragment, endTurn, reset };
}
```

- [x] **Step 2: Write the test**

```javascript
// tests/live-transcript-router.test.js
// Pure logic test — no network, no browser. Run: node tests/live-transcript-router.test.js
import assert from 'node:assert/strict';
import { createLiveTranscriptRouter } from '../src/lib/liveTranscriptRouter.ts';

async function run() {
  // NOTE: Node can't import .ts directly without a loader. This test is
  // executed via `npx tsx tests/live-transcript-router.test.js` (tsx is
  // already a project devDependency used for the dev server).
  let idCounter = 0;
  const added = [];
  const updated = [];
  const router = createLiveTranscriptRouter({
    addMessage: (msg) => added.push(msg),
    updateMessage: (id, updates) => updated.push({ id, ...updates }),
    newId: () => `id-${++idCounter}`,
    now: () => '2026-07-07T00:00:00.000Z',
  });

  // Fragments for the same turn accumulate into one message
  router.onFragment('user', 'Hello');
  router.onFragment('user', ' there');
  assert.equal(added.length, 1, 'first fragment should add exactly one message');
  assert.equal(added[0].role, 'user');
  assert.equal(added[0].content, 'Hello');
  assert.equal(updated.length, 1, 'second fragment should update, not add');
  assert.equal(updated[0].content, 'Hello there');

  // Ending the turn starts a fresh message on the next fragment
  router.endTurn('user');
  router.onFragment('user', 'Second turn');
  assert.equal(added.length, 2, 'new turn should add a new message');
  assert.notEqual(added[1].id, added[0].id, 'new turn must get a new message id');
  assert.equal(added[1].content, 'Second turn');

  // model and user turns are tracked independently
  router.onFragment('model', 'Sure,');
  router.onFragment('model', ' happy to help.');
  assert.equal(added[2].role, 'assistant', 'model role maps to assistant Message role');
  assert.equal(updated[updated.length - 1].content, 'Sure, happy to help.');

  // reset() clears in-flight turns for both roles
  router.reset();
  router.onFragment('user', 'After reset');
  assert.equal(added.length, 4, 'reset should force a brand-new message on next fragment');

  console.log('PASS: live-transcript-router (6 assertions)');
}

run().catch((err) => { console.error('FAIL:', err); process.exit(1); });
```

- [x] **Step 3: Run the test to verify it passes**

Run: `npx tsx tests/live-transcript-router.test.js`
Expected: `PASS: live-transcript-router (6 assertions)`

- [x] **Step 4: Add the npm script and commit**

Edit `package.json` scripts block, add after `"test:mcp"`:
```json
"test:live-router": "tsx tests/live-transcript-router.test.js",
```

```bash
git add src/lib/liveTranscriptRouter.ts tests/live-transcript-router.test.js package.json
git commit -m "feat: extract live transcript turn-router as pure, tested logic"
```

---

### Task 2: `LiveControlBar` component — the soul orb + controls

**Files:**
- Create: `src/components/LiveControlBar.tsx`
- Delete (in this task, since it's being fully superseded): `src/components/LiveSessionPanel.tsx`

**Interfaces:**
- Produces: `export default function LiveControlBar(props: LiveControlBarProps)` where:
```typescript
export interface LiveControlBarProps {
  state: 'idle' | 'connecting' | 'active' | 'disconnecting' | 'error';
  isMuted: boolean;
  onToggleMic: () => void;
  onEnd: () => void;
}
```
- Consumed by: Task 4 (`ChatSection.tsx`), Task 5 (`EmptyStatePlaceholder.tsx`).
- Consumes: `LiveState` type shape already defined in `src/hooks/useGeminiLive.ts` (structurally compatible, re-declared here to avoid a new cross-import — this component has no other dependency on the hook).

- [x] **Step 1: Delete the old panel**

```bash
git rm src/components/LiveSessionPanel.tsx
```

- [x] **Step 2: Write `LiveControlBar.tsx`**

```tsx
/**
 * LiveControlBar — replaces the text composer row while a Gemini Live
 * voice session is active. Renders inline (same layout slot as the
 * composer), no overlay/backdrop, so the rest of the chat stays visible
 * and legible while the user talks.
 *
 * The "soul orb" reuses Wasi's own established gold/violet identity
 * (see WasiRobot.tsx's GOLD_SOUL) rather than a generic waveform or a
 * literal copy of iOS's rainbow Siri orb — same character, just active.
 */
import { motion } from 'motion/react';
import { Mic, MicOff, PhoneOff } from 'lucide-react';

export interface LiveControlBarProps {
  state: 'idle' | 'connecting' | 'active' | 'disconnecting' | 'error';
  isMuted: boolean;
  elapsedLabel: string;
  onToggleMic: () => void;
  onEnd: () => void;
}

const STATE_LABELS: Record<LiveControlBarProps['state'], string> = {
  idle: 'Ending…',
  connecting: 'Connecting…',
  active: 'Listening…',
  disconnecting: 'Ending…',
  error: 'Voice error',
};

function SoulOrb({ state, isMuted }: { state: LiveControlBarProps['state']; isMuted: boolean }) {
  const isError = state === 'error';
  const isLive = state === 'active' && !isMuted;

  return (
    <div className="relative w-7 h-7 shrink-0 rounded-full" aria-hidden="true">
      {/* Base — same violet gradient family as the composer's send button */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: isError
            ? 'linear-gradient(135deg, #f43f5e 0%, #9f1239 100%)'
            : 'linear-gradient(135deg, #5B3E8A 0%, #402970 50%, #2D1B69 100%)',
          boxShadow: isLive ? '0 0 12px rgba(232,201,107,0.45)' : '0 2px 8px rgba(64,41,112,0.25)',
        }}
      />
      {/* Gold sheen ring — rotates while live, static glow otherwise */}
      <motion.div
        className="absolute inset-[-2px] rounded-full motion-reduce:animate-none"
        style={{
          background: 'conic-gradient(from 0deg, #E8C96B, transparent 30%, transparent 70%, #E8C96B)',
          opacity: isError ? 0 : isLive ? 0.9 : 0.35,
          maskImage: 'radial-gradient(circle, transparent 55%, black 58%)',
          WebkitMaskImage: 'radial-gradient(circle, transparent 55%, black 58%)',
        }}
        animate={isLive ? { rotate: 360 } : { rotate: 0 }}
        transition={isLive ? { duration: 1.6, repeat: Infinity, ease: 'linear' } : { duration: 0.3 }}
      />
    </div>
  );
}

export default function LiveControlBar({ state, isMuted, elapsedLabel, onToggleMic, onEnd }: LiveControlBarProps) {
  const isBusy = state === 'connecting' || state === 'disconnecting';

  return (
    <div
      className="flex items-center w-full rounded-full gap-2 px-3"
      style={{
        minHeight: '54px',
        background: 'rgba(255,255,255,0.80)',
        backdropFilter: 'blur(12px)',
        border: state === 'error' ? '1.5px solid rgba(244,63,94,0.30)' : '1.5px solid rgba(139,92,246,0.25)',
        boxShadow: '0 6px 28px rgba(139,92,246,0.08)',
      }}
      role="status"
      aria-live="polite"
    >
      <SoulOrb state={state} isMuted={isMuted} />

      <span className={`text-[13.5px] font-medium flex-1 truncate ${state === 'error' ? 'text-rose-600' : 'text-ink'}`}>
        {STATE_LABELS[state]}
      </span>

      {state === 'active' && (
        <span className="text-[11px] tabular-nums text-ink-faint font-mono shrink-0">{elapsedLabel}</span>
      )}

      <button
        type="button"
        onClick={onToggleMic}
        disabled={!(state === 'active')}
        title={isMuted ? 'Unmute mic' : 'Mute mic'}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all disabled:opacity-30 ${
          isMuted ? 'bg-gray-200 text-gray-500' : 'bg-violet-tint text-violet'
        }`}
      >
        {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </button>

      <button
        type="button"
        onClick={onEnd}
        disabled={isBusy}
        title="End live session"
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-rose-500 text-white transition-all disabled:opacity-40"
      >
        <PhoneOff className="w-4 h-4" />
      </button>
    </div>
  );
}
```

- [x] **Step 3: Typecheck**

Run: `npm run lint`
Expected: no new errors from `LiveControlBar.tsx` (errors from other in-progress files in this task set are expected until later tasks land — see Task 6 for the final all-green check).

- [x] **Step 4: Commit**

```bash
git add src/components/LiveControlBar.tsx src/components/LiveSessionPanel.tsx
git commit -m "feat: replace LiveSessionPanel overlay with inline LiveControlBar"
```

---

### Task 3: Wire transcript routing + error fallback into `App.tsx`

**Files:**
- Modify: `src/App.tsx` (live-voice state block, `~line 93` and `~line 126-150`; render block `~line 2087-2094`; `ChatSection`/`EmptyStatePlaceholder` render props `~line 2023-2081`)

**Interfaces:**
- Consumes: `createLiveTranscriptRouter` from `src/lib/liveTranscriptRouter.ts` (Task 1); `addMessage`, `updateMessage` from `useSupabaseChat` (already destructured at `App.tsx:87`); `live.state`, `live.isMuted`, `live.toggleMic`, `live.disconnect`, `live.connect` from `useGeminiLive` (existing).
- Produces: `liveElapsedLabel: string` and passes `isLiveActive`, `liveState`, `onLiveToggle`, `onLiveToggleMic`, `onLiveEnd`, `liveElapsedLabel` as props to both `EmptyStatePlaceholder` and `ChatSection` (consumed by Tasks 4 and 5).

- [x] **Step 1: Replace the `liveTranscripts` state with the router**

Find this block (current `App.tsx:92-94`):
```typescript
  // Live voice mode state
  const [liveTranscripts, setLiveTranscripts] = useState<Array<{ id: number; role: 'user' | 'model'; text: string }>>([]);
  const liveTranscriptIdRef = useRef(0);
```
Replace with:
```typescript
  // Live voice mode — transcripts route into the same message thread as
  // typed chat via the router below, instead of a separate feed.
  const liveTranscriptRouterRef = useRef(
    createLiveTranscriptRouter({
      addMessage: (msg) => { void addMessage(msg); },
      updateMessage: (id, updates) => { void updateMessage(id, updates); },
      newId: () => crypto.randomUUID(),
      now: () => new Date().toISOString(),
    })
  );
```

Add the import at the top with the other local imports:
```typescript
import { createLiveTranscriptRouter } from './lib/liveTranscriptRouter';
```

- [x] **Step 2: Update the `useGeminiLive` callbacks**

Find (current `App.tsx:126-150`):
```typescript
  const live = useGeminiLive({
    onUserTranscript: (text) => {
      liveTranscriptIdRef.current += 1;
      setLiveTranscripts(prev => [...prev, { id: liveTranscriptIdRef.current, role: 'user', text }]);
    },
    onModelTranscript: (text) => {
      liveTranscriptIdRef.current += 1;
      setLiveTranscripts(prev => [...prev, { id: liveTranscriptIdRef.current, role: 'model', text }]);
    },
    onToolCall: (name, args) => {
      console.log(`[Live/Tool] ${name}`, args);
    },
    onEnd: () => {
      setLiveTranscripts([]);
    },
    onError: (msg, shouldFallback) => {
      console.error('[Live] Error:', msg, shouldFallback ? '(fallback to text)' : '');
      if (shouldFallback) {
        // Fall back to text chat — show error briefly then dismiss
        setErrorToast({ message: `Live ended: ${msg}. Switching to text chat.`, category: 'unknown', isRetryable: false });
      } else {
        setErrorToast({ message: `Live error: ${msg}`, category: 'unknown', isRetryable: false });
      }
    },
  });
```
Replace with:
```typescript
  const live = useGeminiLive({
    onUserTranscript: (text) => {
      liveTranscriptRouterRef.current.onFragment('user', text);
    },
    onModelTranscript: (text) => {
      liveTranscriptRouterRef.current.onFragment('model', text);
    },
    onToolCall: (name, args) => {
      console.log(`[Live/Tool] ${name}`, args);
    },
    onEnd: () => {
      liveTranscriptRouterRef.current.reset();
    },
    onError: (msg, shouldFallback) => {
      console.error('[Live] Error:', msg, shouldFallback ? '(fallback to text)' : '');
      liveTranscriptRouterRef.current.reset();
      if (shouldFallback) {
        // Transcripts already live in the main thread — falling back to
        // text is a continuation, not a reset. Say so in Wasi's own voice.
        void addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Voice ended — ${msg}. Keep typing, I've got the full conversation.`,
          timestamp: new Date().toISOString(),
        });
      } else {
        setErrorToast({ message: `Live error: ${msg}`, category: 'unknown', isRetryable: false });
      }
    },
  });
```

- [x] **Step 3: Compute an elapsed-time label for the control bar**

Add near the `live` hook (after its declaration):
```typescript
  const [liveElapsed, setLiveElapsed] = useState(0);
  useEffect(() => {
    if (live.state !== 'active') { setLiveElapsed(0); return; }
    const start = Date.now();
    const id = setInterval(() => setLiveElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [live.state]);
  const liveElapsedLabel = `${String(Math.floor(liveElapsed / 60)).padStart(2, '0')}:${String(liveElapsed % 60).padStart(2, '0')}`;
```

- [x] **Step 4: Replace the `LiveSessionPanel` render with nothing (deleted) and pass live props to both branches**

Find (current `App.tsx:2086-2094`):
```typescript
      {/* ── Live voice panel (bottom sheet) ──────────────────────────────────── */}
      <LiveSessionPanel
        isOpen={live.state !== 'idle'}
        state={live.state}
        transcripts={liveTranscripts}
        isMuted={live.isMuted}
        onToggleMic={live.toggleMic}
        onEnd={live.disconnect}
      />
```
Delete this block entirely (the control bar now renders inline inside `EmptyStatePlaceholder`/`ChatSection`, wired in Tasks 4–5).

Remove the now-unused import:
```typescript
import LiveSessionPanel from './components/LiveSessionPanel';
```

Find the existing `onLiveToggle` handler passed to `ChatSection` (current `App.tsx:2071-2080`) and lift it to a named callback usable by both branches. Add above the `messages.length === 0 ? (...) : (...)` ternary (i.e., just above `App.tsx:2022`):
```typescript
        const handleLiveToggle = () => {
          if (live.state === 'active' || live.state === 'connecting') {
            live.disconnect();
          } else {
            const sysPrompt = buildLiveSystemPrompt();
            const history = buildLiveHistory();
            live.connect({ systemPrompt: sysPrompt, history });
          }
        };
        const isLiveActive = live.state === 'active' || live.state === 'connecting';
```
(Note: this sits inside the component body already, alongside `buildLiveSystemPrompt`/`buildLiveHistory` — no new `useCallback` needed since it closes over stable refs/functions already memoized.)

Update the `EmptyStatePlaceholder` call to add:
```typescript
            onLiveToggle={handleLiveToggle}
            isLiveActive={isLiveActive}
            liveState={live.state}
            liveIsMuted={live.isMuted}
            onLiveToggleMic={live.toggleMic}
            liveElapsedLabel={liveElapsedLabel}
```
Update the existing `ChatSection`'s `onLiveToggle={...}` / `isLiveActive={...}` props (currently duplicating the inline logic) to use the lifted values:
```typescript
            onLiveToggle={handleLiveToggle}
            isLiveActive={isLiveActive}
            liveState={live.state}
            liveIsMuted={live.isMuted}
            onLiveToggleMic={live.toggleMic}
            liveElapsedLabel={liveElapsedLabel}
```
(replacing the old two-line `onLiveToggle`/`isLiveActive` props with these six).

- [x] **Step 5: Typecheck**

Run: `npm run lint`
Expected: errors only in `ChatSection.tsx`/`EmptyStatePlaceholder.tsx` for the new props not yet accepted (fixed in Tasks 4–5) — no errors in `App.tsx` itself.

- [x] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat: route live transcripts through the message thread, add in-thread error fallback"
```

---

### Task 4: Wire `LiveControlBar` into `ChatSection.tsx`

**Files:**
- Modify: `src/components/ChatSection.tsx` (props interface `~line 57-59`, composer render `~line 748-822`)

**Interfaces:**
- Consumes: `LiveControlBar` (Task 2), new props from `App.tsx` (Task 3): `liveState`, `liveIsMuted`, `onLiveToggleMic`, `liveElapsedLabel` (in addition to existing `onLiveToggle`, `isLiveActive`).

- [x] **Step 1: Add the import and extend the props interface**

Add import:
```typescript
import LiveControlBar from './LiveControlBar';
```

Find (current `ChatSection.tsx:57-59`):
```typescript
  /** Live voice mode */
  onLiveToggle?: () => void;
  isLiveActive?: boolean;
```
Replace with:
```typescript
  /** Live voice mode */
  onLiveToggle?: () => void;
  isLiveActive?: boolean;
  liveState?: 'idle' | 'connecting' | 'active' | 'disconnecting' | 'error';
  liveIsMuted?: boolean;
  onLiveToggleMic?: () => void;
  liveElapsedLabel?: string;
```

Find (current `ChatSection.tsx:113`, destructured props) and add the new ones to the destructure list:
```typescript
  onCheckoutWizardComplete, orderIntent, onOpenCart, onLiveToggle, isLiveActive,
```
becomes:
```typescript
  onCheckoutWizardComplete, orderIntent, onOpenCart, onLiveToggle, isLiveActive,
  liveState, liveIsMuted, onLiveToggleMic, liveElapsedLabel,
```

- [x] **Step 2: Swap the composer pill for the control bar when live is active**

Find (current `ChatSection.tsx:762`):
```tsx
            <div className="chat-composer-pill flex items-center gap-1.5 rounded-full pl-2 pr-1.5 py-1 min-h-[48px]">
```
Wrap the existing composer pill `<div>...</div>` (the whole block from `ChatSection.tsx:762` through its closing `</div>` at `ChatSection.tsx:821`) in a conditional. Change the opening to:
```tsx
            {isLiveActive ? (
              <LiveControlBar
                state={liveState ?? 'idle'}
                isMuted={!!liveIsMuted}
                elapsedLabel={liveElapsedLabel ?? '00:00'}
                onToggleMic={() => onLiveToggleMic?.()}
                onEnd={() => onLiveToggle?.()}
              />
            ) : (
            <div className="chat-composer-pill flex items-center gap-1.5 rounded-full pl-2 pr-1.5 py-1 min-h-[48px]">
```
and add the closing `)}` immediately after the existing pill's closing `</div>` (right before `</form>`):
```tsx
            </div>
            )}
          </form>
```

- [x] **Step 3: Typecheck**

Run: `npm run lint`
Expected: no errors in `ChatSection.tsx`.

- [x] **Step 4: Commit**

```bash
git add src/components/ChatSection.tsx
git commit -m "feat: render LiveControlBar in place of ChatSection composer when live"
```

---

### Task 5: Wire `LiveControlBar` + entry point into `EmptyStatePlaceholder.tsx`

**Files:**
- Modify: `src/components/EmptyStatePlaceholder.tsx` (props interface `~line 6-16`, composer render `~line 392-436`)

**Interfaces:**
- Consumes: `LiveControlBar` (Task 2), same new props from `App.tsx` (Task 3) as `ChatSection`.

- [x] **Step 1: Add the import and extend the props interface**

Add imports:
```typescript
import { Radio } from 'lucide-react';
import LiveControlBar from './LiveControlBar';
```

Find (current `EmptyStatePlaceholder.tsx:6-16`):
```typescript
interface EmptyStatePlaceholderProps {
  lang?: 'en' | 'si' | 'ta';
  isSignedIn: boolean;
  userName?: string;
  onSignIn: () => void;
  onNewChat: () => void;
  onSendMessage: (text: string, images?: Array<{ data: string; mimeType: string }>) => void;
  onSendVoice?: (audioBase64: string, mimeType: string) => void;
  onAddMessage?: (msg: Message) => void;
  onUpdateMessage?: (msgId: string, updates: Partial<Message>) => void;
}
```
Replace with:
```typescript
interface EmptyStatePlaceholderProps {
  lang?: 'en' | 'si' | 'ta';
  isSignedIn: boolean;
  userName?: string;
  onSignIn: () => void;
  onNewChat: () => void;
  onSendMessage: (text: string, images?: Array<{ data: string; mimeType: string }>) => void;
  onSendVoice?: (audioBase64: string, mimeType: string) => void;
  onAddMessage?: (msg: Message) => void;
  onUpdateMessage?: (msgId: string, updates: Partial<Message>) => void;
  onLiveToggle?: () => void;
  isLiveActive?: boolean;
  liveState?: 'idle' | 'connecting' | 'active' | 'disconnecting' | 'error';
  liveIsMuted?: boolean;
  onLiveToggleMic?: () => void;
  liveElapsedLabel?: string;
}
```

Find the component's destructured props (current `EmptyStatePlaceholder.tsx:95`):
```typescript
lang = 'en', isSignedIn, userName, onSignIn, onNewChat, onSendMessage, onSendVoice, onAddMessage, onUpdateMessage,
```
(exact remainder of that line may continue — append the new props to whatever the full destructure list is):
```typescript
onLiveToggle, isLiveActive, liveState, liveIsMuted, onLiveToggleMic, liveElapsedLabel,
```

- [x] **Step 2: Add the Live button next to the mic/send controls, and swap in the control bar**

Find (current `EmptyStatePlaceholder.tsx:392`, the composer pill open tag) and wrap the same way as Task 4 — change:
```tsx
            <div className="flex items-center w-full rounded-full transition-all duration-250"
```
to:
```tsx
            {isLiveActive ? (
              <LiveControlBar
                state={liveState ?? 'idle'}
                isMuted={!!liveIsMuted}
                elapsedLabel={liveElapsedLabel ?? '00:00'}
                onToggleMic={() => onLiveToggleMic?.()}
                onEnd={() => onLiveToggle?.()}
              />
            ) : (
            <div className="flex items-center w-full rounded-full transition-all duration-250"
```
and close it right after the composer pill's closing `</div>` (the one that matches this opening `<div>`, immediately before `</form>`):
```tsx
            </div>
            )}
          </form>
```

Then add the Radio (live) button inside the pill's right-hand button group (current `EmptyStatePlaceholder.tsx:417-422`, right before the `<button type="submit" ...>`):
```tsx
              <div className="flex items-center gap-1 shrink-0">
                {isRecording && (
                  <button type="button" onClick={cancelRecording} className="w-9 h-9 rounded-full flex items-center justify-center bg-rose-50 text-rose-500 hover:bg-rose-100 transition-all cursor-pointer" title="Cancel">
                    <X className="w-[17px] h-[17px]" />
                  </button>
                )}
                <button type="button" onClick={onLiveToggle} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-violet/6 transition-colors cursor-pointer" style={{ color: 'rgba(64,41,112,0.35)' }} title="Start live voice">
                  <Radio className="w-[17px] h-[17px]" />
                </button>
```
(keep the existing `<button type="submit" ...>` immediately after, unchanged).

- [x] **Step 3: Typecheck**

Run: `npm run lint`
Expected: no errors in `EmptyStatePlaceholder.tsx`.

- [x] **Step 4: Commit**

```bash
git add src/components/EmptyStatePlaceholder.tsx
git commit -m "feat: add live-voice entry point and control bar to the empty-state composer"
```

---

### Task 6: Full-project typecheck + mock browser-flow smoke test

**Files:**
- Create: `tests/live-ui-mock-flow.spec.ts` (Playwright)

**Interfaces:**
- Consumes: the running dev server (`npm run dev`), Playwright (existing devDependency).

This test does **not** connect to a real Gemini Live session — it mocks `POST /api/live-token` to fail fast (simulating "no mic/network available in CI"), so it only verifies the UI doesn't crash when Live is triggered and gracefully surfaces the in-thread fallback message from Task 3. Real audio/voice verification is manual (per the project owner's instruction).

- [x] **Step 1: Write the test**

```typescript
// tests/live-ui-mock-flow.spec.ts
// Mock-only flow test for the Live voice UI redesign. Does not open a real
// Gemini Live WebSocket — verifies the empty-state entry point renders,
// clicking it doesn't crash the app, and a failed token request surfaces
// as an in-thread message rather than a silent hang or a full-screen
// overlay. Run: npx playwright test tests/live-ui-mock-flow.spec.ts
import { test, expect } from '@playwright/test';

test('live entry point on empty state, and token failure falls back gracefully in-thread', async ({ page }) => {
  // Force the token request to fail immediately — simulates no
  // GEMINI_API_KEY / network issue without needing a real Live session.
  await page.route('**/api/live-token', (route) =>
    route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'GEMINI_API_KEY not configured' }) })
  );

  await page.goto('/');

  const liveButton = page.getByTitle('Start live voice');
  await expect(liveButton).toBeVisible({ timeout: 15000 });

  await liveButton.click();

  // No full-screen overlay/backdrop should ever appear — the redesign
  // removed LiveSessionPanel's backdrop-blur bottom sheet entirely.
  await expect(page.locator('.backdrop-blur-xl')).toHaveCount(0);

  // The failed token request should end the session and the app should
  // still be interactive (composer/empty-state input still present) —
  // no crash, no stuck "Connecting…" state.
  await expect(page.locator('input[type="text"], textarea').first()).toBeVisible({ timeout: 10000 });
});
```

- [x] **Step 2: Run the test**

Run: `npm run dev` (in one terminal), then in another: `npx playwright test tests/live-ui-mock-flow.spec.ts`
Expected: 1 passed.

If Playwright isn't configured with a `baseURL`/webServer in this repo yet, check for a `playwright.config.ts`; if none exists, run with an explicit base URL instead:
`npx playwright test tests/live-ui-mock-flow.spec.ts --config=<(echo "export default { use: { baseURL: 'http://localhost:3000' } }")` — or simpler, hardcode `page.goto('http://localhost:3000/')` in the test if no config exists (check the `dev` script's port in `server.ts` first).

- [x] **Step 3: Full project typecheck**

Run: `npm run lint`
Expected: 0 errors.

- [x] **Step 4: Run the existing test suite to confirm no regressions**

Run: `npm run test:live-router`
Expected: `PASS: live-transcript-router (6 assertions)`

- [x] **Step 5: Commit**

```bash
git add tests/live-ui-mock-flow.spec.ts
git commit -m "test: add mock browser-flow smoke test for the live voice UI redesign"
```

---

## Post-Implementation

- [ ] Get advisor review of the complete diff (all 6 tasks) before considering this done.
- [ ] Leave real live-audio verification (speaking → transcripts → audio playback) to the project owner's manual test, per their explicit instruction.
