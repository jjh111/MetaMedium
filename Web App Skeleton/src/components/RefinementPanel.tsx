// MetaMedium Day 6 - Refinement Panel
// Stroke refinement controls (smooth, simplify, normalize)

import { useStore } from '../store/useStore';

export function RefinementPanel() {
  const { refinement, setRefinement } = useStore();

  const handleToggle = () => {
    setRefinement({ enabled: !refinement.enabled });
  };

  const handleSmoothChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRefinement({ smooth: parseInt(e.target.value, 10) });
  };

  const handleSimplifyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRefinement({ simplify: parseInt(e.target.value, 10) });
  };

  const handleNormalizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRefinement({ normalize: e.target.checked });
  };

  return (
    <div className="refinement-panel">
      <button
        className={`refinement-toggle ${refinement.enabled ? 'active' : ''}`}
        onClick={handleToggle}
      >
        {refinement.enabled ? 'Refinement Enabled' : 'Enable Refinement'}
      </button>

      <div className={`refinement-controls ${!refinement.enabled ? 'disabled' : ''}`}>
        <div className="refinement-control">
          <label htmlFor="smoothSlider">
            Smooth
            <span className="value-display">{refinement.smooth}</span>
          </label>
          <input
            type="range"
            id="smoothSlider"
            min="0"
            max="10"
            value={refinement.smooth}
            step="1"
            onChange={handleSmoothChange}
            disabled={!refinement.enabled}
          />
        </div>

        <div className="refinement-control">
          <label htmlFor="simplifySlider">
            Simplify
            <span className="value-display">{refinement.simplify}</span>
          </label>
          <input
            type="range"
            id="simplifySlider"
            min="0"
            max="10"
            value={refinement.simplify}
            step="1"
            onChange={handleSimplifyChange}
            disabled={!refinement.enabled}
          />
        </div>

        <div className="refinement-control">
          <label htmlFor="normalizeToggle">
            Normalize
          </label>
          <input
            type="checkbox"
            id="normalizeToggle"
            checked={refinement.normalize}
            onChange={handleNormalizeChange}
            disabled={!refinement.enabled}
          />
        </div>
      </div>
    </div>
  );
}
