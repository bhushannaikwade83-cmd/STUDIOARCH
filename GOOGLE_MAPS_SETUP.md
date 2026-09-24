# How to Add Google Maps Location Embed

## ❌ Wrong - Don't Use These:
- `https://www.google.com/maps/place/...` (regular Google Maps link)
- `https://maps.google.com/?q=...` (search link)
- Regular Google Maps URL

## ✅ Correct - Use Embedded URL

### Method 1: Get Embed URL from Google Maps (Easy)

1. **Go to Google Maps**: https://maps.google.com/
2. **Search for your location** (e.g., "Mykonos, Greece")
3. **Click the "Share" button** (looks like a share icon)
4. **Click "Embed a map" tab**
5. **Copy the entire `src` value** from the iframe
   ```html
   <iframe src="https://www.google.com/maps/embed?pb=..." ...></iframe>
   ```
6. **Copy everything after `src="`** - it starts with `https://www.google.com/maps/embed?pb=`
7. **Paste into admin panel location field**

### Method 2: Easy URL Format

The embed URL format is:
```
https://www.google.com/maps/embed?pb=[unique-code-here]
```

### Example URLs That Work:
```
https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3024.1234567890!2d-74.0060!3d40.7128!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z0JTQtdC50L3Qv9C40YM!5e0!3m2!1sen!2sus!4v1234567890
```

## 📝 Step-by-Step for Admin Panel

1. Go to Admin → Projects → Edit/Create Project
2. Find "Location Map Embed URL" field
3. **Paste the full embed URL** (must start with `https://www.google.com/maps/embed?pb=`)
4. Save project
5. Check Projects page - map should display

## ⚠️ Troubleshooting

### "Refused to connect" Error
- ❌ You pasted a regular Google Maps link
- ✅ Use the embed URL format above

### Map doesn't show anything
- ❌ URL might be incomplete or wrong
- ✅ Copy entire URL from Google Maps embed
- ✅ Make sure it starts with `https://www.google.com/maps/embed?pb=`

### How to verify you have correct URL
Correct URL should:
- Start with: `https://www.google.com/maps/embed?pb=`
- Contain many numbers and `!`
- End with: `!5e0!3m2!1sen!2sus!4v[numbers]`
- Be very long (usually 300+ characters)

## 🎯 Quick Copy-Paste Example

**Original Google Maps Share → Embed:**

Before (Wrong):
```
https://www.google.com/maps/place/New+York,+USA/@40.7128,-74.0060,10z
```

After (Correct):
```
https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3024.1234567890!2d-74.0060!3d40.7128!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z0JTQtdC50L3Qv9C40YM!5e0!3m2!1sen!2sus!4v1234567890
```

## Test It
1. Add a project with location embed URL
2. Go to /projects page
3. Click on project modal
4. Scroll down - you should see the map!
