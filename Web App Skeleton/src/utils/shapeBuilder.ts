// MetaMedium Day 6 - Shape Builder
// Create geometric Shape objects from recognized primitives

import type { Point, Shape, Fingerprint, Bounds } from '../types';

export function createLineShape(
  originalStroke: Point[],
  refinedStroke: Point[] | null,
  bounds: Bounds
): Shape {
  // Extract start and end from refined stroke or original
  const stroke = refinedStroke || originalStroke;
  const start = stroke[0];
  const end = stroke[stroke.length - 1];

  return {
    type: 'line',
    label: 'Line',
    bounds,
    accepted: true,
    formalism: 'geometric',
    definition: {
      type: 'segment',
      start: { x: start.x, y: start.y },
      end: { x: end.x, y: end.y },
    },
  };
}

export function createCircleShape(
  originalStroke: Point[],
  bounds: Bounds,
  fingerprint: Fingerprint | null
): Shape {
  // Calculate center and radius from bounds
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const radiusX = (bounds.maxX - bounds.minX) / 2;
  const radiusY = (bounds.maxY - bounds.minY) / 2;
  const radius = (radiusX + radiusY) / 2; // Average for perfect circle

  return {
    type: 'circle',
    label: 'Circle',
    bounds,
    accepted: true,
    formalism: 'geometric',
    definition: {
      type: 'circle',
      center: { x: centerX, y: centerY },
      radius,
    },
  };
}

export function createPolygonShape(
  originalStroke: Point[],
  refinedStroke: Point[][] | null,
  type: string,
  bounds: Bounds,
  fingerprint: Fingerprint | null
): Shape {
  // Extract corners from segment-based refined stroke or fingerprint
  let vertices: Point[] = [];

  if (refinedStroke && Array.isArray(refinedStroke[0])) {
    // Extract unique corners from segment endpoints
    const cornerSet = new Set<string>();
    refinedStroke.forEach((segment) => {
      if (segment && segment.length > 0) {
        cornerSet.add(JSON.stringify(segment[0]));
        cornerSet.add(JSON.stringify(segment[segment.length - 1]));
      }
    });
    vertices = Array.from(cornerSet).map((s) => JSON.parse(s));
  } else if (fingerprint && fingerprint.cornerData) {
    // Use corner data from fingerprint
    vertices = fingerprint.cornerData.map((c) => ({ x: c.x, y: c.y }));
  } else {
    // Fallback: use bounding box corners
    vertices = [
      { x: bounds.minX, y: bounds.minY },
      { x: bounds.maxX, y: bounds.minY },
      { x: bounds.maxX, y: bounds.maxY },
      { x: bounds.minX, y: bounds.maxY },
    ];
  }

  return {
    type: type,
    label: type.charAt(0).toUpperCase() + type.slice(1),
    bounds,
    accepted: true,
    formalism: 'geometric',
    definition: {
      type: 'polygon',
      vertices,
    },
  };
}

export function createShapeFromRecognition(
  originalStroke: Point[],
  recognizedType: string,
  refinedStroke: Point[] | Point[][] | null,
  bounds: Bounds,
  fingerprint: Fingerprint | null
): Shape {
  switch (recognizedType) {
    case 'line':
      return createLineShape(originalStroke, refinedStroke as Point[], bounds);

    case 'circle':
      return createCircleShape(originalStroke, bounds, fingerprint);

    case 'rectangle':
    case 'triangle':
      return createPolygonShape(
        originalStroke,
        refinedStroke as Point[][],
        recognizedType,
        bounds,
        fingerprint
      );

    default:
      // For user primitives or unknown shapes, create a basic shape without geometric definition
      return {
        type: recognizedType,
        label: recognizedType,
        bounds,
        accepted: true,
        formalism: 'freeform',
        definition: null,
      };
  }
}
