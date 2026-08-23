/**
 * B2 Storage Upload Utility
 * Works with local Node.js server or production API
 */

export async function uploadToB2(
  file: File,
  fileName: string,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const sanitizedFileName = fileName.replace(/\s+/g, '_');

    console.log('🚀 [B2 Upload] Starting upload:', {
      originalName: fileName,
      sanitizedName: sanitizedFileName,
      fileSize: file.size,
      fileType: file.type,
      timestamp: new Date().toISOString()
    });

    if (onProgress) onProgress(10);

    // Use digitrixmedia backend endpoint
    const apiUrl = 'https://digitrixmedia.com/b2-upload';

    console.log('🔗 [B2 Upload] Using endpoint:', apiUrl);
    console.log('📋 [B2 Upload] Request headers:', {
      'X-File-Name': sanitizedFileName,
      'Content-Type': file.type || 'application/octet-stream',
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'X-File-Name': sanitizedFileName,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    });

    console.log('📡 [B2 Upload] Response received:', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      timestamp: new Date().toISOString()
    });

    if (onProgress) onProgress(50);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ [B2 Upload] Server error:', {
        status: response.status,
        errorData,
        timestamp: new Date().toISOString()
      });
      throw new Error(errorData.error || `Upload failed (${response.status})`);
    }

    const data = await response.json();

    console.log('✅ [B2 Upload] Response data:', {
      url: data.url,
      fileId: data.fileId,
      timestamp: new Date().toISOString()
    });

    if (onProgress) onProgress(100);

    console.log('✅ [B2 Upload] Upload successful!');

    return {
      success: true,
      url: data.url,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [B2 Upload] Upload failed:', {
      error: errorMessage,
      fullError: error,
      timestamp: new Date().toISOString()
    });
    return {
      success: false,
      error: errorMessage,
    };
  }
}
