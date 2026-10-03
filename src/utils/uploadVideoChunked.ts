// Simple chunked video upload - no queue, no B2, just chunks
const API_BASE = import.meta.env.VITE_API_URL || 'https://digitrixmedia.com';
const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks

export async function uploadVideoChunked(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  try {
    console.log('📦 [CHUNKED] Starting chunked upload:', file.name);

    const uploadId = 'upload_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    console.log(`📦 [CHUNKED] ${totalChunks} chunks of ${(CHUNK_SIZE/1024/1024).toFixed(1)}MB`);

    // Upload each chunk
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

    // Get final URL from server
    const finalResponse = await fetch(
      `${API_BASE}/studioarch/api/upload-chunk.php?uploadId=${uploadId}&action=finalize`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('studioarch_jwt_token') || ''}`,
        },
      }
    );

    if (!finalResponse.ok) {
      throw new Error('Failed to finalize upload');
    }

    const finalResult = await finalResponse.json();
    if (!finalResult.success) {
      throw new Error(finalResult.error || 'Failed to finalize upload');
    }

    const url = finalResult.data.url;
    console.log('✅ [CHUNKED] Upload complete:', url);
    return url;

  } catch (error) {
    console.error('❌ [CHUNKED] Error:', error);
    throw error;
  }
}
