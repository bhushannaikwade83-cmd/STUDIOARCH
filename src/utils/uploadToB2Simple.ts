// Simple B2 Upload - Server-side proxy (no CORS issues!)
// Browser → /api/upload → B2
// Handles small and large files automatically

const API_BASE = import.meta.env.VITE_API_URL || 'https://digitrixmedia.com';

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

    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', file.name);
    formData.append('folder', folder);

    // Track upload progress
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

    // Upload to server endpoint
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
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.error || 'Upload failed: HTTP ' + xhr.status));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.open('POST', `${API_BASE}/studioarch/api/upload`);
      xhr.send(formData);
    });

    return await uploadPromise;

  } catch (error) {
    console.error('❌ [B2] Error:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}
