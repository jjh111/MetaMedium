// A picture: an artifact of an image kind, kept by what it is (PLAN-IPAD-NOTES I1).
//
// Its pixels are not in the log. The `import` event names the asset the bytes are kept under —
// `sha256:` and 64 hex digits, the digest of the bytes the surface stored (the browser's asset
// store) — with their mime and size, and the code rep carries the same, so a board is a log of
// events and a picture is one of them. An event with no asset is a log from before this: it is
// still an artifact with a path and a name, and a surface draws its name.

import type { Kind } from './kinds';
import { rowOf } from './kinds';
import type { MMNode } from '../session/nodes';

/** Whether a kind is a picture: the image renderer's. */
export function isPictureKind(kind: Kind | string | undefined): boolean {
  if (!kind) return false;
  try { return rowOf(kind as Kind)?.renderer === 'image'; } catch { return false; }
}

/** `sha256:` and 64 lower-case hex digits, nothing else — the only form of reference a picture holds. */
export const ASSET_REF = /^sha256:[0-9a-f]{64}$/;
export function isAssetRef(v: unknown): v is string {
  return typeof v === 'string' && ASSET_REF.test(v);
}

/** What a picture holds, read from its code rep: the kind, its path and name, and — when kept — its asset, mime and size. */
export interface Picture {
  kind: Kind;
  path: string;
  name: string;
  /** Where its bytes are kept (the surface's asset store); absent for a picture a log from before assets named. */
  asset?: string;
  mime?: string;
  /** Its size in pixels, as kept. */
  w?: number;
  h?: number;
}

const size = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : undefined);

/**
 * The picture a node is, or null. Read, never trusted: an asset that is not a reference, a size that is
 * not a positive number and a mime that is not an image are left out, and the picture stands without them.
 */
export function pictureOf(node: MMNode): Picture | null {
  let code: { data: Record<string, unknown> } | null = null;
  for (let i = node.reps.length - 1; i >= 0; i--) {
    if (node.reps[i].modality === 'code') { code = node.reps[i] as unknown as { data: Record<string, unknown> }; break; }
  }
  if (!code) return null;
  const kind = code.data.kind as Kind | undefined;
  if (!isPictureKind(kind)) return null;
  const word = node.reps.find((r) => r.modality === 'word');
  const path = typeof code.data.path === 'string' ? code.data.path : '';
  const out: Picture = { kind: kind as Kind, path, name: (typeof word?.data === 'string' && word.data) || path.split('/').pop() || path };
  if (isAssetRef(code.data.asset)) out.asset = code.data.asset;
  if (typeof code.data.mime === 'string' && /^image\/[a-z0-9.+-]+$/i.test(code.data.mime)) out.mime = code.data.mime;
  const w = size(code.data.w), h = size(code.data.h);
  if (w) out.w = w;
  if (h) out.h = h;
  return out;
}
