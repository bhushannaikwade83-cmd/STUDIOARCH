<?php
// B2 Large File Upload Part - Proxy
require_once __DIR__ . '/config.php';

header('Access-Control-Allow-Origin: https://digitrixmedia.com');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-File-ID, X-Part-Number');
header('Access-Control-Max-Age: 86400');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit();
}

try {
  $fileId = $_POST['fileId'] ?? $_SERVER['HTTP_X_FILE_ID'] ?? null;
  $partNumber = $_POST['partNumber'] ?? $_SERVER['HTTP_X_PART_NUMBER'] ?? null;
  $b2AuthToken = $_POST['authToken'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? null;
  $b2ApiUrl = $_POST['apiUrl'] ?? null;

  if (!$fileId || !$partNumber || !$b2AuthToken || !$b2ApiUrl) {
    throw new Exception('Missing required parameters');
  }

  if (empty($_FILES['chunk'])) {
    throw new Exception('No chunk file provided');
  }

  $chunkFile = $_FILES['chunk']['tmp_name'];
  $chunkContent = file_get_contents($chunkFile);

  if ($chunkContent === false) {
    throw new Exception('Failed to read chunk file');
  }

  error_log('[B2-UPLOAD-PART] Uploading part ' . $partNumber . ' for file ' . $fileId);

  // Get upload URL for this part
  $ch = curl_init($b2ApiUrl . '/b2api/v2/b2_get_upload_part_url');

  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,

    CURLOPT_HTTPHEADER => [
      'Authorization: ' . $b2AuthToken,
      'Content-Type: application/json'
    ],

    CURLOPT_POSTFIELDS => json_encode(['fileId' => $fileId]),

    CURLOPT_TIMEOUT => 30,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
  ]);

  $urlResponse = curl_exec($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);

  if ($httpCode !== 200) {
    throw new Exception('Failed to get upload URL for part');
  }

  $urlData = json_decode($urlResponse, true);
  $uploadUrl = $urlData['uploadUrl'];
  $uploadAuth = $urlData['authorizationToken'];

  // Calculate SHA1
  $sha1 = sha1($chunkContent);

  // Upload the chunk
  $ch = curl_init($uploadUrl);

  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,

    CURLOPT_HTTPHEADER => [
      'Authorization: ' . $uploadAuth,
      'X-Bz-Part-Number: ' . $partNumber,
      'X-Bz-Content-Sha1: ' . $sha1,
      'Content-Type: application/octet-stream'
    ],

    CURLOPT_POSTFIELDS => $chunkContent,

    CURLOPT_TIMEOUT => 600,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
  ]);

  $uploadResponse = curl_exec($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $curlError = curl_error($ch);
  curl_close($ch);

  if ($curlError) {
    throw new Exception('cURL error: ' . $curlError);
  }

  $data = json_decode($uploadResponse, true);

  if ($httpCode !== 200) {
    $message = $data['message'] ?? $data['error'] ?? 'Upload failed';
    error_log('[B2-UPLOAD-PART] Failed: HTTP ' . $httpCode . ' - ' . $message);
    throw new Exception('B2 error: ' . $message);
  }

  error_log('[B2-UPLOAD-PART] ✅ Part ' . $partNumber . ' uploaded');

  echo json_encode([
    'success' => true,
    'fileId' => $fileId,
    'partNumber' => $partNumber,
    'contentSha1' => $data['contentSha1']
  ]);

} catch (Exception $e) {
  error_log('[B2-UPLOAD-PART] Exception: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['error' => $e->getMessage()]);
}
?>
