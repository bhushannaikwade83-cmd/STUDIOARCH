/**
 * StudioArch Backend - Simple Version (no image processing)
 * Direct B2 upload without rotation
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { createHash } from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// B2 Configuration
const B2_KEY_ID = process.env.VITE_B2_KEY_ID;
const B2_APPLICATION_KEY = process.env.VITE_B2_APPLICATION_KEY;
const B2_BUCKET_NAME = process.env.VITE_B2_BUCKET_NAME;
const B2_BUCKET_ID = process.env.VITE_B2_BUCKET_ID;

console.log('\n🚀 StudioArch Backend (Simple)');
console.log('  B2:', B2_BUCKET_NAME ? '✅' : '❌');

let b2AuthCache = null;

// Middleware
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type', 'X-File-Name', 'Authorization'], }));
app.use(express.raw({ type: '*/*', limit: '500mb' }));

// Health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// B2 Auth
async function authorizeB2() {
  const now = Date.now();
  if (b2AuthCache && b2AuthCache.expiresAt > now) return b2AuthCache;

  const basic = Buffer.from(`${B2_KEY_ID}:${B2_APPLICATION_KEY}`).toString('base64');
  const res = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    method: 'GET',
    headers: { Authorization: `Basic ${basic}` },
  });

  if (!res.ok) throw new Error('B2 auth failed');
  const data = await res.json();
  b2AuthCache = { apiUrl: data.apiUrl, authToken: data.authorizationToken, expiresAt: now + 3600000 };
  return b2AuthCache;
}

async function getB2UploadUrl(auth) {
  const res = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: 'POST',
    headers: { Authorization: auth.authToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucketId: B2_BUCKET_ID }),
  });
  if (!res.ok) throw new Error('Failed to get upload URL');
  return await res.json();
}

// Upload endpoint
app.post('/b2-upload', async (req, res) => {
  try {
    const fileName = req.headers['x-file-name'] || 'file';
    const fileData = req.body;

    console.log(`📤 Uploading: ${fileName}`);

    // B2 Auth & Upload
    const auth = await authorizeB2();
    const urlData = await getB2UploadUrl(auth);
    const sha1 = createHash('sha1').update(fileData).digest('hex');

    const uploadRes = await fetch(urlData.uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: urlData.authorizationToken,
        'X-Bz-File-Name': encodeURIComponent(fileName),
        'Content-Type': 'application/octet-stream',
        'X-Bz-Content-Sha1': sha1,
      },
      body: fileData,
    });

    if (!uploadRes.ok) throw new Error('B2 upload failed');
    const result = await uploadRes.json();
    const b2Url = `https://f${result.fileId.slice(0, 3)}.backblazeb2.com/file/${B2_BUCKET_NAME}/${result.fileName}`;

    console.log(`✅ Success: ${b2Url}`);
    res.json({ success: true, url: b2Url });
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Start
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}\n`);
});
