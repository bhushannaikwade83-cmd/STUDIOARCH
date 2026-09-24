# B2 API Proxy Image Loading - Debug & Fix Guide

## Problem Statement
Images load from local dev server but fail on B2B API proxy in production.

## Root Causes Fixed

### 1. **URL Encoding Inconsistency**
**Before:**
```js
const downloadUrl = `${auth.downloadUrl}/file/${encodeURIComponent(bucketName)}/${encodedKey}`;
```

**After:**
```js
const bucketEncoded = encodeURIComponent(bucketName);
const keyEncoded = key.split('/').map(encodeURIComponent).join('/');
const downloadUrl = `${auth.downloadUrl}/file/${bucketEncoded}/${keyEncoded}`;
```

**Why:** B2 requires specific URL encoding - bucket name and filename paths need consistent handling.

### 2. **Error Logging & Debugging**
Added detailed logging:
- `console.log(\`🔗 Download URL: ${downloadUrl}\`)` - Shows exact URL being requested
- Error response body logging - Captures B2's error messages
- Stack trace logging - Helps identify where requests fail

### 3. **CORS & Caching Headers**
Added headers for production reliability:
```js
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Cache-Control', 'public, max-age=31536000');
```

### 4. **Filename Sanitization**
The upload endpoint sanitizes filenames (spaces → underscores) which is correct for B2. The GET endpoint now consistently uses the same sanitized key.

## Testing Checklist

### Local Development
1. Run dev server: `node dev-server.js`
2. In another terminal: `npm run dev`
3. Upload an image with spaces in the filename: `my photo.jpg`
4. Verify in browser console that `/api/b2-upload?key=my_photo.jpg` loads
5. Check terminal logs for `🔗 Download URL:` line

### Production (Vercel)
1. Deploy to Vercel
2. Upload a test image through the admin panel
3. Open browser DevTools → Network tab
4. Find the image request (e.g., `/api/b2-upload?key=test.jpg`)
5. Check response headers:
   - `Content-Type: image/jpeg` ✅
   - `Access-Control-Allow-Origin: *` ✅
   - `Cache-Control: public, max-age=31536000` ✅

## Troubleshooting

### Issue: "Download failed (400)"
**Likely Cause:** B2 key parameter is malformed
**Fix:**
1. Check console: Look for `📥 Proxying download: {key}` log
2. Verify the key matches what was uploaded
3. Ensure special characters are URL-encoded

### Issue: "Download failed (403)"
**Likely Cause:** Authorization token expired or missing
**Fix:**
1. Check if B2 credentials (VITE_B2_*) are set in Vercel env vars
2. Verify auth token is valid (23 hour cache)
3. Check `b2_get_download_authorization` response in logs

### Issue: "Download failed (404)"
**Likely Cause:** File doesn't exist in B2 bucket
**Fix:**
1. Verify file was actually uploaded to B2
2. Check B2 web console for the file
3. Ensure bucket name is correct

### Issue: Images work locally but not on production
**Steps:**
1. Compare logs between `dev-server.js` and Vercel logs
2. Check for environment variable differences
3. Verify network/CORS settings in B2 bucket

## Files Modified
- `api/b2-upload.js` - Main Vercel endpoint
- `vercel/api/b2-upload.js` - Backup Vercel endpoint
- `dev-server.js` - Local development server

## Key Improvements
✅ Consistent URL encoding across all endpoints  
✅ Better error messages and logging  
✅ CORS headers for browser access  
✅ Cache headers for CDN optimization  
✅ Response body logging for B2 errors  

## Next Steps if Still Failing
1. Check B2 bucket CORS settings
2. Verify `fileNamePrefix` parameter in auth request
3. Test with `curl` directly to B2:
   ```bash
   curl -H "Authorization: <token>" \
     "https://f004.backblazeb2.com/file/BUCKET/image.jpg"
   ```
