// MetaMedium Day 6 - Stroke Refinement
// Convert hand-drawn strokes into perfect geometric shapes

import type { Point, Fingerprint } from '../types';
import { getBounds, countCorners } from './geometry';

// ===== INDIVIDUAL REFINEMENT FUNCTIONS =====

export function refineCircle(originalStroke: Point[]): Point[] {
  const bounds = getBounds(originalStroke);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const radiusX = (bounds.maxX - bounds.minX) / 2;
  const radiusY = (bounds.maxY - bounds.minY) / 2;
  const radius = (radiusX + radiusY) / 2; // Average for perfect circle

  // Generate perfect circle points
  const points: Point[] = [];
  const numPoints = 60;
  for (let i = 0; i <= numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    points.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    });
  }
  return points;
}

export function refineLine(originalStroke: Point[]): Point[] {
  // Keep exact start and end, make perfectly straight
  const start = originalStroke[0];
  const end = originalStroke[originalStroke.length - 1];
  return [
    { x: start.x, y: start.y },
    { x: end.x, y: end.y },
  ];
}

export function refineRectangle(
  originalStroke: Point[],
  fingerprint: Fingerprint | null = null
): Point[][] {
  // LINE-BASED APPROACH: Return 4 separate line segments using actual detected corners
  // This shows composability and is more accurate than bounding-box approach

  // Use cached corner data from fingerprint if available, otherwise compute
  let cornerData;
  if (fingerprint && fingerprint.cornerData) {
    cornerData = {
      count: fingerprint.corners,
      angles: fingerprint.cornerAngles || [],
      cornerData: fingerprint.cornerData,
    };
  } else {
    cornerData = countCorners(originalStroke, Math.PI / 3);
  }

  // Get actual corner positions from the stroke
  let corners: Point[] = [];

  if (cornerData.cornerData && cornerData.cornerData.length >= 3) {
    // Use detected corners - take 4 sharpest if we have more
    corners = cornerData.cornerData
      .sort((a, b) => a.angle - b.angle) // Sort by sharpness
      .slice(0, 4)
      .sort((a, b) => a.index - b.index) // Sort by order in stroke
      .map((c) => originalStroke[c.index])
      .filter((p) => p && typeof p.x !== 'undefined' && typeof p.y !== 'undefined');
  }

  // Fallback: if not enough corners detected, use bounding box
  if (corners.length < 4) {
    const bounds = getBounds(originalStroke);
    corners = [
      { x: bounds.minX, y: bounds.minY }, // Top-left
      { x: bounds.maxX, y: bounds.minY }, // Top-right
      { x: bounds.maxX, y: bounds.maxY }, // Bottom-right
      { x: bounds.minX, y: bounds.maxY }, // Bottom-left
    ];
  }

  // Get the actual corner indices in the original stroke (for order)
  let cornerIndices: number[] = [];
  if (cornerData.cornerData && cornerData.cornerData.length >= 3) {
    cornerIndices = cornerData.cornerData
      .sort((a, b) => a.angle - b.angle)
      .slice(0, 4)
      .map((c) => c.index)
      .sort((a, b) => a - b); // Sort by position in stroke
  }

  // Rectangles need 4 corners - add start/end point if we only detected 3
  if (cornerIndices.length === 3) {
    cornerIndices.push(0); // Add start point as 4th corner
    cornerIndices.sort((a, b) => a - b); // Re-sort by position
  } else if (cornerIndices.length < 3) {
    // CREATE rectangle geometry from bounding box
    const bounds = getBounds(originalStroke);

    // Create synthetic rectangle corners
    const corner0 = { x: bounds.minX, y: bounds.minY }; // Top-left
    const corner1 = { x: bounds.maxX, y: bounds.minY }; // Top-right
    const corner2 = { x: bounds.maxX, y: bounds.maxY }; // Bottom-right
    const corner3 = { x: bounds.minX, y: bounds.maxY }; // Bottom-left

    // Return synthetic corners directly as line segments
    const lineSegments = [
      [corner0, corner1],
      [corner1, corner2],
      [corner2, corner3],
      [corner3, corner0],
    ];

    return lineSegments;
  }

  // Extract corner points from stroke and create straight lines between them
  const corner0 = originalStroke[cornerIndices[0]];
  const corner1 = originalStroke[cornerIndices[1]];
  const corner2 = originalStroke[cornerIndices[2]];
  const corner3 = originalStroke[cornerIndices[3]];

  // Create 4 straight line segments connecting the corners
  const lineSegments = [
    [corner0, corner1], // Line from corner 0 to corner 1
    [corner1, corner2], // Line from corner 1 to corner 2
    [corner2, corner3], // Line from corner 2 to corner 3
    [corner3, corner0], // Line from corner 3 back to corner 0 (close)
  ];

  // Return 4 stroke segments (each is an array of points)
  return lineSegments;
}

