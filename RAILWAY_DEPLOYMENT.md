# Railway Deployment Guide

Complete step-by-step guide to deploy the YouTube Downloader backend on Railway.

## Prerequisites

- GitHub account
- Railway account (sign up at [railway.app](https://railway.app))
- Git installed locally

## Step 1: Prepare Your Repository

### Option A: Create New Repository

```bash
# Create project directory
mkdir youtube-downloader-backend
cd youtube-downloader-backend

# Initialize git
git init

# Create all files (server.js, package.json, etc.)
# ... copy all provided files

# Create initial commit
git add .
git commit -m "Initial commit - YouTube downloader backend"

# Create GitHub repository and push
gh repo create youtube-downloader-backend --public --source=. --remote=origin --push
# OR manually create on GitHub and:
git remote add origin https://github.com/YOUR_USERNAME/youtube-downloader-backend.git
git branch -M main
git push -u origin main
```

### Option B: Clone Existing Repository

```bash
git clone https://github.com/YOUR_USERNAME/youtube-downloader-backend.git
cd youtube-downloader-backend
```

## Step 2: Deploy to Railway

### Method 1: Deploy from GitHub (Recommended)

1. **Login to Railway**
   - Go to [railway.app](https://railway.app)
   - Click "Login" → Sign in with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Authorize Railway to access your repositories
   - Select `youtube-downloader-backend`

3. **Configure Deployment**
   - Railway auto-detects Node.js project
   - It will use `package.json` start script
   - Build command: `npm install`
   - Start command: `node server.js` (from Procfile)

4. **Generate Domain**
   - Go to project "Settings"
   - Under "Networking" → Click "Generate Domain"
   - Copy the URL (e.g., `https://your-app.up.railway.app`)

5. **Check Deployment**
   - Go to "Deployments" tab
   - Click latest deployment
   - View logs - should see "Server running on port XXXX"

### Method 2: Deploy from CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Link to new project
railway link

# Deploy
railway up
```

## Step 3: Verify Deployment

Test your deployed API:

```bash
# Replace with your Railway URL
export API_URL="https://your-app.up.railway.app"

# Health check
curl $API_URL

# Probe video
curl "$API_URL/probe?url=https://youtube.com/watch?v=dQw4w9WgXcQ"
```

## Step 4: Configure Environment (Optional)

Railway automatically sets `PORT` and `NODE_ENV`. You can add custom variables:

1. Go to project → "Variables"
2. Add variables (if needed):
   ```
   NODE_ENV=production
   LOG_LEVEL=info
   ```

## Step 5: Enable Auto-Deploy

Railway automatically deploys on git push:

```bash
# Make changes
vim server.js

# Commit and push
git add .
git commit -m "Update feature"
git push origin main

# Railway deploys automatically
```

## Railway Configuration Details

### Procfile
```
web: node server.js
```
This tells Railway how to start your application.

### package.json Scripts
```json
{
  "scripts": {
    "start": "node server.js"
  }
}
```
Railway runs `npm start` by default.

### Port Configuration
```javascript
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', ...);
```
Railway provides `PORT` environment variable dynamically.

### File System
- Use `__dirname` for absolute paths
- Downloads directory: `path.join(__dirname, 'tmp', 'downloads')`
- Railway provides ephemeral disk storage

## Troubleshooting

### Deployment Fails

**Check Build Logs:**
1. Go to Deployments tab
2. Click failed deployment
3. View "Build Logs" section

**Common Issues:**
- Missing `package.json`: Ensure it's committed
- Wrong Node version: Check `engines` in package.json
- Missing dependencies: Run `npm install` locally first

### Application Crashes

**Check Runtime Logs:**
1. Go to Deployments tab
2. Click deployment
3. View "Deploy Logs" section

**Common Issues:**
- Port binding: Ensure using `process.env.PORT`
- yt-dlp download failed: Check network logs
- Permissions: Railway runs as non-root user

### yt-dlp Not Working

The app downloads yt-dlp automatically. If it fails:

1. **Check Logs:**
   ```
   [yt-dlp] Downloading from: https://github.com/...
   ✓ yt-dlp downloaded
   ✓ yt-dlp version: 2024.xx.xx
   ```

2. **Manual Verification:**
   - Railway provides shell access via CLI
   - `railway run bash`
   - `ls -la bin/`
   - `./bin/yt-dlp --version`

### Timeout Issues

For large videos, Railway has limits:
- Free tier: 5 minute timeout
- Pro tier: Configurable timeout

**Increase timeout in code:**
```javascript
// In utils/runYtDlp.js
const timeout = setTimeout(() => {
  process.kill();
  reject(new Error('Timeout'));
}, 1800000); // 30 minutes instead of 10
```

### Memory Issues

Railway free tier: 512MB RAM

**For large playlists:**
- Process videos in batches
- Or upgrade Railway plan

## Monitoring

### View Logs
```bash
# Via CLI
railway logs

# Or in web dashboard
# Go to project → Deployments → Click deployment → View logs
```

### Metrics
Railway dashboard shows:
- CPU usage
- Memory usage
- Network traffic
- Request count

## Updating Your App

```bash
# Make changes locally
vim server.js

# Test locally
npm start

# Commit and push
git add .
git commit -m "Description of changes"
git push origin main

# Railway auto-deploys
# Check deployment status in dashboard
```

## Custom Domain (Optional)

1. Go to project Settings
2. Under "Networking"
3. Click "Custom Domain"
4. Add your domain
5. Update DNS records as shown

## Cost Considerations

**Free Tier:**
- $5 free credit per month
- Enough for ~100-200 downloads/month
- 512MB RAM
- Shared CPU

**Pro Tier ($20/month):**
- 8GB RAM
- 8 vCPUs
- Priority support
- Longer timeouts

## Security Best Practices

1. **Rate Limiting:** Add rate limiting middleware
   ```bash
   npm install express-rate-limit
   ```

2. **Environment Variables:** Never commit secrets
   ```bash
   echo ".env" >> .gitignore
   ```

3. **HTTPS Only:** Railway provides SSL automatically

4. **Input Validation:** Already implemented in code

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- yt-dlp Docs: https://github.com/yt-dlp/yt-dlp

## Quick Reference

```bash
# Railway CLI commands
railway login              # Login to Railway
railway init              # Initialize project
railway link              # Link to existing project
railway up                # Deploy current directory
railway logs              # View logs
railway run bash          # Open shell in container
railway open              # Open project in browser
```

Your YouTube downloader backend is now live on Railway! 🚀