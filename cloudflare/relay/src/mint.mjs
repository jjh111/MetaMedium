// `POST /rooms`: a room anyone on the app's origins may open and share — not built yet. The route
// is here so the Worker's routing is settled; its body is the rooms unit's.

import { originAllowed, corsHeaders, text } from './http.mjs';

export async function mintRoute(request, env) {
  const origin = request.headers.get('origin');
  if (origin && !originAllowed(origin, env)) return text(403, 'this origin may not use this relay', corsHeaders(origin));
  const cors = origin ? corsHeaders(origin) : {};
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  return text(501, 'this relay does not open rooms yet', cors);
}
