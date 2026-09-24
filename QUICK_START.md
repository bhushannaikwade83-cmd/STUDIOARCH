# Quick Start Guide - New Features

## 🚀 Running the Application

```bash
cd D:\Github Repos\studioarch

# Install dependencies (first time only)
npm install

# Start the application
npm run dev
```

The app will be available at:
- Frontend: `http://localhost:5173`
- Admin: `http://localhost:5173/admin`
- Password: `admin123`

---

## ✨ New Features Overview

### 1️⃣ YouTube Links
**Location:** Admin → Edit Contact → Social Links

- Paste your YouTube channel/video URL
- YouTube icon appears on Contact page when added
- Click icon to visit your YouTube channel

**Example URLs:**
- `https://youtube.com/@yourstudio`
- `https://www.youtube.com/channel/UCxxxxxx`

---

### 2️⃣ Phone Number
**Location:** Admin → Edit Contact → Contact Information

- Add phone number (optional)
- Displays on Contact page
- Click to call on mobile devices
- Uses `tel:` protocol

**Example:** `+1 (555) 123-4567`

---

### 3️⃣ Location Maps (Contact Page)
**Location:** Admin → Edit Contact → Contact Information → Location Map Embed URL

**How to add a Google Maps embed:**

1. Go to [Google Maps](https://maps.google.com)
2. Search for your studio location
3. Click "Share" (usually top-left area)
4. Click "Embed a map"
5. Copy the entire `src="..."` URL from the iframe code
6. Example URL starts with: `https://www.google.com/maps/embed?pb=...`
7. Paste into the Location Map Embed URL field
8. Save

The map will appear on your Contact page in a responsive container.

---

### 4️⃣ Image Gallery
**Location:** Admin → Image Gallery

**Features:**
- ➕ Add images via URL and title
- 👁️ View images in responsive grid
- 🗑️ Delete images individually
- 💾 All changes auto-saved

**How to add images:**

**Option A - Use public folder images:**
```
/architecture-1.jpg
/architecture-2.jpg
/architecture-3.jpg
/architecture-4.jpg
/architecture-5.jpg
```

**Option B - Use external URLs:**
```
https://example.com/my-image.jpg
```

Just paste URL + add title → Click "Add Image"

---

### 5️⃣ Project Location Maps
**Location:** Admin → Manage Projects → Edit Project

**How to add a map to a project:**

1. Click "Edit" on any project
2. Scroll down to "Location Map Embed URL"
3. Paste Google Maps embed URL (same as contact map)
4. Click "Save"
5. View the project details to see the location map

**Result:** When users click on a project, they'll see:
- Project images
- Location map
- Project details
- All information in one modal

---

## 📋 Test Checklist

After running the app, test these features:

- [ ] Admin login with password `admin123`
- [ ] Add/edit phone number → See on Contact page
- [ ] Add YouTube URL → YouTube icon appears on Contact page
- [ ] Add location map URL → Map displays on Contact page
- [ ] Add image to gallery → Appears in grid
- [ ] Delete image → Removed from gallery
- [ ] Edit project → Add location map URL
- [ ] View project → Location map displays in modal
- [ ] Test on mobile (responsive design)

---

## 🎯 Key Files Modified

```
src/pages/Admin.tsx          ← Admin dashboard with all new forms
src/pages/Contact.tsx        ← Contact page displaying new fields
src/pages/Projects.tsx       ← Project details with location maps
FEATURE_UPDATES.md           ← Detailed documentation
QUICK_START.md               ← This file
```

---

## ⚙️ Technical Stack

- **Frontend:** React 18 + TypeScript
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **Storage:** Browser localStorage (no database needed)
- **Maps:** Google Maps embed iframe
- **Icons:** Lucide React

---

## 🔧 Troubleshooting

**Issue:** Port 5173 already in use
```bash
npm run dev -- --port 3000
```

**Issue:** Dependencies not installed
```bash
npm install
```

**Issue:** Changes not saving
- Check browser's localStorage is enabled
- Open DevTools → Application → LocalStorage
- Look for `contactInfo`, `adminProjects`, `galleryImages` keys

**Issue:** Map not displaying
- Verify the embed URL starts with `https://www.google.com/maps/embed?pb=`
- Check that iframe is not blocked by Content Security Policy

---

## 📞 Support

All data is stored in **browser localStorage**:
- Clear browser cache/localStorage to reset to defaults
- Export data by copying localStorage values
- No backend database required (yet)

---

## 🎨 Customization Ideas

1. **Add image categories/tags** to gallery
2. **Implement drag-and-drop** file upload
3. **Add multiple location maps** per project
4. **Create image carousel** for gallery
5. **Add map markers** with custom pins
6. **Export/Import** admin data as JSON

