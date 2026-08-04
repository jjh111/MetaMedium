// MetaMedium v2 PoC — Drawing-Responsive Text Reflow
// Uses @chenglou/pretext for DOM-free text measurement + layout
// MetaMedium shape recognition for obstacle geometry

import {
  prepare,
  prepareWithSegments,
  layoutNextLine,
  type PreparedTextWithSegments,
  type LayoutCursor,
  type LayoutLine,
} from '@chenglou/pretext';

// -------------------------------------------------------------------
// CONFIG
// -------------------------------------------------------------------
const FONT = '18px/1.6 "Space Grotesk", system-ui, sans-serif';
const FONT_SIZE = 18;
const LINE_HEIGHT = Math.round(FONT_SIZE * 1.6);
const OBSTACLE_PAD_H = 20; // horizontal padding around shapes
const OBSTACLE_PAD_V = 8;  // vertical padding
const MIN_SLOT_WIDTH = 40; // discard slivers smaller than this
const SHAPE_RECOGNITION_THRESHOLD = 0.7;

// Colors
const COLORS = {
  bg: '#0a0a0f',
  text: '#e8e4d9',
  textDim: '#a09880',
  accent: '#c9a84c',
  accentDim: 'rgba(201, 168, 76, 0.3)',
  stroke: 'rgba(201, 168, 76, 0.6)',
  strokeActive: '#c9a84c',
  shapeFill: 'rgba(201, 168, 76, 0.08)',
  ghost: 'rgba(201, 168, 76, 0.15)',
  labelBg: 'rgba(10, 10, 15, 0.85)',
};

// -------------------------------------------------------------------
// WHITEPAPER TEXT — excerpts from MetaMedium thesis
// -------------------------------------------------------------------
const BODY_TEXT = `The fundamental interface problem isn't technical — it's linguistic. We've spent decades building increasingly powerful computational engines, then connecting them to humans through the narrowest possible channel: a text box. This is the equivalent of trying to share a symphony by describing it in words.

MetaMedium proposes a different approach. What if artificial intelligence could function as a new kind of grammatical element — not a tool you command, but a word that transforms other words? A meta-word. One that takes rough marks and interprets them as structured meaning based on context. One that holds ambiguity productively until context resolves it.

Draw a circle. The system doesn't immediately classify it. Instead, it holds multiple interpretations: a zero, a planet, a container, the letter O, a selection boundary. Your next mark disambiguates. Draw a line through it — now it might be the symbol for "empty set" or a "no" sign. Add a face — it becomes a character. The system navigates a possibility space, and your strokes are the compass.

This is triadic closure. Traditional interfaces connect Language to Computation to Output in a line. MetaMedium closes the loop: Language ↔ Computation ↔ Meaning. When every mark can mean multiple things and the system negotiates meaning through exchange, meaning becomes part of the computational loop — not something that happens only in human minds.

Space becomes semantic. Position and proximity carry meaning. Write "3x" next to a line and the line triples. Draw a bracket around a group and it becomes a unit. Annotation becomes execution — the gap between describing and doing dissolves.

The shapes you're drawing on this page right now demonstrate the principle. Text flows around your marks — computation responding to gesture, meaning emerging from the spatial relationship between word and form. This is what we mean by the metamedium: a substrate where all prior media can be simulated, composed, and transcended.`;

// -------------------------------------------------------------------
// TYPES
// -------------------------------------------------------------------
interface Point {
  x: number;
  y: number;
  t: number;
  pressure: number;
}

interface Stroke {
  points: Point[];
  done: boolean;
}

interface RecognizedShape {
  type: 'circle' | 'rectangle' | 'line' | 'freeform';
  bounds: { x: number; y: number; width: number; height: number };
  confidence: number;
  label: string;
  // For circle: center + radius
  cx?: number;
  cy?: number;
  radius?: number;
  // For rendering the original stroke
  points: Point[];
  // Ghost alternatives
  alternatives?: { type: string; confidence: number }[];
}

interface Interval {
  left: number;
  right: number;
}

interface TextSlot {
  left: number;
  right: number;
  width: number;
}

