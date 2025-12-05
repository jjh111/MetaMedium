// MetaMedium Day 6 - Composition Matching System
// Migrated from day5.html

import type {
  Component,
  CompositionFingerprint,
  SpatialGraph,
} from '../types';
import { vlog } from '../utils/logger';
import { matchPrimitiveFromLibrary } from './recognition';

// ===== CANONICALIZATION =====

export function canonicalizeComponents(components: Component[]): Component[] {
  // Sort components by type, then by position for order-invariant fingerprinting
  return [...components].sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    if (a.bounds.minX !== b.bounds.minX) return a.bounds.minX - b.bounds.minX;
    return a.bounds.minY - b.bounds.minY;
  });
}

// ===== COMPOSITION FINGERPRINTING =====

export function createCompositionFingerprint(
  components: Component[],
  spatialGraph: SpatialGraph
): CompositionFingerprint {
  const canonical = canonicalizeComponents(components);

  // DAY 5 FIX: Normalize artN types to generic "art" for matching
  const normalizedCanonical = canonical.map((c) => ({
    ...c,
    type: c.type.startsWith('art') ? 'art' : c.type,
  }));

  // Component histogram (type counts)
  const typeHistogram: { [key: string]: number } = {};
  normalizedCanonical.forEach((c) => {
    typeHistogram[c.type] = (typeHistogram[c.type] || 0) + 1;
  });

  // Relationship histogram
  const relationshipHistogram = {
    touching: spatialGraph.connections.filter((c) => c.relationship === 'touching').length,
    intersecting: spatialGraph.connections.filter((c) => c.relationship === 'intersecting')
      .length,
    containment: spatialGraph.containment.length,
  };

  // Topology hash (canonical string representation)
  const typeString = normalizedCanonical.map((c) => c.type).join('+');
  const relString = Object.entries(relationshipHistogram)
    .filter(([_, v]) => v > 0)
    .map(([k, v]) => `${v}${k}`)
    .join('-');
  const topologyHash = `${typeString}${relString ? '-' + relString : ''}`;

  return {
    componentTypes: normalizedCanonical.map((c) => c.type),
    componentCount: components.length,
    typeHistogram,
    relationshipHistogram,
    topologyHash,
    canonicalOrder: canonical.map((c) => c.index),
  };
}

// ===== FINGERPRINT MATCHING =====

export function matchCompositionFingerprints(
  fp1: CompositionFingerprint,
  fp2: CompositionFingerprint,
  threshold: number,
  components1: Component[] | null,
  components2: Component[] | null
): { matches: boolean; score: number; typeScore?: number; relScore?: number } {
  // Quick reject: different component counts
  if (fp1.componentCount !== fp2.componentCount) {
    return { matches: false, score: 0 };
  }

  // Flexible topology hash check
  const hash1Base = fp1.topologyHash.split('-')[0];
  const hash2Base = fp2.topologyHash.split('-')[0];
  if (hash1Base !== hash2Base) {
    return { matches: false, score: 0 };
  }

  let score = 1.0;

  // Type histogram match
  const allTypes = new Set([
    ...Object.keys(fp1.typeHistogram),
    ...Object.keys(fp2.typeHistogram),
  ]);
  let typeMatches = 0;
  let totalTypes = 0;

  allTypes.forEach((type) => {
    const count1 = fp1.typeHistogram[type] || 0;
    const count2 = fp2.typeHistogram[type] || 0;

    // Geometric similarity for "art" types
    if (type === 'art' && components1 && components2) {
      const artComponents1 = components1.filter((c) => c.type === 'art');
      const artComponents2 = components2.filter((c) => c.type === 'art');

      if (artComponents1.length === artComponents2.length) {
        let artSimilarity = 0;
        for (let i = 0; i < artComponents1.length; i++) {
          const sim = matchPrimitiveFromLibrary(
            artComponents1[i].fingerprint,
            artComponents2[i].fingerprint
          );
          artSimilarity += sim;
          vlog(
            `  🎨 Art component ${i} geometric similarity: ~${sim.toFixed(2)}`
          );
        }
        artSimilarity /= artComponents1.length;
        vlog(`  🎨 Overall geometric score: ~${artSimilarity.toFixed(2)}`);

        if (artSimilarity >= threshold) {
          typeMatches += count1;
        }
      }
    } else {
      if (count1 === count2) {
        typeMatches += count1;
      }
    }
    totalTypes += Math.max(count1, count2);
  });

  const typeScore = totalTypes > 0 ? typeMatches / totalTypes : 1;
  score *= typeScore;

  // Relationship histogram match (fuzzy or strict)
  const relKeys: ('touching' | 'intersecting' | 'containment')[] = [
    'touching',
    'intersecting',
    'containment',
  ];
  let relScore = 0;
  let relWeights = 0;

  if (fp2.fuzzyRelationships) {
    // DAY 5 FIX: Check if canvas has relationships if saved does
    const savedHasRelationships = relKeys.some((key) => (fp2.relationshipHistogram[key] || 0) > 0);
    const canvasHasRelationships = relKeys.some((key) => (fp1.relationshipHistogram[key] || 0) > 0);

    if (savedHasRelationships && !canvasHasRelationships) {
      vlog('🔍 Fuzzy relationship FAIL: Saved has relationships but canvas has none');
      return { matches: false, score: 0, typeScore, relScore: 0 };
    }

    relKeys.forEach((key) => {
      const val1 = fp1.relationshipHistogram[key] || 0;
      const val2 = fp2.relationshipHistogram[key] || 0;
      const diff = Math.abs(val1 - val2);

      let keyScore = 1.0;
      if (diff === 1) keyScore = 0.7;
      else if (diff === 2) keyScore = 0.4;
      else if (diff >= 3) keyScore = 0.0;

      relScore += keyScore;
      relWeights += 1;
    });
  } else {
    // Strict matching
    relKeys.forEach((key) => {
      const val1 = fp1.relationshipHistogram[key] || 0;
      const val2 = fp2.relationshipHistogram[key] || 0;
      relScore += val1 === val2 ? 1 : 0;
      relWeights += 1;
    });
  }

  relScore = relWeights > 0 ? relScore / relWeights : 1;
  score *= relScore;

  return {
    matches: score >= threshold,
    score,
    typeScore,
    relScore,
  };
}

