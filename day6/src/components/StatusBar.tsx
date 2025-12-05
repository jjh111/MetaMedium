// MetaMedium Day 6 - Status Bar
// Canvas controls and debug options

import { useStore } from '../store/useStore';

export function StatusBar() {
  const {
    strokes,
    debugMode,
    verboseMode,
    clearCanvas,
    undo,
    redo,
    setDebugMode,
    setVerboseMode,
    history,
  } = useStore();

  const canUndo = history.currentIndex >= 0;
  const canRedo = history.currentIndex < history.actions.length - 1;

  return (
    <div className="status-bar">
      <div className="status-section">
        <span className="status-label">Strokes:</span>
        <span className="status-value">{strokes.length}</span>
      </div>

      <div className="status-section">
        <button
          className="status-button"
          onClick={clearCanvas}
          disabled={strokes.length === 0}
        >
          Clear Canvas
        </button>
      </div>

      <div className="status-section">
        <button
          className="status-button"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Cmd+Z)"
        >
          ↶ Undo
        </button>
        <button
          className="status-button"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Cmd+Shift+Z)"
        >
          ↷ Redo
        </button>
      </div>

      <div className="status-section">
        <label className="status-checkbox">
          <input
            type="checkbox"
            checked={debugMode}
            onChange={(e) => setDebugMode(e.target.checked)}
          />
          <span>Debug Mode</span>
        </label>
      </div>

      <div className="status-section">
        <label className="status-checkbox">
          <input
            type="checkbox"
            checked={verboseMode}
            onChange={(e) => setVerboseMode(e.target.checked)}
          />
          <span>Verbose Logs</span>
        </label>
      </div>
    </div>
  );
}
