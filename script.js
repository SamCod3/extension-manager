document.addEventListener('DOMContentLoaded', () => {
    const listContainer = document.getElementById('extension-list');
    const selectAllBtn = document.getElementById('selectAll');
    const deselectAllBtn = document.getElementById('deselectAll');
    const exportBtn = document.getElementById('exportBtn');

    let extensions = [];
    let selectedIds = new Set();

    // Fetch extensions
    if (!chrome.management) {
        listContainer.innerHTML = '<div class="error">Error: chrome.management API is not available. Ensure the extension has "management" permission.</div>';
        return;
    }

    try {
        chrome.management.getAll((result) => {
            if (chrome.runtime.lastError) {
                listContainer.innerHTML = `<div class="error">Error fetching extensions: ${chrome.runtime.lastError.message}</div>`;
                console.error(chrome.runtime.lastError);
                return;
            }

            if (!result || result.length === 0) {
                listContainer.innerHTML = '<div class="info-message">No extensions found.</div>';
                return;
            }

            console.log('All fetched items:', result);

            // Filter out this extension and apps, keep only normal extensions
            extensions = result.filter(ext => ext.type === 'extension' && ext.id !== chrome.runtime.id);

            console.log('Filtered extensions:', extensions);

            if (extensions.length === 0) {
                listContainer.innerHTML = '<div class="info-message">No other extensions installed (or all filtered out).</div>';
                return;
            }

            // Sort: Enabled first, then alphabetical
            extensions.sort((a, b) => {
                if (a.enabled === b.enabled) {
                    return a.name.localeCompare(b.name);
                }
                return a.enabled ? -1 : 1;
            });

            renderExtensions();
        });
    } catch (e) {
        listContainer.innerHTML = `<div class="error">Unexpected error: ${e.message}</div>`;
        console.error(e);
    }

    const modal = document.getElementById('permissionsModal');
    const modalContent = document.getElementById('modalContent');
    const modalClose = document.querySelector('.modal-close');

    modalClose.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    function showPermissions(ext) {
        modalContent.innerHTML = '';
        const perms = [...(ext.permissions || []), ...(ext.hostPermissions || [])];

        if (perms.length === 0) {
            modalContent.innerHTML = '<span class="info-message" style="padding:0; text-align:left;">No special permissions required.</span>';
        } else {
            perms.forEach(p => {
                const tag = document.createElement('span');
                tag.className = 'permission-tag';
                tag.textContent = p;
                modalContent.appendChild(tag);
            });
        }

        document.querySelector('.modal-title').textContent = `${ext.name} - Permissions`;
        modal.classList.add('active');
    }

    function renderExtensions() {
        listContainer.innerHTML = '';

        // Groups
        const localExts = extensions.filter(e => e.installType === 'development');
        // Filter out local ones from enabled/disabled to avoid duplicates if they overlap (though installType is mutually exclusive with 'normal' usually, 'enabled' checks state)
        // Actually, local extensions can be enabled or disabled too.
        // User wants "Group UI by Local / Enabled / Disabled". 
        // Logic: If Local -> go to Local group (regardless of enabled state, or maybe show state inside).
        // If Not Local AND Enabled -> Enabled group.
        // If Not Local AND Disabled -> Disabled group.

        const normalExts = extensions.filter(e => e.installType !== 'development');
        const enabledExts = normalExts.filter(e => e.enabled);
        const disabledExts = normalExts.filter(e => !e.enabled);

        if (localExts.length > 0) {
            const h2 = document.createElement('h2');
            h2.textContent = `🛠️ Development / Local (${localExts.length})`;
            h2.style.color = '#fbbf24'; // Warning color
            h2.style.borderColor = 'rgba(251, 191, 36, 0.3)';
            listContainer.appendChild(h2);
            localExts.forEach(ext => listContainer.appendChild(createCard(ext)));
        }

        if (enabledExts.length > 0) {
            const h2 = document.createElement('h2');
            h2.textContent = `✅ Enabled (${enabledExts.length})`;
            listContainer.appendChild(h2);
            enabledExts.forEach(ext => listContainer.appendChild(createCard(ext)));
        }

        if (disabledExts.length > 0) {
            const h2 = document.createElement('h2');
            h2.textContent = `❌ Disabled (${disabledExts.length})`;
            listContainer.appendChild(h2);
            disabledExts.forEach(ext => listContainer.appendChild(createCard(ext)));
        }
    }

    function createCard(ext) {
        const card = document.createElement('div');
        // If local and disabled, maybe dim it? Let's add 'disabled' class if not enabled, triggers opacity
        card.className = `extension-card ${!ext.enabled ? 'disabled' : ''} ${selectedIds.has(ext.id) ? 'selected' : ''}`;
        card.dataset.id = ext.id;

        const iconUrl = ext.icons ? ext.icons[ext.icons.length - 1].url : 'icon.png';
        const isLocal = ext.installType === 'development';

        card.innerHTML = `
            <div class="icon-container">
                <div class="icon-wrapper">
                    <img src="${iconUrl}" alt="${ext.name}">
                </div>
                ${isLocal ? '<span class="badge local">LOCAL</span>' : ''}
            </div>
            
            <div class="header-group">
                <div class="name" title="${ext.name}">${ext.name}</div>
            </div>

            <div class="description" title="${ext.description}">${ext.description || 'No description provided'}</div>

            <div class="meta-row">
                <span class="version" title="Version">v${ext.version || '0.0'}</span>
            </div>

            <div class="card-actions">
                <button class="btn-icon info-btn" title="View Permissions">ℹ️</button>
            </div>
        `;

        // Card click for selection (avoid triggering when clicking specific buttons)
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.card-actions')) {
                toggleSelection(ext.id);
            }
        });

        // Info button click
        const infoBtn = card.querySelector('.info-btn');
        infoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showPermissions(ext);
        });

        return card;
    }

    function toggleSelection(id) {
        if (selectedIds.has(id)) {
            selectedIds.delete(id);
        } else {
            selectedIds.add(id);
        }

        // Update UI efficiently
        const card = document.querySelector(`.extension-card[data-id="${id}"]`);
        if (card) {
            if (selectedIds.has(id)) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        }
    }

    selectAllBtn.addEventListener('click', () => {
        extensions.forEach(ext => selectedIds.add(ext.id));
        renderExtensions();
    });

    deselectAllBtn.addEventListener('click', () => {
        selectedIds.clear();
        renderExtensions();
    });

    exportBtn.addEventListener('click', async () => {
        if (selectedIds.size === 0) {
            alert('Please select at least one extension to export.');
            return;
        }

        const selectedExtensions = extensions.filter(ext => selectedIds.has(ext.id));

        // Change button state
        const originalText = exportBtn.innerHTML;
        exportBtn.innerHTML = 'Processing...';
        exportBtn.disabled = true;

        try {
            await generateAndDownloadHtml(selectedExtensions);
        } catch (err) {
            console.error(err);
            alert('Error exporting: ' + err.message);
        } finally {
            exportBtn.innerHTML = originalText;
            exportBtn.disabled = false;
        }
    });

    // Helper to convert image URL to Base64
    function getBase64Image(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.src = url;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                try {
                    const dataURL = canvas.toDataURL('image/png');
                    resolve(dataURL);
                } catch (e) {
                    // Fallback for tainted canvas or other issues
                    console.warn('Could not convert image to base64', url, e);
                    resolve(null);
                }
            };
            img.onerror = () => {
                console.warn('Could not load image for base64', url);
                resolve(null);
            };
        });
    }

    async function generateAndDownloadHtml(items) {
        // Pre-process items to get base64 icons
        const processedItems = await Promise.all(items.map(async (ext) => {
            let iconUrl = ext.icons ? ext.icons[ext.icons.length - 1].url : '';
            let base64Icon = null;
            if (iconUrl) {
                base64Icon = await getBase64Image(iconUrl);
            }
            return { ...ext, base64Icon };
        }));

        const enabledItems = processedItems.filter(i => i.enabled);
        const disabledItems = processedItems.filter(i => !i.enabled);

        const timestamp = new Date().toISOString().split('T')[0];

        const renderList = (list, title) => {
            if (list.length === 0) return '';
            return `
                <h2 class="section-title">${title} (${list.length})</h2>
                <div class="list">
                    ${list.map(ext => {
                const isLocal = ext.installType === 'development';
                const storeUrl = isLocal ? '#' : `https://chrome.google.com/webstore/detail/${ext.id}`;
                const targetAttr = isLocal ? '' : 'target="_blank"';
                const linkClass = isLocal ? 'item local' : 'item';
                const imgSrc = ext.base64Icon || 'https://www.google.com/s2/favicons?domain=chrome.google.com';

                return `
                        <a href="${storeUrl}" ${targetAttr} class="${linkClass}">
                            <img src="${imgSrc}" class="icon" alt="Icon">
                            <div class="details">
                                <span class="name">
                                    ${ext.name}
                                    ${isLocal ? '<span class="badge" style="background:#fbbf24;color:#92400e;font-size:0.7em;padding:2px 6px;border-radius:4px;margin-left:8px;">LOCAL</span>' : ''}
                                </span>
                                <span class="desc">${ext.description || ''}</span>
                                <div class="meta">
                                    <span style="background:#eee;padding:2px 4px;border-radius:3px;">v${ext.version}</span>
                                    ID: ${ext.id}
                                    ${isLocal ? '<br><small style="color:#d97706">⚠️ Manual installation required</small>' : ''}
                                </div>
                            </div>
                        </a>
                        `;
            }).join('')}
                </div>
            `;
        };

        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exported Extensions - ${timestamp}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; background: #f0f2f5; color: #333; }
        h1 { text-align: center; color: #1a1a1a; margin-bottom: 30px; }
        .section-title { color: #4b5563; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin-top: 30px; margin-bottom: 20px; }
        .list { display: grid; gap: 16px; }
        .item { background: white; padding: 16px; border-radius: 8px; display: flex; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05); text-decoration: none; color: inherit; transition: transform 0.2s; }
        .item:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        .item.local { border-left: 4px solid #fbbf24; cursor: default; }
        .item.local:hover { transform: none; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .icon { width: 48px; height: 48px; border-radius: 8px; margin-right: 16px; object-fit: contain; background: #f8fafc; }
        .details { flex: 1; }
        .name { font-weight: 600; font-size: 1.1em; display: block; margin-bottom: 4px; color: #2563eb; }
        .item.local .name { color: #1f2937; }
        .desc { font-size: 0.9em; color: #666; }
        .meta { font-size: 0.8em; color: #999; margin-top: 4px; }
    </style>
</head>
<body>
    <h1>Exported Extensions</h1>
    ${renderList(enabledItems, 'Enabled Extensions')}
    ${renderList(disabledItems, 'Disabled Extensions')}
</body>
</html>
        `;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `extensions-export-${timestamp}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
});
