// RawLens — fallback lens, renders JSON.stringify in a box
// Always available at confidence 0.01

import type { Rect } from '../core/types';

export const RawLens = {
  id: 'raw',
  name: 'Raw',
  
  matches(_dataType: string, _data: unknown): number {
    return 0.01; // Always matches, lowest priority
  },
  
  render(
    ctx: CanvasRenderingContext2D,
    data: unknown,
    bounds: Rect,
    options: { isDark: boolean; selected: boolean; source: string; descriptor?: string; abstractionLevel: string },
  ) {
    const { x, y, width, height } = bounds;
    const isDark = options.isDark;
    
    // Card background
    ctx.fillStyle = isDark ? '#051018' : '#f0ece4';
    ctx.fillRect(x, y, width, height);
    
    // Left accent bar (4px, P1 color)
    ctx.fillStyle = isDark ? '#7dd8f7' : '#2a6b8a';
    ctx.fillRect(x, y, 4, height);
    
    // Border
    if (options.selected) {
      ctx.strokeStyle = isDark ? '#7dd8f7' : '#2a6b8a';
      ctx.lineWidth = 2;
      ctx.shadowColor = isDark ? 'rgba(77, 201, 246, 0.4)' : 'rgba(42, 107, 138, 0.15)';
      ctx.shadowBlur = 8;
    } else {
      ctx.strokeStyle = isDark ? 'rgba(77, 201, 246, 0.2)' : 'rgba(42, 74, 90, 0.2)';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
    }
    ctx.strokeRect(x, y, width, height);
    ctx.shadowBlur = 0;
    
    // LLM source indicator
    if (options.source === 'llm') {
      ctx.strokeStyle = '#8B5CF6';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);
    }
    
    // Text content
    const padding = 12;
    const textX = x + padding + 4; // +4 for accent bar
    let textY = y + padding + 12;
    
    ctx.font = '500 14px "JetBrains Mono", "SF Mono", monospace';
    ctx.fillStyle = isDark ? '#e8f4ff' : '#1a2a3a';
    ctx.textBaseline = 'top';
    
    // Descriptor line
    if (options.descriptor && options.abstractionLevel !== 'type') {
      ctx.font = '400 12px "JetBrains Mono", "SF Mono", monospace';
      ctx.fillStyle = isDark ? '#8cb8cc' : '#4a6a7a';
      ctx.fillText(truncate(options.descriptor, width - padding * 2 - 8), textX, textY);
      textY += 18;
    }
    
    // Data content
    ctx.font = '400 11px "JetBrains Mono", "SF Mono", monospace';
    ctx.fillStyle = isDark ? '#7a9aaa' : '#8a9aa4';
    
    const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const lines = text.split('\n');
    const maxLines = Math.floor((height - (textY - y) - padding) / 14);
    
    for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
      ctx.fillText(truncate(lines[i], width - padding * 2 - 8), textX, textY);
      textY += 14;
    }
    if (lines.length > maxLines) {
      ctx.fillStyle = isDark ? '#4dc9f6' : '#3a7d9c';
      ctx.fillText(`... ${lines.length - maxLines} more lines`, textX, textY);
    }
    
    // Lens badge
    ctx.font = '400 9px "JetBrains Mono", "SF Mono", monospace';
    ctx.fillStyle = isDark ? 'rgba(77, 201, 246, 0.5)' : 'rgba(42, 107, 138, 0.5)';
    ctx.textAlign = 'right';
    ctx.fillText('RAW', x + width - 8, y + height - 8);
    ctx.textAlign = 'left';
  },
};

function truncate(s: string, maxWidth: number): string {
  // Rough char-width estimate for monospace at current size
  const charWidth = 6.6;
  const maxChars = Math.floor(maxWidth / charWidth);
  return s.length > maxChars ? s.slice(0, maxChars - 1) + '…' : s;
}
