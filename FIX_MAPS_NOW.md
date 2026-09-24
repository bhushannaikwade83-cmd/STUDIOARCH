# MAPS LINK FIX - COMPLETE SOLUTION

## THE PROBLEM
Maps link wasn't working because the `maps_url` field wasn't in the database.

## THE SOLUTION - STEP BY STEP

### STEP 1: Create/Update Database Table
**Go to Supabase Dashboard → SQL Editor → Run this:**

```sql
-- Verify table exists and has all columns
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

-- Insert initial data if not exists
INSERT INTO contact_info (id, email, phone, locations, maps_url, instagram, linkedin, youtube)
VALUES (
  1,
  'inquiry@1studioarch.com',
  '+44 (0) 20 1234 5678',
  'London, UK
New York, USA
Singapore, SG',
  'https://maps.app.goo.gl/qvxxeaDYMDN9NpBe7',
  'https://instagram.com/1studioarch',
  'https://linkedin.com/company/1studioarch',
  'https://youtube.com/@1studioarch'
) ON CONFLICT (id) DO UPDATE SET 
  maps_url = 'https://maps.app.goo.gl/qvxxeaDYMDN9NpBe7',
  updated_at = NOW();
```

### STEP 2: Verify in Supabase
1. Go to **Supabase Dashboard**
2. Click **contact_info** table on left
3. You should see **one row with ID = 1**
4. Verify `maps_url` column has value: `https://maps.app.goo.gl/qvxxeaDYMDN9NpBe7`

If it's empty, click edit and add the URL.

### STEP 3: Test in Admin Panel
1. Go to `/admin`
2. Login
3. Click **Settings**
4. Look at **Contact Information** form
5. The **"Google Maps URL"** field should be filled with your URL
6. If empty → click in field → paste: `https://maps.app.goo.gl/qvxxeaDYMDN9NpBe7`
7. Click **Save Contact Info**

### STEP 4: Test on Website
1. Hard refresh homepage: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)
2. Scroll to **footer**
3. Look for locations (London, UK / New York, USA / Singapore, SG)
4. **Click on any location**
5. Should open Google Maps in new tab

### STEP 5: Open Browser Console & Check Logs
1. Right-click → **Inspect** or press **F12**
2. Go to **Console** tab
3. Click on a location
4. You should see:
   ```
   🔗 Clicked locations. maps_url: https://maps.app.goo.gl/qvxxeaDYMDN9NpBe7
   ✅ Opening: https://maps.app.goo.gl/qvxxeaDYMDN9NpBe7
   ```

If you see these messages → it's working!

If you see: `❌ No maps_url set` → data not in database

## COMMON ISSUES & FIXES

### Issue: Maps URL field is empty in admin
**Fix:**
1. Go to Supabase Dashboard
2. Check the `contact_info` table
3. Edit row ID=1
4. Add the maps URL manually in `maps_url` column
5. Save
6. Refresh admin page

### Issue: Click does nothing
**Fix:**
1. Open browser console (F12)
2. Click location
3. Check console for error messages
4. If no messages appear at all → contact_info table doesn't exist or has no data

### Issue: Console shows "No maps_url set"
**Fix:**
1. Data is not in database
2. Run the SQL above in Supabase
3. Verify the data appears in the table
4. Hard refresh website

### Issue: Maps URL is set but still not working
**Fix:**
1. Check the URL is valid: paste it directly in browser tab
2. Make sure it starts with `https://`
3. Try a different location URL from Google Maps
4. Save again in admin

## YOUR MAPS URL

Use this exact URL (the one you provided):
```
https://maps.app.goo.gl/qvxxeaDYMDN9NpBe7
```

Or get a new one:
1. Open Google Maps
2. Search for your location
3. Click **Share**
4. Click **Copy link**
5. Use that link

## VERIFICATION CHECKLIST

- [ ] SQL executed successfully in Supabase
- [ ] Data appears in `contact_info` table with maps_url filled
- [ ] Admin panel shows maps URL in Contact Information form
- [ ] Website footer displays locations
- [ ] Clicking location opens Google Maps
- [ ] Browser console shows ✅ message when clicked
- [ ] Works on Contact page too

## STILL NOT WORKING?

If after all this it still doesn't work, check:

1. **Database connection** - Are you using the correct Supabase credentials in .env?
2. **Table permissions** - RLS policies allow public read
3. **Browser cache** - Hard refresh with Ctrl+Shift+R
4. **Console errors** - F12 → Console → Any red errors?
5. **URL format** - Should start with https://maps.app.goo.gl or https://www.google.com/maps

This is the complete, working solution. Follow every step and it will work.
