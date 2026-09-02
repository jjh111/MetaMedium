// A participant answered by hand.
//
// The canvas asks its questions the same way whoever answers them: same
// grounded prompt, same parsing, same `propose()` channel. A bridge simply
// parks the question instead of posting it, and takes the answer back when it
// arrives. From the session's point of view nothing is different — it is an
// agent at whatever tier you say it is.
//
// This is worth having for three reasons, and only one of them is convenience:
//
//   - **Any model can take part**, including one with no HTTP API, one behind a
//     tool you are already talking to, or one on a machine the browser cannot
//     reach. The routing question stops being "which providers did we
//     integrate" and becomes "who is available".
//   - **It is the honest test of the serializer.** If a capable reader cannot
//     make sense of what `describeSession` produces, no amount of prompt
//     engineering against a small local model will tell you that — it will just
//     look like the small model being small.
//   - **It works offline and costs nothing**, which matters while the shape of
//     the routing system is still being decided.

import type { ProviderConfig, CompletionResult, ChatMessage } from '../llm/provider';
import { textOf } from '../llm/provider';
import type { Session } from '../session/session';
import type { Capability } from '../session/nodes';
import { type AgentParticipant, createAgentParticipant } from './agent';

export interface BridgeRequest {
  id: string;
  /** Everything the participant was told, ready to be read or copied. */
  system: string;
  user: string;
  at: number;
}

export interface BridgeParticipant extends AgentParticipant {
  /** The question waiting for an answer, if any. */
  pending(): BridgeRequest | null;
  /** Answer it. Returns false if that request is no longer the one waiting. */
  deliver(requestId: string, text: string): boolean;
  /** Give up on it — the caller gets a failure, not a hang. */
  cancel(requestId: string, reason?: string): boolean;
  /** Fires whenever a question starts or stops waiting, so a surface can show it. */
  subscribe(listener: (request: BridgeRequest | null) => void): () => void;
}

export interface BridgeOptions {
  name?: string;
  /** Defaults to 2 — a bridge is normally a capable reader, not a local heuristic. */
  tier?: Capability;
  /** How long a question waits before it reports failure rather than hanging. */
  timeoutMs?: number;
}

/**
 * Register a participant whose answers arrive by hand.
 *
 * `pending()` is the question; `deliver()` is the answer. Everything else — the
 * prompts, the tolerant parsing, the proposals — is the ordinary agent path.
 */
export function createBridgeParticipant(
  session: Session,
  at: number = 0,
  options: BridgeOptions = {}
): BridgeParticipant {
  const name = options.name ?? 'bridge';
  const timeoutMs = options.timeoutMs ?? 600_000;

  let waiting: {
    request: BridgeRequest;
    resolve: (r: CompletionResult) => void;
    timer: ReturnType<typeof setTimeout>;
  } | null = null;
  let counter = 0;
  const listeners = new Set<(r: BridgeRequest | null) => void>();
  const notify = () => listeners.forEach((l) => l(waiting?.request ?? null));

  function settle(result: CompletionResult) {
    if (!waiting) return;
    clearTimeout(waiting.timer);
    const { resolve } = waiting;
    waiting = null;
    resolve(result);
    notify();
  }

  const describeForHand = (content: ChatMessage['content']): string =>
    typeof content === 'string'
      ? content
      : content.map((p) => (p.type === 'text' ? p.text : '[an image of the ink is attached]')).join('\n');

  const transport = (
    _config: ProviderConfig,
    messages: ChatMessage[],
    opts: { signal?: AbortSignal }
  ): Promise<CompletionResult> => {
    // One question at a time. A bridge is answered by a person, and a queue of
    // prompts nobody can see is a worse failure than a plain refusal.
    if (waiting) {
      return Promise.resolve({ ok: false, error: 'already waiting on an answer' });
    }
    const request: BridgeRequest = {
      id: `bridge:${++counter}`,
      // A person answering by hand gets the words; an image the bridge cannot
      // show is said to be there rather than silently dropped.
      system: textOf(messages.find((m) => m.role === 'system')?.content ?? ''),
      user: describeForHand(messages.find((m) => m.role === 'user')?.content ?? ''),
      at: Date.now(),
    };

    return new Promise<CompletionResult>((resolve) => {
      const timer = setTimeout(() => settle({ ok: false, error: `no answer within ${timeoutMs}ms` }), timeoutMs);
      waiting = { request, resolve, timer };
      if (opts.signal) {
        if (opts.signal.aborted) settle({ ok: false, error: 'cancelled' });
        else opts.signal.addEventListener('abort', () => settle({ ok: false, error: 'cancelled' }), { once: true });
      }
      notify();
    });
  };

  const config: ProviderConfig = { kind: 'openai-compatible', baseUrl: 'bridge://local', model: name };
  const agent = createAgentParticipant(session, config, at, {
    transport,
    name,
    tier: options.tier ?? 2,
  });

  return {
    ...agent,
    pending: () => waiting?.request ?? null,
    deliver(requestId, text) {
      if (!waiting || waiting.request.id !== requestId) return false;
      settle({ ok: true, text, model: name });
      return true;
    },
    cancel(requestId, reason) {
      if (!waiting || waiting.request.id !== requestId) return false;
      settle({ ok: false, error: reason ?? 'cancelled' });
      return true;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
