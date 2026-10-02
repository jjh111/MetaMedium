// ===== ui =====
// The same six components the reference surface is built from
// (Demos/surface/00-ui.js) — pill, chip, tile, row, pane — ported, not forked,
// so the shard's chrome reads the way the canvas's does. A surface is built
// from these or it is not built.

export function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}

export interface PillOptions {
  cls?: string;
  why?: string;
  model?: boolean;
  disabled?: boolean;
  onclick?: () => void;
}

/** A verb or a reading: a label, its reason as the tooltip, a dot when it asks a model. */
export function pill(label: string, o: PillOptions = {}): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'pill' + (o.cls ? ' ' + o.cls : '');
  b.innerHTML = '<span>' + esc(label) + '</span>' + (o.model ? '<i class="dot" title="asks a model"></i>' : '');
  if (o.why) b.title = o.why;
  if (o.disabled) b.disabled = true;
  if (o.onclick) b.onclick = o.onclick;
  return b;
}

/** A small standing label: the mark, the plane, a reading. */
export function chip(text: string, o: { cls?: string; why?: string; onclick?: () => void } = {}): HTMLElement {
  const s = document.createElement(o.onclick ? 'button' : 'span');
  if (o.onclick) {
    (s as HTMLButtonElement).type = 'button';
    s.onclick = o.onclick;
  }
  s.className = 'chip' + (o.cls ? ' ' + o.cls : '');
  s.textContent = text;
  if (o.why) s.title = o.why;
  return s;
}

/** A control tile's face: what it is, and its state. */
export function tile(
  el: HTMLElement,
  label: string,
  value?: string,
  o: { on?: boolean; why?: string } = {}
): HTMLElement {
  el.classList.add('tile');
  el.innerHTML =
    '<span class="k">' + esc(label) + '</span>' +
    (value !== undefined && value !== null && value !== '' ? '<span class="v">' + esc(value) + '</span>' : '');
  if (o.on !== undefined) el.classList.toggle('on', !!o.on);
  if (o.why) el.title = o.why;
  return el;
}

/** A label/value line in the panel, with an optional reason underneath. */
export function row(k: string, v: string, why?: string): string {
  return (
    '<div class="row"><span class="k">' + esc(k) + '</span><span class="v">' + esc(v) + '</span></div>' +
    (why ? '<div class="why">' + esc(why) + '</div>' : '')
  );
}

export function eyebrow(text: string, note?: string): string {
  return '<div class="eyebrow">' + esc(text) + (note ? ' <span class="srccount">' + esc(note) + '</span>' : '') + '</div>';
}

export const sep = '<div class="sep"></div>';

/** A titled, closable box. */
export function pane(el: HTMLElement, title: string, onClose?: () => void): HTMLElement {
  if (el.querySelector(':scope > .paneHead')) return el;
  el.classList.add('pane');
  const head = document.createElement('div');
  head.className = 'paneHead';
  head.innerHTML = '<span class="paneTitle">' + esc(title) + '</span>';
  const x = document.createElement('button');
  x.type = 'button';
  x.className = 'paneClose';
  x.setAttribute('aria-label', 'Close');
  x.textContent = '×';
  x.onclick = () => (onClose ? onClose() : el.setAttribute('hidden', ''));
  head.appendChild(x);
  el.insertBefore(head, el.firstChild);
  return el;
}
