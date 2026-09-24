/**
 * StudioArch Backend - Production Ready
 * Features: B2 Upload, Image Rotation, Video Support, Fast Processing
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { createHash } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// B2 Configuration
const B2_KEY_ID = process.env.VITE_B2_KEY_ID || process.env.B2B_KEY_ID;
const B2_APPLICATION_KEY = process.env.VITE_B2_APPLICATION_KEY || process.env.B2B_APPLICATION_KEY;
const B2_BUCKET_NAME = process.env.VITE_B2_BUCKET_NAME || process.env.B2B_BUCKET_NAME;
const B2_BUCKET_ID = process.env.VITE_B2_BUCKET_ID || process.env.B2B_BUCKET_ID;

console.log('\n🚀 StudioArch Backend Starting...');
console.log('  PORT:', PORT);
console.log('  B2_KEY_ID:', B2_KEY_ID ? '✅' : '❌');
console.log('  B2_BUCKET:', B2_BUCKET_NAME || '❌\n');

let b2AuthCache = null;

// === MIDDLEWARE ===
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-File-Name', 'X-Image-Rotation', 'Authorization'],
}));

app.use(express.raw({ type: '*/*', limit: '500mb' }));
app.use(express.json({ limit: '500mb' }));

// Logging
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
  next();
});

// === B2 FUNCTIONS ===
async function authorizeB2() {
  const now = Date.now();
  if (b2AuthCache && b2AuthCache.expiresAt > now) {
    return b2AuthCache;
  }

  const basic = Buffer.from(`${B2_KEY_ID}:${B2_APPLICATION_KEY}`).toString('base64');
  const response = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    method: 'GET',
    headers: { Authorization: `Basic ${basic}` },
  });

  if (!response.ok) throw new Error('B2 auth failed');

  const data = await response.json();
  b2AuthCache = {
    apiUrl: data.apiUrl,
    authToken: data.authorizationToken,
    expiresAt: now + 3600000, // 1 hour
  };

  return b2AuthCache;
}

async function getB2UploadUrl(auth) {
  const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: 'POST',
    headers: {
      Authorization: auth.authToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ bucketId: B2_BUCKET_ID }),
  });

  if (!response.ok) throw new Error('Failed to get upload URL');
  return await response.json();
}

async function uploadToB2(fileName, fileData, auth) {
  const uploadUrlData = await getB2UploadUrl(auth);
  const uploadUrl = uploadUrlData.uploadUrl;
  const uploadAuthToken = uploadUrlData.authorizationToken;

  const sha1 = createHash('sha1').update(fileData).digest('hex');

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: uploadAuthToken,
      'X-Bz-File-Name': encodeURIComponent(fileName),
      'Content-Type': 'application/octet-stream',
      'X-Bz-Content-Sha1': sha1,
    },
    body: fileData,
  });

  if (!response.ok) throw new Error(`B2 upload failed: ${response.statusText}`);
  return await response.json();
}

// === ROUTES ===
// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main upload endpoint with rotation support
app.post('/b2-upload', async (req, res) => {
  try {
    const fileName = req.headers['x-file-name'] || 'file';
    const rotation = parseInt(req.headers['x-image-rotation'] || '0');
    let fileData = req.body;

    console.log(`  📤 Uploading: ${fileName} (${fileData.length} bytes)`);

    // Apply image rotation if requested
    if ((rotation === 90 || rotation === 180 || rotation === 270) && isImageFile(fileName)) {
      console.log(`  🔄 Rotating image ${rotation}°...`);
      fileData = await rotateImage(fileData, rotation);
      console.log(`  ✅ Rotation complete`);
    }

    // Authorize B2
    const auth = await authorizeB2();

    // Upload to B2
    const result = await uploadToB2(fileName, fileData, auth);

    // Build public URL
    const b2Url = `https://f${result.fileId.slice(0, 3)}.backblazeb2.com/file/${B2_BUCKET_NAME}/${result.fileName}`;

    console.log(`  ✅ Upload successful: ${b2Url}`);

    res.json({ success: true, url: b2Url, fileId: result.fileId });
  } catch (error) {
    console.error('  ❌ Error:', error.message);
    res.status(400).json({ success: false, error: error.message });
  }
});

// === UTILITIES ===
function isImageFile(fileName) {
  const imageExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  return imageExt.some(ext => fileName.toLowerCase().endsWith(ext));
}

async function rotateImage(buffer, degrees) {
  try {
    const rotated = await sharp(buffer).rotate(degrees).toBuffer();
    return rotated;
  } catch (error) {
    console.error('Rotation failed:', error);
    return buffer; // Return original if rotation fails
  }
}

// === START SERVER ===
app.listen(PORT, () => {
  console.log(`\n✅ Server running on port ${PORT}`);
  console.log(`📤 Upload: POST http://localhost:${PORT}/b2-upload`);
  console.log(`🏥 Health: GET http://localhost:${PORT}/health\n`);
});