interface PositionedLine {
  x: number;
  y: number;
  text: string;
  width: number;
}

// -------------------------------------------------------------------
// SHAPE RECOGNITION (simplified MetaMedium engine)
// -------------------------------------------------------------------

function extractFeatures(points: Point[]) {
  if (points.length < 3) return null;

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const width = maxX - minX;
  const height = maxY - minY;

  // Closure: distance from first to last point relative to perimeter
  const dx = points[0].x - points[points.length - 1].x;
  const dy = points[0].y - points[points.length - 1].y;
  const closureDist = Math.sqrt(dx * dx + dy * dy);
  const perimeter = pathLength(points);
  const closure = 1 - Math.min(closureDist / Math.max(perimeter * 0.3, 1), 1);

  // Straightness: how close to a straight line
  const lineLen = Math.sqrt(
    (points[points.length - 1].x - points[0].x) ** 2 +
    (points[points.length - 1].y - points[0].y) ** 2
  );
  const straightness = perimeter > 0 ? lineLen / perimeter : 0;

  // Aspect ratio
  const aspectRatio = width > 0 ? height / width : 1;

  // Corner count (direction changes)
  const corners = countCorners(points);

  // Circularity: how close the shape is to a circle
  // Area vs perimeter ratio compared to ideal circle
  const area = width * height;
  const circularity = perimeter > 0 ? (4 * Math.PI * area * 0.7) / (perimeter * perimeter) : 0;

  return {
    closure,
    straightness,
    aspectRatio,
    corners,
    circularity,
    width,
    height,
    minX, minY, maxX, maxY,
    perimeter,
  };
}

function pathLength(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

function countCorners(points: Point[]): number {
  if (points.length < 5) return 0;
  const step = Math.max(1, Math.floor(points.length / 20));
  let corners = 0;
  for (let i = step; i < points.length - step; i += step) {
    const ax = points[i].x - points[i - step].x;
    const ay = points[i].y - points[i - step].y;
    const bx = points[i + step].x - points[i].x;
    const by = points[i + step].y - points[i].y;
    const cross = ax * by - ay * bx;
    const dot = ax * bx + ay * by;
    const angle = Math.abs(Math.atan2(cross, dot));
    if (angle > Math.PI * 0.35) corners++;
  }
  return corners;
}

function recognizeShape(stroke: Stroke): RecognizedShape {
  const { points } = stroke;
  const features = extractFeatures(points);

  if (!features) {
    return makeShape('freeform', points, features);
  }

  const candidates: { type: RecognizedShape['type']; confidence: number }[] = [];

  // Circle detection
  if (features.closure > 0.7) {
    const circleScore = features.closure * 0.4 + features.circularity * 0.3 +
      (1 - Math.abs(features.aspectRatio - 1) * 0.5) * 0.3;
    candidates.push({ type: 'circle', confidence: Math.min(circleScore, 1) });
  }

  // Rectangle detection
  if (features.closure > 0.6 && features.corners >= 3) {
    const rectScore = features.closure * 0.3 + Math.min(features.corners / 4, 1) * 0.4 +
      (features.straightness < 0.3 ? 0.3 : 0);
    candidates.push({ type: 'rectangle', confidence: Math.min(rectScore, 1) });
  }

  // Line detection
  if (features.straightness > 0.85 && features.closure < 0.3) {
    candidates.push({ type: 'line', confidence: features.straightness });
  }

  // Sort by confidence
  candidates.sort((a, b) => b.confidence - a.confidence);

  if (candidates.length > 0 && candidates[0].confidence > SHAPE_RECOGNITION_THRESHOLD) {
    const shape = makeShape(candidates[0].type, points, features);
    shape.alternatives = candidates.slice(1).map(c => ({ type: c.type, confidence: c.confidence }));
    return shape;
  }

  // Fallback: freeform obstacle
  const shape = makeShape('freeform', points, features);
  shape.alternatives = candidates.map(c => ({ type: c.type, confidence: c.confidence }));
  return shape;
}

function makeShape(type: RecognizedShape['type'], points: Point[], features: ReturnType<typeof extractFeatures>): RecognizedShape {
  if (!features) {
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    return {
      type, points,
      bounds: { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) },
      confidence: 0,
      label: type,
    };
  }

  const bounds = { x: features.minX, y: features.minY, width: features.width, height: features.height };
  const shape: RecognizedShape = { type, bounds, confidence: 0, label: type, points };

  if (type === 'circle') {
    shape.cx = features.minX + features.width / 2;
    shape.cy = features.minY + features.height / 2;
    shape.radius = Math.max(features.width, features.height) / 2;
    shape.label = 'circle';
  } else if (type === 'rectangle') {
    shape.label = `rectangle`;
  } else if (type === 'line') {
    shape.label = 'line';
  }

  return shape;
}

