# Google Maps Link - Quick Start Guide

## Getting Your Maps Link (2 Steps)

### Step 1: Open Google Maps
- Go to [maps.google.com](https://maps.google.com)
- Or open Google Maps app on your phone

### Step 2: Get the Share Link
1. Search for your location (e.g., "Studio-Arch, Mumbai")
2. Click **Share** button (usually top-right)
3. Click **Copy link**
4. You now have something like: `https://maps.app.goo.gl/qvxxeaDYMDN9NpBe7`

## Add to Admin Panel

1. Login to Admin Panel → **Settings**
2. Scroll to **Contact Information**
3. Paste the link into **"Google Maps URL"** field
4. Click **Save Contact Info**

Done! ✅

## How Users Will Use It

### On Footer
- Scroll to footer
- Click on any location text (London, UK / New York, USA / etc.)
- Opens Google Maps with your location

### On Contact Page
- Visit `/contact`
- Click on any location text
- Opens Google Maps with your location

## Supported Link Formats

All of these work:

✅ **Short Link** (Easiest - recommended)
```
https://maps.app.goo.gl/qvxxeaDYMDN9NpBe7
```

✅ **Full Maps URL**
```
https://www.google.com/maps/search/Studio-Arch,+Mumbai
```

✅ **Direct Location**
```
https://www.google.com/maps/place/Studio/@19.123,72.456
```

## Example Admin Entry

```
Google Maps URL: https://maps.app.goo.gl/qvxxeaDYMDN9NpBe7
```

That's all you need! The system will handle the rest.

## Troubleshooting

**Link not working?**
- Test it in a new browser tab first
- Make sure it starts with `https://`
- Copy directly from Google Maps (don't type it)

**Multiple locations?**
- Use the same Google Maps link for all locations
- Or create different short links for each location and update as needed

**Mobile links?**
- Google Maps app links work too
- Just copy the share link from the app

## Testing

After saving:
1. Hard refresh website (Ctrl+Shift+R)
2. Click location text on footer or contact page
3. Should open Google Maps with your location
4. Perfect! ✅
