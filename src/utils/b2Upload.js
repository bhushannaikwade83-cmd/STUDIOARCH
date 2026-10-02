// B2 Storage Upload Utility - Backend Proxy (like BJNP pattern)

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/studioarch/api`
  : 'https://digitrixmedia.com/studioarch/api';

import { getToken } from './auth.js';

export async function uploadToB2(file, onProgress) {
  try {
    console.log('🚀 [B2] Starting B2 upload:', {
      fileName: file.name,
      fileSize: file.size
    });

    const token = getToken();
    const fileBuffer = await file.arrayBuffer();

    // Upload to backend proxy (server handles B2 auth)
    console.log('📤 [B2] Uploading via backend proxy...');

    const response = await fetch(`${API_BASE}/b2-proxy`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'X-File-Name': file.name,
        'X-Folder': 'uploads/',
        'X-Content-Type': file.type || 'application/octet-stream'
      },
      body: fileBuffer
    });

    console.log('📥 [B2] Response status:', response.status);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('❌ [B2] Upload failed:', error);
      throw new Error(error.error || `Upload failed: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'B2 upload error');
    }

    console.log('✅ [B2] Upload complete:', result.publicUrl);
    onProgress?.(100);

    return {
      success: true,
      fileId: result.fileId,
      fileName: result.fileName,
      url: result.publicUrl || result.b2Url,
      size: result.contentLength
    };

  } catch (error) {
    console.error('❌ [B2] Error:', error.message);
    throw error;
  }
}

export async function deleteFromB2(fileId) {
  try {
    console.log('🗑️ [B2] Deleting file:', fileId);
    throw new Error('B2 deletion not yet implemented');
  } catch (error) {
    console.error('❌ [B2] Delete error:', error.message);
    throw error;
  }
}
