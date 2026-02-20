// MetaMedium v4 - Main App Component
// Layout and keyboard shortcuts with LLM integration

import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { Canvas } from './components/Canvas';
import { CanvasControls } from './components/CanvasControls';
import { RefinementPanel } from './components/RefinementPanel';
import { SuggestionPanel } from './components/SuggestionPanel';
import { LibraryPanel } from './components/LibraryPanel';
import { ApiSettings } from './components/ApiSettings';
import { installQueryAPI } from './api/semanticQuery';
import { getInterpreterStatus, hasApiKey } from './llm';
import './App.css';

export function App() {
  const { undo, redo, showApiSettings, showApiSettingsDialog, hideApiSettingsDialog } = useStore();

  // Install Semantic Query API on mount
  useEffect(() => {
    installQueryAPI(useStore.getState);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Z (Mac) or Ctrl+Z (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const status = getInterpreterStatus();
  const hasKey = hasApiKey();

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1>MetaMedium</h1>
            <p className="app-subtitle">LLM-Grounded Drawing System</p>
          </div>
          <div className="header-right">
            <button
              className={`llm-status-btn ${hasKey ? 'has-key' : ''}`}
              onClick={showApiSettingsDialog}
              title="LLM Settings"
            >
              <span className="status-indicator">
                {status.tier2 ? '●●●' : status.tier1 ? '●●○' : '●○○'}
              </span>
              <span className="status-label">
                {status.tier2 ? 'Tier 2' : status.tier1 ? 'Tier 1' : 'Tier 0'}
              </span>
            </button>
            <a
              href="https://johnhanacek.com"
              target="_blank"
              rel="noopener noreferrer"
              className="header-link"
            >
              JHDesign, LLC
            </a>
          </div>
        </div>
      </header>

      <div className="app-content">
        <div className="app-main">
          <Canvas />
        </div>

        <div className="app-sidebar">
          <SuggestionPanel />
          <LibraryPanel />
        </div>
      </div>

      <div className="app-footer">
        <CanvasControls />
        <RefinementPanel />
      </div>

      <ApiSettings isOpen={showApiSettings} onClose={hideApiSettingsDialog} />
    </div>
  );
}

export default App;
