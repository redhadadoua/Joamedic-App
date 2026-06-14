# Joamedic WordPress Theme Instructions

This theme was built with React, Vite, Tailwind CSS, and Framer Motion, and is packaged ready for import into your WordPress site.

## Theme Details
* **Theme Name**: Joamedic
* **Theme Folder Name**: `joamedic-wp-theme`
* **Target Directory**: `/wp-content/themes/joamedic-wp-theme/`

## Quick Install Instructions

1. **Locate the Theme Folder**:
   The built WordPress theme is located inside the `joamedic-wp-theme` folder in your project's root directory.

2. **Zip the Theme**:
   Zip the entire `joamedic-wp-theme` folder. Make sure the files (like `style.css`, `index.php`, `functions.php`) are at the **root** of the ZIP file (not nested inside double folders). Name the zip file `joamedic-wp-theme.zip`.

3. **Upload to WordPress**:
   - Log in to your WordPress Admin Dashboard.
   - Go to **Appearance** > **Themes** > **Add New Theme**.
   - Click **Upload Theme** at the top.
   - Choose your `joamedic-wp-theme.zip` file and click **Install Now**.
   - After installation succeeds, click **Activate**.

---

## Technical Features Implemented
* **Vite Manifest Support**: The theme enqueues assets dynamically by reading `.vite/manifest.json`. This means any hash-based compiled files are automatically handled without manually renaming anything inside WordPress.
* **Module Loading**: Integrates script tags with `type="module"` to ensure Framer Motion and modern React code load and render correctly.
* **Robust Fallbacks**: If the manifest is ever missing or deleted, `functions.php` falls back to scanning the `assets/` directory directly.
* **Zero Path Conflicts**: Assets are compiled with WP template paths mapped dynamically.

Enjoy your brand-new, ultra-modern Liquid Glass medical apparel theme!
