# Extension Export Manager

A beautiful and powerful browser extension to manage and export your installed extensions.

## Features

- **📊 Dashboard View**: View all your extensions in a clean, card-based layout.
- **📂 Grouping**: Automatically groups extensions by:
    - 🛠️ **Local / Development**: Extensions loaded from disk.
    - ✅ **Enabled**: Active extensions.
    - ❌ **Disabled**: Inactive extensions.
- **ℹ️ Metadata**: See version numbers and local installation badges.
- **🔒 Permission Audit**: Click the `i` button on any card to see exactly what permissions an extension has.
- **💾 Smart Export**: Export your list to a self-contained HTML file.
    - Icons are embedded (Base64) so they work offline.
    - Local extensions are marked and safe from broken store links.

## Installation

1. Clone this repository.
2. Open your browser and go to `chrome://extensions` (or `brave://extensions`).
3. Enable **Developer mode** in the top right.
4. Click **Load unpacked**.
5. Select the folder where you cloned this repository.

## Usage

1. Click the extension icon in your toolbar.
2. Use the **Select All**, **Deselect All**, or click individual cards to select extensions.
3. Click **Export Selection** to generate an HTML file with your list.

## License

MIT
