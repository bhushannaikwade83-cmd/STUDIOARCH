// B2 Chunked Upload - Direct from browser to B2 (no cPanel limits!)
// Works for files 5MB to 10TB

const API_BASE = import.meta.env.VITE_API_URL || 'https://digitrixmedia.com';
const CHUNK_SIZE = 100 * 1024 * 1024; // 100MB chunks

interface B2AuthData {
  uploadUrl: string;
  authToken: string;
  bucketName: string;
  downloadUrl: string;
  apiUrl: string;
}

async function getB2Auth(): Promise<B2AuthData> {
  const response = await fetch(`${API_BASE}/studioarch/api/b2-auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) throw new Error(`Auth failed: ${response.status}`);
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

async function initiateB2Upload(
  auth: B2AuthData,
  fileName: string,
  fileSize: number
): Promise<string> {
  // Start large file upload via PHP proxy (B2 API doesn't allow direct browser access)
  const response = await fetch(`${API_BASE}/studioarch/api/b2-initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      authToken: auth.authToken,
      apiUrl: auth.apiUrl,
      bucketId: import.meta.env.VITE_B2_BUCKET_ID,
      fileName: `uploads/${new Date().toISOString().split('T')[0]}/${Date.now()}-${fileName}`
    })
  });

  if (!response.ok) throw new Error(`Initiate failed: ${response.status}`);
  const data = await response.json();
  return data.fileId;
}

async function uploadChunk(
  auth: B2AuthData,
  fileId: string,
  partNumber: number,
  chunk: Blob
): Promise<string> {
  // Upload chunk via PHP proxy (B2 API doesn't allow direct browser access)
  const formData = new FormData();
  formData.append('chunk', chunk);
  formData.append('fileId', fileId);
  formData.append('partNumber', partNumber.toString());
  formData.append('authToken', auth.authToken);
  formData.append('apiUrl', auth.apiUrl);

  const uploadResponse = await fetch(`${API_BASE}/studioarch/api/b2-upload-part`, {
    method: 'POST',
    headers: {
      'X-File-ID': fileId,
      'X-Part-Number': partNumber.toString()
    },
    body: formData
  });

  if (!uploadResponse.ok) throw new Error(`Chunk upload failed: ${uploadResponse.status}`);

  const result = await uploadResponse.json();
  return result.contentSha1;
}

async function finishB2Upload(
  auth: B2AuthData,
  fileId: string,
  partShas: string[]
): Promise<{ fileName: string; url: string }> {
  // Finish upload via PHP proxy (B2 API doesn't allow direct browser access)
  const response = await fetch(`${API_BASE}/studioarch/api/b2-finish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fileId,
      partShas,
      authToken: auth.authToken,
      apiUrl: auth.apiUrl
    })
  });

  if (!response.ok) throw new Error(`Finish failed: ${response.status}`);

  const result = await response.json();
  const url = `${auth.downloadUrl}/file/${auth.bucketName}/${result.fileName}`;

  return {
    fileName: result.fileName,
    url
  };
}

export async function uploadToB2Chunked(file: File, onProgress?: (percent: number) => void) {
  try {
    console.log('🚀 [B2 Chunked] Starting chunked upload:', {
      fileName: file.name,
      fileSize: (file.size / 1024 / 1024 / 1024).toFixed(2) + ' GB'
    });

    // Step 1: Get auth
    console.log('🔐 [B2 Chunked] Getting auth...');
    const auth = await getB2Auth();

    // Step 2: Initiate large file upload
    console.log('📝 [B2 Chunked] Initiating large file upload...');
    const fileId = await initiateB2Upload(auth, file.name, file.size);

    // Step 3: Upload chunks
    console.log('📦 [B2 Chunked] Uploading chunks...');
    const partShas: string[] = [];
    let uploadedBytes = 0;

    for (let partNumber = 1; uploadedBytes < file.size; partNumber++) {
      const start = (partNumber - 1) * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      console.log(`📤 [B2 Chunked] Part ${partNumber}: ${(chunk.size / 1024 / 1024).toFixed(0)}MB`);

      const sha1 = await uploadChunk(auth, fileId, partNumber, chunk);
      partShas.push(sha1);

      uploadedBytes = end;
      const percent = Math.round((uploadedBytes / file.size) * 100);
      onProgress?.(percent);
      console.log(`✅ [B2 Chunked] Part ${partNumber} complete (${percent}%)`);
    }

    // Step 4: Finish upload
    console.log('🏁 [B2 Chunked] Finalizing upload...');
    const { fileName, url } = await finishB2Upload(auth, fileId, partShas);

    console.log('✅ [B2 Chunked] Upload complete:', url);
    onProgress?.(100);

    return {
      success: true,
      fileName,
      url,
      size: file.size
    };

  } catch (error) {
    console.error('❌ [B2 Chunked] Error:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}
