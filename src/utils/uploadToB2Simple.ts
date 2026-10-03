// Simple B2 Upload - Vercel serverless (like BJNP)
// Browser → Vercel Node.js → B2 (no CORS issues!)

const UPLOAD_URL = 'https://studioarch-main.vercel.app/api/upload';

export async function uploadToB2Simple(
  file: File,
  folder: string = 'uploads/',
  onProgress?: (percent: number) => void
): Promise<{ url: string; fileName: string }> {
  try {
    console.log('🚀 [B2] Uploading:', {
      fileName: file.name,
      fileSize: (file.size / 1024 / 1024 / 1024).toFixed(2) + ' GB'
    });

    // Track upload progress using XMLHttpRequest
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
          console.log(`📤 [B2] Progress: ${percent}%`);
        }
      });
    }

    // Upload to Vercel endpoint
    const uploadPromise = new Promise<{ url: string; fileName: string }>((resolve, reject) => {
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const result = JSON.parse(xhr.responseText);
          if (result.success) {
            console.log('✅ [B2] Upload complete:', result.url);
            onProgress?.(100);
            resolve({ url: result.url, fileName: result.fileName });
          } else {
            reject(new Error(result.error || 'Upload failed'));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.error || `Upload failed: HTTP ${xhr.status}`));
          } catch {
            reject(new Error(`Upload failed: HTTP ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.open('POST', UPLOAD_URL);
      xhr.setRequestHeader('X-File-Name', file.name);
      xhr.setRequestHeader('X-Folder', folder);

      xhr.send(file);
    });

    return await uploadPromise;

  } catch (error) {
    console.error('❌ [B2] Error:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}
