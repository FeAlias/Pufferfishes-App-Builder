#!/usr/bin/env node

/**
 * Test Script for PWA Conversion
 *
 * This script tests the complete PWA conversion workflow locally
 * without requiring GitHub Actions or production environment.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function success(message) {
  log(`✓ ${message}`, 'green');
}

function error(message) {
  log(`✗ ${message}`, 'red');
}

function info(message) {
  log(`ℹ ${message}`, 'cyan');
}

function warning(message) {
  log(`⚠ ${message}`, 'yellow');
}

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
const testRepoUrl = options['repo-url'];

if (!testRepoUrl) {
  error('Usage: test-pwa-conversion.js --repo-url <github-url>');
  console.log('\nExample:');
  console.log('  node test-pwa-conversion.js --repo-url https://github.com/user/my-react-app');
  process.exit(1);
}

const TEST_DIR = path.join(__dirname, '..', 'test-conversion');
const TARGET_DIR = path.join(TEST_DIR, 'target-app');
const TEST_APP_ID = 'test-app-' + Date.now();
const TEST_APP_NAME = 'Test PWA App';

log('\n========================================', 'bright');
log('  PWA Conversion Test', 'bright');
log('========================================\n', 'bright');

// Test Step 1: Setup
log('Step 1: Setting up test environment...', 'blue');
try {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
    info('Cleaned up old test directory');
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });
  success('Test environment created');
} catch (e) {
  error(`Failed to setup test environment: ${e.message}`);
  process.exit(1);
}

// Test Step 2: Clone repository
log('\nStep 2: Cloning repository...', 'blue');
try {
  info(`Cloning: ${testRepoUrl}`);
  execSync(`git clone ${testRepoUrl} target-app`, {
    cwd: TEST_DIR,
    stdio: 'inherit'
  });
  success('Repository cloned successfully');
} catch (e) {
  error(`Failed to clone repository: ${e.message}`);
  process.exit(1);
}

// Test Step 3: Check for existing PWA files
log('\nStep 3: Checking for existing PWA files...', 'blue');
const pwaFiles = [
  'manifest.json',
  'manifest.webmanifest',
  'service-worker.js',
  'sw.js',
  'public/manifest.json',
  'public/service-worker.js'
];

let foundPwaFiles = [];
pwaFiles.forEach(file => {
  const fullPath = path.join(TARGET_DIR, file);
  if (fs.existsSync(fullPath)) {
    foundPwaFiles.push(file);
  }
});

if (foundPwaFiles.length > 0) {
  warning(`Found ${foundPwaFiles.length} existing PWA file(s):`);
  foundPwaFiles.forEach(f => console.log(`    - ${f}`));
} else {
  info('No existing PWA files found');
}

// Test Step 4: Run PWA cleanup
log('\nStep 4: Running PWA cleanup...', 'blue');
try {
  execSync(`node ${path.join(__dirname, 'clean-pwa.js')} --target-dir ${TARGET_DIR}`, {
    stdio: 'inherit'
  });
  success('PWA cleanup completed');
} catch (e) {
  error(`PWA cleanup failed: ${e.message}`);
  process.exit(1);
}

// Verify cleanup
let remainingPwaFiles = [];
pwaFiles.forEach(file => {
  const fullPath = path.join(TARGET_DIR, file);
  if (fs.existsSync(fullPath)) {
    remainingPwaFiles.push(file);
  }
});

if (remainingPwaFiles.length > 0) {
  warning(`${remainingPwaFiles.length} PWA file(s) still present after cleanup:`);
  remainingPwaFiles.forEach(f => console.log(`    - ${f}`));
} else {
  success('All PWA files removed successfully');
}

// Test Step 5: Detect and install dependencies
log('\nStep 5: Installing dependencies...', 'blue');
const packageJsonPath = path.join(TARGET_DIR, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  error('No package.json found. This is not a Node.js project.');
  process.exit(1);
}

try {
  info('Running npm install...');
  execSync('npm install', {
    cwd: TARGET_DIR,
    stdio: 'inherit'
  });
  success('Dependencies installed');
} catch (e) {
  error(`Failed to install dependencies: ${e.message}`);
  process.exit(1);
}

// Test Step 6: Build the app
log('\nStep 6: Building application...', 'blue');
try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const buildScript = packageJson.scripts?.build || 'build';

  info(`Running: npm run ${buildScript}`);
  execSync(`npm run ${buildScript}`, {
    cwd: TARGET_DIR,
    stdio: 'inherit'
  });
  success('Application built successfully');
} catch (e) {
  error(`Build failed: ${e.message}`);
  process.exit(1);
}

// Test Step 7: Detect build directory
log('\nStep 7: Detecting build output...', 'blue');
const possibleBuildDirs = ['build', 'dist', 'out'];
let buildDir = null;

for (const dir of possibleBuildDirs) {
  const dirPath = path.join(TARGET_DIR, dir);
  if (fs.existsSync(dirPath)) {
    buildDir = dir;
    break;
  }
}

if (!buildDir) {
  error('Could not find build output directory (build/, dist/, or out/)');
  process.exit(1);
}

const buildPath = path.join(TARGET_DIR, buildDir);
info(`Found build directory: ${buildDir}/`);

// Check for index.html
const indexPath = path.join(buildPath, 'index.html');
if (!fs.existsSync(indexPath)) {
  error('No index.html found in build directory');
  process.exit(1);
}
success('Build output validated');

// Test Step 8: Inject PWA assets
log('\nStep 8: Injecting PWA assets...', 'blue');
try {
  execSync(`node ${path.join(__dirname, 'build-pwa.js')} --build-dir ${buildPath} --app-id ${TEST_APP_ID} --app-name "${TEST_APP_NAME}" --repo-url ${testRepoUrl}`, {
    stdio: 'inherit'
  });
  success('PWA assets injected');
} catch (e) {
  error(`PWA injection failed: ${e.message}`);
  process.exit(1);
}

// Test Step 9: Verify PWA assets
log('\nStep 9: Verifying PWA assets...', 'blue');
const requiredFiles = [
  'manifest.json',
  'service-worker.js',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

let missingFiles = [];
requiredFiles.forEach(file => {
  const fullPath = path.join(buildPath, file);
  if (fs.existsSync(fullPath)) {
    success(`Found: ${file}`);
  } else {
    error(`Missing: ${file}`);
    missingFiles.push(file);
  }
});

if (missingFiles.length > 0) {
  error(`${missingFiles.length} required PWA file(s) missing`);
  process.exit(1);
}

// Verify HTML modifications
const html = fs.readFileSync(indexPath, 'utf8');
const requiredHtmlElements = [
  { pattern: /<link[^>]*rel=["']manifest["']/, name: 'Manifest link' },
  { pattern: /serviceWorker\.register/, name: 'Service worker registration' },
  { pattern: /<meta[^>]*name=["']theme-color["']/, name: 'Theme color meta tag' },
];

log('\nVerifying HTML modifications:', 'blue');
let htmlErrors = [];
requiredHtmlElements.forEach(({ pattern, name }) => {
  if (pattern.test(html)) {
    success(name);
  } else {
    error(`Missing: ${name}`);
    htmlErrors.push(name);
  }
});

if (htmlErrors.length > 0) {
  error(`${htmlErrors.length} required HTML element(s) missing`);
  process.exit(1);
}

// Verify manifest.json content
log('\nVerifying manifest content:', 'blue');
const manifest = JSON.parse(fs.readFileSync(path.join(buildPath, 'manifest.json'), 'utf8'));
const requiredManifestFields = ['name', 'short_name', 'start_url', 'scope', 'display', 'icons'];

let manifestErrors = [];
requiredManifestFields.forEach(field => {
  if (manifest[field]) {
    success(`${field}: ${JSON.stringify(manifest[field]).substring(0, 50)}`);
  } else {
    error(`Missing field: ${field}`);
    manifestErrors.push(field);
  }
});

if (manifestErrors.length > 0) {
  error(`${manifestErrors.length} required manifest field(s) missing`);
  process.exit(1);
}

// Test Step 10: Summary
log('\n========================================', 'bright');
log('  Test Summary', 'bright');
log('========================================\n', 'bright');

success('All tests passed!');
info(`Build directory: ${buildPath}`);
info(`App ID: ${TEST_APP_ID}`);
info(`App Name: ${TEST_APP_NAME}`);

log('\nTo test the PWA locally:', 'yellow');
log(`  1. Serve the build directory with a local server:`, 'cyan');
log(`     npx serve ${buildPath}`, 'cyan');
log(`  2. Open in browser (HTTPS required for PWA):`, 'cyan');
log(`     https://localhost:3000`, 'cyan');
log(`  3. Check DevTools → Application → Manifest`, 'cyan');
log(`  4. Check DevTools → Application → Service Workers`, 'cyan');
log(`  5. Look for "Install" button in browser address bar\n`, 'cyan');

log('Cleanup:', 'yellow');
log(`  To remove test files: rm -rf ${TEST_DIR}\n`, 'cyan');
