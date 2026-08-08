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

    console.log('Starting B2 upload:', { originalName: fileName, sanitizedName: sanitizedFileName, fileSize: file.size });

    if (onProgress) onProgress(10);

    // Use Railway backend endpoint
    const apiUrl = 'https://studioarch-production.up.railway.app/b2-upload';

    console.log('Using API endpoint:', apiUrl);
    console.log('Request details:', {
      method: 'POST',
      headers: {
        'X-File-Name': sanitizedFileName,
        'Content-Type': file.type || 'application/octet-stream',
      },
      bodySize: file.size
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'X-File-Name': sanitizedFileName,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    });

    console.log('Response status:', response.status, response.statusText);

    if (onProgress) onProgress(50);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Upload failed (${response.status})`);
    }

    const data = await response.json();

    if (onProgress) onProgress(100);

    console.log('✅ B2 upload successful:', data.url);

    return {
      success: true,
      url: data.url,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('B2 upload error:', errorMessage, error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}
