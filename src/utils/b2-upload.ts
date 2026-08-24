/**
 * Local File Upload Utility
 * Uploads files to cPanel server instead of B2
 */

export async function uploadToB2(
  file: File,
  fileName: string,
  fileType: string = 'other',
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const sanitizedFileName = fileName.replace(/\s+/g, '_');

    console.log('🚀 [Upload] Starting local upload:', {
      originalName: fileName,
      sanitizedName: sanitizedFileName,
      fileSize: file.size,
      fileType: file.type,
      category: fileType,
      timestamp: new Date().toISOString()
    });

    if (onProgress) onProgress(10);

    // Use local upload endpoint
    const apiUrl = 'https://digitrixmedia.com/studioarch/api/upload';

    console.log('🔗 [Upload] Using endpoint:', apiUrl);

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'X-File-Name': sanitizedFileName,
        'X-File-Type': fileType,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: arrayBuffer,
    });

    console.log('📡 [Upload] Response received:', {
      status: response.status,
      statusText: response.statusText,
      timestamp: new Date().toISOString()
    });

    if (onProgress) onProgress(50);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ [Upload] Server error:', {
        status: response.status,
        errorData,
        timestamp: new Date().toISOString()
      });
      throw new Error(errorData.error || `Upload failed (${response.status})`);
    }

    const data = await response.json();

    console.log('✅ [Upload] Response data:', {
      url: data.url,
      fileName: data.fileName,
      timestamp: new Date().toISOString()
    });

    if (onProgress) onProgress(100);

    console.log('✅ [Upload] Upload successful!');

    return {
      success: true,
      url: data.url,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [Upload] Upload failed:', {
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
