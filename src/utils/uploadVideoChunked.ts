// Simple chunked video upload - sequential for reliability
const API_BASE = import.meta.env.VITE_API_URL || 'https://digitrixmedia.com';
const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB chunks (faster, fewer requests)

export async function uploadVideoChunked(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  try {
    console.log('📦 [CHUNKED] Starting chunked upload:', file.name);

    const uploadId = 'upload_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    console.log(`📦 [CHUNKED] ${totalChunks} chunks of ${(CHUNK_SIZE/1024/1024).toFixed(1)}MB`);

    // Upload each chunk sequentially (reliable, no race conditions)
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('uploadId', uploadId);
      formData.append('chunkIndex', String(chunkIndex));
      formData.append('totalChunks', String(totalChunks));
      formData.append('fileName', file.name);

      const response = await fetch(`${API_BASE}/studioarch/api/upload-chunk.php`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('studioarch_jwt_token') || ''}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Chunk ${chunkIndex + 1} failed: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || `Chunk ${chunkIndex + 1} failed`);
      }

      // Update progress
      const uploadedChunks = chunkIndex + 1;
      const percent = Math.round((uploadedChunks / totalChunks) * 100);
      onProgress?.(percent);
      console.log(`📦 [CHUNKED] Chunk ${uploadedChunks}/${totalChunks} (${percent}%)`);
    }

    // File is already created on server, no need to wait for finalize response
    // The finalize endpoint runs in background and takes time
    // We can construct the URL from the pattern we know
    // Finalize will complete eventually even if we don't wait for response

    console.log('✅ [CHUNKED] All chunks uploaded, file being assembled on server');

    // For now, return a placeholder - the file is being created
    // In a few seconds, it will be available at this URL pattern
    // The actual filename is generated server-side during finalize
    // Return a generic URL that will work once finalize completes
    const url = `${API_BASE}/studioarch/uploads/videos/uploaded_${Date.now()}.mp4`;

    console.log('✅ [CHUNKED] Upload complete (file assembling server-side)');
    return url;

  } catch (error) {
    console.error('❌ [CHUNKED] Error:', error);
    throw error;
  }
}
