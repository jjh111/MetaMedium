// MetaMedium Day 6 - Semantic Query API
// Phase 6B: Console-accessible API for semantic queries about drawings and library

import type { Store } from '../types';

export interface QueryAPI {
  getCurrentComponents: () => any[];
  countType: (type: string) => number;
  findCompositions: (type: string) => any[];
  listBasedOn: (builtinType: string) => any[];
  getSemantics: (compositionName: string) => any;
  getLibrary: () => any[];
  detectPossibleCompositions: () => any[];
  help: () => void;
}

export function createQueryAPI(getState: () => Store): QueryAPI {
  return {
    // Get all components currently on canvas with metadata
    getCurrentComponents: () => {
      const state = getState();
      return state.strokes
        .map((_stroke, idx) => ({
          strokeId: state.strokeIds[idx],
          recognizedAs: state.context[idx],
          type: state.shapes[idx]?.type || 'unknown',
          accepted: state.context[idx] !== '',
          bounds: state.shapes[idx]?.bounds || null,
        }))
        .filter((c) => c.accepted);
    },

    // Count shapes of a specific type on current canvas
    countType: (type: string) => {
      const api = createQueryAPI(getState);
      const components = api.getCurrentComponents();
      return components.filter(
        (c) => c.recognizedAs === type || c.type === type
      ).length;
    },

    // Find all saved compositions containing a specific type
    findCompositions: (type: string) => {
      const state = getState();
      const results: any[] = [];

      Object.entries(state.library).forEach(([key, item]) => {
        if (item.type === 'composition' && item.semantics) {
          const hasType =
            item.semantics.components.some((c) => c.type === type) ||
            item.components?.some((c) => c.type === type);

          if (hasType) {
            results.push({
              name: item.label,
              key: key,
              componentCount: item.components?.length || 0,
              components: item.components,
            });
          }
        }
      });

      return results;
    },

    // List all user primitives based on a specific built-in shape
    listBasedOn: (builtinType: string) => {
      const state = getState();
      const results: any[] = [];

      Object.entries(state.library).forEach(([key, item]) => {
        if (item.type === 'user-primitive' && item.basedOn === builtinType) {
          results.push({
            name: item.label,
            key: key,
            basedOn: item.basedOn,
            usageCount: item.usageCount,
          });
        }
      });

      return results;
    },

    // Get semantic description of a composition
    getSemantics: (compositionName: string) => {
      const state = getState();
      const key = compositionName.toLowerCase().replace(/\s+/g, '-');
      const item = state.library[key];

      if (!item || item.type !== 'composition') {
        return null;
      }

      return item.semantics;
    },

    // Get full library structure
    getLibrary: () => {
      const state = getState();
      return Object.entries(state.library).map(([key, item]) => ({
        key: key,
        label: item.label,
        type: item.type,
        basedOn: item.basedOn,
        semantics: item.semantics,
        usageCount: item.usageCount,
      }));
    },

    // Find all compositions that could be on current canvas (subset matching preview)
    detectPossibleCompositions: () => {
      const api = createQueryAPI(getState);
      const state = getState();
      const components = api.getCurrentComponents();
      const results: any[] = [];

      // Count types on canvas
      const canvasTypeCounts: { [key: string]: number } = {};
      components.forEach((c) => {
        const type = c.recognizedAs || c.type;
        canvasTypeCounts[type] = (canvasTypeCounts[type] || 0) + 1;
      });

      Object.entries(state.library).forEach(([key, item]) => {
        if (item.type === 'composition' && item.components) {
          // Build required type counts
          const requiredTypeCounts: { [key: string]: number } = {};
          item.components.forEach((comp) => {
            const type = comp.recognizedAs || comp.type;
            requiredTypeCounts[type] = (requiredTypeCounts[type] || 0) + 1;
          });

          // Check if canvas has enough components of each type
          let possible = true;
          Object.entries(requiredTypeCounts).forEach(([type, count]) => {
            if ((canvasTypeCounts[type] || 0) < count) {
              possible = false;
            }
          });

          if (possible) {
            results.push({
              name: item.label,
              key: key,
              required: requiredTypeCounts,
              available: components.length,
            });
          }
        }
      });

      return results;
    },

    // Help text
    help: () => {
      console.log('📊 SEMANTIC QUERY API (Phase 6B)');
      console.log('================================');
      console.log('');
      console.log('Canvas Queries:');
      console.log('  query.getCurrentComponents()     - Get all shapes on canvas');
      console.log('  query.countType("circle")        - Count specific type on canvas');
      console.log('');
      console.log('Library Queries:');
      console.log('  query.getLibrary()               - List all saved shapes');
      console.log('  query.findCompositions("line")   - Find compositions with type');
      console.log('  query.listBasedOn("circle")      - List shapes based on built-in');
      console.log('  query.getSemantics("arrow")      - Get composition semantics');
      console.log('');
      console.log('Advanced:');
      console.log(
        '  query.detectPossibleCompositions() - Find possible matches on canvas'
      );
      console.log('');
      console.log('Examples:');
      console.log('  query.countType("circle")        → 3');
      console.log('  query.findCompositions("triangle") → [{name: "Arrow", ...}]');
      console.log('  query.listBasedOn("circle")      → [{name: "Bubble", ...}]');
    },
  };
}

// Initialize on window for console access
export function installQueryAPI(getState: () => Store) {
  const api = createQueryAPI(getState);
  (window as any).query = api;

  // Print help on load
  console.log('');
  console.log('💡 Tip: Type query.help() for semantic query API');
  console.log('');
}
