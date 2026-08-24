const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this_in_production';

// B2 Configuration
const B2_KEY_ID = process.env.VITE_B2_KEY_ID;
const B2_APPLICATION_KEY = process.env.VITE_B2_APPLICATION_KEY;
const B2_BUCKET_NAME = process.env.VITE_B2_BUCKET_NAME;
const B2_BUCKET_ID = process.env.VITE_B2_BUCKET_ID;

console.log('\n🚀 StudioArch Backend (Node.js)');
console.log('  Port:', PORT);
console.log('  B2:', B2_BUCKET_NAME ? '✅' : '❌');

let pool;
let b2AuthCache = null;

// Database Pool
async function initDb() {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'digitrix_studioarchwebsite',
      password: process.env.DB_PASSWORD || 'studioarch@70',
      database: process.env.DB_NAME || 'digitrix_studioarchwebsite',
      connectionLimit: 10,
      waitForConnections: true,
      queueLimit: 0,
    });
    console.log('✅ Database connected');
  } catch (err) {
    console.error('❌ Database error:', err);
    process.exit(1);
  }
}

// Middleware
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'X-File-Name', 'X-File-Type', 'Authorization'], }));
app.use(express.json({ limit: '10mb' }));
app.use(express.raw({ type: ['image/*', 'video/*', 'application/octet-stream'], limit: '500mb' }));

// Auth Middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Health (all path variations)
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/studioarch/api/health', (req, res) => res.json({ status: 'ok' }));
app.get('/studioarch/api/health', (req, res) => res.json({ status: 'ok' }));

// B2 Auth
async function authorizeB2() {
  const now = Date.now();
  if (b2AuthCache && b2AuthCache.expiresAt > now) {
    console.log('✅ [B2 Auth] Using cached auth token');
    return b2AuthCache;
  }

  try {
    console.log('🔐 [B2 Auth] Starting B2 authorization...');
    const basic = Buffer.from(`${B2_KEY_ID}:${B2_APPLICATION_KEY}`).toString('base64');

    const res = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      method: 'GET',
      headers: { Authorization: `Basic ${basic}` },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`B2 auth failed: ${res.status} ${errorText}`);
    }

    const data = await res.json();
    console.log('✅ [B2 Auth] Success!');

    b2AuthCache = { apiUrl: data.apiUrl, authToken: data.authorizationToken, expiresAt: now + 3600000 };
    return b2AuthCache;
  } catch (err) {
    console.error('❌ [B2 Auth] Error:', err.message);
    throw err;
  }
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