// -------------------------------------------------------------------
// OBSTACLE GEOMETRY (from pretext's wrap-geometry pattern)
// -------------------------------------------------------------------

function circleIntervalForBand(cx: number, cy: number, r: number, bandTop: number, bandBottom: number, hPad: number, vPad: number): Interval | null {
  const top = bandTop - vPad;
  const bottom = bandBottom + vPad;
  // Check if band overlaps the circle
  const minDy = top > cy ? top - cy : bottom < cy ? cy - bottom : 0;
  if (minDy >= r) return null;
  const maxDx = Math.sqrt(r * r - minDy * minDy);
  return { left: cx - maxDx - hPad, right: cx + maxDx + hPad };
}

function rectIntervalForBand(rect: { x: number; y: number; width: number; height: number }, bandTop: number, bandBottom: number, hPad: number, vPad: number): Interval | null {
  if (bandBottom + vPad < rect.y || bandTop - vPad > rect.y + rect.height) return null;
  return { left: rect.x - hPad, right: rect.x + rect.width + hPad };
}

function freeformIntervalForBand(points: Point[], bandTop: number, bandBottom: number, hPad: number, vPad: number): Interval | null {
  const top = bandTop - vPad;
  const bottom = bandBottom + vPad;
  let minX = Infinity, maxX = -Infinity;
  let found = false;
  for (const p of points) {
    if (p.y >= top && p.y <= bottom) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      found = true;
    }
  }
  // Also check line segments that cross the band
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    if ((a.y < top && b.y < top) || (a.y > bottom && b.y > bottom)) continue;
    // Clamp segment to band
    for (const scanY of [top, bottom]) {
      if ((a.y <= scanY && b.y >= scanY) || (b.y <= scanY && a.y >= scanY)) {
        const t = (scanY - a.y) / (b.y - a.y);
        if (t >= 0 && t <= 1) {
          const x = a.x + t * (b.x - a.x);
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          found = true;
        }
      }
    }
  }
  if (!found) return null;
  return { left: minX - hPad, right: maxX + hPad };
}

function getShapeInterval(shape: RecognizedShape, bandTop: number, bandBottom: number): Interval | null {
  if (shape.type === 'circle' && shape.cx !== undefined && shape.cy !== undefined && shape.radius !== undefined) {
    return circleIntervalForBand(shape.cx, shape.cy, shape.radius, bandTop, bandBottom, OBSTACLE_PAD_H, OBSTACLE_PAD_V);
  } else if (shape.type === 'line') {
    // Lines don't block text
    return null;
  } else if (shape.type === 'rectangle') {
    return rectIntervalForBand(shape.bounds, bandTop, bandBottom, OBSTACLE_PAD_H, OBSTACLE_PAD_V);
  } else {
    return freeformIntervalForBand(shape.points, bandTop, bandBottom, OBSTACLE_PAD_H, OBSTACLE_PAD_V);
  }
}

function carveTextLineSlots(base: Interval, blocked: Interval[]): TextSlot[] {
  let slots: Interval[] = [{ ...base }];
  for (const b of blocked) {
    const next: Interval[] = [];
    for (const s of slots) {
      if (b.right <= s.left || b.left >= s.right) {
        next.push(s); // no overlap
      } else {
        if (b.left > s.left) next.push({ left: s.left, right: b.left });
        if (b.right < s.right) next.push({ left: b.right, right: s.right });
      }
    }
    slots = next;
  }
  return slots
    .filter(s => (s.right - s.left) >= MIN_SLOT_WIDTH)
    .map(s => ({ left: s.left, right: s.right, width: s.right - s.left }));
}

