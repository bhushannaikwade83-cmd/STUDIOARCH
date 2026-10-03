// Upload with Queue System
// Submits to queue, shows immediate "DONE", backend processes in background

const API_BASE = import.meta.env.VITE_API_URL || 'https://digitrixmedia.com';

export async function uploadWithQueue(
  file: File,
  folder: string = 'uploads/',
  projectId?: number,
  fieldName?: string
): Promise<{ uploadId: string; showDone: boolean }> {
  try {
    console.log('🚀 [QUEUE] Submitting file to queue:', file.name);

    // Create upload queue entry
    const response = await fetch(`${API_BASE}/studioarch/api/upload-queue.php?action=create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        folder,
        projectId,
        fieldName
      })
    });

    if (!response.ok) {
      throw new Error(`Queue request failed: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to create queue entry');
    }

    const { uploadId, chunksTotal, chunkSize } = result.data;

    console.log('✅ [QUEUE] Upload queued:', uploadId);
    console.log(`📦 [QUEUE] Will upload ${chunksTotal} chunks of ${(chunkSize / 1024 / 1024).toFixed(1)}MB each`);
    console.log('⏳ [QUEUE] Background processor will handle this upload');

    // Return immediately - show "DONE UPLOADING" to admin
    return {
      uploadId,
      showDone: true // Signal to show "DONE UPLOADING" message
    };

  } catch (error) {
    console.error('❌ [QUEUE] Error:', error);
    throw error;
  }
}

// Optionally track upload status in background
export async function pollUploadStatus(
  uploadId: string,
  onProgress?: (status: any) => void
): Promise<string | null> {
  try {
    let attempts = 0;
    const maxAttempts = 300; // 5 minutes (polling every second)

    while (attempts < maxAttempts) {
      const response = await fetch(
        `${API_BASE}/studioarch/api/upload-queue.php?uploadId=${encodeURIComponent(uploadId)}`
      );

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }

      const status = result.data;

      if (onProgress) {
        onProgress(status);
      }

      if (status.status === 'completed') {
        console.log('✅ [QUEUE] Upload complete:', status.url);
        return status.url;
      }

      if (status.status === 'failed') {
        throw new Error(status.error || 'Upload failed');
      }

      // Wait 1 second before next poll
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    throw new Error('Upload processing timeout');

  } catch (error) {
    console.error('❌ [QUEUE] Poll error:', error);
    throw error;
  }
}
