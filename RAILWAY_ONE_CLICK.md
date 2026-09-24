# Railway Backend - ONE CLICK DEPLOYMENT 🚀

## Step 1: Open Railway (2 mins)
1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub"
3. Select `Vedantkapse901/studioarch`
4. Click "Deploy"

## Step 2: Add Environment Variables (2 mins)
Railway Dashboard → Variables Tab → Add these:

```
VITE_B2_KEY_ID = 379cd0b52bbf
VITE_B2_APPLICATION_KEY = 004a72718b0ba180f5b742b7a1f4840d3c9ec904b4
VITE_B2_BUCKET_NAME = STUDIO-ARCH
VITE_B2_BUCKET_ID = 0327892cfdc0dba592eb0b1f
PORT = 3000
NODE_ENV = production
```

## Step 3: Deploy (5-10 mins)
Railway auto-deploys! Watch the logs.

## Step 4: Get Your URL
Railway Dashboard → Deployments → Copy URL

Example:
```
https://studioarch-production-xyz.up.railway.app
```

## Step 5: Update Vercel
Vercel Dashboard → Settings → Environment Variables

Add:
```
VITE_API_BACKEND_URL=https://your-railway-url.up.railway.app
```

Then redeploy Vercel ✅

## Done! ✅

Your complete stack:
- Frontend: Vercel
- Backend: Railway
- Database: Supabase
- Storage: B2

Test upload at: https://studioarch-main.vercel.app/admin
