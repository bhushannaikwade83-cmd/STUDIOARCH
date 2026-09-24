# B2 API 500 Error Fix - Production (Vercel)

## Problem
Images returning 500 errors on production:
```
GET /api/b2-upload?key=images%252F1782198775280_F3_compressed.webp 500
```

## Root Cause
Double URL encoding in the key parameter:
- `images%252F` = `images%2F` (which is `images/` encoded)
- This causes incorrect B2 file path lookups

## Solution Deployed

Updated both API files to handle double encoding:
- `api/b2-upload.js` (local)
- `vercel/api/b2-upload.js` (production)

### What Changed

**Before:**
```javascript
const key = decodeURIComponent(String(keyParam));
```

**After:**
```javascript
let key = String(keyParam);
key = decodeURIComponent(key);
if (key.includes('%2F') || key.includes('%2f')) {
  key = decodeURIComponent(key);  // Decode again if double-encoded
}
```

## Deployment Steps

1. **Commit changes:**
   ```bash
   git add api/b2-upload.js vercel/api/b2-upload.js
   git commit -m "Fix B2 API double encoding issue"
   ```

2. **Push to Vercel:**
   ```bash
   git push origin main
   ```

3. **Vercel auto-deploys** (watch deployment in Vercel Dashboard)

4. **Hard refresh website:**
   ```
   Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   ```

5. **Test image loading:**
   - Go to home page or gallery
   - Images should load without 500 errors
   - Check browser console for any errors

## What to Check After Deployment

### In Browser Console (F12)
You should see logs like:
```
📥 Raw key param: images%252F1782198775280_F3_compressed.webp
📥 Decoded once: images%2F1782198775280_F3_compressed.webp
📥 Decoded twice: images/1782198775280_F3_compressed.webp
📥 Final key: images/1782198775280_F3_compressed.webp
🔗 Download URL: https://f004.backblazeb2.com/file/STUDIO-ARCH/images/1782198775280_F3_compressed.webp
✅ Downloaded 12345 bytes
```

### In Vercel Logs
1. Go to Vercel Dashboard
2. Click your project
3. Go to **Deployments**
4. Click latest deployment
5. Go to **Functions** tab
6. Click **b2-upload**
7. You should see the console logs above

### If Still Getting 500 Errors

Check these in order:

1. **Environment Variables in Vercel**
   - Go to Vercel Dashboard
   - Project Settings → Environment Variables
   - Verify these exist:
     - `VITE_B2_KEY_ID`
     - `VITE_B2_APPLICATION_KEY`
     - `VITE_B2_BUCKET_NAME`
     - `VITE_B2_BUCKET_ID`

2. **B2 Credentials Valid**
   - Login to B2 Dashboard
   - Check that key/secret are correct
   - Regenerate if needed

3. **B2 Bucket Permissions**
   - B2 Dashboard → Bucket Settings
   - Ensure bucket is accessible

## Testing Images Load

After deployment:

1. **Homepage** - Carousel images should load
2. **Gallery page** - Gallery images should display
3. **Projects page** - Project images should show
4. **Admin panel** - Uploaded images should preview

If any 404/500 errors remain, file is likely not uploaded to B2 (not a proxy issue).

## For New Images

When uploading new images:
1. Upload via admin panel
2. You'll get a proxy URL like: `/api/b2-upload?key=images%2F...`
3. This is correct - the system handles the encoding now

The fix ensures all URL encoding levels are properly handled!
