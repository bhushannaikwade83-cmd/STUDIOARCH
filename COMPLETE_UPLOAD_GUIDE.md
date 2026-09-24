# Complete Upload & Display Guide (EYE10 Pattern)

## Problem
- Upload works (shows mock URL in dev)
- Database saves work
- But admin panel doesn't show uploaded images/videos
- Frontend also can't display them

## Root Cause
Missing **refetch** after successful database insert. The data is in DB, but UI isn't reading it.

## Solution (EYE10 Pattern)

### 1. Upload → Database → Refetch (3-step flow)

```
User uploads file
  ↓
Compress file
  ↓
Upload to B2 → Get public URL
  ↓
Save URL to database (event_videos or gallery_items table)
  ↓
REFETCH data from database
  ↓
UI updates with new data
```

### 2. What's Working
✅ File upload to B2  
✅ Mock URL generation  
✅ Database insert  
✅ Refetch function exists  

### 3. What's Broken
❌ After refetch, useEffect not updating state
❌ Admin panel showing old data, not new uploads

## Fix: Force State Update After Refetch

### Current (Broken) Flow in Admin.tsx:
```javascript
const dbResult = await insertVideo('event_videos', {...});
if (dbResult.success) {
  refetchVideos();  // ← This fetches but doesn't guarantee UI update
  showSuccessNotification(...);
}
```

### Fixed Flow:
```javascript
const dbResult = await insertVideo('event_videos', {...});
if (dbResult.success) {
  // 1. Optimistic update (show immediately)
  setEventVideos(prev => [...prev, newVideo]);
  
  // 2. Refresh from DB (sync with other users)
  setTimeout(() => refetchVideos(), 1000);
  
  showSuccessNotification(...);
}
```

## Complete Working Example

### Admin Upload Handler:
```javascript
const handleUploadVideo = async (file, title) => {
  try {
    // Step 1: Upload to B2
    const uploadResult = await uploadToB2(file, `videos/${fileName}`);
    if (!uploadResult.success) throw new Error(uploadResult.error);
    
    console.log('✅ B2 upload:', uploadResult.url);
    
    // Step 2: Save to database
    const dbResult = await insertVideo('event_videos', {
      title: title,
      video_url: uploadResult.url,  // ← Public URL from B2
      category: 'Upload',
      display_order: eventVideos.length
    });
    
    console.log('Database result:', dbResult);
    
    if (!dbResult.success) throw new Error('Database save failed');
    
    // Step 3: Optimistic UI update
    setEventVideos(prev => [...prev, {
      id: Date.now(),
      title: title,
      video_url: uploadResult.url,
      category: 'Upload',
      created_at: new Date().toISOString()
    }]);
    
    // Step 4: Refetch to sync
    setTimeout(() => refetchVideos(), 1000);
    
    showSuccess('Video uploaded!');
    
  } catch (error) {
    showError(error.message);
  }
};
```

### Frontend Display Component:
```javascript
export function EventsPage() {
  const { data: videos, loading } = useEventVideos();
  
  if (loading) return <LoadingScreen />;
  
  return (
    <div>
      {videos.map(video => (
        <video key={video.id} src={video.video_url} controls />
      ))}
    </div>
  );
}
```

## Testing Checklist

### Step 1: Check Upload
- [ ] File uploads to B2 (check browser console: "✅ B2 upload: https://...")
- [ ] Returns public URL

### Step 2: Check Database Save
- [ ] Console shows: "Database result: { success: true, data: [...] }"
- [ ] Go to Supabase dashboard → event_videos table
- [ ] New row appears with correct URL

### Step 3: Check Admin UI Update
- [ ] Video appears in admin panel immediately (optimistic update)
- [ ] Or appears after 1 second (after refetch)

### Step 4: Check Frontend Display
- [ ] Go to Events page
- [ ] Video should be visible and playable

### Step 5: Debug if Fails
- [ ] Check browser console for errors
- [ ] Check Network tab → `/api/b2-upload` status
- [ ] Check Supabase directly - is data there?
- [ ] Check if refetchVideos actually gets called

## Common Issues & Fixes

### Issue: "Database save failed"
**Cause:** insertVideo mutation failed  
**Fix:**
- Check if admin is authenticated
- Check RLS policies on event_videos table
- Check if table columns match (title, video_url, etc.)

### Issue: "Database result says success but nothing shows"
**Cause:** refetch isn't working  
**Fix:**
- Check useEventVideos hook
- Add console.log in useEffect to see if data updates
- Try manual refetch after delay

### Issue: "Video shows in admin but not on frontend"
**Cause:** Frontend isn't fetching or displaying correctly  
**Fix:**
- Check Events.tsx uses useEventVideos hook
- Check video_url column has correct URLs
- Check video element has `src={video.video_url}`

## Files to Check/Update

1. **Admin.tsx** - Upload handlers (already updated with logging)
2. **useSupabaseData.js** - useEventVideos hook
3. **Events.tsx** - Frontend display component
4. **b2-upload.ts** - Returns correct public URL

## Expected Behavior After Fix

✅ Upload file → See "✅ B2 upload" in console  
✅ See "Database result: success: true" in console  
✅ Video appears in admin panel immediately  
✅ Go to Events page → Video displays and plays  
✅ Refresh page → Video still there (persisted)

## Database Columns (event_videos table)

```sql
id BIGSERIAL PRIMARY KEY
title TEXT
video_url TEXT  -- ← Public URL from B2
category TEXT
display_order INTEGER
created_at TIMESTAMP
```

The `video_url` must be a valid public URL like:
```
https://f000.backblazeb2.com/file/STUDIO-ARCH/videos/1234567890_video.mp4
```

## Summary

The upload works ✓  
The database saves ✓  
The issue is the UI doesn't reflect the new data ✗

**Fix:** Add optimistic update + proper refetch

Test it now! 🎉
