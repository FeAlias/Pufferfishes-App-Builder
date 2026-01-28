# PufferFishes App Builder

Automated PWA builder for the PufferFishes marketplace. This repository contains GitHub Actions workflows that:

1. Clone developer GitHub repositories
2. Build the apps (React, Vue, etc.)
3. Inject PWA capabilities (manifest, service worker, install prompts)
4. Upload to Cloudflare R2
5. Notify PufferFishes platform when complete

## Setup Instructions

### 1. Copy Files to Builder Repository

Copy all files from this directory to your `FeAlias/Pufferfishes-App-Builder` repository:

```bash
# Navigate to your builder repo
cd path/to/Pufferfishes-App-Builder

# Copy files (adjust paths as needed)
cp -r ../PufferFishes.NetV2/builder-repo-files/* .

# Commit and push
git add .
git commit -m "feat: add PWA build workflow and scripts"
git push origin main
```

### 2. Configure GitHub Repository Secrets

In your `FeAlias/Pufferfishes-App-Builder` repository, go to **Settings → Secrets and variables → Actions** and add:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `R2_ACCESS_KEY_ID` | Cloudflare R2 Access Key ID | `abc123...` |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 Secret Access Key | `xyz789...` |
| `R2_ENDPOINT` | Cloudflare R2 Endpoint URL | `https://[account-id].r2.cloudflaresapis.com` |
| `R2_BUCKET_NAME` | R2 Bucket Name | `pufferfishes-apps` |
| `CALLBACK_SECRET` | Shared secret for auth | `your-secret-key-123` |

### 3. Get Cloudflare R2 Credentials

```bash
# Create R2 bucket
wrangler r2 bucket create pufferfishes-apps

# Generate R2 API tokens
# Go to Cloudflare Dashboard → R2 → Manage R2 API Tokens → Create API Token
# Scope: Read & Write for pufferfishes-apps bucket
# Copy the Access Key ID and Secret Access Key
```

### 4. Configure PufferFishes Backend

In your PufferFishes.NetV2 `.dev.vars` file, add:

```bash
# GitHub Actions Configuration
GITHUB_PAT=ghp_xxxxxxxxxxxxx  # Personal Access Token with 'repo' and 'workflow' scopes
GITHUB_BUILDER_REPO=FeAlias/Pufferfishes-App-Builder
BUILD_CALLBACK_SECRET=your-secret-key-123  # Must match GitHub Actions secret

# Cloudflare R2 Configuration
R2_BUCKET_NAME=pufferfishes-apps
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
```

### 5. Run Database Migration

```bash
cd PufferFishes.NetV2
wrangler d1 execute pufferfishes-db --file=migrations/0005_add_pwa_fields.sql
```

### 6. Deploy PufferFishes Backend

```bash
cd PufferFishes.NetV2
npm run deploy
```

## How It Works

### Workflow Trigger

When a developer imports an app:

1. PufferFishes calls GitHub API to trigger `build-app.yml` workflow
2. Workflow receives: `repo_url`, `app_id`, `callback_url`, `app_name`

### Build Process

1. **Clone**: Clone developer's repository
2. **Detect**: Auto-detect framework (React, Vue, etc.)
3. **Install**: Run `npm install`
4. **Build**: Run build script from `package.json`
5. **Inject**: Add PWA assets (manifest, service worker, install prompt)
6. **Upload**: Sync files to Cloudflare R2 at `/apps/{app_id}/`
7. **Notify**: Call PufferFishes callback endpoint with success/failure

### PWA Features Added

- **Manifest.json**: App metadata for installation
- **Service Worker**: Offline caching and updates
- **Install Prompt**: UI button to install app
- **API Key Manager**: Prompt for Gemini API key on first run
- **Meta Tags**: PWA-required meta tags in HTML

## Testing

### Manual Test

1. Go to builder repo: https://github.com/FeAlias/Pufferfishes-App-Builder
2. Click **Actions** tab
3. Select **Build PWA App** workflow
4. Click **Run workflow**
5. Enter test values:
   - `repo_url`: https://github.com/your-username/test-react-app
   - `app_id`: 999
   - `callback_url`: https://your-domain.com/api/build/callback
   - `app_name`: Test App
6. Watch workflow run (2-5 minutes)
7. Check R2 bucket for files at `/apps/999/`

### End-to-End Test

1. Login to PufferFishes as developer
2. Navigate to Developer page
3. Import a simple React app:
   - Example: https://github.com/facebook/create-react-app
4. Watch build status change: pending → building → published
5. Navigate to: `https://pufferfishes.net/apps/{appId}/`
6. Browser should show install prompt
7. Install app to home screen
8. Open installed app (standalone mode)
9. Test offline by disconnecting internet

## Troubleshooting

### Build Fails

Check GitHub Actions logs:
1. Go to Actions tab in builder repo
2. Click on failed run
3. Expand failed step to see error

Common issues:
- **No package.json**: Repo is not a Node.js project
- **No build script**: Add `"build"` script to package.json
- **Build timeout**: Optimize build or increase timeout

### PWA Not Installable

Run Lighthouse audit:
1. Open app URL in Chrome
2. Open DevTools (F12)
3. Go to Lighthouse tab
4. Run PWA audit
5. Check for failures

### R2 Upload Fails

Check AWS CLI configuration:
- Verify R2_ACCESS_KEY_ID secret
- Verify R2_SECRET_ACCESS_KEY secret
- Verify R2_ENDPOINT format

## File Structure

```
Pufferfishes-App-Builder/
├── .github/
│   └── workflows/
│       └── build-app.yml          # Main workflow
├── scripts/
│   └── build-pwa.js               # PWA injection script
├── templates/
│   ├── service-worker.template.js # Service worker template
│   ├── install-prompt.html        # Install button UI
│   └── api-key-manager.html       # API key prompt UI
├── package.json                    # Dependencies (minimal)
├── .gitignore                      # From your existing repo
├── LICENSE                         # From your existing repo
└── README.md                       # This file
```

## Next Steps

After Phase A is working:

- **Phase B**: Add Stripe payment integration
- **Phase C**: Implement social rewards system
- **Phase D**: Add messaging/chat features

See the main implementation plan for details.

## Support

For issues or questions:
- GitHub Issues: https://github.com/FeAlias/Pufferfishes-App-Builder/issues
- Main Platform: https://github.com/[your-org]/PufferFishes.NetV2
