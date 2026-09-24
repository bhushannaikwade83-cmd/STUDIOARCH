# StudioArch Supabase Setup Guide

This guide walks you through setting up Supabase and B2B access for the StudioArch website.

## What Was Created

### 1. **Environment & Configuration**
- `.env` - Environment variables file (add your credentials here)
- `src/lib/supabase.js` - Supabase client initialization
- `package.json` - Updated with dependencies (Supabase, Express, file upload)

### 2. **Backend Server**
- `server.js` - Express server for file uploads to Backblaze B2
- Handles admin authentication, file uploads, and signed URLs
- Runs on port 3001

### 3. **Database & Hooks**
- `supabase_schema.sql` - Complete database schema with RLS policies
- `src/hooks/useSupabaseData.js` - React hooks for data operations
  - `useProjects()` - Fetch all projects
  - `useProjectById()` - Fetch single project
  - `useEventVideos()` - Fetch event videos
  - `useGallery()` - Fetch gallery folders and items
  - `useContentSettings()` - Fetch content settings
  - `useSupabaseMutation()` - Insert, update, delete operations
  - `useSupabaseStorage()` - File upload/delete
  - `useAdminAuth()` - Admin login/logout

### 4. **Admin Panel (Supabase)**
- `src/pages/AdminSupabase.tsx` - New admin panel using Supabase
- Features:
  - Supabase Auth login
  - Manage event videos
  - Edit content (quotes, philosophy)
  - Upload images (coming soon)
  - Gallery management (coming soon)

### 5. **Projects Page (Supabase)**
- `src/pages/ProjectsSupabase.tsx` - Fetches projects from database
- Displays projects dynamically from Supabase
- Modal view with image carousel

---

## Step-by-Step Setup

### Step 1: Create Supabase Project
1. Go to https://app.supabase.com/
2. Create new project
3. Get your credentials from Settings → API
4. Copy: Project URL, Anon Key, Service Role Key

### Step 2: Set Environment Variables
1. Open `.env` file in studioarch-main folder
2. Replace placeholders with your credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Step 3: Create Backblaze B2 Account
1. Go to https://www.backblaze.com/
2. Create account and B2 bucket
3. Get credentials:
   - B2_KEY_ID
   - B2_MASTER_KEY
   - B2_BUCKET_ID
   - B2_BUCKET_NAME

4. Add to `.env`:

```env
B2_KEY_ID=your-b2-key-id
B2_MASTER_KEY=your-b2-master-key
B2_BUCKET_NAME=studioarch-media
B2_BUCKET_ID=your-b2-bucket-id
```

### Step 4: Create Database Schema
1. Go to Supabase Dashboard → SQL Editor
2. Copy entire contents of `supabase_schema.sql`
3. Paste and run in SQL Editor
4. Verify tables and RLS policies are created

### Step 5: Create Admin User
1. Go to Supabase → Authentication → Users
2. Click "Create new user"
3. Enter email and password
4. Go to SQL Editor and run:

```sql
INSERT INTO public.admin_users (id, email, full_name, role, access_level)
SELECT id, email, 'Admin Name', 'admin', 'internal'
FROM auth.users
WHERE email = 'your-admin@email.com';
```

### Step 6: Install Dependencies
```bash
cd studioarch-main
npm install
```

### Step 7: Run Development
```bash
npm run dev
```

This will start:
- Backend server (port 3001)
- Frontend dev server (port 5173)

---

## File Structure

```
studioarch-main/
├── .env                          # Your credentials (DO NOT COMMIT)
├── server.js                     # Express backend
├── supabase_schema.sql           # Database schema
├── src/
│   ├── lib/
│   │   └── supabase.js          # Supabase client
│   ├── hooks/
│   │   └── useSupabaseData.js   # Data hooks
│   ├── pages/
│   │   ├── Admin.tsx            # Old admin (for reference)
│   │   ├── AdminSupabase.tsx    # NEW - Supabase admin
│   │   ├── Projects.tsx         # Old projects (hardcoded)
│   │   └── ProjectsSupabase.tsx # NEW - DB projects
│   └── ...
```

---

## Database Tables

### projects
- id, name, location, year, category, description, images, display_order

### gallery_folders
- id, name, description, display_order

### gallery_items
- id, folder_id, title, image_url, display_order

### event_videos
- id, title, youtube_id, url, created_at

### content_settings
- home_quote, philosophy_text, carousel_speed, transition_duration

### admin_users
- id, email, full_name, role (admin/editor/viewer), access_level (internal/b2b/partner)

---

## B2B Access Control

### Row-Level Security (RLS)
- **Public read** for projects, videos, gallery
- **Admin-only write** for content management
- **Role-based access** through admin_users table

### Access Levels
- **internal**: Full admin access
- **b2b**: Partners can see/download media
- **partner**: Limited read-only access

### Example: Add B2B User
```sql
INSERT INTO auth.users (email, password)
VALUES ('partner@company.com', 'hashed-password');

INSERT INTO public.admin_users (id, email, full_name, role, access_level, company_name)
SELECT id, 'partner@company.com', 'Partner Name', 'viewer', 'b2b', 'Partner Company'
FROM auth.users WHERE email = 'partner@company.com';
```

---

## File Upload Flow

1. Admin clicks "Upload Images" in AdminSupabase panel
2. File sent to backend (server.js)
3. Backend verifies auth token with Supabase
4. Backend uploads file to Backblaze B2
5. B2 returns public URL
6. Admin saves URL to database
7. Website displays images from B2

---

## Important Notes

⚠️ **Security:**
- Never commit `.env` file
- Keep service role key secret (server-side only)
- Use Anon key for frontend
- RLS policies protect data

⚠️ **B2 Storage:**
- Backblaze B2 is cheaper than Supabase storage
- Same setup as Biyani's website
- Can handle large video/image files

⚠️ **Next Steps:**
- Update App.tsx routing to use AdminSupabase and ProjectsSupabase
- Implement image upload UI in AdminSupabase
- Add gallery management functionality
- Test file uploads with actual B2 credentials

---

## Troubleshooting

### "Supabase credentials missing"
- Check `.env` file is in root directory
- Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set
- Restart dev server

### Upload fails
- Check B2 credentials in `.env`
- Verify bucket exists in Backblaze B2
- Check admin is authenticated

### RLS policy errors
- Verify admin_users table has your user entry
- Check role is set to 'admin' or 'editor'
- Run schema.sql again if needed

---

## Differences from Old Setup

| Feature | Old (localStorage) | New (Supabase) |
|---------|------------------|----------------|
| Data Storage | Browser localStorage | PostgreSQL database |
| Images | Static files | Backblaze B2 |
| Authentication | Simple password in code | Supabase Auth |
| Access Control | None | Role-based RLS |
| Multi-user | Not possible | Supported |
| B2B Access | Not possible | Yes (RLS policies) |
| Backend | None | Express server |

---

## Support

For issues, check:
1. Supabase docs: https://supabase.com/docs
2. BJNP-main folder for reference implementation
3. Console logs in dev tools (Ctrl+Shift+J)

Good luck! 🚀
