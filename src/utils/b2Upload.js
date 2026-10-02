// B2 Upload via Vercel Function
// Frontend → Vercel Function → B2 Auth → B2 Upload

const API_BASE = import.meta.env.VITE_API_URL || 'https://digitrixmedia.com';

export async function uploadToB2(file, onProgress) {
  try {
    console.log('🚀 [B2] Starting upload via Vercel:', {
      fileName: file.name,
      fileSize: (file.size / 1024 / 1024).toFixed(2) + ' MB'
    });

    // Step 1: Get auth from PHP backend
    console.log('🔐 [B2] Getting auth from PHP...');
    const authResponse = await fetch(`${API_BASE}/studioarch/api/b2-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!authResponse.ok) {
      throw new Error(`Auth failed: ${authResponse.status}`);
    }

    const authData = await authResponse.json();
    if (!authData.success) {
      throw new Error(authData.error || 'Auth failed');
    }

    console.log('✅ [B2] Got auth from PHP');

    // Step 2: Calculate SHA1
    console.log('🔢 [B2] Calculating SHA1...');
    const fileBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-1', fileBuffer);
    const sha1 = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Step 3: Upload to B2
    console.log('📤 [B2] Uploading to B2...');
    const fileKey = `uploads/${new Date().toISOString().split('T')[0]}/${Date.now()}-${file.name}`;

    const uploadResponse = await fetch(authData.uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': authData.authToken,
        'X-Bz-File-Name': fileKey,
        'X-Bz-Content-Sha1': sha1,
        'Content-Type': file.type || 'application/octet-stream'
      },
      body: fileBuffer
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json().catch(() => ({}));
      throw new Error(error.message || `Upload failed: ${uploadResponse.status}`);
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
