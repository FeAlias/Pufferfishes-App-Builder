# PufferFishes PWA Builder - Quick Start

## What This Does

When you import a GitHub repository into PufferFishes, it is automatically:
1. **Cloned** from GitHub
2. **Cleaned** of any existing PWA code
3. **Built** using `npm run build`
4. **Converted** into a PWA with PufferFishes assets
5. **Uploaded** to Cloudflare R2
6. **Published** to the marketplace

Users can then **install** your app as a PWA directly from the marketplace!

## For Developers: Import Your App

### Step 1: Prepare Your Repository

Your repository must have:
- ✅ `package.json` with a `build` script
- ✅ A build output in `build/`, `dist/`, or `out/`
- ✅ An `index.html` in the build output

Example `package.json`:
```json
{
  "name": "my-app",
  "scripts": {
    "build": "react-scripts build"
  }
}
```

### Step 2: Import to PufferFishes

1. Go to **Developer View** in PufferFishes
2. Enter your GitHub repository URL
3. Add app name and description
4. Click **Import**

### Step 3: Wait for Approval

- Admin reviews your submission
- Once approved, automatic build starts
- You'll be notified when published

### Step 4: Test Your App

1. Open the marketplace
2. Find your app
3. Click to launch
4. Click "Install App" button
5. App installs to your device!

## Testing Locally (Before Import)

### Test Your Build

```bash
# Clone your repo
git clone https://github.com/you/your-app

# Install dependencies
cd your-app
npm install

# Build
npm run build

# Verify build output exists
ls -la build/  # or dist/ or out/
```

### Test PWA Conversion

```bash
# Run the test script
node scripts/test-pwa-conversion.js --repo-url https://github.com/you/your-app

# This will:
# 1. Clone your repo
# 2. Clean existing PWA files
# 3. Install dependencies
# 4. Build your app
# 5. Inject PufferFishes PWA assets
# 6. Verify everything works
```

### Test PWA Locally

```bash
# Serve your build directory
cd test-conversion/target-app/build  # (or dist/ or out/)
npx serve --ssl-cert cert.pem --ssl-key key.pem -p 3000

# Open in browser
# https://localhost:3000

# Check in DevTools:
# - Application → Manifest
# - Application → Service Workers
```

## For Admins: Approve Apps

1. Go to **Admin Dashboard**
2. View **Pending Apps**
3. Review app details and GitHub repo
4. Click **Approve** or **Reject**

When approved:
- GitHub Actions workflow triggers automatically
- Build runs on GitHub runners
- App publishes to marketplace when build completes

## Project Structure

```
builder-repo-files/
├── .github/workflows/
│   └── build-app.yml          # Main build pipeline
├── scripts/
│   ├── clean-pwa.js           # Remove existing PWA files
│   ├── build-pwa.js           # Inject PufferFishes PWA assets
│   └── test-pwa-conversion.js # Test workflow locally
├── templates/
│   ├── service-worker.template.js  # Service worker template
│   ├── install-prompt.html         # Installation UI
│   └── api-key-manager.html        # API key management
├── PWA-CONVERSION.md          # Detailed technical docs
└── QUICK-START.md             # This file
```

## What Gets Replaced

### Old PWA Files Removed ❌
- `manifest.json` / `manifest.webmanifest`
- `service-worker.js` / `sw.js`
- PWA meta tags in HTML
- PWA dependencies in `package.json`
- Old PWA icons

### PufferFishes PWA Files Added ✅
- New `manifest.json` with PufferFishes branding
- New `service-worker.js` with offline support
- PWA meta tags in `<head>`
- Service worker registration script
- App icons (192x192, 512x512)
- Install prompt UI

## PWA Features Included

### 📱 Installation
- Install button in browser
- iOS instructions (Share → Add to Home Screen)
- Standalone app experience

### 🔄 Offline Support
- Service worker caches app shell
- Works offline after first visit
- Automatic cache updates

### 🚀 Performance
- Cache-first strategy
- Fast loading
- No network needed after install

### 🔔 Updates
- Automatic update detection
- User prompted to reload
- Seamless version updates

## Troubleshooting

### "No package.json found"
**Problem:** Repository is not a Node.js project
**Solution:** Add `package.json` with build script

### "Could not find build output directory"
**Problem:** Build doesn't create `build/`, `dist/`, or `out/`
**Solution:** Update build script to output to one of these directories

### "Build failed"
**Problem:** Build script fails
**Solution:** Test build locally first with `npm run build`

### "Install button doesn't appear"
**Problem:** PWA not detected by browser
**Solution:** Check DevTools → Application for errors

### "Service worker registration failed"
**Problem:** HTTPS required for service workers
**Solution:** Use HTTPS (works automatically in production)

## Support

- **Documentation:** `PWA-CONVERSION.md`
- **Test Script:** `scripts/test-pwa-conversion.js`
- **GitHub Issues:** Report problems in repository

## Example Repositories

Good examples for testing:

1. **Create React App:**
   ```bash
   npx create-react-app my-test-app
   cd my-test-app
   npm run build
   # Creates build/ directory ✓
   ```

2. **Vite:**
   ```bash
   npm create vite@latest my-test-app -- --template react
   cd my-test-app
   npm install
   npm run build
   # Creates dist/ directory ✓
   ```

3. **Next.js (Static Export):**
   ```bash
   npx create-next-app@latest my-test-app
   cd my-test-app
   npm run build
   # Creates out/ directory ✓
   ```

## Best Practices

### ✅ DO
- Test build locally before importing
- Use semantic versioning in package.json
- Include proper README in your repo
- Test app after installation
- Use descriptive app names

### ❌ DON'T
- Include sensitive data in public repos
- Use proprietary code without permission
- Import apps that require server-side code
- Skip testing before importing
- Use generic app names

## Next Steps

1. ✅ Prepare your repository
2. ✅ Test build locally
3. ✅ Test PWA conversion with test script
4. ✅ Import to PufferFishes
5. ✅ Wait for approval
6. ✅ Test in marketplace
7. ✅ Share with users!

---

**Happy Building! 🐡**
