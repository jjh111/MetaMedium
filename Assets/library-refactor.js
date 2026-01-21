// REFACTORED LIBRARY RENDERING
// Clean, efficient, single-pass rendering with thumbnail caching

// Cache for generated thumbnails (avoids regenerating)
const thumbnailCache = new Map();

function generateThumbnail(item, size = 80) {
    // Check cache first
    const cacheKey = `${item.label}-${item.type}`;
    if (thumbnailCache.has(cacheKey)) {
        return thumbnailCache.get(cacheKey).cloneNode(true);
    }

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { alpha: true });

    // Light background
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, size, size);

    // Drawing config
    ctx.strokeStyle = '#7C3AED';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const center = size / 2;
    const radius = size * 0.28;

    // Draw built-in shapes
    if (item.type === 'builtin-primitive') {
        ctx.beginPath();
        switch (item.shapeType) {
            case 'circle':
                ctx.arc(center, center, radius, 0, Math.PI * 2);
                break;
            case 'triangle':
                ctx.moveTo(center, size * 0.25);
                ctx.lineTo(size * 0.25, size * 0.75);
                ctx.lineTo(size * 0.75, size * 0.75);
                ctx.closePath();
                break;
            case 'rectangle':
                ctx.rect(size * 0.25, size * 0.3, size * 0.5, size * 0.4);
                break;
        }
        ctx.stroke();
    } else if (item.type === 'builtin-composition' && item.label === 'Arrow') {
        // Line
        ctx.beginPath();
        ctx.moveTo(size * 0.2, center);
        ctx.lineTo(size * 0.65, center);
        ctx.stroke();
        // Triangle
        ctx.beginPath();
        ctx.moveTo(size * 0.8, center);
        ctx.lineTo(size * 0.65, center - radius * 0.5);
        ctx.lineTo(size * 0.65, center + radius * 0.5);
        ctx.closePath();
        ctx.stroke();
    }
    // TODO: Handle user-drawn shapes with actual stroke data

    // Cache it
    thumbnailCache.set(cacheKey, canvas);
    return canvas.cloneNode(true);
}

function renderLibrary() {
    const { library } = state;

    // Categorize items
    const builtins = Object.entries(library).filter(([_, item]) =>
        item.type === 'builtin-primitive' || item.type === 'builtin-composition'
    );
    const userShapes = Object.entries(library).filter(([_, item]) =>
        item.type === 'user-primitive' && !item.components
    );
    const compositions = Object.entries(library).filter(([_, item]) =>
        item.type === 'composition' || (item.components?.length > 1)
    );

    // Update count
    const total = builtins.length + userShapes.length + compositions.length;
    document.getElementById('libraryCount').textContent =
        `${total} shape${total !== 1 ? 's' : ''}`;

    // Render sections
    renderSection('builtinGrid', 'builtinSection', builtins, true);
    renderSection('userGrid', 'userSection', userShapes, false);
    renderSection('compositionsGrid', 'compositionsSection', compositions, false);
}

function renderSection(gridId, sectionId, items, show = true) {
    const grid = document.getElementById(gridId);
    const section = document.getElementById(sectionId);

    if (!grid || !section) return;

    if (items.length === 0 && !show) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    // Clear and rebuild (single pass)
    grid.innerHTML = '';

    items.forEach(([key, item]) => {
        // Create item container
        const itemDiv = document.createElement('div');
        itemDiv.className = `library-item${show ? ' builtin' : ''}`;
        itemDiv.dataset.key = key;

        // Badge for multi-component items
        const componentCount = item.components?.length || item.componentCount || 1;
        if (componentCount > 1) {
            const badge = document.createElement('span');
            badge.className = 'library-item-badge';
            badge.textContent = componentCount;
            itemDiv.appendChild(badge);
        }

        // Thumbnail container
        const thumbDiv = document.createElement('div');
        thumbDiv.className = 'library-thumbnail';
        thumbDiv.appendChild(generateThumbnail(item));
        itemDiv.appendChild(thumbDiv);

        // Info
        const infoDiv = document.createElement('div');
        infoDiv.className = 'library-item-info';
        infoDiv.innerHTML = `
            <div class="library-item-label">${item.label}</div>
            <div class="library-item-meta">${item.usageCount || 0}×</div>
        `;
        itemDiv.appendChild(infoDiv);

        // Append to grid
        grid.appendChild(itemDiv);
    });
}

// Call renderLibrary() when needed, not on every frame!
