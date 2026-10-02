// Uploads big files (500MB+) in 5MB pieces with automatic retry.
const CHUNK_SIZE = 5 * 1024 * 1024;
const MAX_RETRIES = 5;

export async function chunkedUpload(
  file: File,
  fileType: string,
  onProgress?: (percent: number) => void,
  endpoint = `${import.meta.env.VITE_API_URL || 'https://digitrixmedia.com'}/studioarch/api/upload-chunk`
): Promise<{ success: boolean; url?: string; error?: string }> {
  const safeName = file.name.replace(/[^\w.-]/g, '_');
  const uploadId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));

  for (let i = 0; i < totalChunks; i++) {
    const blob = file.slice(i * CHUNK_SIZE, Math.min(file.size, (i + 1) * CHUNK_SIZE));
    let lastError = '';
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'X-File-Name': safeName,
            'X-File-Type': fileType,
            'X-Upload-Id': uploadId,
            'X-Chunk-Index': String(i),
            'X-Total-Chunks': String(totalChunks),
          },
          body: blob,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
        onProgress?.(Math.round(((i + 1) / totalChunks) * 100));
        if (data.done) return { success: true, url: data.url };
        lastError = '';
        break;
      } catch (e) {
        lastError = e instanceof Error ? e.message : 'Network error';
        // 4xx (except 408/409/429) are permanent — don't retry
        if (/HTTP 4(0[0-7]|1\d)/.test(lastError) || /not allowed|Invalid|exceeds/i.test(lastError)) break;
        await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, 15000)));
      }
    }
    if (lastError) return { success: false, error: `Chunk ${i + 1}/${totalChunks} failed: ${lastError}` };
  }
  return { success: false, error: 'Upload did not finalize' };
}
