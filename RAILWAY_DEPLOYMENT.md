# Deploy Backend to Railway

## Step 1: Prepare Backend Files

```bash
# Copy complete backend
cp backend-complete-with-rotation.js server.js
```

## Step 2: Create Railway App

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub"
4. Connect your repository

## Step 3: Set Environment Variables

In Railway Dashboard → Variables:

```
VITE_B2_KEY_ID=379cd0b52bbf
VITE_B2_APPLICATION_KEY=004a72718b0ba180f5b742b7a1f4840d3c9ec904b4
VITE_B2_BUCKET_NAME=STUDIO-ARCH
VITE_B2_BUCKET_ID=0327892cfdc0dba592eb0b1f
PORT=3000
NODE_ENV=production
```

## Step 4: Configure Start Script

In package.json, ensure:
```json
"scripts": {
  "dev:server": "node server.js",
  "start": "node server.js"
}
```

## Step 5: Deploy

Railway will auto-deploy! 🚀

Your backend URL will be:
```
https://your-project-name.railway.app
```

## Step 6: Update Vercel Frontend

Update environment variable in Vercel:
```
VITE_API_BACKEND_URL=https://your-project-name.railway.app
```

## Testing

```bash
# Health check
curl https://your-project-name.railway.app/health

# Upload test
curl -X POST https://your-project-name.railway.app/b2-upload \
  -H "X-File-Name: test.jpg" \
  --data-binary @test.jpg
```

## Features

✅ B2 Upload (images & videos)
✅ Image Rotation (90°, 180°, 270°)
✅ Fast Processing (Sharp)
✅ 500MB file limit
✅ CORS enabled
✅ Production ready
