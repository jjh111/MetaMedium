// MetaMedium Day 6 - Main App Component
// Layout and keyboard shortcuts

import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { Canvas } from './components/Canvas';
import { CanvasControls } from './components/CanvasControls';
import { RefinementPanel } from './components/RefinementPanel';
import { SuggestionPanel } from './components/SuggestionPanel';
import { LibraryPanel } from './components/LibraryPanel';
import { installQueryAPI } from './api/semanticQuery';
import './App.css';

export function App() {
  const { undo, redo } = useStore();

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

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1>MetaMedium</h1>
            <p className="app-subtitle">Draw shapes and compositions</p>
          </div>
          <a
            href="https://johnhanacek.com"
            target="_blank"
            rel="noopener noreferrer"
            className="header-link"
          >
            JHDesign, LLC
          </a>
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
    </div>
  );
}

export default App;
