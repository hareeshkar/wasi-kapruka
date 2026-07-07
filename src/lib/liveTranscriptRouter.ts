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
