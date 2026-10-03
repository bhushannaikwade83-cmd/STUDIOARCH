import { useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://digitrixmedia.com';

interface UploadStatus {
  uploadId: string;
  fileName: string;
  fileSize: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  chunksUploaded: number;
  chunksTotal: number;
  url?: string;
  error?: string;
}

export function useUploadQueue() {
  const [upload, setUpload] = useState<UploadStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Create upload request in queue
  const submitUpload = useCallback(async (
    file: File,
    folder: string = 'uploads/',
    projectId?: number,
    fieldName?: string
  ): Promise<string> => {
    try {
      console.log('🚀 [QUEUE] Submitting upload request:', file.name);

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
        throw new Error(`Upload request failed: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to create upload request');
      }

      const { uploadId, chunksTotal, chunkSize } = result.data;

      setUpload({
        uploadId,
        fileName: file.name,
        fileSize: file.size,
        status: 'pending',
        progress: 0,
        chunksUploaded: 0,
        chunksTotal
      });

      console.log('✅ [QUEUE] Upload request created:', uploadId);
      console.log('📦 [QUEUE] Will upload in ' + chunksTotal + ' chunks of ' + (chunkSize / 1024 / 1024).toFixed(1) + 'MB');

      return uploadId;
    } catch (error) {
      console.error('❌ [QUEUE] Error:', error);
      throw error;
    }
  }, []);

  // Poll upload status
  const pollStatus = useCallback(async (uploadId: string): Promise<UploadStatus> => {
    try {
      const response = await fetch(
        `${API_BASE}/studioarch/api/upload-queue.php?uploadId=${encodeURIComponent(uploadId)}`
      );

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to get upload status');
      }

      const status: UploadStatus = result.data;
      setUpload(status);

      if (status.status === 'uploading' || status.status === 'pending') {
        console.log(`📤 [QUEUE] Progress: ${status.progress}% (${status.chunksUploaded}/${status.chunksTotal} chunks)`);
      }

      return status;
    } catch (error) {
      console.error('❌ [QUEUE] Poll error:', error);
      throw error;
    }
  }, []);

  // Start polling status until complete
  const startPolling = useCallback(async (uploadId: string, onProgress?: (percent: number) => void) => {
    setIsPolling(true);

    try {
      let status = await pollStatus(uploadId);

      while (status.status === 'pending' || status.status === 'uploading') {
        // Wait 1 second before next poll
        await new Promise(resolve => setTimeout(resolve, 1000));

        status = await pollStatus(uploadId);

        if (onProgress) {
          onProgress(status.progress);
        }

        // Check for failure
        if (status.status === 'failed') {
          throw new Error(status.error || 'Upload failed');
        }
      }

      if (status.status === 'completed') {
        console.log('✅ [QUEUE] Upload complete:', status.url);
        onProgress?.(100);
        return status.url;
      }
    } finally {
      setIsPolling(false);
    }
  }, [pollStatus]);

  return {
    upload,
    isPolling,
    submitUpload,
    pollStatus,
    startPolling
  };
}
