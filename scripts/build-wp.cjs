const fs = require('fs');
const path = require('path');

// Helper to copy directory recursively
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function buildWordPressTheme() {
  console.log('🏁 Starting WordPress Theme Packaging...');

  const rootDir = path.resolve(__dirname, '..');
  const distDir = path.join(rootDir, 'dist');
  const themeOutputDir = path.join(rootDir, 'joamedic-wp-theme');

  // Verify that the dist directory exists
  if (!fs.existsSync(distDir)) {
    console.error('❌ Error: The "dist/" directory does not exist. Please run "npm run build" first.');
    process.exit(1);
  }

  // Remove existing output directory to start fresh
  if (fs.existsSync(themeOutputDir)) {
    console.log('🧹 Cleaning existing joamedic-wp-theme/ folder...');
    fs.rmSync(themeOutputDir, { recursive: true, force: true });
  }

  // Copy dist contents to themeOutputDir
  console.log('📦 Copying build files to WordPress theme directory...');
  copyDirSync(distDir, themeOutputDir);

  // Define theme headers
  const styleCssContent = `/*
Theme Name: Joamedic
Theme URI: https://ai.studio/build
Description: Premium medical apparel brand landing page featuring a Liquid Glass modern design, built with React, Vite, and Tailwind CSS.
Version: 1.0.0
Author: Google AI Studio
Author URI: https://ai.studio/build
License: GNU General Public License v2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html
Text Domain: joamedic
*/
`;

  // Write style.css in the theme directory root
  fs.writeFileSync(path.join(themeOutputDir, 'style.css'), styleCssContent);
  console.log('✍️  Generated style.css with WordPress Headers.');

  // Define index.php content
  const indexPhpContent = `<?php
/**
 * The main template file for Joamedic Theme.
 *
 * @package Joamedic
 */
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo( 'charset' ); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <?php wp_head(); ?>
</head>
<body <?php body_class('bg-slate-950 text-white min-h-screen'); ?>>
    <?php wp_body_open(); ?>
    
    <!-- React App Root Container -->
    <div id="root"></div>

    <?php wp_footer(); ?>
</body>
</html>
`;

  // Write index.php
  fs.writeFileSync(path.join(themeOutputDir, 'index.php'), indexPhpContent);
  console.log('✍️  Generated index.php template file.');

  // Define functions.php content
  const functionsPhpContent = `<?php
/**
 * Joamedic functions and definitions
 *
 * @package Joamedic
 */

if ( ! function_exists( 'joamedic_setup' ) ) {
    function joamedic_setup() {
        // Add support for document title tag
        add_theme_support( 'title-tag' );
        // Enable automatic feed links
        add_theme_support( 'automatic-feed-links' );
        // Enable featured image support
        add_theme_support( 'post-thumbnails' );
    }
}
add_action( 'after_setup_theme', 'joamedic_setup' );

function joamedic_enqueue_react_assets() {
    $theme_dir = get_template_directory();
    $theme_uri = get_template_directory_uri();
    
    // Check manifest paths (Vite 5/6 places it in .vite/manifest.json; Vite 4 placed it in manifest.json)
    $manifest_path = $theme_dir . '/.vite/manifest.json';
    if ( ! file_exists( $manifest_path ) ) {
        $manifest_path = $theme_dir . '/manifest.json';
    }
    
    if ( file_exists( $manifest_path ) ) {
        $manifest = json_decode( file_get_contents( $manifest_path ), true );
        
        if ( is_array( $manifest ) ) {
            // Find the main app entry (typically src/main.tsx or index.html)
            $main_entry_key = null;
            foreach ( array_keys( $manifest ) as $key ) {
                if ( isset( $manifest[$key]['isEntry'] ) && $manifest[$key]['isEntry'] === true ) {
                    $main_entry_key = $key;
                    break;
                }
            }
            
            // Fallback to src/main.tsx or main.js if not found
            if ( ! $main_entry_key ) {
                if ( isset( $manifest['src/main.tsx'] ) ) {
                    $main_entry_key = 'src/main.tsx';
                } elseif ( isset( $manifest['index.html'] ) ) {
                    $main_entry_key = 'index.html';
                } else {
                    // Try to guess from the first item
                    $keys = array_keys($manifest);
                    $main_entry_key = reset($keys);
                }
            }
            
            if ( $main_entry_key && isset( $manifest[$main_entry_key] ) ) {
                $main_entry = $manifest[$main_entry_key];
                
                // Enqueue Main JavaScript Module
                $js_file = $theme_uri . '/' . $main_entry['file'];
                wp_enqueue_script(
                    'joamedic-react-app',
                    $js_file,
                    array(),
                    null,
                    array(
                        'strategy' => 'defer',
                        'in_footer' => true,
                    )
                );
                
                // Set the script element to use type="module" (Required for Vite modules)
                add_filter( 'script_loader_tag', function( $tag, $handle, $src ) {
                    if ( 'joamedic-react-app' === $handle ) {
                        $tag = '<script type="module" src="' . esc_url( $src ) . '" defer></script>';
                    }
                    return $tag;
                }, 10, 3 );
                
                // Enqueue associated CSS files from manifest
                if ( isset( $main_entry['css'] ) && is_array( $main_entry['css'] ) ) {
                    foreach ( $main_entry['css'] as $index => $css_file_rel ) {
                        wp_enqueue_style(
                            'joamedic-main-css-' . $index,
                            $theme_uri . '/' . $css_file_rel,
                            array(),
                            null
                        );
                    }
                }
                
                // Enqueue imported/lazy-loaded chunk CSS/JS if any
                if ( isset( $main_entry['imports'] ) && is_array( $main_entry['imports'] ) ) {
                    foreach ( $main_entry['imports'] as $import_key ) {
                        if ( isset( $manifest[$import_key] ) && isset( $manifest[$import_key]['css'] ) ) {
                            foreach ( $manifest[$import_key]['css'] as $index => $css_chunk_rel ) {
                                wp_enqueue_style(
                                    'joamedic-chunk-css-' . $index,
                                    $theme_uri . '/' . $css_chunk_rel,
                                    array(),
                                    null
                                );
                            }
                        }
                    }
                }
            }
        }
    } else {
        // Fallback for development/diagnostics
        // Look in assets/ directory for JS/CSS directly
        $assets_dir = $theme_dir . '/assets';
        if ( is_dir( $assets_dir ) ) {
            $files = scandir( $assets_dir );
            foreach ( $files as $file ) {
                if ( preg_match( '/^main-.*\\.js$/', $file ) || preg_match( '/^index-.*\\.js$/', $file ) ) {
                    wp_enqueue_script(
                        'joamedic-react-app',
                        $theme_uri . '/assets/' . $file,
                        array(),
                        null,
                        array(
                            'strategy' => 'defer',
                            'in_footer' => true,
                        )
                    );
                    add_filter( 'script_loader_tag', function( $tag, $handle, $src ) {
                        if ( 'joamedic-react-app' === $handle ) {
                            $tag = '<script type="module" src="' . esc_url( $src ) . '" defer></script>';
                        }
                        return $tag;
                    }, 10, 3 );
                } elseif ( preg_match( '/^index-.*\\.css$/', $file ) || preg_match( '/^main-.*\\.css$/', $file ) ) {
                    wp_enqueue_style(
                        'joamedic-main-css',
                        $theme_uri . '/assets/' . $file,
                        array(),
                        null
                    );
                }
            }
        }
    }
}
add_action( 'wp_enqueue_scripts', 'joamedic_enqueue_react_assets' );
`;

  // Write functions.php
  fs.writeFileSync(path.join(themeOutputDir, 'functions.php'), functionsPhpContent);
  console.log('✍️  Generated functions.php WordPress asset-loader file.');

  // Clean index.html from WordPress compiled folder as it is not needed there (index.php is used)
  const themeIndexHtml = path.join(themeOutputDir, 'index.html');
  if (fs.existsSync(themeIndexHtml)) {
    fs.unlinkSync(themeIndexHtml);
    console.log('🗑️  Removed unneeded index.html from WordPress theme folder (index.php takes its place).');
  }

  // Create instructions file in root and inside theme folder
  const instructionsContent = `# Joamedic WordPress Theme Instructions

This theme was built with React, Vite, Tailwind CSS, and Framer Motion, and is packaged ready for import into your WordPress site.

## Theme Details
* **Theme Name**: Joamedic
* **Theme Folder Name**: \`joamedic-wp-theme\`
* **Target Directory**: \`/wp-content/themes/joamedic-wp-theme/\`

## Quick Install Instructions

1. **Locate the Theme Folder**:
   The built WordPress theme is located inside the \`joamedic-wp-theme\` folder in your project's root directory.

2. **Zip the Theme**:
   Zip the entire \`joamedic-wp-theme\` folder. Make sure the files (like \`style.css\`, \`index.php\`, \`functions.php\`) are at the **root** of the ZIP file (not nested inside double folders). Name the zip file \`joamedic-wp-theme.zip\`.

3. **Upload to WordPress**:
   - Log in to your WordPress Admin Dashboard.
   - Go to **Appearance** > **Themes** > **Add New Theme**.
   - Click **Upload Theme** at the top.
   - Choose your \`joamedic-wp-theme.zip\` file and click **Install Now**.
   - After installation succeeds, click **Activate**.

---

## Technical Features Implemented
* **Vite Manifest Support**: The theme enqueues assets dynamically by reading \`.vite/manifest.json\`. This means any hash-based compiled files are automatically handled without manually renaming anything inside WordPress.
* **Module Loading**: Integrates script tags with \`type="module"\` to ensure Framer Motion and modern React code load and render correctly.
* **Robust Fallbacks**: If the manifest is ever missing or deleted, \`functions.php\` falls back to scanning the \`assets/\` directory directly.
* **Zero Path Conflicts**: Assets are compiled with WP template paths mapped dynamically.

Enjoy your brand-new, ultra-modern Liquid Glass medical apparel theme!
`;

  fs.writeFileSync(path.join(rootDir, 'WORDPRESS_INSTRUCTIONS.md'), instructionsContent);
  fs.writeFileSync(path.join(themeOutputDir, 'README.md'), instructionsContent);
  console.log('✍️  Generated WORDPRESS_INSTRUCTIONS.md and README.md.');

  console.log('✅ WordPress Theme packaged successfully at "./joamedic-wp-theme"!');
}

buildWordPressTheme().catch((err) => {
  console.error('❌ Compilation failed:', err);
  process.exit(1);
});
