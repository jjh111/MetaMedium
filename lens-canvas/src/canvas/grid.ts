// Dot grid background
// Uses --border-subtle color from design tokens

const DOT_SPACING = 24;
const DOT_RADIUS = 1;
const MAJOR_EVERY = 4;
const MAJOR_RADIUS = 1.5;

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  panX: number,
  panY: number,
  zoom: number,
  isDark: boolean,
) {
  const dotColor = isDark ? 'rgba(77, 201, 246, 0.08)' : 'rgba(42, 74, 90, 0.12)';
  const majorColor = isDark ? 'rgba(77, 201, 246, 0.15)' : 'rgba(42, 74, 90, 0.2)';
  
  const spacing = DOT_SPACING * zoom;
  if (spacing < 6) return; // too zoomed out, skip grid
  
  const startX = panX % spacing;
  const startY = panY % spacing;
  
  // Calculate grid offset for major dot alignment
  const gridOffsetX = Math.floor(-panX / spacing);
  const gridOffsetY = Math.floor(-panY / spacing);
  
  ctx.save();
  
  for (let sx = startX; sx < width; sx += spacing) {
    const gx = gridOffsetX + Math.round((sx - startX) / spacing);
    for (let sy = startY; sy < height; sy += spacing) {
      const gy = gridOffsetY + Math.round((sy - startY) / spacing);
      const isMajor = gx % MAJOR_EVERY === 0 && gy % MAJOR_EVERY === 0;
      
      ctx.fillStyle = isMajor ? majorColor : dotColor;
      ctx.beginPath();
      ctx.arc(sx, sy, isMajor ? MAJOR_RADIUS : DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  ctx.restore();
}
