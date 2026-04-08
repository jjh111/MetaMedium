// Lens Switcher HUD — floating picker for per-node lens override
// Triggered by right-click or L key on selected node
// DOM overlay (not canvas-drawn) for simplicity and accessibility

import { allMatches } from '../core/lens-registry';
import { getNode, updateNode } from '../core/graph';
import { getTheme } from '../canvas/renderer';

let hudEl: HTMLElement | null = null;

export function showLensHud(nodeId: string, screenX: number, screenY: number) {
  closeLensHud();

  const node = getNode(nodeId);
  if (!node) return;

  const matches = allMatches(node.dataType, node.data);
  const isDark = getTheme();

  hudEl = document.createElement('div');
  hudEl.className = 'lens-hud';
  hudEl.style.cssText = `
    position: fixed;
    left: ${screenX}px;
    top: ${screenY}px;
    background: ${isDark ? '#051018' : '#f0ece4'};
    border: 1px solid ${isDark ? 'rgba(77,201,246,0.25)' : 'rgba(42,74,90,0.25)'};
    border-radius: 6px;
    padding: 8px;
    z-index: 200;
    min-width: 200px;
    box-shadow: 0 8px 32px ${isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.15)'};
    font: 400 11px "JetBrains Mono", monospace;
  `;

  // Header
  const header = document.createElement('div');
  header.textContent = 'Choose Lens';
  header.style.cssText = `
    color: ${isDark ? 'rgba(77,201,246,0.5)' : 'rgba(42,107,138,0.6)'};
    margin-bottom: 6px;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  `;
  hudEl.appendChild(header);

  // Current lens — what's active (by MoE or override)
  const activeLensId = node.lens; // undefined = MoE decides

  for (const { lens, score } of matches) {
    const isActive = lens.id === activeLensId;
    const isMoeWinner = !activeLensId && matches[0]?.lens.id === lens.id;
    const highlighted = isActive || isMoeWinner;

    const row = document.createElement('div');
    row.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 8px;
      border-radius: 3px;
      cursor: pointer;
      color: ${highlighted
        ? (isDark ? '#7dd8f7' : '#2a6b8a')
        : (isDark ? '#8cb8cc' : '#4a6a7a')};
      background: ${highlighted
        ? (isDark ? 'rgba(77,201,246,0.1)' : 'rgba(42,107,138,0.08)')
        : 'transparent'};
      transition: background 0.1s;
    `;

    // Lens name
    const nameSpan = document.createElement('span');
    nameSpan.style.flex = '1';
    nameSpan.textContent = lens.name;
    if (isMoeWinner && !isActive) {
      nameSpan.textContent += ' ★';  // MoE winner indicator
    }
    if (isActive) {
      nameSpan.textContent += ' ●';  // explicit override indicator
    }

    // Confidence %
    const pctSpan = document.createElement('span');
    pctSpan.style.cssText = `
      color: ${isDark ? 'rgba(77,201,246,0.4)' : 'rgba(42,107,138,0.5)'};
      font-size: 9px;
    `;
    pctSpan.textContent = `${Math.round(score * 100)}%`;

    // Mini bar
    const barOuter = document.createElement('div');
    barOuter.style.cssText = `
      width: 40px;
      height: 3px;
      background: ${isDark ? 'rgba(77,201,246,0.15)' : 'rgba(42,107,138,0.12)'};
      border-radius: 2px;
      overflow: hidden;
    `;
    const barInner = document.createElement('div');
    barInner.style.cssText = `
      width: ${Math.round(score * 100)}%;
      height: 100%;
      background: ${isDark ? '#7dd8f7' : '#2a6b8a'};
      border-radius: 2px;
    `;
    barOuter.appendChild(barInner);

    row.appendChild(nameSpan);
    row.appendChild(pctSpan);
    row.appendChild(barOuter);

    // Hover effects
    const defaultBg = highlighted
      ? (isDark ? 'rgba(77,201,246,0.1)' : 'rgba(42,107,138,0.08)')
      : 'transparent';
    row.addEventListener('mouseenter', () => {
      row.style.background = isDark ? 'rgba(77,201,246,0.15)' : 'rgba(42,107,138,0.12)';
    });
    row.addEventListener('mouseleave', () => {
      row.style.background = defaultBg;
    });

    // Click → set lens override
    row.addEventListener('click', (ev) => {
      ev.stopPropagation();
      updateNode(nodeId, { lens: lens.id });
      closeLensHud();
    });

    hudEl.appendChild(row);
  }

  // ── "Auto (MoE)" option to clear override ──
  const autoRow = document.createElement('div');
  const isAutoActive = !activeLensId;
  autoRow.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 8px;
    border-radius: 3px;
    cursor: pointer;
    color: ${isDark ? 'rgba(77,201,246,0.5)' : 'rgba(42,107,138,0.5)'};
    margin-top: 4px;
    border-top: 1px solid ${isDark ? 'rgba(77,201,246,0.08)' : 'rgba(42,74,90,0.08)'};
    padding-top: 8px;
    font-size: 10px;
  `;
  autoRow.textContent = isAutoActive ? '✓ Auto (MoE decides)' : '  Auto (MoE decides)';
  autoRow.addEventListener('mouseenter', () => {
    autoRow.style.background = isDark ? 'rgba(77,201,246,0.08)' : 'rgba(42,107,138,0.06)';
  });
  autoRow.addEventListener('mouseleave', () => {
    autoRow.style.background = 'transparent';
  });
  autoRow.addEventListener('click', (ev) => {
    ev.stopPropagation();
    updateNode(nodeId, { lens: undefined as unknown as string });
    closeLensHud();
  });
  hudEl.appendChild(autoRow);

  document.body.appendChild(hudEl);

  // ── Clamp to viewport ──
  requestAnimationFrame(() => {
    if (!hudEl) return;
    const rect = hudEl.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      hudEl.style.left = `${window.innerWidth - rect.width - 8}px`;
    }
    if (rect.bottom > window.innerHeight) {
      hudEl.style.top = `${window.innerHeight - rect.height - 8}px`;
    }
  });

  // ── Close on outside click or Escape ──
  setTimeout(() => {
    const closeOnClick = (ev: MouseEvent) => {
      if (hudEl && !hudEl.contains(ev.target as Node)) {
        closeLensHud();
      }
    };
    const closeOnEsc = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') closeLensHud();
    };

    window.addEventListener('click', closeOnClick);
    window.addEventListener('keydown', closeOnEsc);

    // Store cleanup refs
    if (hudEl) {
      (hudEl as any)._cleanup = () => {
        window.removeEventListener('click', closeOnClick);
        window.removeEventListener('keydown', closeOnEsc);
      };
    }
  }, 10);
}

export function closeLensHud() {
  if (hudEl) {
    if ((hudEl as any)._cleanup) (hudEl as any)._cleanup();
    hudEl.remove();
    hudEl = null;
  }
}
