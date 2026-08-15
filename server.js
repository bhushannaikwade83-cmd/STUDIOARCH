/**
 * StudioArch Backend - Simple Version (no image processing)
 * Direct B2 upload without rotation
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { createHash } from 'crypto';
import * as db from './db.js';

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
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'X-File-Name', 'Authorization'], }));
app.use(express.raw({ type: '*/*', limit: '500mb' }));
app.use(express.json());

// Auth Middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = db.verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.user = user;
  next();
};

// Health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// B2 Auth
async function authorizeB2() {
  const now = Date.now();
  if (b2AuthCache && b2AuthCache.expiresAt > now) {
    console.log('✅ [B2 Auth] Using cached auth token');
    return b2AuthCache;
  }

  console.log('🔐 [B2 Auth] Starting B2 authorization...');
  console.log('📋 [B2 Auth] Credentials check:', {
    hasKeyId: !!B2_KEY_ID,
    hasAppKey: !!B2_APPLICATION_KEY,
    keyIdLength: B2_KEY_ID?.length || 0,
    appKeyLength: B2_APPLICATION_KEY?.length || 0,
  });

  const basic = Buffer.from(`${B2_KEY_ID}:${B2_APPLICATION_KEY}`).toString('base64');
  console.log('🔑 [B2 Auth] Base64 auth prepared, length:', basic.length);

  const res = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    method: 'GET',
    headers: { Authorization: `Basic ${basic}` },
  });

  console.log('📡 [B2 Auth] Response status:', res.status, res.statusText);

  if (!res.ok) {
    const errorText = await res.text();
    console.error('❌ [B2 Auth] Auth failed:', {
      status: res.status,
      statusText: res.statusText,
      errorBody: errorText,
      timestamp: new Date().toISOString()
    });
    throw new Error(`B2 auth failed: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  console.log('✅ [B2 Auth] Success! Got API URL:', data.apiUrl);

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

    console.log('📤 [Upload] Starting upload:', {
      fileName,
      fileSize: fileData?.length || 0,
      timestamp: new Date().toISOString()
    });

    // B2 Auth & Upload
    console.log('🔐 [Upload] Step 1: Authorizing with B2...');
    const auth = await authorizeB2();
    console.log('✅ [Upload] Step 1 complete: Got auth token');

    console.log('🔗 [Upload] Step 2: Getting upload URL...');
    const urlData = await getB2UploadUrl(auth);
    console.log('✅ [Upload] Step 2 complete: Got upload URL');

    console.log('📋 [Upload] Step 3: Computing SHA1...');
    const sha1 = createHash('sha1').update(fileData).digest('hex');
    console.log('✅ [Upload] Step 3 complete: SHA1 =', sha1);

    console.log('📨 [Upload] Step 4: Uploading to B2...');
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

    console.log('📡 [Upload] Response status:', uploadRes.status, uploadRes.statusText);

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      console.error('❌ [Upload] Upload failed:', {
        status: uploadRes.status,
        statusText: uploadRes.statusText,
        errorBody: errorText
      });
      throw new Error(`B2 upload failed: ${uploadRes.status} ${errorText}`);
    }

    const result = await uploadRes.json();
    const b2Url = `https://f${result.fileId.slice(0, 3)}.backblazeb2.com/file/${B2_BUCKET_NAME}/${result.fileName}`;

    console.log('✅ [Upload] SUCCESS! File URL:', b2Url);
    res.json({ success: true, url: b2Url });
  } catch (error) {
    console.error('❌ [Upload] Error caught:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    res.status(400).json({ success: false, error: error.message });
  }
});

// ===== AUTH ENDPOINTS =====

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const result = await db.loginUser(email, password);
    res.json(result);
  } catch (error) {
    console.error('❌ /api/auth/login error:', error.message);
    res.status(401).json({ error: error.message });
  }
});

// ===== API ENDPOINTS =====

// Projects
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await db.getProjects();
    res.json(projects);
  } catch (error) {
    console.error('❌ /api/projects error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects', authMiddleware, async (req, res) => {
  try {
    const project = await db.createProject(req.body);
    res.json(project);
  } catch (error) {
    console.error('❌ /api/projects POST error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/projects/:id', authMiddleware, async (req, res) => {
  try {
    await db.updateProject(req.params.id, req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ /api/projects PUT error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/projects/:id', authMiddleware, async (req, res) => {
  try {
    await db.deleteProject(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ /api/projects DELETE error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Event Videos
app.get('/api/event-videos', async (req, res) => {
  try {
    const videos = await db.getEventVideos();
    res.json(videos);
  } catch (error) {
    console.error('❌ /api/event-videos error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/event-videos', authMiddleware, async (req, res) => {
  try {
    const video = await db.createEventVideo(req.body);
    res.json(video);
  } catch (error) {
    console.error('❌ /api/event-videos POST error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/event-videos/:id', authMiddleware, async (req, res) => {
  try {
    await db.deleteEventVideo(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ /api/event-videos DELETE error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Journal Posts
app.get('/api/journal-posts', async (req, res) => {
  try {
    const posts = await db.getJournalPosts();
    res.json(posts);
  } catch (error) {
    console.error('❌ /api/journal-posts error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/journal-posts', authMiddleware, async (req, res) => {
  try {
    const post = await db.createJournalPost(req.body);
    res.json(post);
  } catch (error) {
    console.error('❌ /api/journal-posts POST error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/journal-posts/:id', authMiddleware, async (req, res) => {
  try {
    await db.deleteJournalPost(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ /api/journal-posts DELETE error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Contact Messages
app.get('/api/contact-messages', async (req, res) => {
  try {
    const messages = await db.getContactMessages();
    res.json(messages);
  } catch (error) {
    console.error('❌ /api/contact-messages error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/contact-messages', async (req, res) => {
  try {
    const message = await db.createContactMessage(req.body);
    res.json(message);
  } catch (error) {
    console.error('❌ /api/contact-messages POST error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/contact-messages/:id', authMiddleware, async (req, res) => {
  try {
    await db.deleteContactMessage(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ /api/contact-messages DELETE error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Start
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}\n`);
});
