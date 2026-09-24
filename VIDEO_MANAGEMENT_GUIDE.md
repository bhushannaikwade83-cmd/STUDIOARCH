# Video Management System Guide

## Overview
Complete video management system for the Events page with:
- **YouTube Videos** - Embed YouTube videos
- **Uploaded Videos** - Upload video files directly
- **Separate Display** - Two sections on Events page

---

## 1. ADMIN - ADD VIDEOS

**Location:** Admin → Events Videos

### Add Video Form:

**Required Field:**
- Video Title (must be filled for either option)

**Option A - YouTube URL:**
1. Paste YouTube video URL in "Option 1: YouTube URL" field
2. Paste full YouTube URL (e.g., `https://www.youtube.com/watch?v=...`)
3. Click "Add Video" button
4. Video appears in "YouTube Videos" section

**Option B - Upload Video File:**
1. Click "Select Video File" in "Option 2: Upload Video File"
2. Choose video from your computer
3. File name shows when selected
4. Click "Add Video" button
5. Video appears in "Uploaded Videos" section

### Rules:
- ✅ Either URL **OR** file upload required (not both)
- ✅ Video title is **always** required
- ✅ Only one submit button at the end
- ✅ Supported video formats: MP4, WebM, Ogg
- ✅ Max file size: 500MB

### Remove Videos:
- Click trash icon next to any video
- Video removed immediately

---

## 2. WEBSITE - EVENTS PAGE DISPLAY

### Two Sections:

#### **YouTube Videos Section**
- Shows all YouTube-sourced videos
- Displays YouTube thumbnails
- Embeds YouTube player with controls
- Labeled "📺 YouTube"

#### **Videos Section**
- Shows all uploaded video files
- Displays HTML5 video player
- Full controls: play, pause, volume, fullscreen
- Labeled "🎬 Video"

### Design:
- Responsive grid layout
- Works on mobile, tablet, desktop
- Cards show video title and source
- Hover effects for interactivity

---

## 3. COMPLETE WORKFLOW

### Add YouTube Video:
```
Admin → Events Videos
  → Video Title: "Project Walkthrough"
  → YouTube URL: https://www.youtube.com/watch?v=...
  → Click "Add Video"
  → Appears in "YouTube Videos" section on Events page
```

### Upload Video File:
```
Admin → Events Videos
  → Video Title: "Studio Tour 2024"
  → Upload File: select-video.mp4
  → Click "Add Video"
  → Appears in "Videos" section on Events page
```

### View on Website:
```
Website → Events Page
  → See "YouTube Videos" section (if any YouTube videos added)
  → See "Videos" section (if any videos uploaded)
  → Click play to watch
  → Full player controls available
```

---

## 4. VIDEO STORAGE

### How Videos are Stored:

**YouTube Videos:**
- Stored as: YouTube ID + URL + Title
- Minimal storage (just metadata)
- Embedded from YouTube servers

**Uploaded Videos:**
- Converted to base64 data URL
- Stored in localStorage
- Serves from browser memory

### Storage Location:
- `localStorage.eventVideos` - All videos (YouTube + uploaded)

### Persistence:
- Videos persist across page refresh
- Data lost if browser cache cleared
- Local only (not synced to other devices)

---

## 5. VIDEO SPECIFICATIONS

### YouTube Videos:
- **Source:** YouTube.com
- **Player:** YouTube embedded player
- **Quality:** YouTube default (adjustable by user)
- **Controls:** YouTube player controls
- **Storage:** Just metadata, no file size

### Uploaded Videos:
- **Format:** MP4, WebM, Ogg
- **Max Size:** 500MB per video
- **Player:** HTML5 video player
- **Controls:** Play, pause, volume, fullscreen, progress
- **Codec:** H.264 (MP4), VP8/VP9 (WebM), Theora (Ogg)

---

## 6. ADMIN PANEL FEATURES

### Video List:
- **YouTube Videos Section:**
  - Shows thumbnail from YouTube
  - Video title
  - 📺 YouTube label
  - Delete button

- **Uploaded Videos Section:**
  - Shows video icon (no thumbnail)
  - Video title
  - 🎬 Video File label
  - Delete button

### Organization:
- YouTube and uploaded videos shown in separate sections
- Count shown for each type
- Easy identification of video source
- One-click deletion

---

## 7. TROUBLESHOOTING

**Video not showing?**
- Verify video title is filled
- Check YouTube URL is valid (for YouTube videos)
- Verify video file is supported format
- Check browser localStorage enabled

**YouTube video not embedding?**
- Verify URL format: `https://www.youtube.com/watch?v=...`
- Some videos may have embedding disabled
- Try with different YouTube video

**Uploaded video won't play?**
- Check file format is MP4/WebM/Ogg
- Verify file isn't corrupted
- Try smaller file size
- Check browser supports video format

**Large file size issues?**
- Keep videos under 500MB
- Compress video before uploading
- Use MP4 format (better compression)
- Consider YouTube for larger files

**Lost videos?**
- localStorage data cleared
- Videos are local-only storage
- Re-upload if needed

---

## 8. BEST PRACTICES

### For YouTube Videos:
1. **Quality:** Use 1080p or higher YouTube videos
2. **Duration:** 2-10 minutes recommended
3. **Content:** Project walkthroughs, events, showcases
4. **Privacy:** Ensure video can be embedded
5. **Title:** Use descriptive names

### For Uploaded Videos:
1. **Format:** Use MP4 for best compatibility
2. **Duration:** Keep under 10 minutes
3. **Size:** Compress before uploading
4. **Quality:** 720p or 1080p recommended
5. **Codec:** H.264 video, AAC audio (for MP4)

### Video Organization:
```
Option 1: All YouTube (easier, larger library)
Option 2: All Uploaded (more control, larger storage)
Option 3: Mix both (YouTube for externals, uploaded for exclusives)
```

### File Size Guide:
```
1 minute video:
- 720p MP4: ~100-150MB
- 1080p MP4: ~200-300MB
- Compressed: 50-100MB

5 minute video:
- 720p MP4: ~500-750MB
- 1080p MP4: ~1000-1500MB (exceeds 500MB limit)
```

---

## 9. FUTURE ENHANCEMENTS

Possible improvements:
- [ ] Video thumbnails for uploaded videos
- [ ] Video preview in admin
- [ ] Drag-and-drop reordering
- [ ] Video categories/playlists
- [ ] Cloud storage integration
- [ ] Automatic video compression
- [ ] Video duration display
- [ ] Playlist support

---

## 10. QUICK REFERENCE

| Feature | YouTube | Uploaded |
|---------|---------|----------|
| Max Size | Unlimited | 500MB |
| Upload Time | Fast | Depends on size |
| Player | YouTube | HTML5 |
| Controls | YouTube | Full |
| Thumbnail | Auto | Icon |
| Storage | YouTube servers | localStorage |
| Bandwidth | YouTube | Your server |
| Privacy | YouTube settings | Local only |

