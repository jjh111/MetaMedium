// What a run refuses to let happen, and what it knowingly tolerates.
//
// Two guards, because a browser gate that passes for the wrong reason is worse
// than no gate: nothing may reach a real model (a green run that quietly used
// John's Ollama is not a test of the stub), and an unexpected page error fails
// the run instead of scrolling past. The tolerated ones are NAMED, each with
// the reason it is thrown on purpose.

/** Hosts that mean "a model was actually asked". Matched host:port, not substring. */
const MODEL_ENDPOINTS = [
  { host: '127.0.0.1', port: '11434', what: 'Ollama' },
  { host: 'localhost', port: '11434', what: 'Ollama' },
  { host: '[::1]', port: '11434', what: 'Ollama' },
  { host: '127.0.0.1', port: '1234', what: 'LM Studio' },
  { host: 'localhost', port: '1234', what: 'LM Studio' },
  { host: '[::1]', port: '1234', what: 'LM Studio' },
];

const MODEL_HOSTS = [
  'openrouter.ai',
  'api.anthropic.com',
  'api.openai.com',
  'generativelanguage.googleapis.com',
  'api.mistral.ai',
  'api.groq.com',
];

/**
 * True when this URL is a request to a model. The run's own origins are passed
 * in and always allowed — the OS could hand the shard's vite :1234, and failing
 * a run because the test server got an unlucky port would be a lie.
 */
export function isModelRequest(url, ownOrigins = []) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (ownOrigins.includes(u.origin)) return null;
  if (MODEL_HOSTS.includes(u.hostname)) return { what: u.hostname, url };
  const port = u.port || (u.protocol === 'https:' ? '443' : '80');
  const hit = MODEL_ENDPOINTS.find((e) => e.host === u.hostname && e.port === port);
  return hit ? { what: hit.what, url } : null;
}

/**
 * Page errors this gate tolerates, each named with WHY it is thrown on purpose.
 * Anything not on this list fails the run. Keep the list short and argued: an
 * entry here is a claim that the surface means to throw that, and a reviewer
 * should be able to check the claim against the source named in `where`.
 */
export const ALLOWED_PAGE_ERRORS = [
  {
    name: 'canvas-27d2-late-throw',
    where: 'Demos/session-engine.e2e.js:1102 — `late.run.js` is imported as `setTimeout(… throw new Error("later"), 10)`',
    reason:
      'Step 27d2 asserts that an error thrown LATER inside a playing program — not while its code loads — is posted back, pauses the clock with the reason and marks the frame broken. The uncaught throw in the sandboxed `about:srcdoc` frame IS the assertion; a run without it would mean the step tested nothing.',
    match: (t) => /\bError: later\b/.test(t) && /about:srcdoc/.test(t),
  },
];

/** The first allowlist entry that covers this error text, or null. */
export function allowedError(text) {
  return ALLOWED_PAGE_ERRORS.find((e) => e.match(text)) || null;
}
