<?php
// Unified B2 Upload - Server-side proxy (no CORS issues)
// Browser → /api/upload → B2
// Handles both simple and chunked uploads for large files

require_once __DIR__ . '/config.php';

// CORS headers
header('Access-Control-Allow-Origin: https://digitrixmedia.com');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-File-Name, X-Folder');
header('Access-Control-Max-Age: 86400');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'Method not allowed']);
  exit();
}

try {
  // Get B2 credentials from environment
  $b2_key_id = getenv('B2_KEY_ID');
  $b2_app_key = getenv('B2_APP_KEY');
  $b2_bucket_id = getenv('B2_BUCKET_ID');
  $b2_bucket_name = getenv('B2_BUCKET_NAME') ?: 'STUDIO-ARCH2';

  if (!$b2_key_id || !$b2_app_key || !$b2_bucket_id) {
    throw new Exception('B2 credentials not configured');
  }

  // Get file from request
  if (empty($_FILES['file'])) {
    throw new Exception('No file uploaded');
  }

  $file = $_FILES['file'];
  $fileName = $_POST['fileName'] ?? $file['name'];
  $folder = $_POST['folder'] ?? 'uploads/';
  
  if (empty($file['tmp_name']) || $file['error'] !== UPLOAD_ERR_OK) {
    throw new Exception('File upload error');
  }

  error_log('[UPLOAD] Processing file: ' . $fileName . ', size: ' . $file['size']);

  // Read file
  $fileContent = file_get_contents($file['tmp_name']);
  if ($fileContent === false) {
    throw new Exception('Failed to read file');
  }

  $fileSize = strlen($fileContent);
  error_log('[UPLOAD] File size: ' . $fileSize);

  // ===== AUTHORIZE WITH B2 =====
  error_log('[UPLOAD] Authorizing with B2...');
  
  $ch = curl_init('https://api.backblazeb2.com/b2api/v4/b2_authorize_account');
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPGET => true,
    CURLOPT_USERPWD => $b2_key_id . ':' . $b2_app_key,
    CURLOPT_HTTPAUTH => CURLAUTH_BASIC,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
  ]);

  $authResponse = curl_exec($ch);
  $httpCode = curl_getinfo($ch, CURLOPT_HTTP_CODE);
  $curlError = curl_error($ch);
  curl_close($ch);

  if ($httpCode !== 200) {
    throw new Exception('B2 auth failed: HTTP ' . $httpCode);
  }

  $authData = json_decode($authResponse, true);
  $b2AuthToken = $authData['authorizationToken'] ?? null;
  $storageApi = $authData['apiInfo']['storageApi'] ?? [];
  $b2ApiUrl = $storageApi['apiUrl'] ?? null;
  $downloadUrl = $storageApi['downloadUrl'] ?? null;

  if (!$b2AuthToken || !$b2ApiUrl) {
    throw new Exception('Missing B2 auth data');
  }

  error_log('[UPLOAD] ✅ Authorized with B2');

  // ===== DECIDE: Simple vs Chunked Upload =====
  $CHUNK_SIZE = 100 * 1024 * 1024; // 100MB chunks
  $use_chunked = $fileSize > $CHUNK_SIZE;

  if ($use_chunked) {
    error_log('[UPLOAD] Using chunked upload for ' . round($fileSize / 1024 / 1024 / 1024, 2) . 'GB file');
    $result = uploadChunked($b2ApiUrl, $b2AuthToken, $b2_bucket_id, $folder, $fileName, $fileContent, $fileSize, $CHUNK_SIZE);
  } else {
    error_log('[UPLOAD] Using simple upload for ' . round($fileSize / 1024 / 1024, 2) . 'MB file');
    $result = uploadSimple($b2ApiUrl, $b2AuthToken, $b2_bucket_id, $folder, $fileName, $fileContent);
  }

  error_log('[UPLOAD] ✅ Upload complete: ' . $result['url']);

  echo json_encode([
    'success' => true,
    'fileName' => $result['fileName'],
    'url' => $result['url'],
    'size' => $fileSize,
    'chunked' => $use_chunked
  ]);

} catch (Exception $e) {
  error_log('[UPLOAD] Error: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['error' => $e->getMessage()]);
}

function uploadSimple($b2ApiUrl, $b2AuthToken, $b2_bucket_id, $folder, $fileName, $fileContent) {
  $ch = curl_init($b2ApiUrl . '/b2api/v2/b2_get_upload_url');
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Authorization: ' . $b2AuthToken, 'Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode(['bucketId' => $b2_bucket_id]),
    CURLOPT_TIMEOUT => 30,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
  ]);

  $urlResponse = curl_exec($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);

  if ($httpCode !== 200) {
    throw new Exception('Failed to get upload URL');
  }

  $urlData = json_decode($urlResponse, true);
  $uploadUrl = $urlData['uploadUrl'];
  $uploadAuthToken = $urlData['authorizationToken'];

  $sha1 = sha1($fileContent);
  $fullFileName = $folder . $fileName;

  $ch = curl_init($uploadUrl);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
      'Authorization: ' . $uploadAuthToken,
      'X-Bz-File-Name: ' . $fullFileName,
      'X-Bz-Content-Sha1: ' . $sha1,
      'Content-Type: application/octet-stream'
    ],
    CURLOPT_POSTFIELDS => $fileContent,
    CURLOPT_TIMEOUT => 600,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
  ]);

  $uploadResponse = curl_exec($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);

  if ($httpCode !== 200) {
    throw new Exception('Upload to B2 failed');
  }

  $result = json_decode($uploadResponse, true);
  $publicUrl = 'https://f004.backblazeb2.com/file/STUDIO-ARCH2/' . urlencode($fullFileName);

  return ['fileName' => $result['fileName'], 'url' => $publicUrl];
}

