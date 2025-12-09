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
    },
    /**
     * Generates Policy file and triggers download
     * @param {Array} items - List of extension objects
     * @param {Object} options - { os: 'WINDOWS'|'MACOS'|'LINUX', browser: 'CHROME'|'BRAVE'|'EDGE', allowUninstall: boolean }
     */
    exportPolicy: (items, options) => {
        const { os, browser, allowUninstall } = options;

        // Filter: Only extensions from WebStore (no local)
        const validItems = items.filter(ext => ext.installType !== 'development');

        if (validItems.length === 0) {
            throw new Error('No hay extensiones válidas para exportar a políticas (deben ser de la Web Store).');
        }

        const timestamp = new Date().toISOString().split('T')[0];
        let result = null;

        // Dispatch to specific generator
        switch (os) {
            case 'WINDOWS':
                result = window.ExtensionExporter._generateWindowsPolicy(validItems, browser, allowUninstall, timestamp);
                break;
            case 'MACOS':
                result = window.ExtensionExporter._generateMacOSPolicy(validItems, browser, allowUninstall, timestamp);
                break;
            case 'LINUX':
                result = window.ExtensionExporter._generateLinuxPolicy(validItems, browser, allowUninstall, timestamp);
                break;
            default:
                throw new Error('Sistema Operativo no soportado');
        }

        // Trigger Download
        if (result) {
            const blob = new Blob([result.content], { type: result.mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    },

    // --- Internal Helpers ---

    _generateWindowsPolicy: (items, browser, allowUninstall, timestamp) => {
        const filename = `extensions-policy-${browser.toLowerCase()}-${timestamp}.reg`;
        const mimeType = 'application/x-registry-script';

        // Define Registry Key Base
        let keyPath = '';
        if (browser === 'CHROME') keyPath = 'Software\\Policies\\Google\\Chrome';
        else if (browser === 'BRAVE') keyPath = 'Software\\Policies\\BraveSoftware\\Brave';
        else if (browser === 'EDGE') keyPath = 'Software\\Policies\\Microsoft\\Edge';

        let content = 'Windows Registry Editor Version 5.00\n\n';

        if (allowUninstall) {
            // Recommended: ExtensionSettings
            const settingsKey = `HKEY_LOCAL_MACHINE\\${keyPath}\\ExtensionSettings`;
            content += `[${settingsKey}]\n\n`;

            items.forEach(ext => {
                const updateUrl = "https://clients2.google.com/service/update2/crx";
                content += `[${settingsKey}\\${ext.id}]\n`;
                content += `"installation_mode"="normal_installed"\n`;
                content += `"update_url"="${updateUrl}"\n\n`;
            });
        } else {
            // Forced: ExtensionInstallForcelist
            const forceKey = `HKEY_LOCAL_MACHINE\\${keyPath}\\ExtensionInstallForcelist`;
            content += `[${forceKey}]\n`;
            items.forEach((ext, index) => {
                const val = `${ext.id};https://clients2.google.com/service/update2/crx`;
                content += `"${index + 1}"="${val}"\n`;
            });
        }
        return { filename, content, mimeType };
    },

    _generateMacOSPolicy: (items, browser, allowUninstall, timestamp) => {
        const filename = `extensions-policy-${browser.toLowerCase()}-${timestamp}.mobileconfig`;
        const mimeType = 'application/x-apple-aspen-config';

        // Define Payload Identifier
        let payloadId = '';
        if (browser === 'CHROME') payloadId = 'com.google.Chrome';
        else if (browser === 'BRAVE') payloadId = 'com.brave.Browser';
        else if (browser === 'EDGE') payloadId = 'com.microsoft.Edge';

        const uuid = '50608b0a-0000-4000-8000-' + Date.now().toString(16).padEnd(12, '0');

        let dictContent = '';
        if (allowUninstall) {
            // ExtensionSettings
            dictContent += `
            <key>ExtensionSettings</key>
            <dict>`;
            items.forEach(ext => {
                dictContent += `
                <key>${ext.id}</key>
                <dict>
                    <key>installation_mode</key>
                    <string>normal_installed</string>
                    <key>update_url</key>
                    <string>https://clients2.google.com/service/update2/crx</string>
                </dict>`;
            });
            dictContent += `
            </dict>`;
        } else {
            // ExtensionInstallForcelist
            dictContent += `
            <key>ExtensionInstallForcelist</key>
            <array>`;
            items.forEach(ext => {
                dictContent += `
                <string>${ext.id};https://clients2.google.com/service/update2/crx</string>`;
            });
            dictContent += `
            </array>`;
        }

        const content = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>PayloadDisplayName</key>
            <string>Extension Policy (${browser})</string>
            <key>PayloadIdentifier</key>
            <string>${payloadId}</string>
            <key>PayloadType</key>
            <string>${payloadId}</string>
            <key>PayloadUUID</key>
            <string>${uuid}</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
            ${dictContent}
        </dict>
    </array>
    <key>PayloadDisplayName</key>
    <string>Extension Install Policy</string>
    <key>PayloadIdentifier</key>
    <string>com.example.extensionpolicy</string>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>${uuid.replace('0a', '0b')}</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>`;
        return { filename, content, mimeType };
    },

    _generateLinuxPolicy: (items, browser, allowUninstall, timestamp) => {
        const filename = `extensions-policy-${browser.toLowerCase()}-${timestamp}.json`;
        const mimeType = 'application/json';

        let policyData = {};
        let path = '/etc/opt/chrome/policies/managed/';
        if (browser === 'BRAVE') path = '/etc/brave/policies/managed/';
        else if (browser === 'EDGE') path = '/etc/opt/edge/policies/managed/';

        policyData["_INSTRUCCIONES"] = `Copiar a: ${path}`;

        if (allowUninstall) {
            policyData["ExtensionSettings"] = {};
            items.forEach(ext => {
                policyData["ExtensionSettings"][ext.id] = {
                    "installation_mode": "normal_installed",
                    "update_url": "https://clients2.google.com/service/update2/crx"
                };
            });
        } else {
            policyData["ExtensionInstallForcelist"] = items.map(ext => `${ext.id};https://clients2.google.com/service/update2/crx`);
        }

        const content = JSON.stringify(policyData, null, 4);
        return { filename, content, mimeType };
    }
};