// Local file upload endpoint (Images & Videos up to 500MB)
app.post('/studioarch/api/upload', async (req, res) => {
  try {
    const fileName = req.headers['x-file-name'] || 'file';
    const fileType = req.headers['x-file-type'] || 'other'; // 'projects', 'videos', 'gallery', 'journal'
    const contentType = req.headers['content-type'] || '';
    const fileData = req.body;

    // Validate file size (max 500MB)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (fileData.length > maxSize) {
      return res.status(413).json({ success: false, error: 'File exceeds 500MB limit' });
    }

    // Validate file type
    const isImage = contentType.startsWith('image/');
    const isVideo = contentType.startsWith('video/');
    if (!isImage && !isVideo) {
      return res.status(400).json({ success: false, error: 'Only images and videos allowed' });
    }

    console.log('📤 [Upload] Starting upload:', {
      fileName,
      fileType,
      size: `${(fileData.length / (1024 * 1024)).toFixed(2)}MB`,
      type: isImage ? 'IMAGE' : 'VIDEO'
    });

    // Create upload directory
    const uploadsRoot = path.join(__dirname, '..', 'uploads', fileType);
    if (!fs.existsSync(uploadsRoot)) {
      fs.mkdirSync(uploadsRoot, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${timestamp}-${safeName}`;
    const filePath = path.join(uploadsRoot, uniqueFileName);

    // Save file
    fs.writeFileSync(filePath, fileData);

    // Return web-accessible URL
    const webUrl = `/studioarch/uploads/${fileType}/${uniqueFileName}`;
    const fullUrl = `https://digitrixmedia.com${webUrl}`;

    console.log('✅ [Upload] SUCCESS!', { size: `${(fileData.length / (1024 * 1024)).toFixed(2)}MB`, url: fullUrl });
    res.json({ success: true, url: fullUrl, path: webUrl, fileName: uniqueFileName, size: fileData.length });
  } catch (error) {
    console.error('❌ [Upload] Error:', error.message);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Serve uploaded files statically (from studioarch root)
app.use('/studioarch/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ===== AUTH ENDPOINTS =====

// Login
app.post('/studioarch/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const conn = await pool.getConnection();
    const [rows] = await conn.execute('SELECT * FROM users WHERE email = ?', [email]);
    conn.release();

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    // TODO: Verify password hash
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error('❌ Login error:', error.message);
    res.status(401).json({ error: error.message });
  }
});

// ===== API ENDPOINTS =====

// Projects
app.get('/studioarch/api/projects', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.execute('SELECT * FROM projects ORDER BY created_at DESC');
    conn.release();
    res.json(rows);
  } catch (error) {
    console.error('❌ /api/projects error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/studioarch/api/projects', authMiddleware, async (req, res) => {
  try {
    const { title, description, images } = req.body;
    const conn = await pool.getConnection();
    const [result] = await conn.execute(
      'INSERT INTO projects (title, description, images) VALUES (?, ?, ?)',
      [title, description, JSON.stringify(images)]
    );
    conn.release();
    res.json({ id: result.insertId, title, description });
  } catch (error) {
    console.error('❌ /api/projects POST error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.put('/studioarch/api/projects/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, images } = req.body;
    const conn = await pool.getConnection();
    await conn.execute(
      'UPDATE projects SET title = ?, description = ?, images = ? WHERE id = ?',
      [title, description, JSON.stringify(images), req.params.id]
    );
    conn.release();
    res.json({ success: true });
  } catch (error) {
    console.error('❌ /api/projects PUT error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/studioarch/api/projects/:id', authMiddleware, async (req, res) => {
  try {
    const conn = await pool.getConnection();
    await conn.execute('DELETE FROM projects WHERE id = ?', [req.params.id]);
    conn.release();
    res.json({ success: true });
  } catch (error) {
    console.error('❌ /api/projects DELETE error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Event Videos
app.get('/studioarch/api/event-videos', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.execute('SELECT * FROM event_videos ORDER BY created_at DESC');
    conn.release();
    res.json(rows);
  } catch (error) {
    console.error('❌ /api/event-videos error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/studioarch/api/event-videos', authMiddleware, async (req, res) => {
  try {
    const { title, url } = req.body;
    const conn = await pool.getConnection();
    const [result] = await conn.execute(
      'INSERT INTO event_videos (title, url) VALUES (?, ?)',
      [title, url]
    );
    conn.release();
    res.json({ id: result.insertId, title, url });
  } catch (error) {
    console.error('❌ /api/event-videos POST error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/studioarch/api/event-videos/:id', authMiddleware, async (req, res) => {
  try {
    const conn = await pool.getConnection();
    await conn.execute('DELETE FROM event_videos WHERE id = ?', [req.params.id]);
    conn.release();
    res.json({ success: true });
  } catch (error) {
    console.error('❌ /api/event-videos DELETE error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Journal Posts
app.get('/studioarch/api/journal-posts', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.execute('SELECT * FROM journal_posts ORDER BY created_at DESC');
    conn.release();
    res.json(rows);
  } catch (error) {
    console.error('❌ /api/journal-posts error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/studioarch/api/journal-posts', authMiddleware, async (req, res) => {
  try {
    const { title, content } = req.body;
    const conn = await pool.getConnection();
    const [result] = await conn.execute(
      'INSERT INTO journal_posts (title, content) VALUES (?, ?)',
      [title, content]
    );
    conn.release();
    res.json({ id: result.insertId, title, content });
  } catch (error) {
    console.error('❌ /api/journal-posts POST error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/studioarch/api/journal-posts/:id', authMiddleware, async (req, res) => {
  try {
    const conn = await pool.getConnection();
    await conn.execute('DELETE FROM journal_posts WHERE id = ?', [req.params.id]);
    conn.release();
    res.json({ success: true });
  } catch (error) {
    console.error('❌ /api/journal-posts DELETE error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Contact Messages
app.get('/studioarch/api/contact-messages', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.execute('SELECT * FROM contact_messages ORDER BY created_at DESC');
    conn.release();
    res.json(rows);
  } catch (error) {
    console.error('❌ /api/contact-messages error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/studioarch/api/contact-messages', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    const conn = await pool.getConnection();
    const [result] = await conn.execute(
      'INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)',
      [name, email, message]
    );
    conn.release();
    res.json({ id: result.insertId, name, email, message });
  } catch (error) {
    console.error('❌ /api/contact-messages POST error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/studioarch/api/contact-messages/:id', authMiddleware, async (req, res) => {
  try {
    const conn = await pool.getConnection();
    await conn.execute('DELETE FROM contact_messages WHERE id = ?', [req.params.id]);
    conn.release();
    res.json({ success: true });
  } catch (error) {
    console.error('❌ /api/contact-messages DELETE error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Gallery Items
app.get('/studioarch/api/gallery-items', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.execute('SELECT * FROM gallery_items ORDER BY created_at DESC');
    conn.release();
    res.json(rows);
  } catch (error) {
    console.error('❌ /api/gallery-items error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/studioarch/api/gallery-items', authMiddleware, async (req, res) => {
  try {
    const { folder_name, image_url, title } = req.body;
    const conn = await pool.getConnection();
    const [result] = await conn.execute(
      'INSERT INTO gallery_items (folder_name, image_url, title) VALUES (?, ?, ?)',
      [folder_name, image_url, title]
    );
    conn.release();
    res.json({ id: result.insertId, folder_name, image_url, title });
  } catch (error) {
    console.error('❌ /api/gallery-items POST error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/studioarch/api/gallery-items/:id', authMiddleware, async (req, res) => {
  try {
    const conn = await pool.getConnection();
    await conn.execute('DELETE FROM gallery_items WHERE id = ?', [req.params.id]);
    conn.release();
    res.json({ success: true });
  } catch (error) {
    console.error('❌ /api/gallery-items DELETE error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Content Settings
app.get('/studioarch/api/content-settings', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.execute('SELECT * FROM content_settings');
    conn.release();
    res.json(rows);
  } catch (error) {
    console.error('❌ /api/content-settings error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/studioarch/api/content-settings', authMiddleware, async (req, res) => {
  try {
    const { key_name, value } = req.body;
    const conn = await pool.getConnection();
    await conn.execute(
      'INSERT INTO content_settings (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
      [key_name, value]
    );
    conn.release();
    res.json({ success: true });
  } catch (error) {
    console.error('❌ /api/content-settings POST error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Contact Info
app.get('/studioarch/api/contact-info', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.execute('SELECT * FROM contact_info LIMIT 1');
    conn.release();
    res.json(rows);
  } catch (error) {
    console.error('❌ /api/contact-info error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/studioarch/api/contact-info', authMiddleware, async (req, res) => {
  try {
    const { email, phone, locations, instagram, linkedin, youtube, locationmapurl } = req.body;
    const conn = await pool.getConnection();
    await conn.execute(
      'INSERT INTO contact_info (email, phone, locations, instagram, linkedin, youtube, locationmapurl) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE email = VALUES(email)',
      [email, phone, locations, instagram, linkedin, youtube, locationmapurl]
    );
    conn.release();
    res.json({ success: true });
  } catch (error) {
    console.error('❌ /api/contact-info POST error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Start
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}\n`);
  });
});

module.exports = app;
