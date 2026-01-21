// MetaMedium Day 6 - Thumbnail Generation
// Generate canvas thumbnails for library items

import type { Point } from '../types';
import { getBounds } from './geometry';

export function generateThumbnail(item: any, maxHeight = 70): HTMLCanvasElement {
  // Generate a thumbnail canvas for a library item
  // Maintains aspect ratio within maxHeight constraint

  let strokesToDraw: Point[][] = [];
  let isBuiltin = false;
  let isBuiltinComposition = false;

  if (item.type === 'builtin-composition') {
    isBuiltinComposition = true;
  } else if (item.type === 'composition' && item.components) {
    // Draw composition - all strokes
    strokesToDraw = item.components.map(
      (c: any) => c.originalStroke || c.refinedStroke || []
    );
  } else if (item.strokes && item.strokes.length > 0) {
    // User primitive with strokes
    strokesToDraw = item.strokes;
  } else if (item.type === 'builtin-primitive') {
    isBuiltin = true;
  }

  // Calculate dimensions based on content
  let canvasWidth = maxHeight;
  let canvasHeight = maxHeight;

  if (!isBuiltin && strokesToDraw.length > 0) {
    // Calculate bounding box for actual content
    let allPoints: Point[] = [];
    strokesToDraw.forEach((stroke) => {
      if (stroke && stroke.length > 0) {
        allPoints = allPoints.concat(stroke);
      }
    });

    if (allPoints.length > 0) {
      const bounds = getBounds(allPoints);
      const contentWidth = bounds.maxX - bounds.minX;
      const contentHeight = bounds.maxY - bounds.minY;
      const aspectRatio = contentWidth / contentHeight;

      // Adjust canvas size to maintain aspect ratio
      if (aspectRatio > 1) {
        // Wider than tall
        canvasWidth = maxHeight * aspectRatio;
        canvasHeight = maxHeight;
      } else {
        // Taller than wide
        canvasWidth = maxHeight;
        canvasHeight = maxHeight / aspectRatio;
      }

      // Cap maximum width to avoid extremely wide thumbnails
      const maxWidth = maxHeight * 2;
      if (canvasWidth > maxWidth) {
        canvasHeight = canvasHeight * (maxWidth / canvasWidth);
        canvasWidth = maxWidth;
      }
    }
  }

  const thumbnailCanvas = document.createElement('canvas');
  thumbnailCanvas.width = canvasWidth;
  thumbnailCanvas.height = canvasHeight;
  const thumbCtx = thumbnailCanvas.getContext('2d');
  if (!thumbCtx) return thumbnailCanvas;

  // Clear with light gray background
  thumbCtx.fillStyle = '#F5F5F5';
  thumbCtx.fillRect(0, 0, canvasWidth, canvasHeight);

  if (isBuiltin || isBuiltinComposition) {
    // Draw built-in primitives and compositions as simple shapes
    thumbCtx.strokeStyle = '#7C3AED';
    thumbCtx.lineWidth = 2;
    thumbCtx.lineCap = 'round';
    thumbCtx.lineJoin = 'round';

    const center = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const radius = Math.min(canvasWidth, canvasHeight) * 0.3;

    if (isBuiltinComposition) {
      // Draw iconic representation of built-in compositions
      // For arrow: line + triangle
      if (item.label === 'Arrow') {
        // Draw horizontal line
        thumbCtx.beginPath();
        thumbCtx.moveTo(canvasWidth * 0.15, centerY);
        thumbCtx.lineTo(canvasWidth * 0.65, centerY);
        thumbCtx.stroke();

        // Draw triangle arrowhead pointing right
        thumbCtx.beginPath();
        thumbCtx.moveTo(canvasWidth * 0.85, centerY); // tip
        thumbCtx.lineTo(canvasWidth * 0.65, centerY - radius * 0.6); // top corner
        thumbCtx.lineTo(canvasWidth * 0.65, centerY + radius * 0.6); // bottom corner
        thumbCtx.closePath();
        thumbCtx.stroke();
      }
    } else {
      // Built-in primitives
      switch (item.shapeType) {
        case 'circle':
          thumbCtx.beginPath();
          thumbCtx.arc(center, centerY, radius, 0, Math.PI * 2);
          thumbCtx.stroke();
          break;
        case 'triangle':
          thumbCtx.beginPath();
          thumbCtx.moveTo(center, canvasHeight * 0.2);
          thumbCtx.lineTo(canvasWidth * 0.2, canvasHeight * 0.7);
          thumbCtx.lineTo(canvasWidth * 0.8, canvasHeight * 0.7);
          thumbCtx.closePath();
          thumbCtx.stroke();
          break;
        case 'rectangle':
          thumbCtx.strokeRect(
            canvasWidth * 0.2,
            canvasHeight * 0.25,
            canvasWidth * 0.6,
            canvasHeight * 0.5
          );
          break;
      }
    }
    return thumbnailCanvas;
  }

  // Draw user-created strokes
  if (strokesToDraw.length > 0) {
    // Calculate bounding box for all strokes
    let allPoints: Point[] = [];
    strokesToDraw.forEach((stroke) => {
      if (stroke && stroke.length > 0) {
        allPoints = allPoints.concat(stroke);
      }
    });

    if (allPoints.length > 0) {
      const bounds = getBounds(allPoints);
      const width = bounds.maxX - bounds.minX;
      const height = bounds.maxY - bounds.minY;

      // Calculate scale to fit in thumbnail with padding
      const padding = Math.min(canvasWidth, canvasHeight) * 0.1;
      const scaleX = (canvasWidth - padding * 2) / width;
      const scaleY = (canvasHeight - padding * 2) / height;
      const scale = Math.min(scaleX, scaleY);

      // Center the drawing
      const offsetX = (canvasWidth - width * scale) / 2;
      const offsetY = (canvasHeight - height * scale) / 2;

      // Draw each stroke
      thumbCtx.strokeStyle = '#7C3AED';
      thumbCtx.lineWidth = 2;
      thumbCtx.lineCap = 'round';
      thumbCtx.lineJoin = 'round';

      strokesToDraw.forEach((stroke) => {
        if (!stroke || stroke.length === 0) return;

        thumbCtx.beginPath();
        stroke.forEach((point, i) => {
          const x = (point.x - bounds.minX) * scale + offsetX;
          const y = (point.y - bounds.minY) * scale + offsetY;
          if (i === 0) thumbCtx.moveTo(x, y);
          else thumbCtx.lineTo(x, y);
        });
        thumbCtx.stroke();
      });
    }
  }

  return thumbnailCanvas;
}
