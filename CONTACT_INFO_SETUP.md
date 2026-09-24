# Contact Information Setup Guide

## Overview
The contact information system is now dynamic and simplified. Admins manage contact details through the Settings panel, and these changes automatically sync to the footer and contact page.

## Database Setup

### Create the `contact_info` table in Supabase

1. Go to **Supabase Dashboard** → Your Project → **SQL Editor**
2. Create a new query and run:

```sql
-- Create contact_info table
CREATE TABLE IF NOT EXISTS contact_info (
  id BIGINT PRIMARY KEY DEFAULT 1,
  email TEXT,
  phone TEXT,
  locations TEXT,
  maps_url TEXT,
  instagram TEXT,
  linkedin TEXT,
  youtube TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default row
INSERT INTO contact_info (id, email, phone, locations, maps_url, instagram, linkedin, youtube)
VALUES (
  1,
  'inquiry@1studioarch.com',
  '+44 (0) 20 1234 5678',
  'London, UK
New York, USA
Singapore, SG',
  'https://maps.google.com/maps/search/Studio+Arch',
  'https://instagram.com/1studioarch',
  'https://linkedin.com/company/1studioarch',
  'https://youtube.com/@1studioarch'
) ON CONFLICT (id) DO UPDATE SET updated_at = NOW();
```

### Enable RLS (Row Level Security)

```sql
-- Enable RLS on contact_info
ALTER TABLE contact_info ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Anyone can read contact_info"
  ON contact_info FOR SELECT
  USING (true);

-- Allow authenticated users to update
CREATE POLICY "Authenticated users can update contact_info"
  ON contact_info FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

## How It Works

### Admin Panel
1. **Settings** → **Contact Information**
2. Update any of these fields:
   - **Email** - Primary contact email
   - **Phone** - Phone number
   - **Locations** - Office locations (one per line)
   - **Google Maps URL** - Google Maps link (for clicking locations)
   - **Social Media URLs** - Instagram, LinkedIn, YouTube
3. Click **Save Contact Info**

### Frontend Display

#### Footer (Home page)
- Shows email, phone, and locations from the database
- **Clicking any location** opens the Google Maps URL in a new tab
- Hover effect shows it's clickable

#### Contact Page
- Shows email, phone, locations
- **Clicking any location** opens the Google Maps URL
- All information is dynamic from the database

## Field Descriptions

| Field | Purpose | Example |
|-------|---------|---------|
| **Email** | Primary contact email (clickable for mailto) | inquiry@1studioarch.com |
| **Phone** | Phone number (clickable for tel:) | +44 (0) 20 1234 5678 |
| **Locations** | List of office locations (one per line) | London, UK<br/>New York, USA<br/>Singapore, SG |
| **Google Maps URL** | Link opened when clicking locations | https://maps.google.com/maps/search/Studio+Arch |
| **Instagram URL** | Instagram profile link | https://instagram.com/1studioarch |
| **LinkedIn URL** | LinkedIn company link | https://linkedin.com/company/1studioarch |
| **YouTube URL** | YouTube channel link | https://youtube.com/@1studioarch |

## Getting Google Maps URL

### Recommended - Short URL (Easiest!)
1. Open [Google Maps](https://maps.google.com) or Google Maps app
2. Search for your location (e.g., "Studio-Arch, Mumbai")
3. Click **Share** button
4. Copy the short link (starts with `https://maps.app.goo.gl/`)
5. Paste into **"Google Maps URL"** field in admin settings

This is the easiest method! The short URL is what Google recommends.

### Alternative - Full URL
1. Go to [Google Maps](https://maps.google.com)
2. Search for your location
3. Copy the URL from the address bar
4. Paste into **"Google Maps URL"** field

### Supported URL Formats
✅ Short URL (Recommended):
```
https://maps.app.goo.gl/qvxxeaDYMDN9NpBe7
```

✅ Full Search URL:
```
https://maps.google.com/maps/search/Studio+Arch
https://www.google.com/maps/search/Studio-Arch,+Mumbai
```

✅ Direct Location URL:
```
https://www.google.com/maps/place/Studio-Arch/@19.123,72.456,15z
```

All formats work perfectly when clicking locations on your website!

## Testing Checklist

After updating contact info in the admin panel:

- [ ] Visit homepage, scroll to footer
- [ ] See updated email, phone, locations
- [ ] Click on any location in footer → opens Google Maps
- [ ] Visit `/contact` page
- [ ] See same contact information displayed
- [ ] Click on any location on Contact page → opens Google Maps
- [ ] Try on mobile - clicking works smoothly
- [ ] Hard refresh (Ctrl+Shift+R) if changes don't appear immediately

## Troubleshooting

### Locations not clickable
- **Problem:** Clicking location does nothing
- **Solution:**
  1. Check that `maps_url` is filled in admin panel
  2. Verify URL starts with `https://maps.google.com` or `https://www.google.com/maps`
  3. Test the URL directly in browser (should open Google Maps)
  4. Save admin settings and hard refresh (Ctrl+Shift+R)

### Maps URL not working
- **Problem:** URL is set but doesn't open Maps when clicked
- **Solution:**
  1. Copy the URL from address bar after searching on Maps (most reliable)
  2. Make sure it's not a shortened URL
  3. Test the URL in a new tab first
  4. If using mobile Maps, try desktop Maps URL instead

### Changes not appearing on website
- **Problem:** Updated contact info not showing on footer/contact page
- **Solution:**
  1. Hard refresh browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
  2. Wait a few seconds after saving
  3. Check that save was successful (green notification)
  4. Verify in Supabase dashboard that data was saved

### Social links showing but not clickable
- **Problem:** Instagram/LinkedIn/YouTube visible but clicking doesn't work
- **Solution:**
  1. Verify URLs are complete (start with https://)
  2. No trailing slashes at end of URL
  3. Test each URL directly in browser
  4. Save admin settings again

## Files Modified
- `src/hooks/useSupabaseData.js` - Added `useContactInfo()` hook
- `src/pages/Home.tsx` - Footer uses dynamic contact info
- `src/pages/Contact.tsx` - All contact details are dynamic
- `src/pages/AdminSupabase.tsx` - Settings panel for contact management

## Database Schema

```sql
Table: contact_info
├── id (BIGINT) - Primary key, always 1
├── email (TEXT)
├── phone (TEXT)
├── locations (TEXT) - Multiple lines separated by \n
├── maps_url (TEXT) - Google Maps search/location URL
├── instagram (TEXT)
├── linkedin (TEXT)
├── youtube (TEXT)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

## Admin Panel Form

The admin Settings panel includes these fields:
- Email
- Phone  
- Locations (textarea, one per line)
- Google Maps URL
- Instagram URL
- LinkedIn URL
- YouTube URL

All changes are saved with one click to the "Save Contact Info" button.
