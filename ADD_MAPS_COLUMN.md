# Add maps_url Column to Existing Table

The `contact_info` table exists but is missing the `maps_url` column.

## Run this SQL in Supabase:

```sql
-- Add the missing maps_url column
ALTER TABLE contact_info
ADD COLUMN maps_url TEXT;

-- Update existing row with your maps URL
UPDATE contact_info 
SET maps_url = 'https://maps.app.goo.gl/qvxxeaDYMDN9NpBe7'
WHERE id = 1;
```

That's it! 

## Then verify:
1. Go to Supabase Dashboard
2. Click **contact_info** table
3. You should see the **maps_url** column now
4. It should have the value: `https://maps.app.goo.gl/qvxxeaDYMDN9NpBe7`

## Test:
1. Hard refresh your website (Ctrl+Shift+R)
2. Click on any location in footer or contact page
3. Should open Google Maps ✅
