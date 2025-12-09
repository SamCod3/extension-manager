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
                listContainer.innerHTML = '<div class="info-message">No se encontraron extensiones.</div>';
                return;
            }

            console.log('All fetched items:', result);

            // Filter out this extension and apps, keep only normal extensions
            extensions = result.filter(ext => ext.type === 'extension' && ext.id !== chrome.runtime.id);

            console.log('Filtered extensions:', extensions);

            if (extensions.length === 0) {
                listContainer.innerHTML = '<div class="info-message">No se encontraron otras extensiones instaladas.</div>';
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
        listContainer.innerHTML = `<div class="error">Error inesperado: ${e.message}</div>`;
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
            modalContent.innerHTML = '<span class="info-message" style="padding:0; text-align:left;">No requiere permisos especiales.</span>';
        } else {
            perms.forEach(p => {
                const tag = document.createElement('span');
                tag.className = 'permission-tag';
                tag.textContent = p;
                modalContent.appendChild(tag);
            });
        }

        document.querySelector('.modal-title').textContent = `${ext.name} - Permisos`;
        modal.classList.add('active');
    }

    function renderExtensions() {
        listContainer.innerHTML = '';

        // Use shared grouping logic from utils.js
        const groups = window.ExtensionUtils.groupExtensions(extensions);

        if (groups.local.length > 0) {
            const h2 = document.createElement('h2');
            h2.textContent = `🛠️ Desarrollo / Local (${groups.local.length})`;
            h2.style.color = '#fbbf24';
            h2.style.borderColor = 'rgba(251, 191, 36, 0.3)';
            listContainer.appendChild(h2);
            groups.local.forEach(ext => listContainer.appendChild(createCard(ext)));
        }

        if (groups.enabled.length > 0) {
            const h2 = document.createElement('h2');
            h2.textContent = `✅ Habilitadas (${groups.enabled.length})`;
            listContainer.appendChild(h2);
            groups.enabled.forEach(ext => listContainer.appendChild(createCard(ext)));
        }

        if (groups.disabled.length > 0) {
            const h2 = document.createElement('h2');
            h2.textContent = `❌ Deshabilitadas (${groups.disabled.length})`;
            listContainer.appendChild(h2);
            groups.disabled.forEach(ext => listContainer.appendChild(createCard(ext)));
        }
    }

    function createCard(ext) {
        const card = document.createElement('div');
        // If local and disabled, maybe dim it? Let's add 'disabled' class if not enabled, triggers opacity
        card.className = `extension-card ${!ext.enabled ? 'disabled' : ''} ${selectedIds.has(ext.id) ? 'selected' : ''}`;
        card.dataset.id = ext.id;

        const iconUrl = ext.icons ? ext.icons[ext.icons.length - 1].url : 'icon.png';

        card.innerHTML = `
            <div class="icon-container">
                <div class="icon-wrapper">
                    <img src="${iconUrl}" alt="${ext.name}">
                </div>
            </div>
            
            <div class="header-group">
                <div class="name" title="${ext.name}">${ext.name}</div>
            </div>

            <div class="description" title="${ext.description}">${ext.description || 'Sin descripción'}</div>

            <div class="meta-row">
                <span class="version" title="Versión">v${ext.version || '0.0'}</span>
            </div>

            <div class="card-actions">
                <button class="btn-icon info-btn" title="Ver Permisos">ℹ️</button>
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
            alert('Por favor selecciona al menos una extensión para exportar.');
            return;
        }

        const selectedExtensions = extensions.filter(ext => selectedIds.has(ext.id));

        // Change button state
        const originalText = exportBtn.innerHTML;
        exportBtn.innerHTML = 'Procesando...';
        exportBtn.disabled = true;

        try {
            // Use new Export Module
            await window.ExtensionExporter.exportExtensions(selectedExtensions);
        } catch (err) {
            console.error(err);
            alert('Error exportando: ' + err.message);
        } finally {
            exportBtn.innerHTML = originalText;
            exportBtn.disabled = false;
        }
    });

    // Old helpers removed (getBase64Image, generateAndDownloadHtml) - now in modules
});
