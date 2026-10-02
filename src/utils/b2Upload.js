// B2 Direct Upload - Frontend uploads directly to B2 after auth
// PHP only provides authorization, doesn't handle files

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/studioarch/api`
  : 'https://digitrixmedia.com/studioarch/api';

import { getToken } from './auth.js';

export async function uploadToB2(file, onProgress) {
  try {
    console.log('🚀 [B2] Direct upload start:', {
      fileName: file.name,
      fileSize: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      type: file.type
    });

    const token = getToken();

    // Step 1: Get B2 authorization from PHP (auth only, no file)
    console.log('🔐 [B2] Getting authorization from PHP...');
    const authResponse = await fetch(`${API_BASE}/uploads/create`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      })
    });

    if (!authResponse.ok) {
      throw new Error(`Auth failed: ${authResponse.status}`);
    }

    const authData = await authResponse.json();
    if (!authData.success) {
      throw new Error(authData.error || 'Authorization failed');
    }

    console.log('✅ [B2] Got authorization');

    // Step 2: Calculate SHA1 hash
    console.log('🔢 [B2] Calculating SHA1...');
    const fileBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-1', fileBuffer);
    const sha1 = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Step 3: Upload DIRECTLY to B2 (no PHP middleman)
    console.log('📤 [B2] Uploading directly to B2...');
    const uploadResponse = await fetch(authData.uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': authData.authToken,
        'X-Bz-File-Name': authData.fileKey,
        'X-Bz-Content-Sha1': sha1,
        'Content-Type': file.type || 'application/octet-stream'
      },
      body: fileBuffer
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => ({}));
      throw new Error(errorData.message || `B2 upload failed: ${uploadResponse.status}`);
    }

    const uploadResult = await uploadResponse.json();
    const publicUrl = `${authData.downloadUrl}/file/${authData.bucketName}/${uploadResult.fileName}`;

    console.log('✅ [B2] Upload complete:', publicUrl);
    onProgress?.(100);

    return {
      success: true,
      fileId: uploadResult.fileId,
      fileName: uploadResult.fileName,
      url: publicUrl,
      size: uploadResult.contentLength
    };

  } catch (error) {
    console.error('❌ [B2] Error:', error.message);
    throw error;
  }
}

export async function deleteFromB2(fileId) {
  throw new Error('B2 deletion not yet implemented');
}
