<?php
// B2 Large File Upload Initiate - Proxy
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
  $rawInput = file_get_contents('php://input');
  error_log('[B2-INITIATE] Raw input: ' . $rawInput);

  $input = json_decode($rawInput, true);
  error_log('[B2-INITIATE] Decoded input: ' . json_encode($input));

  $b2AuthToken = $input['authToken'] ?? null;
  $b2ApiUrl = $input['apiUrl'] ?? null;
  $fileName = $input['fileName'] ?? null;
  $b2BucketId = $input['bucketId'] ?? null;

  error_log('[B2-INITIATE] authToken: ' . ($b2AuthToken ? 'present' : 'MISSING'));
  error_log('[B2-INITIATE] apiUrl: ' . ($b2ApiUrl ?? 'MISSING'));
  error_log('[B2-INITIATE] fileName: ' . ($fileName ?? 'MISSING'));
  error_log('[B2-INITIATE] bucketId: ' . ($b2BucketId ?? 'MISSING'));

  if (!$b2AuthToken || !$b2ApiUrl || !$fileName || !$b2BucketId) {
    throw new Exception('Missing required parameters: authToken, apiUrl, fileName, bucketId');
  }

  error_log('[B2-INITIATE] Starting large file: ' . $fileName);

  $ch = curl_init($b2ApiUrl . '/b2api/v2/b2_start_large_file');

  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,

    CURLOPT_HTTPHEADER => [
      'Authorization: ' . $b2AuthToken,
      'Content-Type: application/json'
    ],

    CURLOPT_POSTFIELDS => json_encode([
      'bucketId' => $b2BucketId,
      'fileName' => $fileName,
      'contentType' => 'application/octet-stream'
    ]),

    CURLOPT_TIMEOUT => 30,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
  ]);

  $response = curl_exec($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $curlError = curl_error($ch);
  curl_close($ch);

  if ($curlError) {
    throw new Exception('cURL error: ' . $curlError);
  }

  $data = json_decode($response, true);

  if ($httpCode !== 200) {
    $message = $data['message'] ?? $data['error'] ?? 'Unknown error';
    error_log('[B2-INITIATE] Failed: HTTP ' . $httpCode . ' - ' . $message);
    throw new Exception('B2 error: ' . $message);
  }

  error_log('[B2-INITIATE] ✅ Started file: ' . $data['fileId']);

  echo json_encode([
    'success' => true,
    'fileId' => $data['fileId']
  ]);

} catch (Exception $e) {
  error_log('[B2-INITIATE] Exception: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['error' => $e->getMessage()]);
}
?>
