// B2 Direct Upload - Frontend handles B2 auth directly, no PHP proxy

const B2_KEY_ID = '379cd0b52bbf';
const B2_APP_KEY = '0040a614cfa7c97e3de2377263ad7e9b55c68b587d';
const B2_BUCKET_ID = '0327892cfdc0dba592e0b1f';
const B2_BUCKET_NAME = 'STUDIO-ARCH';

export async function uploadToB2(file, onProgress) {
  try {
    console.log('🚀 [B2] Direct B2 upload (no PHP):', {
      fileName: file.name,
      fileSize: (file.size / 1024 / 1024).toFixed(2) + ' MB'
    });

    // Step 1: Authorize with B2 directly from frontend
    console.log('🔐 [B2] Authorizing with B2...');
    const authHeader = 'Basic ' + btoa(B2_KEY_ID + ':' + B2_APP_KEY);

    const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      method: 'POST',
      headers: {
        'Authorization': authHeader
      }
    });

    if (!authResponse.ok) {
      throw new Error(`B2 auth failed: ${authResponse.status}`);
    }

    const authData = await authResponse.json();
    const authToken = authData.authorizationToken;
    const apiUrl = authData.apiUrl;
    const downloadUrl = authData.downloadUrl;

    console.log('✅ [B2] Authorized');

    // Step 2: Get upload URL from B2
    console.log('📍 [B2] Getting upload URL...');
    const uploadUrlResponse = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: 'POST',
      headers: {
        'Authorization': authToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ bucketId: B2_BUCKET_ID })
    });

    const uploadUrlData = await uploadUrlResponse.json();
    const uploadUrl = uploadUrlData.uploadUrl;
    const uploadToken = uploadUrlData.authorizationToken;

    // Step 3: Calculate SHA1
    console.log('🔢 [B2] Calculating SHA1...');
    const fileBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-1', fileBuffer);
    const sha1 = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Step 4: Upload directly to B2
    console.log('📤 [B2] Uploading directly to B2...');
    const fileKey = `uploads/${new Date().toISOString().split('T')[0]}/${Date.now()}-${file.name}`;

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': uploadToken,
        'X-Bz-File-Name': fileKey,
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
    const publicUrl = `${downloadUrl}/file/${B2_BUCKET_NAME}/${uploadResult.fileName}`;

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
