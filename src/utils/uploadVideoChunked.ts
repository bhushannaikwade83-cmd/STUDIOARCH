// Simple chunked video upload - parallel chunks for speed
const API_BASE = import.meta.env.VITE_API_URL || 'https://digitrixmedia.com';
const CHUNK_SIZE = 25 * 1024 * 1024; // 25MB chunks (faster, fewer requests)
const PARALLEL_CHUNKS = 3; // Upload 3 chunks simultaneously

export async function uploadVideoChunked(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  try {
    console.log('📦 [CHUNKED] Starting chunked upload:', file.name);

    const uploadId = 'upload_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    console.log(`📦 [CHUNKED] ${totalChunks} chunks of ${(CHUNK_SIZE/1024/1024).toFixed(1)}MB, uploading ${PARALLEL_CHUNKS} in parallel`);

    // Track completed chunks
    const completedChunks = new Set<number>();
    let uploadErrors: Error[] = [];

    // Upload chunks in parallel (3 at a time)
    for (let startIdx = 0; startIdx < totalChunks; startIdx += PARALLEL_CHUNKS) {
      const chunkPromises: Promise<void>[] = [];

      // Start up to PARALLEL_CHUNKS uploads
      for (let i = 0; i < PARALLEL_CHUNKS && startIdx + i < totalChunks; i++) {
        const chunkIndex = startIdx + i;

        const uploadPromise = (async () => {
          try {
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

            completedChunks.add(chunkIndex);
            const percent = Math.round((completedChunks.size / totalChunks) * 100);
            onProgress?.(percent);
            console.log(`📦 [CHUNKED] Chunk ${chunkIndex + 1}/${totalChunks} completed (${percent}%)`);
          } catch (error) {
            uploadErrors.push(error as Error);
            throw error;
          }
        })();

        chunkPromises.push(uploadPromise);
      }

      // Wait for all parallel uploads to complete
      const results = await Promise.allSettled(chunkPromises);

      // Check for errors
      for (const result of results) {
        if (result.status === 'rejected') {
          throw result.reason;
        }
      }
    }

    if (uploadErrors.length > 0) {
      throw uploadErrors[0];
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
