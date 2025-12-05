// MetaMedium Day 6 - Canvas Controls
// Control buttons and stroke counters below the canvas

import { useStore } from '../store/useStore';
import { CanvasLooksLike } from './CanvasLooksLike';

export function CanvasControls() {
  const {
    strokes,
    context,
    clearCanvas,
    showSaveDialog,
    debugMode,
    verboseMode,
    setDebugMode,
    setVerboseMode,
  } = useStore();

  const acceptedCount = context.filter((c) => c && c !== '').length;

  return (
    <div className="canvas-controls">
      <button
        className="save-library-button"
        disabled={strokes.length === 0}
        onClick={() => showSaveDialog('compound')}
      >
        Save to Library
      </button>

      <button className="clear-button" onClick={clearCanvas}>
        Clear Canvas
      </button>

      <div className="stroke-count">
        Strokes: <span>{strokes.length}</span> | Accepted:{' '}
        <span>{acceptedCount}</span>
      </div>

      <label className="debug-toggle">
        <input
          type="checkbox"
          checked={debugMode}
          onChange={(e) => setDebugMode(e.target.checked)}
        />
        <span>Show debug indicators</span>
      </label>

      <label className="debug-toggle">
        <input
          type="checkbox"
          checked={verboseMode}
          onChange={(e) => setVerboseMode(e.target.checked)}
        />
        <span>Verbose console logging</span>
      </label>

      <CanvasLooksLike />
    </div>
  );
}
