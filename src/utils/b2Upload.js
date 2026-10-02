// B2 Storage Upload Utility

const B2_API_URL = 'https://api.backblazeb2.com';
const B2_KEY_ID = import.meta.env.VITE_B2_KEY_ID;
const B2_APPLICATION_KEY = import.meta.env.VITE_B2_APPLICATION_KEY;
const B2_BUCKET_NAME = import.meta.env.VITE_B2_BUCKET_NAME;
const B2_BUCKET_ID = import.meta.env.VITE_B2_BUCKET_ID;

let authCache = { token: null, uploadUrl: null, expiresAt: 0 };

async function b2Authorize() {
  // Check if cached token is still valid
  if (authCache.token && authCache.expiresAt > Date.now()) {
    return authCache;
  }

  console.log('🔐 [B2] Authorizing...');

  const auth = btoa(`${B2_KEY_ID}:${B2_APPLICATION_KEY}`);

  const response = await fetch(`${B2_API_URL}/b2api/v2/b2_authorize_account`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`
    }
  });

  if (!response.ok) {
    throw new Error(`B2 auth failed: ${response.status}`);
  }

  const data = await response.json();

  authCache = {
    token: data.authorizationToken,
    apiUrl: data.apiUrl,
    uploadUrl: null,
    bucketId: data.bucketId || B2_BUCKET_ID,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  };

  console.log('✅ [B2] Authorized');
  return authCache;
}

async function b2GetUploadUrl(auth) {
  console.log('📤 [B2] Getting upload URL...');

  const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: 'POST',
    headers: {
      'Authorization': auth.token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ bucketId: auth.bucketId })
  });

  if (!response.ok) {
    throw new Error(`B2 get upload URL failed: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

export async function uploadToB2(file, onProgress) {
  try {
    console.log('🚀 [B2] Starting B2 upload:', {
      fileName: file.name,
      fileSize: file.size,
      bucketName: B2_BUCKET_NAME
    });

    // Authorize
    const auth = await b2Authorize();

    // Get upload URL
    const uploadUrl = await b2GetUploadUrl(auth);

    // Create SHA1 hash (B2 requires it)
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-1', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    console.log('📤 [B2] Uploading to B2...');

    // Upload file to B2
    const uploadResponse = await fetch(uploadUrl.uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': uploadUrl.authorizationToken,
        'X-Bz-File-Name': file.name,
        'X-Bz-Content-Sha1': hashHex,
        'Content-Type': file.type || 'application/octet-stream'
      },
      body: arrayBuffer
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      console.error('❌ [B2] Upload failed:', error);
      throw new Error(`B2 upload failed: ${uploadResponse.status}`);
    }

    const result = await uploadResponse.json();

    // Generate public B2 URL
    const fileUrl = `https://${auth.apiUrl.split('//')[1]}/file/${B2_BUCKET_NAME}/${result.fileName}`;

    console.log('✅ [B2] Upload complete:', fileUrl);

    onProgress?.(100);

    return {
      success: true,
      fileId: result.fileId,
      fileName: result.fileName,
      url: fileUrl,
      size: result.contentLength
    };

  } catch (error) {
    console.error('❌ [B2] Error:', error.message);
    throw error;
  }
}

export async function deleteFromB2(fileId) {
  try {
    const auth = await b2Authorize();

    console.log('🗑️ [B2] Deleting file:', fileId);

    const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_delete_file_version`, {
      method: 'POST',
      headers: {
        'Authorization': auth.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileId: fileId,
        fileName: fileId // B2 requires both
      })
    });

    if (!response.ok) {
      throw new Error(`B2 delete failed: ${response.status}`);
    }

    console.log('✅ [B2] File deleted');
    return true;

  } catch (error) {
    console.error('❌ [B2] Delete error:', error.message);
    throw error;
  }
}
