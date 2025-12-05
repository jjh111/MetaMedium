// MetaMedium Day 6 - Library Item Component
// Individual library item with thumbnail

import { useRef, useEffect } from 'react';
import { generateThumbnail } from '../utils/thumbnail';

interface LibraryItemProps {
  itemKey: string;
  item: any;
  canDelete: boolean;
  onDelete: (key: string) => void;
}

export function LibraryItem({ itemKey, item, canDelete, onDelete }: LibraryItemProps) {
  const isComposition = item.fingerprint?.componentCount > 1;
  const componentBadge = isComposition
    ? ` (${item.fingerprint.componentCount} parts)`
    : '';
  const isBuiltin = item.type === 'builtin-primitive' || item.type === 'builtin-composition';

  const thumbnailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (thumbnailRef.current) {
      // Clear existing content
      thumbnailRef.current.innerHTML = '';

      // Generate and append thumbnail
      const thumbnail = generateThumbnail(item);
      thumbnailRef.current.appendChild(thumbnail);
    }
  }, [item, itemKey]);

  return (
    <div className={`library-item ${isBuiltin ? 'builtin' : ''}`}>
      <div className="library-item-thumbnail" ref={thumbnailRef}></div>
      <div className="library-item-content">
        <div className="library-item-header">
          <span className="library-item-label">
            {item.label}
            {componentBadge && (
              <span className="component-badge">{componentBadge}</span>
            )}
          </span>
          {canDelete && (
            <button
              className="library-delete-button"
              onClick={() => onDelete(itemKey)}
              title="Delete from library"
            >
              ×
            </button>
          )}
        </div>
        <div className="library-item-meta">
          <span className="library-item-type">{item.shapeType || item.type}</span>
          <span className="library-item-usage">
            Used {item.usageCount} time{item.usageCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
