// B2 Storage Upload Utility - uses PHP proxy to bypass CORS

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/studioarch/api`
  : 'https://digitrixmedia.com/studioarch/api';

const B2_BUCKET_NAME = import.meta.env.VITE_B2_BUCKET_NAME;

import { getToken } from './auth.js';

export async function uploadToB2(file, onProgress) {
  try {
    console.log('🚀 [B2] Starting B2 upload:', {
      fileName: file.name,
      fileSize: file.size,
      bucketName: B2_BUCKET_NAME
    });

    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', file.name);

    // Upload to backend proxy (bypasses CORS)
    console.log('📤 [B2] Uploading via PHP proxy...');

    const response = await fetch(`${API_BASE}/b2-proxy`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: formData
    });

    console.log('📥 [B2] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [B2] Upload failed:', errorText);
      throw new Error(`B2 upload failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'B2 upload error');
    }

    console.log('✅ [B2] Upload complete:', result.url);

    onProgress?.(100);

    return {
      success: true,
      fileId: result.fileId,
      fileName: result.fileName,
      url: result.url,
      size: result.size
    };

  } catch (error) {
    console.error('❌ [B2] Error:', error.message);
    throw error;
  }
}

export async function deleteFromB2(fileId) {
  try {
    console.log('🗑️ [B2] Deleting file:', fileId);
    // Note: Backblaze B2 file deletion requires both fileId and fileName
    // This would need to be implemented in the proxy if needed
    throw new Error('B2 deletion not yet implemented');
  } catch (error) {
    console.error('❌ [B2] Delete error:', error.message);
    throw error;
  }
}
