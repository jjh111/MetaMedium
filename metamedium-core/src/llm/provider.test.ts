// The transport. Most of its behaviour is pinned through the agent tests that
// drive it with a stubbed server; this file holds what is about the transport
// itself.

import { describe, it, expect, afterEach } from 'vitest';
import { complete, stripThink, PRESETS } from './provider';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

describe('stripThink', () => {
  it('drops a closed reasoning block and keeps the answer', () => {
    expect(stripThink('<think>\nlet me see {\n</think>\n[{"label":"circle"}]')).toBe('[{"label":"circle"}]');
  });
  it('treats an unclosed block as all reasoning — nothing usable followed', () => {
    expect(stripThink('<think>still going { {')).toBe('');
  });
  it('leaves a reply with no reasoning alone', () => {
    expect(stripThink('{"a":1}')).toBe('{"a":1}');
  });
  it('is applied by the OpenAI-compatible client', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: '<think>{ not this }</think>{"regions":{}}' } }] }), {
        status: 200, headers: { 'content-type': 'application/json' },
      })) as unknown as typeof fetch;
    const r = await complete({ ...PRESETS.ollama, model: 'x' }, [{ role: 'user', content: 'hi' }]);
    expect(r.ok && r.text).toBe('{"regions":{}}');
  });
});
