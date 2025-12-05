// MetaMedium Day 6 - Library Panel
// Display saved shapes and compositions

import { useStore } from '../store/useStore';
import { InlineSaveUI } from './InlineSaveUI';
import { LibraryItem } from './LibraryItem';

export function LibraryPanel() {
  const { library, deleteFromLibrary, showSaveUI, saveMode, hideSaveDialog } = useStore();

  const libraryEntries = Object.entries(library);

  if (libraryEntries.length === 0) {
    return (
      <div className="library-panel">
        <h3>Library</h3>
        <div className="library-empty">
          No shapes saved yet
        </div>
      </div>
    );
  }

  // Separate built-ins from user shapes
  const builtIns = libraryEntries.filter(([_, item]) =>
    item.type === 'builtin-primitive' || item.type === 'builtin-composition'
  );
  const userShapes = libraryEntries.filter(([_, item]) =>
    item.type !== 'builtin-primitive' && item.type !== 'builtin-composition'
  );

  // Sort by usage count (most used first)
  const sortByUsage = (entries: typeof libraryEntries) => {
    return [...entries].sort((a, b) => b[1].usageCount - a[1].usageCount);
  };

  return (
    <div className="library-panel">
      <div className="library-header">
        <h3>Library</h3>
        <button className="export-button" onClick={() => {
          const dataStr = JSON.stringify(library, null, 2);
          const dataBlob = new Blob([dataStr], { type: 'application/json' });
          const url = URL.createObjectURL(dataBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `metamedium-library-${Date.now()}.json`;
          link.click();
          URL.revokeObjectURL(url);
        }}>
          Export
        </button>
      </div>

      <InlineSaveUI
        isVisible={showSaveUI}
        saveMode={saveMode}
        onCancel={hideSaveDialog}
      />

      {builtIns.length > 0 && (
        <div className="library-section">
          <h4>Built-in Shapes</h4>
          <div className="library-list">
            {sortByUsage(builtIns).map(([key, item]) => (
              <LibraryItem
                key={key}
                itemKey={key}
                item={item}
                canDelete={false}
                onDelete={deleteFromLibrary}
              />
            ))}
          </div>
        </div>
      )}

      {userShapes.length > 0 && (
        <div className="library-section">
          <h4>Your Shapes</h4>
          <div className="library-list">
            {sortByUsage(userShapes).map(([key, item]) => (
              <LibraryItem
                key={key}
                itemKey={key}
                item={item}
                canDelete={true}
                onDelete={deleteFromLibrary}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