export function refineTriangle(
  originalStroke: Point[],
  fingerprint: Fingerprint | null = null
): Point[][] {
  // LINE-BASED APPROACH: Return 3 separate line segments using actual detected corners

  // Use cached corner data from fingerprint if available
  let cornerData;
  if (fingerprint && fingerprint.cornerData) {
    cornerData = {
      count: fingerprint.corners,
      angles: fingerprint.cornerAngles || [],
      cornerData: fingerprint.cornerData,
    };
  } else {
    cornerData = countCorners(originalStroke, Math.PI / 3);
  }

  // Get the actual corner indices in the original stroke
  let cornerIndices: number[] = [];
  if (cornerData.cornerData && cornerData.cornerData.length >= 2) {
    cornerIndices = cornerData.cornerData
      .sort((a, b) => a.angle - b.angle)
      .slice(0, 3)
      .map((c) => c.index)
      .filter((idx) => typeof idx !== 'undefined' && idx >= 0) // Remove undefined indices
      .sort((a, b) => a - b); // Sort by position in stroke
  }

  // Triangles need 3 corners - add start/end point if we only detected 2
  if (cornerIndices.length === 2) {
    // Add a third corner that's not already in the list
    // Try start point first, then end point
    const endIdx = originalStroke.length - 1;
    if (!cornerIndices.includes(0)) {
      cornerIndices.push(0);
    } else if (!cornerIndices.includes(endIdx)) {
      cornerIndices.push(endIdx);
    } else {
      // Both start and end are already corners, find midpoint
      const midIdx = Math.floor(originalStroke.length / 2);
      cornerIndices.push(midIdx);
    }
    cornerIndices.sort((a, b) => a - b); // Re-sort by position
  } else if (cornerIndices.length === 1) {
    // Find the point farthest from the detected corner
    const cornerPt = originalStroke[cornerIndices[0]];
    let maxDist = 0;
    let farthestIdx = 0;
    originalStroke.forEach((pt, idx) => {
      const dist = Math.sqrt(Math.pow(pt.x - cornerPt.x, 2) + Math.pow(pt.y - cornerPt.y, 2));
      if (dist > maxDist) {
        maxDist = dist;
        farthestIdx = idx;
      }
    });
    cornerIndices = [0, cornerIndices[0], farthestIdx].sort((a, b) => a - b);
  } else if (cornerIndices.length === 0) {
    console.warn('No corners detected for triangle, using fallback method');

    // FALLBACK: Find 3 points that are maximally distant from each other
    // This works even with very few points in the stroke

    // Start with first point
    let p1Idx = 0;
    let p1 = originalStroke[0];

    // Find point farthest from p1
    let maxDist1 = 0;
    let p2Idx = 0;
    originalStroke.forEach((pt, idx) => {
      const dist = Math.sqrt(Math.pow(pt.x - p1.x, 2) + Math.pow(pt.y - p1.y, 2));
      if (dist > maxDist1) {
        maxDist1 = dist;
        p2Idx = idx;
      }
    });
    const p2 = originalStroke[p2Idx];

    // Find point farthest from the line between p1 and p2
    let maxDist2 = 0;
    let p3Idx = 0;
    originalStroke.forEach((pt, idx) => {
      // Calculate perpendicular distance from point to line p1-p2
      const A = pt.x - p1.x;
      const B = pt.y - p1.y;
      const C = p2.x - p1.x;
      const D = p2.y - p1.y;

      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      const param = lenSq !== 0 ? dot / lenSq : -1;

      let closestX, closestY;
      if (param < 0) {
        closestX = p1.x;
        closestY = p1.y;
      } else if (param > 1) {
        closestX = p2.x;
        closestY = p2.y;
      } else {
        closestX = p1.x + param * C;
        closestY = p1.y + param * D;
      }

      const dist = Math.sqrt(Math.pow(pt.x - closestX, 2) + Math.pow(pt.y - closestY, 2));
      if (dist > maxDist2) {
        maxDist2 = dist;
        p3Idx = idx;
      }
    });
    const p3 = originalStroke[p3Idx];

    console.log('Fallback triangle corners:', {
      p1: { idx: p1Idx, point: p1 },
      p2: { idx: p2Idx, point: p2, distFromP1: maxDist1 },
      p3: { idx: p3Idx, point: p3, distFromLine: maxDist2 }
    });

    // Create triangle from these 3 points
    const lineSegments = [[p1, p2], [p2, p3], [p3, p1]];
    return lineSegments;
  }

  // Extract corner points from stroke and create straight lines between them
  const corner0 = originalStroke[cornerIndices[0]];
  const corner1 = originalStroke[cornerIndices[1]];
  const corner2 = originalStroke[cornerIndices[2]];

  // Validate all corners exist
  if (!corner0 || !corner1 || !corner2) {
    console.warn('Invalid corner points detected in triangle refinement', {
      cornerIndices,
      corner0,
      corner1,
      corner2,
      strokeLength: originalStroke.length,
    });
    // Fallback: use bounding box to create triangle
    const startPt = originalStroke[0];
    const endPt = originalStroke[originalStroke.length - 1];
    const tipPoint = fingerprint?.tipPoint || startPt;
    return [[startPt, endPt], [endPt, tipPoint], [tipPoint, startPt]];
  }

  // Create 3 straight line segments connecting the corners
  const lineSegments = [
    [corner0, corner1], // Line from corner 0 to corner 1
    [corner1, corner2], // Line from corner 1 to corner 2
    [corner2, corner0], // Line from corner 2 back to corner 0 (close)
  ];

  // Return 3 stroke segments (each is an array of points)
  return lineSegments;
}

// ===== MAIN REFINEMENT DISPATCHER =====

export function refineStroke(
  originalStroke: Point[],
  recognizedAs: string,
  fingerprint: Fingerprint | null = null
): Point[] | Point[][] | null {
  switch (recognizedAs) {
    case 'circle':
      return refineCircle(originalStroke);
    case 'line':
      return refineLine(originalStroke);
    case 'rectangle':
      return refineRectangle(originalStroke, fingerprint);
    case 'triangle':
      return refineTriangle(originalStroke, fingerprint);
    default:
      return null; // No refinement for unrecognized shapes
  }
}
