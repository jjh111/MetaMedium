// Canvas Viewport — pan/zoom coordinate transforms
// Adapted from Collaborator canvas-viewport.js patterns

export interface ViewportState {
  panX: number;
  panY: number;
  zoom: number;
}

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 3.0;

let state: ViewportState = { panX: 0, panY: 0, zoom: 1.0 };
let canvas: HTMLCanvasElement | null = null;

export function init(c: HTMLCanvasElement) {
  canvas = c;
  attachEvents(c);
}

export function getState(): Readonly<ViewportState> {
  return state;
}

export function setState(s: Partial<ViewportState>) {
  if (s.panX !== undefined) state.panX = s.panX;
  if (s.panY !== undefined) state.panY = s.panY;
  if (s.zoom !== undefined) state.zoom = clampZoom(s.zoom);
}

// ── Coordinate transforms ──

/** Screen pixel → world coordinate */
export function screenToWorld(sx: number, sy: number): { x: number; y: number } {
  return {
    x: (sx - state.panX) / state.zoom,
    y: (sy - state.panY) / state.zoom,
  };
}

/** World coordinate → screen pixel */
export function worldToScreen(wx: number, wy: number): { x: number; y: number } {
  return {
    x: wx * state.zoom + state.panX,
    y: wy * state.zoom + state.panY,
  };
}

/** Apply viewport transform to canvas context */
export function applyTransform(ctx: CanvasRenderingContext2D) {
  ctx.setTransform(state.zoom, 0, 0, state.zoom, state.panX, state.panY);
}

/** Reset canvas transform */
export function resetTransform(ctx: CanvasRenderingContext2D) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// ── Input handling ──

function attachEvents(c: HTMLCanvasElement) {
  let isPanning = false;
  let lastX = 0, lastY = 0;

  // Wheel zoom + pan
  c.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom toward cursor
      const rect = c.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const oldZoom = state.zoom;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      state.zoom = clampZoom(state.zoom * delta);
      const ratio = state.zoom / oldZoom;
      state.panX = mx - (mx - state.panX) * ratio;
      state.panY = my - (my - state.panY) * ratio;
    } else {
      // Pan
      state.panX -= e.deltaX;
      state.panY -= e.deltaY;
    }
  }, { passive: false });

  // Middle-click or Space+drag pan
  c.addEventListener('pointerdown', (e) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      isPanning = true;
      lastX = e.clientX;
      lastY = e.clientY;
      c.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
  });

  window.addEventListener('pointermove', (e) => {
    if (!isPanning) return;
    state.panX += e.clientX - lastX;
    state.panY += e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
  });

  window.addEventListener('pointerup', () => {
    isPanning = false;
  });
}

function clampZoom(z: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
}
