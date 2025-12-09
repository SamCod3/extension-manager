/**
 * Utility functions for the Extension Manager
 */
window.ExtensionUtils = {
    /**
     * Groups extensions into Logical categories
     * @param {Array} extensions - List of extension objects
     * @returns {Object} Grouped extensions
     */
    groupExtensions: (extensions) => {
        const local = extensions.filter(e => e.installType === 'development');
        const normal = extensions.filter(e => e.installType !== 'development');

        return {
            local: local,
            enabled: normal.filter(e => e.enabled),
            disabled: normal.filter(e => !e.enabled)
        };
    },

    /**
     * Convert an image URL to a Base64 string
     * @param {string} url - The URL of the image
     * @returns {Promise<string|null>} Base64 data URL
     */
    getBase64Image: (url) => {
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
};
