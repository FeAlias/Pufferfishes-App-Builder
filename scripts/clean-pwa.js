#!/usr/bin/env node

/**
 * PWA Cleanup Script
 *
 * Removes existing PWA files from a cloned repository to ensure
 * only PufferFishes PWA files are used.
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      const value = args[i + 1];
      options[key] = value;
      i++;
    }
  }

  return options;
}

const options = parseArgs();
const { 'target-dir': targetDir } = options;

if (!targetDir) {
  console.error('Usage: clean-pwa.js --target-dir <dir>');
  process.exit(1);
}

const targetPath = path.resolve(targetDir);
console.log(`Cleaning PWA files from: ${targetPath}`);

// Common PWA file patterns to remove
const PWA_PATTERNS = [
  'manifest.json',
  'manifest.webmanifest',
  'sw.js',
  'service-worker.js',
  'serviceworker.js',
  'pwa.js',
  'workbox-*.js',
  'firebase-messaging-sw.js'
];

// Directories that might contain PWA files
const SEARCH_DIRS = [
  '',           // Root
  'public',
  'static',
  'src',
  'assets',
  'dist',
  'build',
  'out'
];

let filesRemoved = 0;

// Remove PWA files from directory
function cleanDirectory(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }

  const items = fs.readdirSync(dir);

  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.lstatSync(fullPath);

    // Skip node_modules and hidden directories
    if (stat.isDirectory() && (item === 'node_modules' || item.startsWith('.'))) {
      return;
    }

    // Check if file matches PWA patterns
    const matchesPattern = PWA_PATTERNS.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
        return regex.test(item);
      }
      return item === pattern;
    });

    if (matchesPattern && stat.isFile()) {
      fs.unlinkSync(fullPath);
      console.log(`  Removed: ${path.relative(targetPath, fullPath)}`);
      filesRemoved++;
    }
  });
}

// Clean PWA-related content from HTML files
function cleanHtmlFiles(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }

  const items = fs.readdirSync(dir);

  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.lstatSync(fullPath);

    // Skip node_modules and hidden directories
    if (stat.isDirectory() && (item === 'node_modules' || item.startsWith('.'))) {
      return;
    }

    if (stat.isDirectory()) {
      cleanHtmlFiles(fullPath);
    } else if (item.endsWith('.html')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      // Remove manifest links
      const manifestRegex = /<link[^>]*rel=["']manifest["'][^>]*>/gi;
      if (manifestRegex.test(content)) {
        content = content.replace(manifestRegex, '');
        modified = true;
      }

      // Remove service worker registration scripts
      const swRegex = /<script[^>]*>[\s\S]*?navigator\.serviceWorker\.register[\s\S]*?<\/script>/gi;
      if (swRegex.test(content)) {
        content = content.replace(swRegex, '');
        modified = true;
      }

      // Remove PWA meta tags
      const pwaMetaPatterns = [
        /<meta[^>]*name=["']theme-color["'][^>]*>/gi,
        /<meta[^>]*name=["']mobile-web-app-capable["'][^>]*>/gi,
        /<meta[^>]*name=["']apple-mobile-web-app-capable["'][^>]*>/gi,
        /<meta[^>]*name=["']apple-mobile-web-app-status-bar-style["'][^>]*>/gi,
        /<meta[^>]*name=["']apple-mobile-web-app-title["'][^>]*>/gi,
        /<link[^>]*rel=["']apple-touch-icon["'][^>]*>/gi
      ];

      pwaMetaPatterns.forEach(pattern => {
        if (pattern.test(content)) {
          content = content.replace(pattern, '');
          modified = true;
        }
      });

      if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log(`  Cleaned PWA code from: ${path.relative(targetPath, fullPath)}`);
        filesRemoved++;
      }
    }
  });
}

// Clean package.json of PWA dependencies and scripts
function cleanPackageJson() {
  const packagePath = path.join(targetPath, 'package.json');

  if (!fs.existsSync(packagePath)) {
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  let modified = false;

  // PWA-related dependencies to remove
  const pwaDeps = [
    'workbox-webpack-plugin',
    'workbox-window',
    'workbox-core',
    'workbox-precaching',
    'workbox-routing',
    'workbox-strategies',
    'next-pwa',
    'vite-plugin-pwa',
    '@vite-pwa/assets-generator',
    'webpack-pwa-manifest',
    'react-pwa',
    'vue-pwa',
    'angular-pwa'
  ];

  // Remove from dependencies
  if (packageJson.dependencies) {
    pwaDeps.forEach(dep => {
      if (packageJson.dependencies[dep]) {
        delete packageJson.dependencies[dep];
        modified = true;
        console.log(`  Removed dependency: ${dep}`);
      }
    });
  }

  // Remove from devDependencies
  if (packageJson.devDependencies) {
    pwaDeps.forEach(dep => {
      if (packageJson.devDependencies[dep]) {
        delete packageJson.devDependencies[dep];
        modified = true;
        console.log(`  Removed devDependency: ${dep}`);
      }
    });
  }

  if (modified) {
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    filesRemoved++;
  }
}

// Remove icons directory that might contain PWA icons
function cleanIconsDirectory() {
  const iconsDirs = ['icons', 'public/icons', 'static/icons', 'assets/icons'];

  iconsDirs.forEach(dir => {
    const fullPath = path.join(targetPath, dir);
    if (fs.existsSync(fullPath)) {
      const items = fs.readdirSync(fullPath);
      items.forEach(item => {
        // Only remove if it looks like a PWA icon
        if (item.match(/icon-\d+x\d+\.(png|svg|ico)/i) || item === 'manifest-icon.png') {
          const iconPath = path.join(fullPath, item);
          fs.unlinkSync(iconPath);
          console.log(`  Removed PWA icon: ${path.relative(targetPath, iconPath)}`);
          filesRemoved++;
        }
      });
    }
  });
}

// Execute cleanup
console.log('\n=== Starting PWA Cleanup ===\n');

// 1. Clean PWA files from common directories
SEARCH_DIRS.forEach(dir => {
  const fullPath = path.join(targetPath, dir);
  cleanDirectory(fullPath);
});

// 2. Clean HTML files
cleanHtmlFiles(targetPath);

// 3. Clean package.json
cleanPackageJson();

// 4. Clean PWA icons
cleanIconsDirectory();

console.log('\n=== PWA Cleanup Complete ===');
console.log(`Total items cleaned: ${filesRemoved}`);

if (filesRemoved === 0) {
  console.log('No existing PWA files found.');
} else {
  console.log('Repository is now ready for PufferFishes PWA injection.');
}
