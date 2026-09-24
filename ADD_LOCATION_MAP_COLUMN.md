# Add location_map_url Column to contact_info Table

Run this SQL in Supabase to add the embedded map URL column:

```sql
-- Add the location_map_url column if it doesn't exist
ALTER TABLE contact_info
ADD COLUMN IF NOT EXISTS location_map_url TEXT;
```

That's it! The column will be created if it doesn't already exist.

## What This Does

- Allows you to optionally set a custom embedded Google Maps iframe src
- If left empty, the system auto-generates an embed URL from the share link
- Gives you flexibility to customize the map display

## Test It

1. Run the SQL above
2. Go to admin panel → Settings → Contact Information
3. You'll see two map-related fields:
   - **Google Maps URL** (Share Link) - Required, what users click
   - **Embedded Map URL** (Optional) - For custom map display on contact page
4. Leave Embedded Map URL empty to use auto-generated map from share link
5. Or paste a custom Google Maps embed URL if you have one

Done! ✅
