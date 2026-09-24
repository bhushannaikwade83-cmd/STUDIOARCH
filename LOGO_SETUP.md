# Logo Setup Instructions

Your actual 1StudioArch logo has been detected and is ready for integration!

## Current Status

✓ **logo-color.png** - Your original color logo is in place
⚠ **logo-bw.png** - Black & white version needs to be created

## How to Complete Setup

The logo will display in **black & white by default** when you first load the website, and reveal the **full color version on hover** - exactly as you requested!

### Option 1: Automatic Setup (Recommended)

Run this command in your project directory:

```bash
python setup-logos.py
```

This script will:
1. Verify your logo files
2. Create the black & white version automatically
3. Confirm everything is ready

### Option 2: Manual Setup

If automatic setup doesn't work on your system:

1. Open `D:\Github Repos\studioarch\public\`
2. Copy `logo-color.png` to `logo-bw.png`
3. Manually convert `logo-bw.png` to grayscale using any image editor:
   - GIMP: Image → Mode → Grayscale
   - Photoshop: Image → Mode → Grayscale
   - Online: Use an online grayscale converter
   - Windows: Right-click → Edit with Paint → Filters → Black and White

### Option 3: Use Pre-generated Files

The black & white version has already been generated for you:
- File: `../outputs/logo-bw.png` (relative to project)
- Simply copy this file to `D:\Github Repos\studioarch\public\logo-bw.png`

## Logo Display

Once setup is complete:

- ✓ Pages will show the **black & white logo** on load (matches dark theme)
- ✓ Hovering over logo reveals **full color version** (smooth transition)
- ✓ Clicking the logo returns to home page
- ✓ Works on all pages: Home, Philosophy, Journal, Contact, Admin

## Files Involved

```
public/
├── logo-color.png       (Your original color logo)
└── logo-bw.png        (Black & white version)

Code files:
├── src/pages/Home.tsx
├── src/pages/Philosophy.tsx
├── src/pages/Journal.tsx
└── src/pages/Contact.tsx
```

## Troubleshooting

**Problem**: "logo-bw.png not found"
- **Solution**: Run setup script or manually copy the pre-generated file from outputs folder

**Problem**: Images look pixelated
- **Solution**: Ensure images are PNG format with proper resolution (377x121px)

**Problem**: Hover effect not working
- **Solution**: Verify both logo files exist in the public folder and are valid PNG images

## Next Steps

1. Complete the logo setup using one of the options above
2. Run `npm run dev` to test
3. Visit http://localhost:5173 and hover over the logo in top-right corner
4. You should see the color version appear smoothly!

---

**Created**: June 13, 2026
**Project**: 1StudioArch Portfolio Website
