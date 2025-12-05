// MetaMedium Day 6 - Canvas Looks Like Component
// Display composition matches for current canvas state

import { useStore } from '../store/useStore';

export function CanvasLooksLike() {
  const { compositionMatches } = useStore();

  // Show top 3 matches
  const topMatches = compositionMatches.slice(0, 3);

  if (topMatches.length === 0) {
    return (
      <div className="canvas-looks-like">
        <span className="looks-like-label">Canvas looks like:</span>
        <span className="looks-like-list empty">—</span>
      </div>
    );
  }

  return (
    <div className="canvas-looks-like">
      <span className="looks-like-label">Canvas looks like:</span>
      <span className="looks-like-list">
        {topMatches.map((match, idx) => {
          const confidencePercent = Math.round(match.confidence * 100);
          return (
            <span key={idx} className="match-item">
              {match.label}{' '}
              <span className="match-confidence">{confidencePercent}%</span>
            </span>
          );
        })}
      </span>
    </div>
  );
}
