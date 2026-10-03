import crypto from 'crypto';

// B2 Upload - Vercel serverless function (Node.js)
// Browser → Vercel Node.js → B2 (no CORS issues!)

const B2_KEY_ID = process.env.B2_KEY_ID;
const B2_APP_KEY = process.env.B2_APP_KEY;
const B2_BUCKET_ID = process.env.B2_BUCKET_ID;
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME || 'STUDIO-ARCH2';

export const config = {
  runtime: 'nodejs',
  maxDuration: 300, // Free plan limit
};

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

function getHeader(req, name) {
  const key = name.toLowerCase();
  return req.headers[key] || req.headers[name] || '';
}

async function authorizeB2() {
  const auth = Buffer.from(`${B2_KEY_ID}:${B2_APP_KEY}`).toString('base64');

  const response = await fetch('https://api.backblazeb2.com/b2api/v4/b2_authorize_account', {
    method: 'GET',
    headers: { 'Authorization': `Basic ${auth}` },
  });

  if (!response.ok) {
    throw new Error(`B2 auth failed: ${response.status}`);
  }

  const data = await response.json();
  return {
    authToken: data.authorizationToken,
    apiUrl: data.apiInfo.storageApi.apiUrl,
    downloadUrl: data.apiInfo.storageApi.downloadUrl,
  };
}

async function getUploadUrl(auth, bucketId) {
  const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: 'POST',
    headers: {
      'Authorization': auth.authToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ bucketId }),
  });

  if (!response.ok) {
    throw new Error('Failed to get upload URL');
  }

  return await response.json();
}

async function uploadSimple(auth, uploadUrl, sha1, fileName, fileBuffer) {
  const response = await fetch(uploadUrl.uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': uploadUrl.authorizationToken,
      'X-Bz-File-Name': fileName,
      'X-Bz-Content-Sha1': sha1,
      'Content-Type': 'application/octet-stream',
    },
    body: fileBuffer,
  });

  if (!response.ok) {
    throw new Error('Upload to B2 failed');
  }

  return await response.json();
}

async function startLargeFile(auth, bucketId, fileName) {
  const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_start_large_file`, {
    method: 'POST',
    headers: {
      'Authorization': auth.authToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bucketId,
      fileName,
      contentType: 'application/octet-stream',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to start large file');
  }

  return await response.json();
}

async function getUploadPartUrl(auth, fileId) {
  const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_part_url`, {
    method: 'POST',
    headers: {
      'Authorization': auth.authToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileId }),
  });

  if (!response.ok) {
    throw new Error('Failed to get part URL');
  }

  return await response.json();
}

async function uploadPart(uploadUrl, partNumber, sha1, chunk) {
  const response = await fetch(uploadUrl.uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': uploadUrl.authorizationToken,
      'X-Bz-Part-Number': String(partNumber),
      'X-Bz-Content-Sha1': sha1,
      'Content-Type': 'application/octet-stream',
    },
    body: chunk,
  });

  if (!response.ok) {
    throw new Error(`Part ${partNumber} upload failed`);
  }

  return await response.json();
}

async function finishLargeFile(auth, fileId, partShas) {
  const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_finish_large_file`, {
    method: 'POST',
    headers: {
      'Authorization': auth.authToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileId,
      partSha1Array: partShas,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to finish large file');
  }

  return await response.json();
}

export default async function handler(req, res) {
  // CORS headers - CRITICAL for browser requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-File-Name, X-Folder, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!B2_KEY_ID || !B2_APP_KEY || !B2_BUCKET_ID) {
      return res.status(500).json({ error: 'B2 credentials not configured' });
    }

    const body = await readBody(req);
    const fileName = getHeader(req, 'x-file-name');
    const folder = getHeader(req, 'x-folder') || 'uploads/';

    if (!fileName || !body.length) {
      return res.status(400).json({ error: 'Missing file or filename' });
    }

    console.log(`[UPLOAD] ${fileName} (${body.length} bytes)`);

    // Authorize
    const auth = await authorizeB2();

    const CHUNK_SIZE = 100 * 1024 * 1024; // 100MB
    const useChunked = body.length > CHUNK_SIZE;
    const fullFileName = `${folder}${fileName}`;

    let result;

    if (useChunked) {
      console.log(`[UPLOAD] Using chunked for ${(body.length / 1024 / 1024 / 1024).toFixed(2)}GB`);

      // Start large file
      const start = await startLargeFile(auth, B2_BUCKET_ID, fullFileName);
      const fileId = start.fileId;

      const partShas = [];
      let offset = 0;

      for (let partNumber = 1; offset < body.length; partNumber++) {
        const end = Math.min(offset + CHUNK_SIZE, body.length);
        const chunk = body.slice(offset, end);
        const sha1 = crypto.createHash('sha1').update(chunk).digest('hex');

        console.log(`[UPLOAD] Part ${partNumber}: ${(chunk.length / 1024 / 1024).toFixed(1)}MB`);

        const partUrl = await getUploadPartUrl(auth, fileId);
        await uploadPart(partUrl, partNumber, sha1, chunk);
        partShas.push(sha1);

        offset = end;
      }

      // Finish
      const finish = await finishLargeFile(auth, fileId, partShas);
      result = finish;
    } else {
      console.log(`[UPLOAD] Using simple for ${(body.length / 1024 / 1024).toFixed(1)}MB`);

      // Get upload URL
      const uploadUrl = await getUploadUrl(auth, B2_BUCKET_ID);
      const sha1 = crypto.createHash('sha1').update(body).digest('hex');

      // Upload
      result = await uploadSimple(auth, uploadUrl, sha1, fullFileName, body);
    }

    const publicUrl = `${auth.downloadUrl}/file/${B2_BUCKET_NAME}/${encodeURIComponent(fullFileName)}`;

    console.log(`[UPLOAD] ✅ Complete: ${publicUrl}`);

    return res.status(200).json({
      success: true,
      fileName: result.fileName,
      url: publicUrl,
      size: body.length,
      chunked: useChunked,
    });
  } catch (error) {
    console.error('[UPLOAD] Error:', error.message);
    return res.status(500).json({ error: error.message || 'Upload failed' });
  }
}
