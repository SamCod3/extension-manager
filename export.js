/**
 * Handles the generation and download of the export file
 */
window.ExtensionExporter = {
    /**
     * Generates HTML report and triggers download
     * @param {Array} items - List of extension objects to export
     */
    exportExtensions: async (items) => {
        // 1. Pre-process items to get base64 icons
        // Relies on ExtensionUtils being available
        const processedItems = await Promise.all(items.map(async (ext) => {
            let iconUrl = ext.icons ? ext.icons[ext.icons.length - 1].url : '';
            let base64Icon = null;
            if (iconUrl && window.ExtensionUtils) {
                base64Icon = await window.ExtensionUtils.getBase64Image(iconUrl);
            }
            return { ...ext, base64Icon };
        }));

        // 2. Group items using the same logic as the UI
        // We use the utility if available, or manual fallback logic if strict dependency not desired here,
        // but for consistency we re-use the utility pattern
        let groups;
        if (window.ExtensionUtils) {
            groups = window.ExtensionUtils.groupExtensions(processedItems);
        } else {
            // Fallback just in case, though utils should be loaded
            groups = {
                local: processedItems.filter(i => i.installType === 'development'),
                enabled: processedItems.filter(i => i.installType !== 'development' && i.enabled),
                disabled: processedItems.filter(i => i.installType !== 'development' && !i.enabled)
            };
        }

        const timestamp = new Date().toISOString().split('T')[0];

        // 3. Helper to render a section
        const renderSection = (list, title) => {
            if (!list || list.length === 0) return '';
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
                                </span>
                                <span class="desc">${ext.description || ''}</span>
                                <div class="meta">
                                    <span style="background:#eee;padding:2px 4px;border-radius:3px;">v${ext.version}</span>
                                    ID: ${ext.id}
                                    ${isLocal ? '<br><small style="color:#d97706">⚠️ Requiere instalación manual</small>' : ''}
                                </div>
                            </div>
                        </a>
                        `;
            }).join('')}
                </div>
            `;
        };

        // 4. Construct the full HTML
        const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Extensiones Exportadas - ${timestamp}</title>
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
    <h1>Extensiones Exportadas</h1>
    ${renderSection(groups.local, 'Desarrollo / Local')}
    ${renderSection(groups.enabled, 'Extensiones Habilitadas')}
    ${renderSection(groups.disabled, 'Extensiones Deshabilitadas')}
</body>
</html>
        `;

        // 5. Trigger download
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
};
