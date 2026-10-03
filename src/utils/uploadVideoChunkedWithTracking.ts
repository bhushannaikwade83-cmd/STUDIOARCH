// Chunked video upload with progress tracking
const API_BASE = import.meta.env.VITE_API_URL || 'https://digitrixmedia.com';
const CHUNK_SIZE = 25 * 1024 * 1024; // 25MB chunks (fast & reliable)

export interface UploadProgress {
  uploadId: string;
  projectId: number;
  fileName: string;
  progress: number;
  status: 'uploading' | 'reassembling' | 'completed' | 'failed';
  error?: string;
}

async function reportProgress(
  uploadId: string,
  projectId: number,
  progress: number,
  status: string,
  error?: string
) {
  try {
    const token = localStorage.getItem('studioarch_jwt_token');
    const params = new URLSearchParams();
    params.append('uploadId', uploadId);
    params.append('progress', String(progress));
    params.append('status', status);
    params.append('error', error || '');

    await fetch(`${API_BASE}/studioarch/api/upload-tracker.php?action=update`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token || ''}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
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
    const uploadId = 'upload_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    console.log('📦 [CHUNKED] Starting chunked upload:', file.name);
    console.log(`📦 [CHUNKED] ${totalChunks} chunks of ${(CHUNK_SIZE / 1024 / 1024).toFixed(1)}MB`);

    // Initialize tracking
    const token = localStorage.getItem('studioarch_jwt_token');
    const initParams = new URLSearchParams();
    initParams.append('uploadId', uploadId);
    initParams.append('projectId', String(projectId));
    initParams.append('fileName', file.name);
    initParams.append('fileSize', String(file.size));

    await fetch(`${API_BASE}/studioarch/api/upload-tracker.php?action=init`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token || ''}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: initParams.toString(),
    });

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

      const response = await fetch(`${API_BASE}/studioarch/api/upload-chunk.php`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorMsg = `Chunk ${chunkIndex + 1} failed: ${response.status}`;
        await reportProgress(uploadId, projectId, Math.round((chunkIndex / totalChunks) * 100), 'failed', errorMsg);
        throw new Error(errorMsg);
      }

      const result = await response.json();
      if (!result.success) {
        const errorMsg = result.error || `Chunk ${chunkIndex + 1} failed`;
        await reportProgress(uploadId, projectId, Math.round((chunkIndex / totalChunks) * 100), 'failed', errorMsg);
        throw new Error(errorMsg);
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

    // All chunks uploaded - file being assembled on server
    console.log('✅ [CHUNKED] All chunks uploaded, file being assembled on server');
    await reportProgress(uploadId, projectId, 100, 'reassembling');

    onProgress?.({
      uploadId,
      projectId,
      fileName: file.name,
      progress: 100,
      status: 'reassembling',
    });

    // Return placeholder URL - backend will generate real filename during finalize
    const url = `${API_BASE}/studioarch/uploads/videos/uploaded_${Date.now()}.mp4`;

    console.log('✅ [CHUNKED] Upload complete (file assembling server-side)');
    return url;

  } catch (error) {
    console.error('❌ [CHUNKED] Error:', error);
    throw error;
  }
}
