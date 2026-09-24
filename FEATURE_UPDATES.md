# Studio Arch - Feature Updates

## Summary of Changes

All requested features have been implemented. Here's what was added:

### 1. **YouTube Links** ✅
- Added YouTube URL field to Social Links section in Admin Contact page
- YouTube icon now appears on Contact page when link is provided
- Navigate to Admin → Edit Contact → Social Links → YouTube URL

### 2. **Phone/Contact Number** ✅
- Added phone number field to Contact Information section
- Phone number displays on Contact page with `tel:` link for quick calling
- Appears below email in the Contact Information section
- Navigate to Admin → Edit Contact → Contact Information → Phone Number

### 3. **Location Maps (Contact Page)** ✅
- Added Location Map Embed URL field to Contact Information
- Accepts Google Maps embed URLs or any iframe-compatible map service
- Map displays on Contact page in a responsive iframe (h-96 container)
- To get a Google Maps embed URL:
  1. Go to Google Maps
  2. Search for a location
  3. Click "Share" → "Embed a map" 
  4. Copy the iframe src URL
  5. Paste into the Location Map Embed URL field

### 4. **Working Image Gallery** ✅
- Completely rewrote Image Gallery section
- Add new images via URL and title
- Full CRUD operations (Create, Read, Delete)
- Images stored in localStorage
- Features:
  - Add images with URL and title
  - View images in a responsive grid
  - Click "View" to open image in new tab
  - Delete images individually
  - Empty state message when no images exist
- Navigate to Admin → Image Gallery

**How to add images:**
- Use public folder images: `/architecture-1.jpg`, `/architecture-2.jpg`, etc.
- Or paste full URLs: `https://example.com/image.jpg`
- Enter a title for each image
- Click "Add Image"

### 5. **Project Location Maps** ✅
- Added Location Map Embed URL field to each project in Admin
- Maps display in project details modal/view
- "Location" section appears in project details when map URL is provided
- Responsive iframe container (h-96)

**How to add maps to projects:**
1. Go to Admin → Manage Projects
2. Click "Edit" on any project
3. Scroll to "Location Map Embed URL"
4. Paste Google Maps embed URL
5. Click "Save"

---

## File Changes

### Modified Files:
1. **src/pages/Admin.tsx**
   - Added `GalleryImage` type
   - Added phone, youtube, locationMapUrl fields to DEFAULT_CONTACT
   - Added gallery image state management
   - Added image upload/delete handlers
   - Updated Contact section with new fields
   - Updated Projects section with location map field
   - Completely redesigned Image Gallery section

2. **src/pages/Contact.tsx**
   - Added Youtube icon import
   - Updated DEFAULT_CONTACT with new fields
   - Added phone number display with tel: link
   - Added YouTube link to social links (with conditional rendering)
   - Updated map to use locationMapUrl from localStorage
   - Added conditional rendering for social links

3. **src/pages/Projects.tsx**
   - Updated PROJECTS data type to include locationMapUrl
   - Added Google Maps embed URLs for all default projects
   - Added Location section in project details modal
   - Displays map only if locationMapUrl is provided

---

## How to Use

### Admin Dashboard
1. Open `/admin` in your browser
2. Login with password: `admin123`
3. Navigate using sidebar menu

### Managing Contact Information
- **Email**: Update primary contact email
- **Phone**: Add phone number (optional)
- **Locations**: List locations (one per line)
- **Location Map**: Paste Google Maps embed URL
- **Social Links**: Instagram, LinkedIn, YouTube URLs

### Managing Images
- Go to Image Gallery section
- Add images by URL and title
- View, download, or delete images
- All changes saved automatically to localStorage

### Managing Projects
- Edit any project
- Add location map URL for that specific project
- Location will appear in project details modal
- All edits saved to localStorage

---

## Technical Details

- All data stored in **localStorage** (browser storage)
- Maps use **Google Maps embed URLs** (iframe-based)
- Phone numbers use **tel:** protocol for easy calling
- YouTube links use **lucide-react** Youtube icon component
- Responsive design works on mobile, tablet, and desktop
- Uses **Framer Motion** for animations

---

## Next Steps (Optional)

If you want to enhance further:
1. Add backend database integration instead of localStorage
2. Implement actual file upload for images (currently URL-based)
3. Add image crop/resize functionality
4. Add map markers customization
5. Add multiple maps for different locations
6. Add image categories/tags

---

## Testing Checklist

- [ ] Navigate to Admin and login
- [ ] Add/edit phone number in Contact section
- [ ] Add YouTube URL in Social Links
- [ ] Add location map URL in Contact section
- [ ] View Contact page - verify phone, YouTube, and map display
- [ ] Add images to gallery with URLs
- [ ] Delete images from gallery
- [ ] Edit a project and add location map URL
- [ ] View project details - verify location map displays
- [ ] Test on mobile device (responsive design)

