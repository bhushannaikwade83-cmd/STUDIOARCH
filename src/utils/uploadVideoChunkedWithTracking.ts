// Chunked video upload with progress tracking (localStorage based)
const API_BASE = import.meta.env.VITE_API_URL || 'https://digitrixmedia.com';
const CHUNK_SIZE = 25 * 1024 * 1024; // 25MB chunks (fast & reliable)

export interface UploadProgress {
  uploadId: string;
  projectId: number;
  fileName: string;
  progress: number;
  status: 'uploading' | 'reassembling' | 'completed' | 'failed';
  error?: string;
  createdAt: string;
}

function reportProgress(
  uploadId: string,
  projectId: number,
  progress: number,
  status: string,
  error?: string
) {
  try {
    const uploads = JSON.parse(localStorage.getItem('upload_progress_tracking') || '[]');
    const index = uploads.findIndex((u: UploadProgress) => u.uploadId === uploadId);

    if (index >= 0) {
      uploads[index] = {
        ...uploads[index],
        progress,
        status,
        error: error || undefined,
      };
    } else {
      uploads.push({
        uploadId,
        projectId,
        fileName: 'uploading...',
        progress,
        status,
        error: error || undefined,
        createdAt: new Date().toISOString(),
      });
    }

    localStorage.setItem('upload_progress_tracking', JSON.stringify(uploads));
  } catch (err) {
    console.error('Failed to report progress:', err);
  }
}

export async function uploadVideoChunkedWithTracking(
  file: File,
  projectId: number,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  try {
    const token = localStorage.getItem('studioarch_jwt_token');
    const uploadId = 'upload_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    console.log('📦 [CHUNKED] Starting chunked upload:', file.name);
    console.log(`📦 [CHUNKED] ${totalChunks} chunks of ${(CHUNK_SIZE / 1024 / 1024).toFixed(1)}MB`);

    // Initialize tracking in localStorage
    const uploads = JSON.parse(localStorage.getItem('upload_progress_tracking') || '[]');
    uploads.push({
      uploadId,
      projectId,
      fileName: file.name,
      progress: 0,
      status: 'uploading',
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem('upload_progress_tracking', JSON.stringify(uploads));

    // Upload each chunk sequentially
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

      try {
        // Fetch with 5 minute timeout per chunk
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);

        const response = await fetch(`${API_BASE}/studioarch/api/upload-chunk.php`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token || ''}`,
          },
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorMsg = `Chunk ${chunkIndex + 1} failed: HTTP ${response.status}`;
          reportProgress(uploadId, projectId, Math.round((chunkIndex / totalChunks) * 100), 'failed', errorMsg);
          throw new Error(errorMsg);
        }

        const result = await response.json();
        if (!result.success) {
          const errorMsg = result.error || `Chunk ${chunkIndex + 1} failed`;
          reportProgress(uploadId, projectId, Math.round((chunkIndex / totalChunks) * 100), 'failed', errorMsg);
          throw new Error(errorMsg);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        reportProgress(uploadId, projectId, Math.round((chunkIndex / totalChunks) * 100), 'failed', errorMsg);
        throw err;
      }

      // Update progress
      const uploadedChunks = chunkIndex + 1;
      const percent = Math.round((uploadedChunks / totalChunks) * 100);
      await reportProgress(uploadId, projectId, percent, 'uploading');

      onProgress?.({
        uploadId,
        projectId,
        fileName: file.name,
        progress: percent,
        status: 'uploading',
      });

      console.log(`📦 [CHUNKED] Chunk ${uploadedChunks}/${totalChunks} (${percent}%)`);
    }

    // All chunks uploaded - now finalize (reassemble chunks into final file)
    console.log('✅ [CHUNKED] All chunks uploaded, calling finalize endpoint');
    reportProgress(uploadId, projectId, 100, 'reassembling');

    onProgress?.({
      uploadId,
      projectId,
      fileName: file.name,
      progress: 100,
      status: 'reassembling',
    });

    // Call finalize endpoint to reassemble chunks
    try {
      const finalizeResponse = await fetch(`${API_BASE}/studioarch/api/upload-chunk.php?action=finalize&uploadId=${uploadId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
        },
      });

      if (!finalizeResponse.ok) {
        throw new Error(`Finalize failed: HTTP ${finalizeResponse.status}`);
      }

      const finalizeResult = await finalizeResponse.json();
      if (!finalizeResult.success) {
        throw new Error(finalizeResult.error || 'Finalize failed');
      }

      const url = finalizeResult.data?.url || finalizeResult.url || `${API_BASE}/studioarch/uploads/videos/${finalizeResult.filename}`;
      console.log('✅ [CHUNKED] Finalize complete, file ready:', url);
      reportProgress(uploadId, projectId, 100, 'completed');

      return url;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Finalize failed';
      console.error('❌ [CHUNKED] Finalize error:', errorMsg);
      reportProgress(uploadId, projectId, 100, 'failed', errorMsg);
      throw err;
    }

  } catch (error) {
    console.error('❌ [CHUNKED] Error:', error);
    throw error;
  }
}
