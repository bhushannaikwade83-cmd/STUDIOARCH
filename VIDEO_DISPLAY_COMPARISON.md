# Video Display Comparison: BJNP vs StudioArch

## BJNP Approach (Working Reference)

### Admin Upload (AdminPanel.jsx)
```jsx
// 1. Detects if video or image
function isMediaField(tab, key, item) {
  if (tab === 'gallery' && (key === 'url' || key === 'thumbnail')) return true;
  if ((key === 'url' || key === 'image' || key === 'thumbnail') && 
      (item.type === 'image' || item.type === 'video')) {
    return true;
  }
}

// 2. Sets correct accept type
function getMediaAccept(tab, key, item) {
  if (tab === 'gallery') {
    if (key === 'thumbnail') return 'image/*';
    if (key === 'url') return item.type === 'video' ? 'video/*' : 'image/*';
  }
  return 'image/*,video/*';
}

// 3. Uploads to B2 storage
const { url, type } = await uploadToB2(file);
```

### Database Schema (Supabase)
```sql
gallery_items:
  - id
  - url (uploaded file path)
  - thumbnail_url (preview image)
  - type ('video' | 'image')
  - title
  - display_order
```

### Frontend Display (Gallery.jsx)
```jsx
// 1. Detects type from database
function mediaSrc(item, preferThumbnail) {
  const url = preferThumbnail ? item?.thumbnail_url : item?.url;
  const fallback = preferThumbnail ? item?.url : item?.thumbnail_url;
  const src = (url && String(url).trim()) || (fallback && String(fallback).trim()) || '';
  
  // Convert B2 URLs to display URLs
  if (extractB2ObjectKey(src)) return buildB2DisplayUrl(src);
  return src;
}

// 2. Renders based on type
{item.type === 'video' ? (
  <video
    src={src}
    className="h-64 w-full object-cover"
    controls
    controlsList="nodownload"
    preload="metadata"
  />
) : (
  <ResolvedImage
    src={item.url || item.thumbnail_url}
    alt={item.title}
    className="h-64 w-full object-cover"
  />
)}
```

---

## StudioArch Current Approach

### Admin Upload (Admin.tsx)
```jsx
// Uploads both images and videos to B2
const uploadResult = await uploadToB2(compressedFile, `videos/${Date.now()}_${newVideoFile.name}`, progress);
```

### Database Schema
```sql
event_videos:
  - id
  - youtube_id (for YouTube embeds)
  - title
  - url (B2 proxy URL)
  - isYoutube (boolean flag)
```

### Frontend Display (Events.tsx)
```jsx
// Converts relative proxy URL to absolute
const videoUrl = video.url?.startsWith('http')
  ? video.url
  : `${window.location.origin}${video.url}`;

// Renders video tag with proxy URL
<video
  src={videoUrl}
  controls
  preload="metadata"
/>
```

---

## Key Differences

| Aspect | BJNP | StudioArch |
|--------|------|-----------|
| **Type Detection** | Database field `type` | Boolean flag `isYoutube` |
| **Thumbnail** | Separate `thumbnail_url` field | Not used |
| **URL Storage** | B2 object keys (converted for display) | B2 proxy URLs (direct display) |
| **Video Compression** | Not mentioned | HD compression (1920x1080, 92%) |
| **Playback** | Direct HTML5 video tags | Direct HTML5 video tags + iframe for YouTube |
| **Download Protection** | `controlsList="nodownload"` | Not implemented |

---

## StudioArch Improvements Needed

### 1. Add Type Field to Database
```sql
ALTER TABLE event_videos ADD COLUMN type VARCHAR(20) DEFAULT 'upload';
-- values: 'youtube' | 'upload'
```

### 2. Update Admin Panel
```jsx
// Store video type when uploading
const videoEntry = {
  title: newVideo.title,
  youtube_id: isYoutubeVideo ? extractYoutubeId(url) : null,
  url: uploadedUrl,
  type: isYoutubeVideo ? 'youtube' : 'upload',
  isYoutube: isYoutubeVideo, // Keep for backward compatibility
};
```

### 3. Update Frontend (Events.tsx)
```jsx
// Use type field instead of isYoutube
{videos.filter(v => v.type === 'youtube').map(video => (
  <iframe src={`https://www.youtube.com/embed/${video.youtube_id}`} />
))}

{videos.filter(v => v.type === 'upload').map(video => (
  <video
    src={video.url}
    controls
    controlsList="nodownload"
  />
))}
```

### 4. Add Security Features
```jsx
// Prevent unauthorized downloads
<video
  controlsList="nodownload"
  disablePictureInPicture
  {...other props}
/>
```

---

## Summary

**BJNP's approach is more robust:**
- ✅ Separate type field for clarity
- ✅ Thumbnail support for video previews
- ✅ Download protection
- ✅ B2 URL normalization

**StudioArch can improve by:**
1. Adding `type` field to `event_videos` table
2. Storing thumbnails for video previews
3. Adding `controlsList="nodownload"` to video tags
4. Using type field instead of isYoutube flag

This ensures consistency across both projects and provides better security/UX.