// ===== SUBSET MATCHING =====

export function findSubsetMatches(
  clusterComponents: Component[],
  requiredTypes: string[],
  requiredCount: number,
  libFingerprint: CompositionFingerprint,
  libComponents: Component[] | null,
  threshold: number,
  proximityThreshold: number
): {
  components: Component[];
  score: number;
  matchDetails: any;
}[] {
  vlog(
    `  🔎 Subset search: need ${requiredCount} components of types [${requiredTypes.join(', ')}]`
  );

  // Quick rejection
  if (clusterComponents.length < requiredCount) {
    vlog(`  ❌ Cluster too small (${clusterComponents.length} < ${requiredCount})`);
    return [];
  }

  // Single-component compositions
  if (requiredCount === 1) {
    const matches: any[] = [];
    clusterComponents.forEach((comp) => {
      if (requiredTypes.includes(comp.type)) {
        // Build minimal fingerprint for single component
        const subset = [comp];
        const fingerprint: CompositionFingerprint = {
          componentTypes: [comp.type],
          componentCount: 1,
          typeHistogram: { [comp.type]: 1 },
          relationshipHistogram: { touching: 0, intersecting: 0, containment: 0 },
          topologyHash: comp.type,
          canonicalOrder: [0],
        };

        // No spatial graph needed for single component
        // const _spatialGraph: SpatialGraph = { connections: [], containment: [] };

        const matchResult = matchCompositionFingerprints(
          fingerprint,
          libFingerprint,
          threshold,
          subset,
          libComponents
        );

        if (matchResult.matches) {
          vlog(`  ✅ Single-component match! Score: ${matchResult.score.toFixed(2)}`);
          matches.push({
            components: subset,
            score: matchResult.score,
            matchDetails: matchResult,
          });
        }
      }
    });
    return matches;
  }

  // Multi-component: use greedy spatial search
  const typeMap: { [key: string]: Component[] } = {};
  clusterComponents.forEach((comp) => {
    if (!typeMap[comp.type]) typeMap[comp.type] = [];
    typeMap[comp.type].push(comp);
  });

  // Count required types
  const typeCounts: { [key: string]: number } = {};
  requiredTypes.forEach((t) => {
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });

  // Check if we have all required types
  for (const [type, count] of Object.entries(typeCounts)) {
    if (!typeMap[type] || typeMap[type].length < count) {
      vlog(`  ❌ Missing required type "${type}" (need ${count}, have ${typeMap[type]?.length || 0})`);
      return [];
    }
  }

  vlog(`  📋 Type availability:`, Object.entries(typeMap).map(([t, cs]) => `${t}:${cs.length}`).join(', '));

  const matches: any[] = [];
  let combinationsTested = 0;
  const maxCombinations = 1000;

  function testCombination(
    subset: Component[],
    spatialGraph: SpatialGraph
  ): boolean {
    combinationsTested++;

    const fingerprint = createCompositionFingerprint(subset, spatialGraph);
    const matchResult = matchCompositionFingerprints(
      fingerprint,
      libFingerprint,
      threshold,
      subset,
      libComponents
    );

    vlog(
      `  🧪 Test combo ${combinationsTested}: [${subset.map((c) => c.type).join(', ')}] → ${
        matchResult.matches ? '✅' : '❌'
      } (score: ${matchResult.score.toFixed(2)})`
    );

    if (matchResult.matches) {
      matches.push({
        components: subset,
        score: matchResult.score,
        matchDetails: matchResult,
      });
      return true;
    }
    return false;
  }

  // Simple recursive generation (for now, without full spatial graph building)
  // Note: This is simplified - full implementation would build spatial graph
  function generateCombinations(
    currentSubset: Component[],
    requiredTypesRemaining: string[]
  ): void {
    if (combinationsTested >= maxCombinations) return;
    if (matches.length > 0) return; // Greedy: stop after first match

    if (requiredTypesRemaining.length === 0) {
      // Build minimal spatial graph (simplified)
      const spatialGraph: SpatialGraph = { connections: [], containment: [] };
      testCombination(currentSubset, spatialGraph);
      return;
    }

    const nextType = requiredTypesRemaining[0];
    const candidates = typeMap[nextType] || [];

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];

      if (currentSubset.some((c) => c.index === candidate.index)) continue;

      // Check spatial proximity
      if (currentSubset.length > 0) {
        const isNearby = currentSubset.some((c) => {
          const dx = Math.abs(c.bounds.minX - candidate.bounds.minX);
          const dy = Math.abs(c.bounds.minY - candidate.bounds.minY);
          const dist = Math.sqrt(dx * dx + dy * dy);
          return dist < proximityThreshold;
        });
        if (!isNearby) continue;
      }

      generateCombinations([...currentSubset, candidate], requiredTypesRemaining.slice(1));
    }
  }

  vlog(`  🔍 Starting combination search...`);
  generateCombinations([], requiredTypes);
  vlog(`  📊 Tested ${combinationsTested} combinations, found ${matches.length} matches`);

  return matches;
}