// -------------------------------------------------------------------
// TEXT LAYOUT ENGINE
// -------------------------------------------------------------------

function layoutWithObstacles(
  prepared: PreparedTextWithSegments,
  shapes: RecognizedShape[],
  region: { x: number; y: number; width: number; height: number },
): PositionedLine[] {
  const lines: PositionedLine[] = [];
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
  let lineTop = region.y;
  const regionRight = region.x + region.width;

  while (lineTop + LINE_HEIGHT <= region.y + region.height) {
    const bandTop = lineTop;
    const bandBottom = lineTop + LINE_HEIGHT;

    // Collect blocked intervals from all shapes
    const blocked: Interval[] = [];
    for (const shape of shapes) {
      const interval = getShapeInterval(shape, bandTop, bandBottom);
      if (interval) blocked.push(interval);
    }

    // Carve available slots
    const slots = carveTextLineSlots({ left: region.x, right: regionRight }, blocked);

    if (slots.length === 0) {
      lineTop += LINE_HEIGHT;
      continue;
    }

    // Fill all usable slots on this line (like editorial-engine)
    for (const slot of slots) {
      const line = layoutNextLine(prepared, cursor, slot.width);
      if (!line) break;
      lines.push({
        x: slot.left,
        y: lineTop,
        text: line.text,
        width: line.width,
      });
      cursor = line.end;
    }

    // Check if text exhausted
    const testLine = layoutNextLine(prepared, cursor, region.width);
    if (!testLine) break;

    lineTop += LINE_HEIGHT;
  }

  return lines;
}

// -------------------------------------------------------------------
// RENDERER
// -------------------------------------------------------------------

class MetaMediumPOC {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private textContainer: HTMLDivElement;
  private linePool: HTMLDivElement[] = [];
  private shapes: RecognizedShape[] = [];
  private currentStroke: Stroke | null = null;
  private prepared: PreparedTextWithSegments | null = null;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private needsRender = true;
  private isDrawing = false;
  private textRegion = { x: 0, y: 0, width: 0, height: 0 };
  private instructionOpacity = 1;
  private instructionFadeStart = 0;
  private hasDrawn = false;

  constructor() {
    // Create DOM structure
    const root = document.getElementById('app')!;
    root.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'header';
    header.innerHTML = `
      <h1>MetaMedium <span class="v2">v2</span></h1>
      <p class="subtitle">Draw on the text. Watch it respond.</p>
    `;
    root.appendChild(header);

    // Canvas container
    const container = document.createElement('div');
    container.className = 'canvas-container';
    root.appendChild(container);

    // Text layer (below canvas)
    this.textContainer = document.createElement('div');
    this.textContainer.className = 'text-layer';
    container.appendChild(this.textContainer);

    // Drawing canvas (above text)
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'draw-canvas';
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;

    // Instruction overlay
    const instruction = document.createElement('div');
    instruction.className = 'instruction';
    instruction.id = 'instruction';
    instruction.innerHTML = `<span class="draw-icon">✦</span> Draw anywhere on the text`;
    container.appendChild(instruction);

    // Shape info panel
    const infoPanel = document.createElement('div');
    infoPanel.className = 'info-panel';
    infoPanel.id = 'info-panel';
    root.appendChild(infoPanel);

    // Clear button
    const clearBtn = document.createElement('button');
    clearBtn.className = 'clear-btn';
    clearBtn.textContent = 'Clear drawings';
    clearBtn.addEventListener('click', () => this.clearAll());
    root.appendChild(clearBtn);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'footer';
    footer.innerHTML = `<p>A <a href="https://jjh111.github.io/MetaMedium/">MetaMedium</a> experiment using <a href="https://github.com/chenglou/pretext">pretext</a></p>`;
    root.appendChild(footer);

    // Bind events
    this.bindEvents();
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Prepare text
    this.prepareText();

    // Start render loop
    this.renderLoop();
  }

