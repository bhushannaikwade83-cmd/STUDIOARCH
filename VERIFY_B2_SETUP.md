# B2 Setup Verification Checklist

## Step 1: Verify Vercel Environment Variables

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Check that these 4 variables are SET (not empty):

```
VITE_B2_KEY_ID = 379cd0b52bbf
VITE_B2_APPLICATION_KEY = 004a72718b0ba180f5b742b7a1f4840d3c9ec904b4
VITE_B2_BUCKET_NAME = STUDIO-ARCH
VITE_B2_BUCKET_ID = 0327892cfdc0dba592eb0b1f
```

**If any are missing or empty:**
1. Add/update them in Vercel
2. Trigger a redeployment (push a commit or click "Redeploy" in Vercel)

## Step 2: Verify Files Exist in B2

1. Go to https://www.backblazeb2.com/ (login)
2. Click **STUDIO-ARCH** bucket
3. Look for folder: **images/**
4. Should see files like: `1782198775280_F3_compressed.webp`

**If folder/files don't exist:**
- Images were never uploaded to B2
- Check admin upload functionality
- Upload test image via admin panel

## Step 3: Test B2 Credentials Directly

Your B2 credentials are:
```
Key ID: 379cd0b52bbf
App Key: 004a72718b0ba180f5b742b7a1f4840d3c9ec904b4
```

Try logging in to B2 dashboard with these - if login fails, credentials are wrong.

## Step 4: Check Vercel Logs

1. Go to Vercel Dashboard
2. Click your project
3. Go to **Deployments** tab
4. Click the **latest deployment**
5. Go to **Functions** tab
6. Click **b2-upload**
7. You should see logs when images load

Look for these messages:
```
🌐 B2 Download URL: https://f004.backblazeb2.com/file/STUDIO-ARCH/images/...
📊 B2 Response Status: 200
✅ Downloaded 12345 bytes
```

If you see errors like:
```
❌ B2 download failed: 404
📋 B2 Error Response: File not found
```

This means: **File doesn't exist in B2** (upload issue, not proxy issue)

If you see:
```
❌ B2 download failed: 401
📋 B2 Error Response: Unauthorized
```

This means: **B2 credentials are wrong** (environment variables issue)

## Step 5: Direct B2 URL Test

Try accessing B2 directly (not through your proxy):

1. Get a file URL from B2 dashboard
2. Example: `https://f004.backblazeb2.com/file/STUDIO-ARCH/images/1782198775280_F3_compressed.webp`
3. Open in browser
4. File should download or display

If this fails: **File not in B2 or wrong path**

## The Real Issue

Based on 500 errors, one of these is true:

1. ❌ **Vercel env vars not set** → B2 authorization fails → 500
2. ❌ **B2 credentials wrong** → Authorization fails → 500
3. ❌ **Files don't exist in B2** → 404 returned (then converted to 500)
4. ❌ **File path is incorrect** → B2 can't find file → 404/500

## What to Do RIGHT NOW

1. **Verify env vars in Vercel** (5 min)
   - Go to Settings → Environment Variables
   - Copy exact values from your .env file
   - Make sure all 4 are set
   - Redeploy

2. **Check B2 bucket for files** (2 min)
   - Go to B2 dashboard
   - Open STUDIO-ARCH bucket
   - Look for images/ folder
   - Should see uploaded files

3. **Check Vercel logs** (2 min)
   - After images fail to load
   - Go to Vercel Deployments
   - Click b2-upload function
   - Look at logs - what error do they show?

4. **Report back with:**
   - Vercel env vars status (all set? any empty?)
   - B2 bucket contents (files exist? what paths?)
   - Exact error from Vercel logs (401? 404? what?)

With this info, I can tell you EXACTLY what's wrong.

## Common Fixes

**If env vars are empty:**
```
Go to Vercel → Settings → Environment Variables
Add these 4 variables with exact values
Redeploy (git push or click Redeploy button)
```

**If B2 credentials wrong:**
```
Get new credentials from B2 dashboard
Update all 4 env vars in Vercel
Redeploy
```

**If files don't exist in B2:**
```
Upload image via admin panel
It should appear in B2 bucket → images/ folder
Then try loading image in website
```

Do these checks and tell me what you find. We'll fix it.
