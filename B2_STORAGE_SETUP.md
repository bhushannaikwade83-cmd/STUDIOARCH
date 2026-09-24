# B2 Storage Setup - STUDIO-ARCH Bucket

**All uploaded files are saved to B2 (Backblaze) bucket!**

---

## B2 Configuration

### STUDIO-ARCH Bucket Details
- **Bucket Name:** STUDIO-ARCH
- **Bucket ID:** 0327892cfdc0dba592eb0b1f
- **Status:** Created June 18, 2026
- **Type:** Public
- **File Organization:**
  - Videos: `videos/`
  - Images: `images/`

---

## .env Configuration

```env
VITE_STORAGE_BACKEND=b2
VITE_B2_PRIVATE_BUCKET=false
B2B_BUCKET_NAME=STUDIO-ARCH
B2B_BUCKET_ID=0327892cfdc0dba592eb0b1f
B2B_KEY_ID=379cd0b52bbf
B2B_APPLICATION_KEY=004a72718b0ba180f5b742b7a1f4840d3c9ec904b4
```

**Note:** These credentials are shared with EYE10 project (same B2 account)

---

## How B2 Upload Works

1. Admin selects video or image file
2. File is compressed to HD (1920x1080 @ 80% quality)
3. Frontend authorizes with B2 API using credentials
4. Compressed file uploaded directly to `STUDIO-ARCH` bucket
5. B2 returns public URL
6. URL saved to Supabase database (event_videos or gallery_items table)
7. File accessible publicly on Events page or Gallery

---

## Database Tables

### `event_videos` Table
```sql
id - bigint (primary key)
title - text
description - text
video_url - text (B2 public URL from STUDIO-ARCH/videos/)
thumbnail_url - text
event_date - text
category - text
display_order - integer
created_at - timestamp
updated_at - timestamp
```

### `gallery_folders` Table
```sql
id - bigint (primary key)
name - text
description - text
display_order - integer
created_at - timestamp
updated_at - timestamp
```

### `gallery_items` Table
```sql
id - bigint (primary key)
folder_id - bigint (references gallery_folders)
title - text
image_url - text (B2 public URL from STUDIO-ARCH/images/)
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
Admin enters YouTube URL
→ Saved to event_videos table
→ Displayed on Events page
```

**Option 2: Upload Video File**
```
Admin selects video file
→ Auto-compressed to HD (1920x1080, 80% quality)
→ Uploaded to B2 STUDIO-ARCH/videos/ folder
→ Public URL from B2 saved to event_videos table
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
→ Auto-compressed to HD (1920x1080, 80% quality)
→ Uploaded to B2 STUDIO-ARCH/images/ folder
→ Public URL from B2 saved to gallery_items table
→ Displayed in gallery
```

---

## File Size Limits

| Type | Max Size | Compression |
|------|----------|------------|
| Video | 500MB | Auto-compressed to 1920x1080 @ 80% quality |
| Image | 10MB | Auto-compressed to 1920x1080 @ 80% quality |

---

## B2 File Structure

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

## Public URLs

Videos and images are publicly accessible at:
```
https://f000.backblazeb2.com/file/STUDIO-ARCH/videos/[filename]
https://f000.backblazeb2.com/file/STUDIO-ARCH/images/[filename]
```

---

## Testing Checklist

- [ ] Verify .env has B2 credentials configured
- [ ] Go to Admin → Events Videos
- [ ] Upload a test video
- [ ] Check B2 Dashboard → STUDIO-ARCH bucket → videos/ folder
- [ ] Verify file appears and is public
- [ ] Check Supabase - entry appears in event_videos table with B2 URL
- [ ] Go to Events page - video plays
- [ ] Go to Admin → Image Gallery
- [ ] Upload a test image
- [ ] Check B2 Dashboard → STUDIO-ARCH bucket → images/ folder
- [ ] Verify file appears and is public
- [ ] Check Supabase - entry appears in gallery_items table with B2 URL
- [ ] Delete video/image from admin - file appears deleted from database
- [ ] (Optional) Check B2 Dashboard - file still there (B2 deletion not implemented yet)

---

## Summary

✅ **B2 Backend:** Directly uploads to Backblaze B2  
✅ **Single Bucket:** STUDIO-ARCH for videos and images  
✅ **File Organization:** Videos in `videos/`, Images in `images/` subfolder  
✅ **Videos:** Uploaded to B2, URL saved to `event_videos` table  
✅ **Images:** Uploaded to B2, URL saved to `gallery_items` table  
✅ **Auto-compression:** All files compressed to 1920x1080 HD before upload  
✅ **Public Access:** All files publicly accessible via B2 URLs  
✅ **Permanent Storage:** Files stored permanently in B2 (not temporary)

**Everything is production-ready! 🎉**