  private prepareText() {
    const fontStr = `${FONT_SIZE}px "Space Grotesk", system-ui, sans-serif`;
    this.prepared = prepareWithSegments(BODY_TEXT, fontStr);
  }

  private bindEvents() {
    // Pointer events (touch + mouse unified)
    this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
    this.canvas.addEventListener('pointercancel', (e) => this.onPointerUp(e));

    // Prevent scrolling while drawing on iOS
    this.canvas.addEventListener('touchstart', (e) => {
      if (this.isDrawing) e.preventDefault();
    }, { passive: false });
    this.canvas.addEventListener('touchmove', (e) => {
      if (this.isDrawing) e.preventDefault();
    }, { passive: false });
  }

  private getPointerPos(e: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private onPointerDown(e: PointerEvent) {
    e.preventDefault();
    this.canvas.setPointerCapture(e.pointerId);
    this.isDrawing = true;
    const pos = this.getPointerPos(e);
    this.currentStroke = {
      points: [{ x: pos.x, y: pos.y, t: Date.now(), pressure: e.pressure || 0.5 }],
      done: false,
    };

    if (!this.hasDrawn) {
      this.hasDrawn = true;
      this.instructionFadeStart = Date.now();
    }

    this.needsRender = true;
  }

  private onPointerMove(e: PointerEvent) {
    if (!this.isDrawing || !this.currentStroke) return;
    e.preventDefault();
    const pos = this.getPointerPos(e);
    const last = this.currentStroke.points[this.currentStroke.points.length - 1];
    const dx = pos.x - last.x, dy = pos.y - last.y;
    // Debounce: skip if too close
    if (dx * dx + dy * dy < 4) return;
    this.currentStroke.points.push({ x: pos.x, y: pos.y, t: Date.now(), pressure: e.pressure || 0.5 });
    this.needsRender = true;
  }

  private onPointerUp(e: PointerEvent) {
    if (!this.currentStroke) return;
    this.isDrawing = false;
    this.currentStroke.done = true;

    if (this.currentStroke.points.length >= 3) {
      const shape = recognizeShape(this.currentStroke);
      this.shapes.push(shape);
      this.updateInfoPanel();
    }

    this.currentStroke = null;
    this.needsRender = true;
  }

  private clearAll() {
    this.shapes = [];
    this.currentStroke = null;
    this.needsRender = true;
    this.updateInfoPanel();
  }

  private resize() {
    const container = this.canvas.parentElement!;
    this.width = container.clientWidth;
    this.height = container.clientHeight;
    this.dpr = window.devicePixelRatio || 1;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // Text region with margins
    const marginX = Math.min(40, this.width * 0.06);
    const marginY = 20;
    this.textRegion = {
      x: marginX,
      y: marginY,
      width: this.width - marginX * 2,
      height: this.height - marginY * 2,
    };

    this.needsRender = true;
  }

  private updateInfoPanel() {
    const panel = document.getElementById('info-panel')!;
    if (this.shapes.length === 0) {
      panel.innerHTML = '';
      panel.style.display = 'none';
      return;
    }
    panel.style.display = 'block';
    const latest = this.shapes[this.shapes.length - 1];
    let html = `<div class="shape-info">
      <span class="shape-type">${latest.label}</span>
      <span class="shape-confidence">${(latest.confidence * 100).toFixed(0)}% confidence</span>`;
    if (latest.alternatives && latest.alternatives.length > 0) {
      html += `<span class="shape-alts">also: ${latest.alternatives.map(a =>
        `${a.type} (${(a.confidence * 100).toFixed(0)}%)`
      ).join(', ')}</span>`;
    }
    html += `<span class="shape-count">${this.shapes.length} shape${this.shapes.length > 1 ? 's' : ''} on canvas</span>`;
    html += `</div>`;
    panel.innerHTML = html;
  }

  private renderLoop() {
    if (this.needsRender || this.isDrawing || this.instructionOpacity > 0) {
      this.render();
      this.needsRender = false;
    }
    requestAnimationFrame(() => this.renderLoop());
  }

  private render() {
    const { ctx, width, height } = this;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw current stroke
    if (this.currentStroke && this.currentStroke.points.length > 1) {
      this.drawStroke(this.currentStroke.points, COLORS.strokeActive, 2.5);
    }

    // Draw recognized shapes
    for (const shape of this.shapes) {
      this.drawRecognizedShape(shape);
    }

    // Layout text around shapes
    if (this.prepared) {
      const lines = layoutWithObstacles(this.prepared, this.shapes, this.textRegion);
      this.renderTextLines(lines);
    }

    // Fade instruction
    if (this.hasDrawn && this.instructionOpacity > 0) {
      const elapsed = Date.now() - this.instructionFadeStart;
      this.instructionOpacity = Math.max(0, 1 - elapsed / 600);
      const el = document.getElementById('instruction');
      if (el) el.style.opacity = String(this.instructionOpacity);
      if (this.instructionOpacity <= 0 && el) el.style.display = 'none';
    }
  }

  private drawStroke(points: Point[], color: string, lineWidth: number) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const mx = (prev.x + curr.x) / 2;
      const my = (prev.y + curr.y) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  private drawRecognizedShape(shape: RecognizedShape) {
    const { ctx } = this;

    // Draw the original stroke (dimmed)
    this.drawStroke(shape.points, COLORS.stroke, 2);

    // Draw the recognized shape overlay
    ctx.save();
    if (shape.type === 'circle' && shape.cx !== undefined && shape.cy !== undefined && shape.radius !== undefined) {
      ctx.beginPath();
      ctx.arc(shape.cx, shape.cy, shape.radius, 0, Math.PI * 2);
      ctx.strokeStyle = COLORS.accent;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.fillStyle = COLORS.shapeFill;
      ctx.fill();
      ctx.setLineDash([]);

      // Label
      this.drawLabel(shape.label, shape.cx, shape.cy - shape.radius - 12);
    } else if (shape.type === 'rectangle') {
      const b = shape.bounds;
      ctx.strokeStyle = COLORS.accent;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(b.x, b.y, b.width, b.height);
      ctx.fillStyle = COLORS.shapeFill;
      ctx.fillRect(b.x, b.y, b.width, b.height);
      ctx.setLineDash([]);

      this.drawLabel(shape.label, b.x + b.width / 2, b.y - 12);
    } else if (shape.type === 'freeform') {
      // Just show the bounding area subtly
      const b = shape.bounds;
      ctx.fillStyle = COLORS.ghost;
      ctx.fillRect(b.x - OBSTACLE_PAD_H, b.y - OBSTACLE_PAD_V, b.width + OBSTACLE_PAD_H * 2, b.height + OBSTACLE_PAD_V * 2);

      this.drawLabel('freeform', b.x + b.width / 2, b.y - 12);
    }
    ctx.restore();
  }

  private drawLabel(text: string, x: number, y: number) {
    const { ctx } = this;
    ctx.font = '11px "Space Grotesk", system-ui, sans-serif';
    const metrics = ctx.measureText(text);
    const pad = 6;
    const lx = x - metrics.width / 2 - pad;
    const ly = y - 8;

    ctx.fillStyle = COLORS.labelBg;
    ctx.beginPath();
    ctx.roundRect(lx, ly, metrics.width + pad * 2, 18, 4);
    ctx.fill();

    ctx.fillStyle = COLORS.accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }

  private renderTextLines(lines: PositionedLine[]) {
    // Sync pool
    while (this.linePool.length < lines.length) {
      const div = document.createElement('div');
      div.className = 'text-line';
      this.textContainer.appendChild(div);
      this.linePool.push(div);
    }

    for (let i = 0; i < this.linePool.length; i++) {
      const div = this.linePool[i];
      if (i < lines.length) {
        const line = lines[i];
        div.textContent = line.text;
        div.style.left = `${line.x}px`;
        div.style.top = `${line.y}px`;
        div.style.maxWidth = `${line.width + 2}px`;
        div.style.display = 'block';
      } else {
        div.style.display = 'none';
      }
    }
  }
}

// -------------------------------------------------------------------
// INIT
// -------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  new MetaMediumPOC();
});
