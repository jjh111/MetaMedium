// MetaMedium Day 6 - Canvas Component
// Drawing surface with rendering

import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import type { Point } from '../types';
import { buildSpatialGraph } from '../core/spatial';
import { getBounds, getBoundsFromStroke } from '../utils/geometry';

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  const {
    strokes,
    refinedStrokes,
    currentStroke,
    context,
    shapes,
    debugMode,
    refinement,
    cornerDebugData,
    tipDebugData,
    isDrawing,
    startStroke,
    addPoint,
    endStroke,
  } = useStore();

  // Handle canvas resizing
  useEffect(() => {
    const updateCanvasSize = () => {
      const container = canvasRef.current?.parentElement;
      if (!container) return;

      const padding = 32; // Account for padding
      const maxWidth = container.clientWidth - padding;
      const maxHeight = container.clientHeight - padding;

      // Use full width, adjust height to maintain reasonable aspect ratio
      let width = maxWidth;
      let height = Math.min(width * 0.6, maxHeight); // 5:3 aspect ratio, max out at container height

      setCanvasSize({
        width: Math.floor(width),
        height: Math.floor(height),
      });
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const point: Point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    startStroke(point);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const point: Point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    addPoint(point);
  };

  const handleMouseUp = () => {
    if (isDrawing) {
      endStroke();
    }
  };

  const handleMouseLeave = () => {
    if (isDrawing) {
      endStroke();
    }
  };

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Render strokes (use refined if available and enabled)
    strokes.forEach((stroke, idx) => {
      const isAccepted = context[idx] && context[idx] !== '';
      const refinedStroke = refinedStrokes[idx];

      ctx.strokeStyle = isAccepted ? '#0066ff' : '#666666';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Check if refined stroke is segment-based (array of arrays for rectangles/triangles)
      const isSegmentBased = refinedStroke &&
        Array.isArray(refinedStroke[0]) &&
        typeof (refinedStroke[0] as any)[0] === 'object' &&
        typeof (refinedStroke[0] as any)[0].x !== 'undefined';

      if (refinement.enabled && refinedStroke && isSegmentBased) {
        // Draw segment-based refined stroke (rectangles/triangles)
        ctx.lineWidth = 3; // Thicker for refined shapes

        const segments = refinedStroke as unknown as any[][];
        segments.forEach((segment) => {
          if (segment && segment.length > 0) {
            ctx.beginPath();
            segment.forEach((point: any, i: number) => {
              if (i === 0) ctx.moveTo(point.x, point.y);
              else ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
          }
        });
      } else if (refinement.enabled && refinedStroke) {
        // Draw single-stroke refined (circles/lines)
        ctx.lineWidth = 3; // Thicker for refined shapes

        const points = refinedStroke as any[];
        if (points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
          }
          ctx.stroke();
        }
      } else {
        // Draw original stroke
        ctx.lineWidth = 2;

        if (stroke.length > 0) {
          ctx.beginPath();
          ctx.moveTo(stroke[0].x, stroke[0].y);
          for (let i = 1; i < stroke.length; i++) {
            ctx.lineTo(stroke[i].x, stroke[i].y);
          }
          ctx.stroke();
        }
      }

      // Debug mode: show original stroke in red if refined is being displayed
      if (debugMode && refinement.enabled && refinedStrokes[idx]) {
        ctx.beginPath();
        ctx.strokeStyle = '#ff5252';
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash([3, 3]);

        if (stroke.length > 0) {
          ctx.moveTo(stroke[0].x, stroke[0].y);
          for (let i = 1; i < stroke.length; i++) {
            ctx.lineTo(stroke[i].x, stroke[i].y);
          }
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      // Debug mode: show bounds
      if (debugMode && shapes[idx]?.bounds) {
        const bounds = shapes[idx].bounds;
        ctx.strokeStyle = '#ff9800';
        ctx.lineWidth = 1;
        ctx.strokeRect(
          bounds.minX,
          bounds.minY,
          bounds.maxX - bounds.minX,
          bounds.maxY - bounds.minY
        );
      }

      // Debug mode: show corner markers and tip indicators
      if (debugMode && isAccepted) {
        // For segment-based refined strokes, extract corners from segment endpoints
        if (refinement.enabled && refinedStroke && isSegmentBased) {
          const segments = refinedStroke as unknown as any[][];
          const corners = new Set<string>();

          segments.forEach((segment) => {
            if (segment && segment.length > 0) {
              // Collect corner points (start and end of each segment)
              if (segment[0]) corners.add(JSON.stringify(segment[0]));
              if (segment[segment.length - 1])
                corners.add(JSON.stringify(segment[segment.length - 1]));
            }
          });

          const cornerArray = Array.from(corners).map((s) => JSON.parse(s));
          cornerArray.forEach((corner, i) => {
            // Dark grey dot
            ctx.fillStyle = '#444';
            ctx.beginPath();
            ctx.arc(corner.x, corner.y, 5, 0, Math.PI * 2);
            ctx.fill();

            // Corner number
            ctx.fillStyle = '#444';
            ctx.font = 'bold 14px sans-serif';
            ctx.fillText(`#${i}`, corner.x + 10, corner.y - 5);

            // Show angle if available from corner debug data
            const cornerDebug = cornerDebugData[idx];
            if (cornerDebug && cornerDebug[i]) {
              const angleDeg = Math.round((cornerDebug[i].angle * 180) / Math.PI);
              ctx.font = '12px sans-serif';
              ctx.fillText(`${angleDeg}°`, corner.x + 10, corner.y + 10);
            }
          });
        } else {
          // For non-segment strokes, use cornerDebugData
          const cornerData = cornerDebugData[idx];
          if (cornerData && cornerData.length > 0) {
            cornerData.forEach((corner: any, i: number) => {
              // Dark grey dot
              ctx.fillStyle = '#444';
              ctx.beginPath();
              ctx.arc(corner.x, corner.y, 5, 0, Math.PI * 2);
              ctx.fill();

              // Corner number
              ctx.fillStyle = '#444';
              ctx.font = 'bold 14px sans-serif';
              ctx.fillText(`#${i}`, corner.x + 10, corner.y - 5);

              // Show angle if available
              if (corner.angle) {
                const angleDeg = Math.round((corner.angle * 180) / Math.PI);
                ctx.font = '12px sans-serif';
                ctx.fillText(`${angleDeg}°`, corner.x + 10, corner.y + 10);
              }
            });
          }
        }

        // Show tip indicator for triangles/arrows
        const tipPoint = tipDebugData[idx];
        if (tipPoint) {
          ctx.fillStyle = '#444';
          ctx.beginPath();
          ctx.arc(tipPoint.x, tipPoint.y, 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#444';
          ctx.font = 'bold 14px sans-serif';
          ctx.fillText('TIP', tipPoint.x + 10, tipPoint.y - 5);
        }
      }
    });

    // Debug mode: spatial graph visualization
    if (debugMode && strokes.length > 1) {
      // Build temp components for spatial graph
      const tempComponents = strokes.map((stroke, idx) => {
        const refinedStroke = refinedStrokes[idx];

        return {
          index: idx,
          strokeId: `temp-${idx}`,
          originalStroke: stroke,
          refinedStroke: refinedStroke,
          bounds: refinedStroke ? getBoundsFromStroke(refinedStroke) : getBounds(stroke),
          recognizedAs: context[idx] || `art${idx}`,
          type: context[idx] || 'unknown',
          fingerprint: null as any,
          geometricShape: shapes[idx] || null,
        };
      });

      const spatialGraph = buildSpatialGraph(tempComponents as any);

      // Draw connection lines
      spatialGraph.connections.forEach((conn, connIdx) => {
        const compA = tempComponents[conn.a];
        const compB = tempComponents[conn.b];
        const centerA = {
          x: (compA.bounds.minX + compA.bounds.maxX) / 2,
          y: (compA.bounds.minY + compA.bounds.maxY) / 2,
        };
        const centerB = {
          x: (compB.bounds.minX + compB.bounds.maxX) / 2,
          y: (compB.bounds.minY + compB.bounds.maxY) / 2,
        };

        const isIntersecting = conn.relationship === 'intersecting';

        // Connection line - dashed grey for intersecting, dashed green for touching
        ctx.strokeStyle = isIntersecting ? '#999999' : '#4CAF50';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]); // Both are dashed now
        ctx.beginPath();
        ctx.moveTo(centerA.x, centerA.y);
        ctx.lineTo(centerB.x, centerB.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Connection label with offset to avoid overlap
        const midX = (centerA.x + centerB.x) / 2;
        const midY = (centerA.y + centerB.y) / 2;
        const offset = (conn.a + conn.b) % 3 * 10;

        ctx.fillStyle = isIntersecting ? '#999999' : '#4CAF50';
        ctx.font = 'bold 10px monospace';
        const emoji = isIntersecting ? '⨯' : '🔗';
        ctx.fillText(emoji, midX - 5, midY - 3 + offset);

        // Draw actual intersection points (if available)
        if (isIntersecting && conn.intersectionPoints && conn.intersectionPoints.length > 0) {
          conn.intersectionPoints.forEach((point) => {
            // Draw intersection point as red dot with yellow center
            ctx.fillStyle = '#FF3333';
            ctx.beginPath();
            ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
            ctx.fill();

            // Yellow center
            ctx.fillStyle = '#FFFF00';
            ctx.beginPath();
            ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
            ctx.fill();
          });

          // Draw count badge near first intersection point
          const firstPoint = conn.intersectionPoints[0];
          const count = conn.intersectionPoints.length;

          ctx.fillStyle = '#FF3333';
          ctx.font = 'bold 9px monospace';
          const badge = `⨯${count}`;
          const badgeMetrics = ctx.measureText(badge);

          // Background
          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          ctx.fillRect(firstPoint.x + 8, firstPoint.y - 12, badgeMetrics.width + 4, 11);

          // Text
          ctx.fillStyle = '#FFFF00';
          ctx.fillText(badge, firstPoint.x + 10, firstPoint.y - 4);
        }
      });

      // Draw containment relationships
      const containmentLabelOffsets: { [key: string]: number } = {};
      if (spatialGraph.containment && spatialGraph.containment.length > 0) {
        spatialGraph.containment.forEach((cont) => {
          const outer = tempComponents[cont.outer];
          const inner = tempComponents[cont.inner];
          const boundsOuter = outer.bounds;
          const boundsInner = inner.bounds;

          // Determine containment type (check if we have type info from spatial graph)
          const type = (cont as any).type || 'bounds-based';

          // Color code by containment type
          let color = '#9C27B0'; // Default purple
          if (type.includes('circle')) color = '#2196F3'; // Blue for circle containment
          if (type.includes('polygon')) color = '#FF9800'; // Orange for polygon containment
          if (type === 'bounds-based') color = '#9E9E9E'; // Gray for fallback

          // Draw dashed box around outer shape (with 5px padding)
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.setLineDash([3, 3]);
          ctx.strokeRect(
            boundsOuter.minX - 5,
            boundsOuter.minY - 5,
            (boundsOuter.maxX - boundsOuter.minX) + 10,
            (boundsOuter.maxY - boundsOuter.minY) + 10
          );
          ctx.setLineDash([]);

          // Label with type (stack vertically to avoid overlap)
          const labelKey = `${cont.outer}`;
          const yOffset = (containmentLabelOffsets[labelKey] || 0) * 11;
          containmentLabelOffsets[labelKey] = (containmentLabelOffsets[labelKey] || 0) + 1;

          ctx.fillStyle = color;
          ctx.font = 'bold 9px monospace';
          const typeShort = type
            .replace('circle-in-', 'C⊃')
            .replace('polygon-in-', 'P⊃')
            .replace('bounds-based', 'BB');
          ctx.fillText(
            `${cont.outer}⊃${cont.inner} [${typeShort}]`,
            boundsOuter.minX,
            boundsOuter.minY - 8 - yOffset
          );
        });
      }

      // Spatial graph summary bar at bottom
      const hasConnections = spatialGraph.connections && spatialGraph.connections.length > 0;
      const hasContainment = spatialGraph.containment && spatialGraph.containment.length > 0;

      if (hasConnections || hasContainment) {
        const summary: string[] = [];

        if (hasConnections) {
          const intersectingCount = spatialGraph.connections.filter(
            (c) => c.relationship === 'intersecting'
          ).length;
          const touchingCount = spatialGraph.connections.filter(
            (c) => c.relationship === 'touching'
          ).length;

          const connParts: string[] = [];
          if (intersectingCount > 0) connParts.push(`${intersectingCount} intersecting`);
          if (touchingCount > 0) connParts.push(`${touchingCount} touching`);

          summary.push(
            `${spatialGraph.connections.length} connections (${connParts.join(', ')})`
          );
        }

        if (hasContainment) {
          // Simpler containment summary to avoid wrapping
          summary.push(`${spatialGraph.containment.length} containment`);
        }

        const summaryText = summary.join(' · ');

        // Black background bar
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, canvasSize.height - 22, canvasSize.width, 22);

        // White text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px monospace';
        ctx.fillText(summaryText, 10, canvasSize.height - 8);
      }
    }

    // Render current stroke (gray)
    if (currentStroke.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = '#666666';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
      for (let i = 1; i < currentStroke.length; i++) {
        ctx.lineTo(currentStroke[i].x, currentStroke[i].y);
      }
      ctx.stroke();
    }
  }, [strokes, refinedStrokes, currentStroke, context, shapes, debugMode, refinement, cornerDebugData, tipDebugData, canvasSize]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.width}
      height={canvasSize.height}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      style={{
        border: '1px solid #ddd',
        cursor: 'crosshair',
        background: '#fff',
        borderRadius: '4px',
      }}
    />
  );
}
