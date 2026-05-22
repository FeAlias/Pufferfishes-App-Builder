# PWA Conversion Workflow

## Overview

When a developer imports a GitHub repository into PufferFishes, it is automatically converted into a Progressive Web App (PWA) that can be installed directly from the marketplace. This document explains the complete workflow.

## Process Flow

### 1. Developer Imports Repository

**Location:** `/api/apps/import`

- Developer submits GitHub URL via Developer View
- App record created with status `pending_approval`
- Admin must approve before build starts

### 2. Admin Approval

**Location:** `/api/admin/apps/[id]/approve`

- Admin reviews and approves the submitted app
- Triggers GitHub Actions workflow in `Pufferfishes-App-Builder` repository

### 3. Automated Build Pipeline

**Location:** `.github/workflows/build-app.yml`

The GitHub Actions workflow performs the following steps:

#### Step 1: Clone Repository
```bash
git clone <github-url> target-app
```

#### Step 2: Clean Existing PWA Files
```bash
node scripts/clean-pwa.js --target-dir target-app
```

**Removes:**
- `manifest.json` / `manifest.webmanifest`
- `service-worker.js` / `sw.js`
- PWA meta tags from HTML files
- PWA dependencies from `package.json`
- PWA icons from common directories
- Service worker registration scripts

#### Step 3: Detect Framework & Install Dependencies
- Validates `package.json` exists
- Installs npm dependencies
- Detects build script

#### Step 4: Build Application
```bash
npm run build
```

Automatically detects output directory:
- `build/` (Create React App, etc.)
- `dist/` (Vite, Webpack, etc.)
- `out/` (Next.js, etc.)

#### Step 5: Inject PufferFishes PWA Assets
```bash
node scripts/build-pwa.js --build-dir <dir> --app-id <id> --app-name <name>
```

**Creates:**
- `manifest.json` - PWA manifest with app metadata
- `service-worker.js` - Offline caching and network fallback
- `icons/` directory with app icons (192x192, 512x512)
- PWA meta tags injected into `<head>` of `index.html`
- Service worker registration script injected before `</body>`

#### Step 6: Upload to Cloudflare R2
```bash
aws s3 sync . s3://<bucket>/apps/<app-id>/ --endpoint-url <r2-endpoint>
```

All files uploaded to R2 storage with public access.

#### Step 7: Notify PufferFishes Backend

**Success callback:**
```json
{
  "app_id": "123",
  "status": "success",
  "bundle_key": "apps/123/index.html",
  "manifest_url": "https://pufferfishes.net/apps/123/manifest.json",
  "install_url": "https://pufferfishes.net/apps/123/",
  "pwa_scope": "/apps/123/",
  "theme_color": "#4F46E5",
  "icon_url": "https://pufferfishes.net/apps/123/icons/icon-192.png"
}
```

**Location:** `/api/build/callback`

Updates database with `published` status and PWA metadata.

### 4. User Installation from Marketplace

**Location:** `views/MarketplaceView.tsx` → `views/RunnerView.tsx`

1. User browses marketplace and clicks on an app
2. App opens in `RunnerView` with iframe or local runner
3. Service worker automatically registers
4. Browser shows "Install" button
5. User clicks "Install App" button
6. PWA installs to device home screen
7. App can now run offline and standalone

## PWA Features

### Service Worker Capabilities

**Cache Strategy:**
- Cache-first for app shell
- Network fallback for dynamic content
- Offline support for previously cached pages

**Update Handling:**
- Automatic version detection
- User prompted to reload for updates
- Old caches automatically cleaned up

### Manifest Configuration

**Generated for each app:**
```json
{
  "name": "App Name",
  "short_name": "App",
  "description": "App Name - Powered by PufferFishes",
  "start_url": "/apps/{id}/",
  "scope": "/apps/{id}/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4F46E5",
  "icons": [...]
}
```

### Installation UI

**Features:**
- Floating "Install App" button
- iOS-specific instructions (Share → Add to Home Screen)
- Auto-hide after installation
- Update notifications

## Files Modified/Created

### Build Workflow
- `.github/workflows/build-app.yml` - Main build pipeline
- `scripts/clean-pwa.js` - PWA cleanup script
- `scripts/build-pwa.js` - PWA injection script

### PWA Templates
- `templates/service-worker.template.js` - Service worker template
- `templates/install-prompt.html` - Installation UI script
- `templates/api-key-manager.html` - API key management

### Frontend
- `views/RunnerView.tsx` - App runner with install button
- `views/MarketplaceView.tsx` - Marketplace display
- `apps/LocalAppRunner.tsx` - OPFS-based app runner

### Backend
- `functions/api/apps/import.ts` - Import handler
- `functions/api/admin/apps/[id]/approve.ts` - Approval handler
- `functions/api/build/callback.ts` - Build completion webhook
- `functions/apps/[[path]].ts` - R2 file serving

## Testing the Workflow

### Local Testing

1. **Test PWA Cleanup:**
   ```bash
   # Create a test app with existing PWA files
   mkdir test-app
   cd test-app
   echo '{"name": "test"}' > manifest.json
   echo 'self.addEventListener("install", () => {});' > service-worker.js

   # Run cleanup
   node scripts/clean-pwa.js --target-dir test-app

   # Verify files removed
   ls -la test-app/
   ```

2. **Test PWA Injection:**
   ```bash
   # Build a simple app
   cd test-app
   mkdir build
   echo '<html><head></head><body>Test</body></html>' > build/index.html

   # Run PWA injection
   node scripts/build-pwa.js --build-dir build --app-id test --app-name "Test App"

   # Verify files created
   ls -la build/
   cat build/manifest.json
   cat build/service-worker.js
   ```

### Production Testing

1. Import a GitHub repository via Developer View
2. Wait for admin approval
3. Monitor GitHub Actions workflow
4. Check app appears in marketplace
5. Launch app from marketplace
6. Click "Install App" button
7. Verify app installs to home screen
8. Test offline functionality

## Troubleshooting

### Build Fails

**Issue:** `No package.json found`
- **Solution:** Repository must be a Node.js project

**Issue:** `Could not find build output directory`
- **Solution:** Ensure `npm run build` creates `build/`, `dist/`, or `out/`

### PWA Not Installing

**Issue:** Install button doesn't appear
- **Solution:** Check that manifest and service worker are loaded correctly
- **Check:** Open DevTools → Application → Manifest
- **Check:** Open DevTools → Application → Service Workers

**Issue:** Service worker registration fails
- **Solution:** Ensure HTTPS is used (required for PWA)
- **Check:** Open DevTools → Console for errors

### App Not in Marketplace

**Issue:** App doesn't appear after build
- **Solution:** Check app status in database is `published`
- **Check:** Verify callback webhook was successful
- **Check:** Check R2 bucket for uploaded files

## Security Considerations

- All apps run in isolated iframes with restricted permissions
- Service workers only have access to their own scope (`/apps/{id}/`)
- API keys stored in localStorage (per-app isolation)
- R2 files served with proper CORS headers
- Cloudflare CDN caching for performance

## Performance Optimizations

- Service worker caches up to 50 files initially
- Lazy loading for remaining assets
- Gzip compression via Cloudflare
- CDN edge caching for global delivery
- OPFS (Origin Private File System) for offline storage

## Future Enhancements

- [ ] Automatic icon extraction from repository
- [ ] Screenshot generation for app store
- [ ] Background sync for offline actions
- [ ] Push notifications support
- [ ] Web Share API integration
- [ ] Automatic testing before approval
- [ ] Version management (updates)
- [ ] Rollback capability
