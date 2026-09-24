# Test B2 Uploads Locally

## Setup

### 1. Check .env has B2 credentials
```
VITE_B2_BUCKET_NAME=STUDIO-ARCH
VITE_B2_BUCKET_ID=0327892cfdc0dba592eb0b1f
VITE_B2_KEY_ID=379cd0b52bbf
VITE_B2_APPLICATION_KEY=004a72718b0ba180f5b742b7a1f4840d3c9ec904b4
```

### 2. Install cors (if not already)
```bash
npm install cors
```

### 3. Terminal 1 - Start Dev Server (Handles B2 uploads)
```bash
node dev-server.js
```

You should see:
```
╔════════════════════════════════════════╗
║  B2 Upload Dev Server Running          ║
║  http://localhost:3001                 ║
║                                        ║
║  In another terminal, run:             ║
║  npm run dev                           ║
║                                        ║
║  Frontend will call /api/b2-upload     ║
║  This server will upload to B2         ║
╚════════════════════════════════════════╝
```

### 4. Terminal 2 - Start Frontend
```bash
npm run dev
```

## Test Upload

1. Go to `http://localhost:3000/admin`
2. Login with your Supabase credentials
3. Admin → Image Gallery → Upload Image
4. Watch Terminal 1 output:
   ```
   📤 B2 Upload: image.jpg (50000 bytes)
   🔐 Authorizing with B2...
   ✅ B2 Authorization successful
   📍 Getting upload URL...
   ✅ Got upload URL
   ⬆️ Uploading to B2...
   ✅ Upload successful!
   📁 B2 URL: https://f000.backblazeb2.com/file/STUDIO-ARCH/images/...
   ```

5. Image appears in admin panel ✓
6. Check B2 Dashboard → STUDIO-ARCH bucket → Should see file there! ✓

## How It Works

**Dev Mode (localhost):**
```
Frontend (localhost:3000)
    ↓
    Upload file + send to /api/b2-upload
    ↓
Dev Server (localhost:3001) receives it
    ↓
Dev Server authenticates with B2
    ↓
Dev Server uploads to STUDIO-ARCH bucket
    ↓
Returns public B2 URL
    ↓
Frontend saves URL to database
```

**Production (Vercel):**
```
Frontend (studioarch.com)
    ↓
    Upload file + send to /api/b2-upload
    ↓
Vercel API (same repo) receives it
    ↓
Vercel API authenticates with B2
    ↓
Vercel API uploads to STUDIO-ARCH bucket
    ↓
Returns public B2 URL
    ↓
Frontend saves URL to database
```

## Troubleshooting

**Error: "Missing cors"**
```bash
npm install cors
```

**Error: "B2 credentials not configured"**
- Check .env file has all 4 B2 variables
- Restart dev-server.js after changing .env

**Error: "B2 auth failed"**
- Check B2 credentials are correct
- Try manually in B2 Dashboard

**Files uploading but not appearing in admin**
- Check browser console for errors
- Check B2 Dashboard - files should be there
- Check database - URL should be saved

## After Testing

When happy with local testing:
1. Git push to GitHub
2. Vercel auto-deploys
3. Production B2 uploads work! 🎉
