// API Settings Component
// Allows users to configure API keys and LLM preferences

import { useState, useEffect } from 'react';
import {
  getSettings,
  updateSettings,
  getInterpreterStatus,
  type LLMSettings,
} from '../llm';

interface ApiSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApiSettings({ isOpen, onClose }: ApiSettingsProps) {
  const [settings, setSettings] = useState<LLMSettings>(getSettings());
  const [status, setStatus] = useState(getInterpreterStatus());
  const [tier1Key, setTier1Key] = useState(settings.tier1ApiKey || '');
  const [tier2Key, setTier2Key] = useState(settings.tier2ApiKey || '');
  const [showKeys, setShowKeys] = useState(false);

  useEffect(() => {
    setSettings(getSettings());
    setStatus(getInterpreterStatus());
  }, [isOpen]);

  const handleSave = () => {
    updateSettings({
      tier1ApiKey: tier1Key || null,
      tier2ApiKey: tier2Key || null,
      preferredTier: settings.preferredTier,
      autoEscalate: settings.autoEscalate,
      autoEscalateThreshold: settings.autoEscalateThreshold,
    });
    setStatus(getInterpreterStatus());
    onClose();
  };

  const handleClear = (tier: 1 | 2) => {
    if (tier === 1) {
      setTier1Key('');
    } else {
      setTier2Key('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="api-settings-overlay" onClick={onClose}>
      <div className="api-settings-modal" onClick={e => e.stopPropagation()}>
        <div className="api-settings-header">
          <h2>LLM Settings</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="api-settings-content">
          {/* Status indicator */}
          <div className="status-section">
            <h3>Interpreter Status</h3>
            <div className="status-grid">
              <div className={`status-item ${status.tier0 ? 'active' : ''}`}>
                <span className="status-dot" />
                <span>Tier 0 (Heuristics)</span>
                <span className="status-label">Always available</span>
              </div>
              <div className={`status-item ${status.tier1 ? 'active' : ''}`}>
                <span className="status-dot" />
                <span>Tier 1 (Haiku)</span>
                <span className="status-label">{status.tier1 ? 'Ready' : 'No API key'}</span>
              </div>
              <div className={`status-item ${status.tier2 ? 'active' : ''}`}>
                <span className="status-dot" />
                <span>Tier 2 (Sonnet)</span>
                <span className="status-label">{status.tier2 ? 'Ready' : 'No API key'}</span>
              </div>
            </div>
          </div>

          {/* API Keys */}
          <div className="keys-section">
            <div className="section-header">
              <h3>API Keys</h3>
              <button
                className="toggle-visibility"
                onClick={() => setShowKeys(!showKeys)}
              >
                {showKeys ? 'Hide' : 'Show'}
              </button>
            </div>

            <div className="key-input-group">
              <label>Tier 1 (Claude Haiku) - Fast & Cheap</label>
              <div className="key-input-row">
                <input
                  type={showKeys ? 'text' : 'password'}
                  value={tier1Key}
                  onChange={e => setTier1Key(e.target.value)}
                  placeholder="sk-ant-api03-..."
                />
                <button className="clear-btn" onClick={() => handleClear(1)}>Clear</button>
              </div>
            </div>

            <div className="key-input-group">
              <label>Tier 2 (Claude Sonnet) - Full Reasoning</label>
              <div className="key-input-row">
                <input
                  type={showKeys ? 'text' : 'password'}
                  value={tier2Key}
                  onChange={e => setTier2Key(e.target.value)}
                  placeholder="sk-ant-api03-..."
                />
                <button className="clear-btn" onClick={() => handleClear(2)}>Clear</button>
              </div>
              <p className="key-hint">
                Same key works for both tiers. Get yours at{' '}
                <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer">
                  console.anthropic.com
                </a>
              </p>
            </div>
          </div>

          {/* Preferences */}
          <div className="prefs-section">
            <h3>Preferences</h3>

            <div className="pref-row">
              <label>Preferred Tier</label>
              <select
                value={settings.preferredTier}
                onChange={e => setSettings({
                  ...settings,
                  preferredTier: parseInt(e.target.value) as 0 | 1 | 2
                })}
              >
                <option value={0}>Tier 0 - Heuristics (Offline)</option>
                <option value={1}>Tier 1 - Haiku (Fast API)</option>
                <option value={2}>Tier 2 - Sonnet (Full API)</option>
              </select>
            </div>

            <div className="pref-row checkbox-row">
              <label>
                <input
                  type="checkbox"
                  checked={settings.autoEscalate}
                  onChange={e => setSettings({
                    ...settings,
                    autoEscalate: e.target.checked
                  })}
                />
                Auto-escalate when confidence is low
              </label>
            </div>

            {settings.autoEscalate && (
              <div className="pref-row">
                <label>Escalate below confidence</label>
                <input
                  type="range"
                  min={0.3}
                  max={0.9}
                  step={0.1}
                  value={settings.autoEscalateThreshold}
                  onChange={e => setSettings({
                    ...settings,
                    autoEscalateThreshold: parseFloat(e.target.value)
                  })}
                />
                <span>{(settings.autoEscalateThreshold * 100).toFixed(0)}%</span>
              </div>
            )}
          </div>
        </div>

        <div className="api-settings-footer">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button className="save-btn" onClick={handleSave}>Save Settings</button>
        </div>
      </div>

      <style>{`
        .api-settings-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .api-settings-modal {
          background: white;
          border-radius: 12px;
          width: 480px;
          max-width: 90vw;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .api-settings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #e5e5e5;
        }

        .api-settings-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
          padding: 0;
          line-height: 1;
        }

        .api-settings-content {
          padding: 20px;
        }

        .api-settings-content h3 {
          font-size: 14px;
          font-weight: 600;
          color: #333;
          margin: 0 0 12px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-section, .keys-section, .prefs-section {
          margin-bottom: 24px;
        }

        .status-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #f5f5f5;
          border-radius: 6px;
          font-size: 14px;
        }

        .status-item.active {
          background: #e8f5e9;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ccc;
        }

        .status-item.active .status-dot {
          background: #4caf50;
        }

        .status-label {
          margin-left: auto;
          color: #888;
          font-size: 12px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .section-header h3 {
          margin: 0;
        }

        .toggle-visibility {
          background: none;
          border: 1px solid #ddd;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
        }

        .key-input-group {
          margin-bottom: 16px;
        }

        .key-input-group label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 6px;
          color: #555;
        }

        .key-input-row {
          display: flex;
          gap: 8px;
        }

        .key-input-row input {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          font-family: monospace;
        }

        .key-input-row input:focus {
          outline: none;
          border-color: #0066ff;
          box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.1);
        }

        .clear-btn {
          padding: 10px 16px;
          background: #f5f5f5;
          border: 1px solid #ddd;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }

        .clear-btn:hover {
          background: #eee;
        }

        .key-hint {
          margin-top: 8px;
          font-size: 12px;
          color: #888;
        }

        .key-hint a {
          color: #0066ff;
        }

        .pref-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .pref-row label {
          font-size: 14px;
          color: #333;
        }

        .pref-row select {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
        }

        .checkbox-row label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .pref-row input[type="range"] {
          flex: 1;
        }

        .api-settings-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 20px;
          border-top: 1px solid #e5e5e5;
        }

        .cancel-btn, .save-btn {
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }

        .cancel-btn {
          background: white;
          border: 1px solid #ddd;
        }

        .cancel-btn:hover {
          background: #f5f5f5;
        }

        .save-btn {
          background: #0066ff;
          color: white;
          border: none;
        }

        .save-btn:hover {
          background: #0052cc;
        }
      `}</style>
    </div>
  );
}
