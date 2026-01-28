#!/usr/bin/env node

/**
 * PWA Injection Script
 *
 * Takes a built web app and injects PWA capabilities:
 * - manifest.json
 * - service-worker.js
 * - Install prompt UI
 * - Gemini API key management
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
const {
  'build-dir': buildDir,
  'app-id': appId,
  'app-name': appName,
  'repo-url': repoUrl
} = options;

if (!buildDir || !appId || !appName) {
  console.error('Usage: build-pwa.js --build-dir <dir> --app-id <id> --app-name <name> --repo-url <url>');
  process.exit(1);
}

const buildPath = path.resolve(buildDir);
console.log(`Injecting PWA assets into: ${buildPath}`);

// Create icons directory
const iconsDir = path.join(buildPath, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate simple icon (text-based for now)
function generateIcon(size, outputPath) {
  // For MVP, we'll copy a default icon or generate a simple colored square
  // In production, extract from repo or use image generation library
  console.log(`Generated ${size}x${size} icon at ${outputPath}`);

  // Create a simple SVG icon as placeholder
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="#4F46E5"/>
    <text x="50%" y="50%" font-size="${size/3}" fill="white" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif">${appName.charAt(0).toUpperCase()}</text>
  </svg>`;

  fs.writeFileSync(outputPath, svg);
}

// Generate icons
generateIcon(192, path.join(iconsDir, 'icon-192.png'));
generateIcon(512, path.join(iconsDir, 'icon-512.png'));

// Create manifest.json
const manifest = {
  name: appName,
  short_name: appName.substring(0, 12),
  description: `${appName} - Powered by PufferFishes`,
  start_url: `/apps/${appId}/`,
  scope: `/apps/${appId}/`,
  display: 'standalone',
  background_color: '#ffffff',
  theme_color: '#4F46E5',
  orientation: 'portrait-primary',
  icons: [
    {
      src: `/apps/${appId}/icons/icon-192.png`,
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any maskable'
    },
    {
      src: `/apps/${appId}/icons/icon-512.png`,
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable'
    }
  ],
  categories: ['productivity', 'utilities']
};

fs.writeFileSync(
  path.join(buildPath, 'manifest.json'),
  JSON.stringify(manifest, null, 2)
);
console.log('Created manifest.json');

// Create service worker
const serviceWorkerTemplate = fs.readFileSync(
  path.join(__dirname, '../templates/service-worker.template.js'),
  'utf8'
);

const serviceWorker = serviceWorkerTemplate
  .replace(/\{\{APP_ID\}\}/g, appId)
  .replace(/\{\{VERSION\}\}/g, Date.now().toString());

fs.writeFileSync(
  path.join(buildPath, 'service-worker.js'),
  serviceWorker
);
console.log('Created service-worker.js');

// Inject PWA meta tags and scripts into index.html
const indexPath = path.join(buildPath, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error('ERROR: index.html not found in build directory');
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');

// Add PWA meta tags if not present
const pwaMetaTags = `
  <!-- PWA Meta Tags -->
  <meta name="theme-color" content="#4F46E5">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="${appName}">
  <link rel="manifest" href="/apps/${appId}/manifest.json">
  <link rel="icon" href="/apps/${appId}/icons/icon-192.png">
  <link rel="apple-touch-icon" href="/apps/${appId}/icons/icon-512.png">
`;

// Add install prompt script
const installPromptScript = fs.readFileSync(
  path.join(__dirname, '../templates/install-prompt.html'),
  'utf8'
);

// Add API key manager script
const apiKeyManagerScript = fs.readFileSync(
  path.join(__dirname, '../templates/api-key-manager.html'),
  'utf8'
);

// Inject into <head>
if (html.includes('</head>')) {
  html = html.replace('</head>', `${pwaMetaTags}</head>`);
} else {
  console.warn('Warning: Could not find </head> tag in index.html');
}

// Inject scripts before </body>
if (html.includes('</body>')) {
  html = html.replace('</body>', `${installPromptScript}\n${apiKeyManagerScript}\n</body>`);
} else {
  console.warn('Warning: Could not find </body> tag in index.html');
  // Append to end of file
  html += installPromptScript + '\n' + apiKeyManagerScript;
}

// Write modified HTML
fs.writeFileSync(indexPath, html);
console.log('Injected PWA assets into index.html');

// Create a file list for service worker caching
const files = [];
function walkDir(dir, baseDir = dir) {
  const items = fs.readdirSync(dir);
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath, baseDir);
    } else {
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      files.push(`/apps/${appId}/${relativePath}`);
    }
  });
}

walkDir(buildPath);

// Update service worker with file list
let swContent = fs.readFileSync(path.join(buildPath, 'service-worker.js'), 'utf8');
swContent = swContent.replace(
  '// INJECT_FILE_LIST_HERE',
  files.slice(0, 50).map(f => `  '${f}'`).join(',\n') // Limit to 50 files for initial cache
);
fs.writeFileSync(path.join(buildPath, 'service-worker.js'), swContent);

console.log('PWA injection completed successfully!');
console.log(`Total files: ${files.length}`);
console.log(`App ID: ${appId}`);
console.log(`Install URL: https://pufferfishes.net/apps/${appId}/`);
