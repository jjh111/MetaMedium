// MetaMedium Day 6 - Suggestion Panel
// Display recognition results

import { useState } from 'react';
import { useStore } from '../store/useStore';

export function SuggestionPanel() {
  const { suggestions, acceptSuggestion, showSaveDialog, selectedStrokeIndex, library, saveToLibrary } = useStore();
  const [fuzzyQuery, setFuzzyQuery] = useState('');

  // Fuzzy match scoring
  const fuzzyMatchScore = (query: string, target: string): number => {
    query = query.toLowerCase();
    target = target.toLowerCase();
    if (target === query) return 100;
    if (target.startsWith(query)) return 80;
    if (target.includes(query)) return 60;

    let queryIndex = 0;
    for (let i = 0; i < target.length && queryIndex < query.length; i++) {
      if (target[i] === query[queryIndex]) queryIndex++;
    }
    if (queryIndex === query.length) return 40;
    return 0;
  };

  // Handle fuzzy match filtering
  const fuzzyMatches = fuzzyQuery.trim()
    ? Object.entries(library)
        .map(([key, item]) => ({
          type: key,
          label: item.label,
          score: fuzzyMatchScore(fuzzyQuery, item.label),
          confidence: fuzzyMatchScore(fuzzyQuery, item.label) / 100,
        }))
        .filter((m) => m.score > 0)
        .sort((a, b) => b.score - a.score)
    : [];

  const handleFuzzyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && selectedStrokeIndex !== null) {
      if (fuzzyMatches.length > 0) {
        // Accept first match
        acceptSuggestion({ type: fuzzyMatches[0].type, label: fuzzyMatches[0].label, score: fuzzyMatches[0].score, confidence: fuzzyMatches[0].score / 100 });
        setFuzzyQuery('');
      } else if (fuzzyQuery.trim()) {
        // Save with fuzzy query as name
        const name = fuzzyQuery.trim();
        const key = name.toLowerCase().replace(/\s+/g, '-');
        saveToLibrary(name, key);
        setFuzzyQuery('');
      }
    } else if (e.key === 'Escape') {
      setFuzzyQuery('');
    }
  };

  const displaySuggestions = fuzzyQuery.trim() ? fuzzyMatches : suggestions;

  if (suggestions.length === 0 && !fuzzyQuery.trim()) {
    return (
      <div className="suggestion-panel">
        <h3>Suggestions</h3>
        <div className="suggestion-empty">
          Waiting for stroke...
        </div>
        <div className="fuzzy-match-container">
          <label htmlFor="fuzzyMatchInput">Force match:</label>
          <input
            type="text"
            id="fuzzyMatchInput"
            placeholder="Type shape name..."
            value={fuzzyQuery}
            onChange={(e) => setFuzzyQuery(e.target.value)}
            onKeyDown={handleFuzzyKeyDown}
            disabled={selectedStrokeIndex === null}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="suggestion-panel">
      <h3>Suggestions</h3>
      <div className="suggestion-status">
        Found {displaySuggestions.length} match{displaySuggestions.length > 1 || displaySuggestions.length === 0 ? 'es' : ''}
      </div>

      <div className="fuzzy-match-container">
        <label htmlFor="fuzzyMatchInput">Force match:</label>
        <input
          type="text"
          id="fuzzyMatchInput"
          placeholder="Type shape name..."
          value={fuzzyQuery}
          onChange={(e) => setFuzzyQuery(e.target.value)}
          onKeyDown={handleFuzzyKeyDown}
          disabled={selectedStrokeIndex === null}
        />
      </div>

      <div className="suggestion-list">
        {displaySuggestions.map((suggestion, idx) => {
          const score = suggestion.score || Math.round((suggestion.confidence || 0) * 100);

          let confidenceClass = 'low';
          if (score >= 60) confidenceClass = 'high';
          else if (score >= 30) confidenceClass = 'medium';

          const compositionBadge = (suggestion as any).isComposition
            ? ` (${ (suggestion as any).componentCount} strokes)`
            : '';

          return (
            <button
              key={idx}
              className="suggestion-button"
              onClick={() => {
                acceptSuggestion(suggestion);
                setFuzzyQuery('');
              }}
            >
              <span className="suggestion-label">
                {suggestion.label}
                {compositionBadge && (
                  <span className="composition-badge">{compositionBadge}</span>
                )}
              </span>
              <span className={`suggestion-confidence ${confidenceClass}`}>
                {score}/100
              </span>
            </button>
          );
        })}

        <button
          className="something-else-button"
          onClick={() => {
            if (fuzzyQuery.trim()) {
              // Save with fuzzy query as name
              const name = fuzzyQuery.trim();
              const key = name.toLowerCase().replace(/\s+/g, '-');
              saveToLibrary(name, key);
              setFuzzyQuery('');
            } else {
              showSaveDialog('single');
            }
          }}
          disabled={selectedStrokeIndex === null}
        >
          {fuzzyQuery.trim() ? `Save as "${fuzzyQuery}"` : 'Something else'}
        </button>
      </div>
    </div>
  );
}
