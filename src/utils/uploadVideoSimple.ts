// Simple direct video upload to server
// No B2, no queue, no background processing
// Fast and straightforward

const API_BASE = import.meta.env.VITE_API_URL || 'https://digitrixmedia.com';

export async function uploadVideoSimple(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  try {
    console.log('📤 [SIMPLE] Uploading video:', file.name);

    const formData = new FormData();
    formData.append('video', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Progress tracking
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress?.(percent);
          console.log(`⬆️ [SIMPLE] Upload ${percent}%`);
        }
      };

      // Success
      xhr.onload = () => {
        if (xhr.status === 200) {
          const result = JSON.parse(xhr.responseText);
          if (result.success) {
            console.log('✅ [SIMPLE] Upload complete:', result.url);
            resolve(result.url);
          } else {
            reject(new Error(result.error || 'Upload failed'));
          }
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.responseText}`));
        }
      };

      // Error
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.ontimeout = () => reject(new Error('Upload timed out'));

      // Send
      const token = localStorage.getItem('studioarch_jwt_token');
      xhr.open('POST', `${API_BASE}/studioarch/api/upload-video.php`);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.timeout = 30 * 60 * 1000; // 30 minutes
      xhr.send(formData);
    });
  } catch (error) {
    console.error('❌ [SIMPLE] Error:', error);
    throw error;
  }
}
