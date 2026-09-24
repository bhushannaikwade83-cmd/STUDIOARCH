# 1StudioArch Supabase Setup Guide

## Quick Setup (One SQL Query)

**Copy the entire content from `migrations/00_COMPLETE_DATABASE_SETUP.sql` and run it in Supabase SQL Editor.**

This single file creates all 9 tables with RLS policies, indexes, and default data.

---

## Database Schema Overview

### Tables Connected to Frontend & Admin Panel

| Table | Purpose | Frontend | Admin |
|-------|---------|----------|-------|
| **projects** | Portfolio projects | ✓ Display | ✓ Manage |
| **journal_posts** | Blog/journal articles | ✓ Display | ✓ Manage |
| **gallery_folders** | Image gallery folders | ✓ Display | ✓ Manage |
| **gallery_items** | Images in folders | ✓ Display | ✓ Manage |
| **event_videos** | Event/demo videos | ✓ Display | ✓ Manage |
| **contact_info** | Contact details | ✓ Display | ✓ Edit |
| **contact_messages** | Form submissions | ✗ Submit | ✓ View |
| **content_settings** | Site-wide settings | ✓ Use | ✓ Edit |
| **admin_users** | Admin authentication | ✗ N/A | ✓ Auth |

---

## What's Connected

### Frontend Pages
- **Home.tsx** → `projects` table (display featured projects)
- **Projects.tsx** → `projects` table (all projects with details)
- **Journal.tsx** → `journal_posts` table (all blog posts)
- **Contact.tsx** → `contact_info` table (display contact data) + `contact_messages` table (form submission)
- **Gallery.tsx** (if exists) → `gallery_folders` + `gallery_items` (image gallery)

### Admin Panel Sections
- **Dashboard** → `content_settings` (site overview)
- **Manage Projects** → `projects` CRUD
- **Manage Journal** → `journal_posts` CRUD
- **Messages** → `contact_messages` (view submitted forms)
- **Edit Contact** → `contact_info` CRUD
- **Image Gallery** → `gallery_folders` + `gallery_items` CRUD
- **Events Videos** → `event_videos` CRUD
- **Content** → `content_settings` CRUD
- **Settings** → Admin account info

---

## Setup Steps

### Step 1: Run SQL
1. Go to Supabase Dashboard → SQL Editor
2. Create new query
3. Copy entire content from: `migrations/00_COMPLETE_DATABASE_SETUP.sql`
4. Execute

### Step 2: Create Admin User
1. Go to Supabase → Authentication → Users
2. Create new user (email: admin@studioarch.com, password: your choice)
3. Copy the user UUID
4. Run this query in SQL Editor:
```sql
INSERT INTO public.admin_users (id, email, role)
VALUES ('PASTE_UUID_HERE', 'admin@studioarch.com', 'admin')
ON CONFLICT DO NOTHING;
```

### Step 3: Set Environment Variables
Create `.env` file in project root:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Step 4: Start Development
```bash
npm run dev
```

Access admin panel: `/admin` → Login with admin credentials

---

## Hooks Usage (Frontend & Admin)

All data fetching is done through custom hooks in `src/hooks/useSupabaseData.js`:

```javascript
// Projects
const { data: projects, loading, error, refetch } = useProjects();

// Journal Posts
const { data: posts, loading, error, refetch } = useJournalPosts();

// Gallery
const { folders, loading, error } = useGallery();

// Event Videos
const { data: videos, loading, error, refetch } = useEventVideos();

// Contact Messages
const { data: messages, loading, error, refetch } = useContactMessages();

// Contact Info
const { data: info, loading, error } = useSupabaseTable('contact_info');

// Content Settings
const { settings, loading, error } = useContentSettings();
```

---

## Image/Video Compression

Automatic compression on upload (HD quality: 1920x1080, 80% quality):

```javascript
import { compressImage, compressVideo } from '../utils/compression';

const compressed = await compressImage(file);
const video = await compressVideo(file);
```

---

## Row Level Security (RLS)

All tables have RLS enabled:
- ✓ **Public read access** for displaying content
- ✓ **Admin-only write/update/delete** for managing content
- ✗ Public cannot submit contact messages directly (handled by frontend function)

---

## File Structure

```
src/
├── hooks/
│   └── useSupabaseData.js (all Supabase hooks)
├── lib/
│   └── supabase.ts (Supabase client config)
├── pages/
│   ├── Admin.tsx (admin panel - all sections)
│   ├── Home.tsx (homepage with projects)
│   ├── Projects.tsx (portfolio page)
│   ├── Journal.tsx (blog page)
│   └── Contact.tsx (contact form + info)
├── utils/
│   └── compression.ts (image/video compression)
└── components/
    └── LoadingScreen.tsx (reusable loading state)

migrations/
├── 00_COMPLETE_DATABASE_SETUP.sql (MAIN FILE)
├── create_journal_posts_table.sql
├── add_locationMapUrl_to_projects.sql
└── setup_admin_user.sql (legacy)
```

---

## Common Issues & Solutions

**Issue:** 403 Forbidden on database operations
- **Solution:** Check if user is in `admin_users` table with correct role

**Issue:** Contact form messages not appearing in admin panel
- **Solution:** Ensure `contact_messages` table exists and RLS policies are correct

**Issue:** Images not showing after upload
- **Solution:** Check Supabase storage bucket settings and public access

**Issue:** Loading spinner spinning forever
- **Solution:** Check `.env` file has correct Supabase credentials

---

## Next Steps (Optional)

1. **Email Notifications**: Integrate email service (Resend, SendGrid, Mailgun) to send contact form submissions to admin
2. **Image Optimization**: Add CDN caching for images and videos
3. **Analytics**: Track page views and user interactions
4. **SEO**: Add meta tags and sitemap generation
5. **Backup**: Set up automated database backups

---

**Database is fully connected! Admin can now manage all content via the admin panel at `/admin`**
