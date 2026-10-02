// B2 Storage Upload Utility - Direct B2 API calls

const B2_KEY_ID = import.meta.env.VITE_B2_KEY_ID;
const B2_APP_KEY = import.meta.env.VITE_B2_APPLICATION_KEY;
const B2_BUCKET_NAME = import.meta.env.VITE_B2_BUCKET_NAME;
const B2_BUCKET_ID = import.meta.env.VITE_B2_BUCKET_ID;

export async function uploadToB2(file, onProgress) {
  try {
    console.log('🚀 [B2] Starting B2 upload:', {
      fileName: file.name,
      fileSize: file.size,
      bucketName: B2_BUCKET_NAME
    });

    // Step 1: Authorize with B2
    console.log('🔐 [B2] Authorizing...');
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

    console.log('✅ [B2] Authorized');

    // Step 2: Get upload URL
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
    const fileBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-1', fileBuffer);
    const sha1 = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Step 4: Upload file
    console.log('📤 [B2] Uploading to B2...');
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': uploadToken,
        'X-Bz-File-Name': file.name,
        'X-Bz-Content-Sha1': sha1,
        'Content-Type': 'application/octet-stream'
      },
      body: file
    });

    if (!uploadResponse.ok) {
      throw new Error(`B2 upload failed: ${uploadResponse.status}`);
    }

    const uploadResult = await uploadResponse.json();
    const fileUrl = `https://f000.backblazeb2.com/file/${B2_BUCKET_NAME}/${uploadResult.fileName}`;

    console.log('✅ [B2] Upload complete:', fileUrl);
    onProgress?.(100);

    return {
      success: true,
      fileId: uploadResult.fileId,
      fileName: uploadResult.fileName,
      url: fileUrl,
      size: uploadResult.contentLength
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