function uploadChunked($b2ApiUrl, $b2AuthToken, $b2_bucket_id, $folder, $fileName, $fileContent, $fileSize, $CHUNK_SIZE) {
  $ch = curl_init($b2ApiUrl . '/b2api/v2/b2_start_large_file');
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Authorization: ' . $b2AuthToken, 'Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode(['bucketId' => $b2_bucket_id, 'fileName' => $folder . $fileName, 'contentType' => 'application/octet-stream']),
    CURLOPT_TIMEOUT => 30,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
  ]);

  $response = curl_exec($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);

  if ($httpCode !== 200) {
    throw new Exception('Failed to start large file upload');
  }

  $startData = json_decode($response, true);
  $fileId = $startData['fileId'];
  error_log('[UPLOAD-CHUNKED] Started fileId: ' . $fileId);

  $partShas = [];
  $uploadedBytes = 0;

  for ($partNumber = 1; $uploadedBytes < $fileSize; $partNumber++) {
    $start = ($partNumber - 1) * $CHUNK_SIZE;
    $end = min($start + $CHUNK_SIZE, $fileSize);
    $chunk = substr($fileContent, $start, $end - $start);

    error_log('[UPLOAD-CHUNKED] Part ' . $partNumber . ': ' . round(strlen($chunk) / 1024 / 1024, 1) . 'MB');

    $ch = curl_init($b2ApiUrl . '/b2api/v2/b2_get_upload_part_url');
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_POST => true,
      CURLOPT_HTTPHEADER => ['Authorization: ' . $b2AuthToken, 'Content-Type: application/json'],
      CURLOPT_POSTFIELDS => json_encode(['fileId' => $fileId]),
      CURLOPT_TIMEOUT => 30,
      CURLOPT_SSL_VERIFYPEER => true,
      CURLOPT_SSL_VERIFYHOST => 2,
    ]);

    $urlResponse = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
      throw new Exception('Failed to get upload part URL');
    }

    $urlData = json_decode($urlResponse, true);
    $partUploadUrl = $urlData['uploadUrl'];
    $partAuthToken = $urlData['authorizationToken'];

    $sha1 = sha1($chunk);
    
    $ch = curl_init($partUploadUrl);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_POST => true,
      CURLOPT_HTTPHEADER => [
        'Authorization: ' . $partAuthToken,
        'X-Bz-Part-Number: ' . $partNumber,
        'X-Bz-Content-Sha1: ' . $sha1,
        'Content-Type: application/octet-stream'
      ],
      CURLOPT_POSTFIELDS => $chunk,
      CURLOPT_TIMEOUT => 600,
      CURLOPT_SSL_VERIFYPEER => true,
      CURLOPT_SSL_VERIFYHOST => 2,
    ]);

    $uploadResponse = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
      throw new Exception('Part ' . $partNumber . ' failed');
    }

    $partData = json_decode($uploadResponse, true);
    $partShas[] = $partData['contentSha1'];
    $uploadedBytes = $end;
    error_log('[UPLOAD-CHUNKED] ✅ Part ' . $partNumber . ' (' . round(100 * $uploadedBytes / $fileSize) . '%)');
  }

  $ch = curl_init($b2ApiUrl . '/b2api/v2/b2_finish_large_file');
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Authorization: ' . $b2AuthToken, 'Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode(['fileId' => $fileId, 'partSha1Array' => $partShas]),
    CURLOPT_TIMEOUT => 30,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
  ]);

  $finishResponse = curl_exec($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);

  if ($httpCode !== 200) {
    throw new Exception('Failed to finish large file upload');
  }

  $finishData = json_decode($finishResponse, true);
  $publicUrl = 'https://f004.backblazeb2.com/file/STUDIO-ARCH2/' . urlencode($finishData['fileName']);

  error_log('[UPLOAD-CHUNKED] ✅ Finished: ' . $finishData['fileName']);

  return ['fileName' => $finishData['fileName'], 'url' => $publicUrl];
}
?>
