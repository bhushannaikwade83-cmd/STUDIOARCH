# Image Management System Guide

## Overview
Complete image management system with:
- **Image Gallery** - Central repository for all images
- **Project Images** - Up to 5 images per project
- **Image Display** - Carousel in project details on website

---

## 1. IMAGE GALLERY

**Location:** Admin → Image Gallery

### What it does:
- Central place to manage all images
- Can add images via URL or file upload
- Gallery images can be used in projects
- Pre-populated with existing public images

### How to use:

**Pre-populated Images (Already in Gallery):**
- `/architecture-1.jpg`
- `/architecture-2.jpg`
- `/architecture-3.jpg`
- `/architecture-4.jpg`
- `/architecture-5.jpg`

**Add More Images:**

Option A - Via URL:
1. Paste image URL
2. Enter title
3. Click "Add Image"

Option B - Via File Upload:
1. Select image file from computer
2. Enter title
3. Click "Add Image"

**Remove Images:**
- Click "Delete" next to any image

**View Images:**
- Click "View" to open in new tab

---

## 2. PROJECT IMAGES

**Location:** Admin → Manage Projects → Click "Edit" on any project

### What it does:
- Each project can have up to 5 images
- Images display in carousel on website
- Images stored with project data

### How to add images to a project:

1. Go to Admin → Manage Projects
2. Click "Edit" on the project
3. Scroll to "Project Images" section
4. See current image count (e.g., "2/5")
5. Add images via URL or upload:
   - Paste URL in text field
   - OR select file to upload
   - Click "Add Image" button
6. Images appear as thumbnails with remove button
7. Click "Save" to save project with images

### Limits:
- Maximum 5 images per project
- Minimum 1 image recommended
- Supports: JPG, PNG, GIF, WebP, SVG

### Image Display:
- When viewing a project on website
- Shows main large image
- Shows thumbnail navigation below
- Counter shows "Image 1 of 3"
- Click thumbnails to switch images

---

## 3. WEBSITE - PROJECT DETAILS CAROUSEL

**Where users see images:** Project Details Modal/Page

### Image Carousel Features:

**Main Display:**
- Large image view (600px height)
- Smooth fade transitions
- Image counter

**Navigation:**
- Click thumbnails to switch images
- Hover effect on thumbnails
- Selected thumbnail highlighted in white
- Unselected thumbnails in gray

**Responsive Design:**
- Works on mobile, tablet, desktop
- Thumbnail navigation scrolls on small screens
- Optimized image sizing

---

## 4. COMPLETE IMAGE WORKFLOW

### Add Images to Gallery:
```
Admin → Image Gallery 
  → Enter Title
  → Paste URL or Upload File
  → Click "Add Image"
  → View in gallery grid
```

### Use Images in Projects:
```
Admin → Manage Projects
  → Click "Edit" on project
  → Scroll to "Project Images"
  → Add images (up to 5)
  → Click "Save"
```

### View on Website:
```
Website → Projects
  → Click project card
  → See large carousel image
  → Click thumbnails below to switch
  → See location map
  → Read project details
```

---

## 5. IMAGE STORAGE

### How images are stored:
- **Gallery images:** Stored in localStorage
- **Project images:** Stored with project data in localStorage
- **File uploads:** Converted to base64 data URLs
- **URL images:** Stored as-is

### Storage Locations:
- `localStorage.galleryImages` - All gallery images
- `localStorage.adminProjects` - Project data including images

### Persistence:
- All images persist in browser
- Data survives page refresh
- Data lost only if browser cache cleared
- Local only (not synced to other devices)

---

## 6. EXAMPLE USAGE

### Project: "The Obsidian Villa"

**Current Setup:**
- 2 images: `/architecture-1.jpg`, `/architecture-2.jpg`
- Location: Mykonos, Greece
- Year: 2024

**To Add More Images:**
1. Admin → Manage Projects
2. Click Edit on "The Obsidian Villa"
3. Scroll to "Project Images (2/5)"
4. Upload new images (can add 3 more)
5. Save project

**Website Display:**
- User clicks project
- Sees first image large
- Can click any thumbnail to view
- Can navigate through all images

---

## 7. TROUBLESHOOTING

**Image not showing?**
- Check image URL is correct
- Verify file format is supported
- Check browser localStorage is enabled

**Can't add image to project?**
- Verify project has < 5 images
- Provide either URL or file
- Provide image title
- Click "Add Image" first, then "Save"

**Lost images after browser update?**
- localStorage data cleared
- Gallery pre-populates with defaults
- Re-upload custom images

**Images not saving?**
- Check browser allows localStorage
- Verify "Save" button clicked (not just "Add Image")
- Check browser console for errors

---

## 8. BEST PRACTICES

**Gallery Images:**
- Use consistent naming (e.g., "Villa Exterior", "Modern Kitchen")
- Organize by type or category
- Keep high-quality images
- Use descriptive titles

**Project Images:**
- Show best angles first
- Mix exterior and interior shots
- Include context shots
- Show final details

**File Formats:**
- JPG - Best for photos (smaller file size)
- PNG - Best for graphics (supports transparency)
- WebP - Modern, efficient format
- Avoid extremely large files

**Image Organization:**
1. Best shot (hero image)
2. Wide/establishing shot
3. Detail/close-up
4. Lifestyle/in-use
5. Final/completion

---

## 9. FUTURE ENHANCEMENTS

Possible improvements:
- [ ] Image cropping in admin
- [ ] Image optimization/compression
- [ ] Drag-and-drop reordering
- [ ] Image filters/effects
- [ ] Batch upload
- [ ] Cloud storage integration
- [ ] Image categories/tags
- [ ] Analytics (popular images)

