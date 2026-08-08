/**
 * B2 Upload Server for Jupiter Hosting
 * Simple and clean implementation
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { createHash } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// B2 Configuration
const B2_KEY_ID = process.env.VITE_B2_KEY_ID || process.env.B2B_KEY_ID;
const B2_APPLICATION_KEY = process.env.VITE_B2_APPLICATION_KEY || process.env.B2B_APPLICATION_KEY;
const B2_BUCKET_NAME = process.env.VITE_B2_BUCKET_NAME || process.env.B2B_BUCKET_NAME;
const B2_BUCKET_ID = process.env.VITE_B2_BUCKET_ID || process.env.B2B_BUCKET_ID;

console.log('\n📋 Server Configuration:');
console.log('  PORT:', PORT);
console.log('  B2_KEY_ID:', B2_KEY_ID ? '✅ Set' : '❌ Missing');
console.log('  B2_APP_KEY:', B2_APPLICATION_KEY ? '✅ Set' : '❌ Missing');
console.log('  B2_BUCKET_NAME:', B2_BUCKET_NAME || '❌ Missing');
console.log('  B2_BUCKET_ID:', B2_BUCKET_ID ? '✅ Set' : '❌ Missing\n');

let b2AuthCache = null;

// === MIDDLEWARE ===
// Enable CORS for all routes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-File-Name', 'Authorization']
}));

// Body parser - accept any content type up to 500MB
app.use(express.raw({ type: '*/*', limit: '500mb' }));
app.use(express.json({ limit: '500mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`\n[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
  if (req.path === '/api/b2-upload') {
    console.log('  Content-Type:', req.headers['content-type']);
    console.log('  Content-Length:', req.headers['content-length']);
  }
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

  if (!response.ok) {
    throw new Error(`B2 auth failed: ${response.statusText}`);
  }

  const data = await response.json();

  b2AuthCache = {
    apiUrl: data.apiUrl,
    downloadUrl: data.downloadUrl,
    authorizationToken: data.authorizationToken,
    expiresAt: now + 23 * 60 * 60 * 1000,
  };

  return b2AuthCache;
}

async function getB2UploadUrl(auth) {
  const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: 'POST',
    headers: {
      Authorization: auth.authorizationToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ bucketId: B2_BUCKET_ID }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get B2 upload URL: ${response.statusText}`);
  }

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

  if (!response.ok) {
    throw new Error(`B2 upload failed: ${response.statusText}`);
  }

  return await response.json();
}

// === ROUTES ===

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', configured: !!B2_KEY_ID });
});

// B2 Upload endpoint
app.post('/b2-upload', async (req, res) => {
  console.log('\n📨 Upload request:');
  console.log('  File size:', req.body?.length || 0, 'bytes');
  console.log('  Content-Type:', req.headers['content-type']);
  console.log('  File name header:', req.headers['x-file-name']);

  try {
    // Validate B2 config
    if (!B2_KEY_ID || !B2_APPLICATION_KEY || !B2_BUCKET_NAME || !B2_BUCKET_ID) {
      console.error('❌ B2 config missing!');
      return res.status(400).json({
        error: 'B2 not configured on server'
      });
    }

    // Get filename from header
    const fileName = req.headers['x-file-name'];
    if (!fileName) {
      console.error('❌ No X-File-Name header');
      return res.status(400).json({ error: 'Missing X-File-Name header' });
    }

    console.log('  ⬆️  Starting B2 upload:', fileName);

    // Authorize with B2
    const auth = await authorizeB2();
    console.log('  ✅ Authorized with B2');

    // Upload file
    const result = await uploadToB2(fileName, req.body, auth);
    console.log('  ✅ Uploaded to B2:', result.fileName);

    // Build public URL
    const publicUrl = `${auth.downloadUrl}/file/${B2_BUCKET_NAME}/${result.fileName}`;
    console.log('  📍 Public URL:', publicUrl);

    res.json({
      success: true,
      url: publicUrl,
      fileName: result.fileName
    });

  } catch (error) {
    console.error('❌ Upload error:', error instanceof Error ? error.message : error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Upload failed'
    });
  }
});

// 404 handler (must be last)
app.use((req, res) => {
  console.log(`⚠️  404 - ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method
  });
});

// === START SERVER ===
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 B2 Upload Server running on http://localhost:' + PORT);
  console.log('📤 Upload endpoint: POST http://localhost:' + PORT + '/b2-upload');
  console.log('✅ Server ready for requests\n');
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});
