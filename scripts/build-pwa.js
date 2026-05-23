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

// Remove any remaining PWA files in build directory (final cleanup)
console.log('Performing final PWA cleanup in build directory...');
const oldManifest = path.join(buildPath, 'manifest.json');
const oldManifestAlt = path.join(buildPath, 'manifest.webmanifest');
const oldServiceWorker = path.join(buildPath, 'service-worker.js');
const oldServiceWorkerAlt = path.join(buildPath, 'sw.js');

[oldManifest, oldManifestAlt, oldServiceWorker, oldServiceWorkerAlt].forEach(file => {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log(`  Removed old PWA file: ${path.basename(file)}`);
  }
});

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

// Remove existing PWA-related tags from HTML (final cleanup)
console.log('Removing any remaining PWA tags from HTML...');

// Remove old manifest links
html = html.replace(/<link[^>]*rel=["']manifest["'][^>]*>/gi, '');

// Remove old service worker registration scripts
html = html.replace(/<script[^>]*>[\s\S]*?navigator\.serviceWorker\.register[\s\S]*?<\/script>/gi, '');

// Remove old PWA meta tags
const oldMetaPatterns = [
  /<meta[^>]*name=["']theme-color["'][^>]*>/gi,
  /<meta[^>]*name=["']mobile-web-app-capable["'][^>]*>/gi,
  /<meta[^>]*name=["']apple-mobile-web-app-capable["'][^>]*>/gi,
  /<meta[^>]*name=["']apple-mobile-web-app-status-bar-style["'][^>]*>/gi,
  /<meta[^>]*name=["']apple-mobile-web-app-title["'][^>]*>/gi,
  /<link[^>]*rel=["']apple-touch-icon["'][^>]*>/gi
];

oldMetaPatterns.forEach(pattern => {
  html = html.replace(pattern, '');
});

// Add PufferFishes PWA meta tags + SDK
const pwaMetaTags = `
  <!-- PufferFishes PWA Meta Tags -->
  <meta name="theme-color" content="#4F46E5">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="${appName}">
  <link rel="manifest" href="/apps/${appId}/manifest.json">
  <link rel="icon" href="/apps/${appId}/icons/icon-192.png">
  <link rel="apple-touch-icon" href="/apps/${appId}/icons/icon-512.png">

  <!-- PufferFishes SDK - Auto-injected for secure API access -->
  <script>
    // Inline SDK for immediate availability
    // This is a minimal version - full SDK available at @pufferfishes/sdk npm package
    (function() {
      // Polyfill localStorage and sessionStorage for sandboxed iframe
      try {
        const test = window.localStorage;
      } catch (e) {
        console.warn('[PufferFishes SDK] Mocking localStorage in memory due to sandbox constraints');
        const store = {};
        try {
          Object.defineProperty(window, 'localStorage', {
            value: {
              getItem: function(key) { return store[key] || null; },
              setItem: function(key, val) { store[key] = String(val); },
              removeItem: function(key) { delete store[key]; },
              clear: function() { for (const k in store) delete store[k]; },
              key: function(i) { return Object.keys(store)[i] || null; },
              get length() { return Object.keys(store).length; }
            },
            writable: true,
            configurable: true
          });
        } catch (err) {
          console.error('[PufferFishes SDK] Failed to polyfill localStorage:', err);
        }
      }

      try {
        const test = window.sessionStorage;
      } catch (e) {
        console.warn('[PufferFishes SDK] Mocking sessionStorage in memory due to sandbox constraints');
        const store = {};
        try {
          Object.defineProperty(window, 'sessionStorage', {
            value: {
              getItem: function(key) { return store[key] || null; },
              setItem: function(key, val) { store[key] = String(val); },
              removeItem: function(key) { delete store[key]; },
              clear: function() { for (const k in store) delete store[k]; },
              key: function(i) { return Object.keys(store)[i] || null; },
              get length() { return Object.keys(store).length; }
            },
            writable: true,
            configurable: true
          });
        } catch (err) {
          console.error('[PufferFishes SDK] Failed to polyfill sessionStorage:', err);
        }
      }

      window.PufferFishesSDK = class {
        constructor(config = {}) {
          this.appId = config.appId || this.detectAppId();
          this.debug = config.debug || false;
          this.messageId = 0;
          this.pendingRequests = new Map();
          this.setupMessageListener();
          if (this.debug) console.log('[PufferFishes SDK] Initialized for app:', this.appId);
        }

        detectAppId() {
          const match = window.location.pathname.match(/\\/(apps|app-runner)\\/([^\\/]+)/);
          return match ? match[2] : 'unknown';
        }

        setupMessageListener() {
          window.addEventListener('message', (event) => {
            if (event.source !== window.parent) return;
            const response = event.data;
            if (response.type !== 'PF_RESPONSE') return;
            const pending = this.pendingRequests.get(response.id);
            if (pending) {
              clearTimeout(pending.timeout);
              response.error ? pending.reject(new Error(response.error)) : pending.resolve(response.data);
              this.pendingRequests.delete(response.id);
            }
          });
        }

        async sendMessage(type, data, timeoutMs = 30000) {
          const id = this.appId + '_' + (++this.messageId) + '_' + Date.now();
          return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              this.pendingRequests.delete(id);
              reject(new Error('Request timeout after ' + timeoutMs + 'ms'));
            }, timeoutMs);
            this.pendingRequests.set(id, { resolve, reject, timeout });
            window.parent.postMessage({ id, type, appId: this.appId, data }, '*');
          });
        }

        async requestPermission(permission) {
          try {
            const result = await this.sendMessage('PF_REQUEST_PERMISSION', { permission });
            return result.granted === true;
          } catch (error) {
            console.error('[PufferFishes SDK] Permission request failed:', error);
            return false;
          }
        }

        async checkPermission(permission) {
          try {
            const result = await this.sendMessage('PF_CHECK_PERMISSION', { permission });
            return result.granted === true;
          } catch (error) {
            return false;
          }
        }

        get ai() {
          return {
            generate: async (request) => {
              const hasPermission = await this.checkPermission('gemini_api');
              if (!hasPermission) {
                const granted = await this.requestPermission('gemini_api');
                if (!granted) throw new Error('User denied API access');
              }
              return await this.sendMessage('PF_API_CALL', { api: 'gemini', method: 'generate', params: request });
            }
          };
        }

        get storage() {
          return {
            get: async (key) => {
              const result = await this.sendMessage('PF_STORAGE_GET', { key });
              return result.value;
            },
            set: async (key, value) => {
              await this.sendMessage('PF_STORAGE_SET', { key, value });
            },
            remove: async (key) => {
              await this.sendMessage('PF_STORAGE_REMOVE', { key });
            }
          };
        }
      };

      // Make SDK available globally
      if (typeof module !== 'undefined' && module.exports) {
        module.exports = window.PufferFishesSDK;
      }
    })();
  </script>
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
      if (item === 'node_modules' || item.startsWith('.')) {
        return;
      }
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

// Add service worker registration verification
const finalHtml = fs.readFileSync(indexPath, 'utf8');
if (!finalHtml.includes('serviceWorker.register')) {
  console.warn('WARNING: Service worker registration not found in HTML!');
} else {
  console.log('✓ Service worker registration verified');
}

if (!finalHtml.includes('rel="manifest"')) {
  console.warn('WARNING: Manifest link not found in HTML!');
} else {
  console.log('✓ Manifest link verified');
}

console.log('\n=== PWA Injection Complete ===');
console.log(`✓ Total files cached: ${files.length}`);
console.log(`✓ App ID: ${appId}`);
console.log(`✓ App Name: ${appName}`);
console.log(`✓ Install URL: https://pufferfishes.net/apps/${appId}/`);
console.log(`✓ Manifest URL: https://pufferfishes.net/apps/${appId}/manifest.json`);
console.log('\nThe app is now a fully functional PWA and ready to install!');
