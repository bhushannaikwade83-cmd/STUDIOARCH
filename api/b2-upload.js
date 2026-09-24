/**
 * B2 Upload API - Local/Production Handler
 */

import { createHash } from 'node:crypto';

export const config = {
  api: { bodyParser: false },
};

let b2AuthCache = null;

function env(...keys) {
  for (const k of keys) {
    const v = String(process.env[k] || '').trim();
    if (v) return v;
  }
  return '';
}

function requireB2Config() {
  const keyId = env('VITE_B2_KEY_ID', 'B2B_KEY_ID');
  const applicationKey = env('VITE_B2_APPLICATION_KEY', 'B2B_APPLICATION_KEY');
  const bucketName = env('VITE_B2_BUCKET_NAME', 'B2B_BUCKET_NAME');
  const bucketId = env('VITE_B2_BUCKET_ID', 'B2B_BUCKET_ID');

  if (!keyId || !applicationKey || !bucketName || !bucketId) {
    throw new Error('Missing B2 config. Set VITE_B2_KEY_ID, VITE_B2_APPLICATION_KEY, VITE_B2_BUCKET_NAME, and VITE_B2_BUCKET_ID.');
  }
  return { keyId, applicationKey, bucketName, bucketId };
}

async function b2AuthorizeAccount() {
  const now = Date.now();
  if (b2AuthCache && b2AuthCache.expiresAt > now) return b2AuthCache;

  const { keyId, applicationKey } = requireB2Config();
  const basic = Buffer.from(`${keyId}:${applicationKey}`).toString('base64');

  const r = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    method: 'GET',
    headers: { Authorization: `Basic ${basic}` },
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message || `B2 auth failed (${r.status})`);

  b2AuthCache = {
    apiUrl: data.apiUrl,
    downloadUrl: data.downloadUrl,
    authorizationToken: data.authorizationToken,
    expiresAt: now + 23 * 60 * 60 * 1000,
  };

  return b2AuthCache;
}

async function b2ApiPost(apiUrl, path, authorizationToken, body) {
  const r = await fetch(`${apiUrl}/b2api/v2/${path}`, {
    method: 'POST',
    headers: {
      Authorization: authorizationToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body || {}),
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message || `${path} failed (${r.status})`);
  return data;
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-File-Name, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // ============ GET - Download/Proxy Images ============
  if (req.method === 'GET' || req.method === 'HEAD') {
    try {
      const keyParam = req.query.key;
      if (!keyParam) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(400).json({ error: 'Missing key parameter' });
      }

      // Decode key - handle multiple encoding levels
      let key = decodeURIComponent(String(keyParam));
      while (key.includes('%2F') || key.includes('%2f')) {
        key = decodeURIComponent(key);
      }

      console.log(`[GET] Key: ${key}`);

      const { bucketName, bucketId } = requireB2Config();
      const auth = await b2AuthorizeAccount();

      // Get download auth from B2
      const authToken = await b2ApiPost(auth.apiUrl, 'b2_get_download_authorization', auth.authorizationToken, {
        bucketId,
        fileNamePrefix: key,
        validDurationInSeconds: 3600,
      });

      // Build download URL
      const downloadUrl = `${auth.downloadUrl}/file/${encodeURIComponent(bucketName)}/${key}`;
      console.log(`[GET] URL: ${downloadUrl}`);

      // Fetch from B2
      const response = await fetch(downloadUrl, {
        method: req.method,
        headers: {
          Authorization: authToken.authorizationToken,
        },
      });

      console.log(`[GET] B2 Response: ${response.status}`);

      if (!response.ok) {
        const body = await response.text().catch(() => 'No error');
        console.error(`[GET] B2 Error: ${response.status} - ${body}`);
        res.setHeader('Content-Type', 'application/json');
        return res.status(response.status).json({ error: `B2 error ${response.status}` });
      }

      // Set headers
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const contentLength = response.headers.get('content-length');

      res.setHeader('Content-Type', contentType);
      if (contentLength) res.setHeader('Content-Length', contentLength);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('ETag', `"${Buffer.from(src).toString('base64').substring(0, 20)}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');

      if (req.method === 'HEAD') {
        return res.status(200).end();
      }

      // Stream file
      const buffer = await response.arrayBuffer();
      console.log(`[GET] Success: ${buffer.byteLength} bytes`);
      return res.status(200).send(Buffer.from(buffer));

    } catch (error) {
      console.error(`[GET] Error:`, error.message);
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).json({ error: error.message });
    }
  }

  // ============ POST - Upload Images ============
  if (req.method === 'POST') {
    try {
      const fileName = req.headers['x-file-name'];
      const contentType = req.headers['content-type'] || 'application/octet-stream';

      if (!fileName) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(400).json({ error: 'Missing X-File-Name header' });
      }

      console.log(`[POST] Uploading: ${fileName}`);

      const body = await readRawBody(req);
      if (!body || body.length === 0) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(400).json({ error: 'Empty file' });
      }

      const { bucketName, bucketId } = requireB2Config();
      const auth = await b2AuthorizeAccount();

      // Get upload URL
      const uploadInfo = await b2ApiPost(auth.apiUrl, 'b2_get_upload_url', auth.authorizationToken, {
        bucketId,
      });

      // Calculate SHA1
      const sha1 = createHash('sha1').update(body).digest('hex');

      // Sanitize and upload
      const sanitizedFileName = fileName.replace(/\s+/g, '_');
      const uploadRes = await fetch(uploadInfo.uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: uploadInfo.authorizationToken,
          'X-Bz-File-Name': sanitizedFileName,
          'Content-Type': contentType,
          'X-Bz-Content-Sha1': sha1,
        },
        body,
      });

      if (!uploadRes.ok) {
        const errorBody = await uploadRes.text().catch(() => 'Unknown error');
        console.error(`[POST] B2 Upload failed: ${uploadRes.status} - ${errorBody}`);
        res.setHeader('Content-Type', 'application/json');
        return res.status(uploadRes.status).json({
          error: `Upload failed (${uploadRes.status})`,
        });
      }

      const uploadData = await uploadRes.json().catch(() => {
        throw new Error('Invalid response from B2');
      });

      const proxyUrl = `/api/b2-upload?key=${encodeURIComponent(sanitizedFileName)}`;
      console.log(`[POST] Success: ${proxyUrl}`);

      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({
        success: true,
        url: proxyUrl,
        fileName: uploadData.fileName,
        fileId: uploadData.fileId,
      });

    } catch (error) {
      console.error(`[POST] Error:`, error.message);
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Method not allowed
  res.setHeader('Content-Type', 'application/json');
  return res.status(405).json({ error: 'Method not allowed' });
}
