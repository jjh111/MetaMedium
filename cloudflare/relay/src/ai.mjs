// The model routes — `/decide` (a decision model), `/extract` (an extraction model) and `/ai/…` —
// through the Worker's Workers AI binding, so no key reaches a browser. Not built yet: the route is
// here so the Worker's routing is settled; its body is the models unit's.

import { originAllowed, corsHeaders, text } from './http.mjs';

/** The paths this module answers. */
export const AI_PATH = /^\/(decide|extract|ai(\/[a-z0-9/-]*)?)$/;

export async function aiRoute(request, env) {
  const origin = request.headers.get('origin');
  if (origin && !originAllowed(origin, env)) return text(403, 'this origin may not use this relay', corsHeaders(origin));
  const cors = origin ? corsHeaders(origin) : {};
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  return text(501, 'this relay asks no model yet', cors);
}
