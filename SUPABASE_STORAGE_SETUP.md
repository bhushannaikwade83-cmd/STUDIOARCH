# Supabase Storage Setup - STUDIO-ARCH Bucket

**All uploaded files are saved to STUDIO-ARCH bucket!**

---

## Storage Bucket

### STUDIO-ARCH Bucket
- **Bucket ID:** 0327892cfdc0dba592eb0b1f
- **Status:** Created June 18, 2026
- **Files:** Videos and Images
- **Organization:**
  - Videos: `STUDIO-ARCH/videos/`
  - Images: `STUDIO-ARCH/images/`

---

## .env Configuration

```env
VITE_STORAGE_BUCKET_MEDIA=STUDIO-ARCH
```

---

## Important: Make Bucket Public

⚠️ **REQUIRED:** Your STUDIO-ARCH bucket is currently **Private**

**To make it public:**
1. Go to Supabase Dashboard
2. Click **Storage** (left sidebar)
3. Click **STUDIO-ARCH** bucket
4. Click **Settings** (top right)
5. Toggle **Public bucket** ON
6. Save

---

## Database Tables Used

### `event_videos` Table
Stores video metadata:
```sql
id - bigint (primary key)
title - text
description - text
video_url - text (URL from STUDIO-ARCH/videos/)
thumbnail_url - text
event_date - text
category - text
display_order - integer
created_at - timestamp
updated_at - timestamp
```

### `gallery_folders` Table
Organizes images into folders:
```sql
id - bigint (primary key)
name - text
description - text
display_order - integer
created_at - timestamp
updated_at - timestamp
```

### `gallery_items` Table
Stores individual images:
```sql
id - bigint (primary key)
folder_id - bigint (references gallery_folders)
title - text
image_url - text (URL from STUDIO-ARCH/images/)
thumbnail_url - text
display_order - integer
created_at - timestamp
updated_at - timestamp
```

---

## Admin Panel Flow

### Adding Videos (Events section)

**Option 1: YouTube Link**
```
Admin uploads YouTube URL
→ Saved to event_videos table
→ Displayed on Events page
```

**Option 2: Upload Video File**
```
Admin selects video file
→ Automatically compressed to HD (1920x1080, 80% quality)
→ Uploaded to STUDIO-ARCH/videos/ in Supabase Storage
→ URL saved to event_videos table
→ Displayed on Events page
```

### Adding Images (Image Gallery section)

**Option 1: Image URL**
```
Admin enters image URL
→ Saved to gallery_items table
→ Displayed in gallery
```

**Option 2: Upload Image File**
```
Admin selects image file
→ Automatically compressed to HD (1920x1080, 80% quality)
→ Uploaded to STUDIO-ARCH/images/ in Supabase Storage
→ URL saved to gallery_items table
→ Displayed in gallery
```

---

## File Size Limits

| Type | Max Size | Compression |
|------|----------|------------|
| Video | 500MB | Auto-compressed to 1920x1080 @ 80% quality |
| Image | 10MB | Auto-compressed to 1920x1080 @ 80% quality |

---

## File Organization in STUDIO-ARCH

```
STUDIO-ARCH/
├── videos/
│   ├── 1718702400000_event1.mp4
│   ├── 1718702500000_event2.mp4
│   └── ...
└── images/
    ├── 1718702600000_photo1.jpg
    ├── 1718702700000_photo2.jpg
    └── ...
```

---

## Testing Checklist

- [ ] Make STUDIO-ARCH bucket PUBLIC (currently Private)
- [ ] Go to Admin → Events Videos
- [ ] Upload a test video
- [ ] Check Supabase Storage → STUDIO-ARCH → videos/ folder
- [ ] Check Supabase database - entry appears in event_videos table
- [ ] Go to Events page - video displays
- [ ] Go to Admin → Image Gallery
- [ ] Upload a test image
- [ ] Check Supabase Storage → STUDIO-ARCH → images/ folder
- [ ] Check Supabase database - entry appears in gallery_items table
- [ ] Delete video/image from admin - file removed from storage & database

---

## Summary

✅ **One Bucket:** STUDIO-ARCH for all media  
✅ **File Organization:** Videos in `videos/`, Images in `images/` subfolder  
✅ **Videos:** Saved to `event_videos` table  
✅ **Images:** Saved to `gallery_items` table  
✅ **Auto-compression:** All files compressed to 1920x1080 HD before upload  
✅ **RLS:** Public read access, admin-only write/delete  
✅ **Persistent:** Files stored permanently in Supabase Storage

**Everything is permanent now! 🎉**
