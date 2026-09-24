# RLS (Row Level Security) - Recommendation

## SHORT ANSWER
**Run WITHOUT RLS** for the `contact_info` table.

## WHY?

### Contact Info is PUBLIC Data
- Email, phone, locations, social links - all public
- Anyone should be able to READ it
- Only admins should WRITE/UPDATE it

### RLS Adds Complexity
- RLS can cause permission errors if misconfigured
- Makes debugging harder
- For public data like contact info, not necessary

## SIMPLE SETUP (NO RLS)

Run this SQL in Supabase:

```sql
-- Create table WITHOUT RLS
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

-- Insert data
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

That's it. No RLS needed.

## IF YOU WANT RLS (Advanced)

Only if you want extra security on updates:

```sql
-- Enable RLS
ALTER TABLE contact_info ENABLE ROW LEVEL SECURITY;

-- Public can READ
CREATE POLICY "Public read contact_info"
  ON contact_info FOR SELECT
  USING (true);

-- Only authenticated admins can UPDATE
CREATE POLICY "Admins update contact_info"
  ON contact_info FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

But this adds complexity. Only do this if you need it.

## RECOMMENDATION

**Go with NO RLS** for now.

1. Run the simple SQL above (without RLS)
2. Your maps link will work
3. It's simpler and less error-prone
4. You can add RLS later if needed

## Verification

After running SQL:

1. Go to Supabase Dashboard
2. Click **contact_info** table
3. You should see **1 row** with all the data
4. No RLS badge/warning needed

Done! ✅
