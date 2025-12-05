// MetaMedium Day 6 - Inline Save UI
// Appears in library panel when saving primitives or compositions

import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';

interface InlineSaveUIProps {
  isVisible: boolean;
  saveMode: 'single' | 'compound';
  onCancel: () => void;
}

export function InlineSaveUI({ isVisible, saveMode, onCancel }: InlineSaveUIProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { saveToLibrary, library } = useStore();

  useEffect(() => {
    if (isVisible) {
      setName('');
      setError('');
      inputRef.current?.focus();
    }
  }, [isVisible]);

  const handleConfirm = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      inputRef.current?.focus();
      return;
    }

    const key = trimmedName.toLowerCase().replace(/\s+/g, '-');

    // Check if name already exists
    if (library[key]) {
      setError('Name already exists! Try another...');
      setName('');
      inputRef.current?.focus();
      return;
    }

    saveToLibrary(trimmedName, key);
    onCancel(); // Close UI after successful save
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setError(''); // Clear error on typing
  };

  if (!isVisible) return null;

  return (
    <div className="save-primitive-container active">
      <label>Save {saveMode === 'compound' ? 'composition' : 'current stroke'} as:</label>
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={error || 'Enter shape name...'}
        style={error ? { borderColor: '#ff5252' } : {}}
      />
      <button className="confirm-save" onClick={handleConfirm}>
        Save
      </button>
      <button className="cancel-save" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
