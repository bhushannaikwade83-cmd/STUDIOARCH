<?php
// B2 Large File Upload Finish - Proxy
require_once __DIR__ . '/config.php';

header('Access-Control-Allow-Origin: https://digitrixmedia.com');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit();
}

try {
  $input = json_decode(file_get_contents('php://input'), true);

  $fileId = $input['fileId'] ?? null;
  $partShas = $input['partShas'] ?? null;
  $b2AuthToken = $input['authToken'] ?? null;
  $b2ApiUrl = $input['apiUrl'] ?? null;

  if (!$fileId || !$partShas || !$b2AuthToken || !$b2ApiUrl) {
    throw new Exception('Missing required parameters');
  }

  error_log('[B2-FINISH] Finishing upload for file ' . $fileId);

  $ch = curl_init($b2ApiUrl . '/b2api/v2/b2_finish_large_file');

  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,

    CURLOPT_HTTPHEADER => [
      'Authorization: ' . $b2AuthToken,
      'Content-Type: application/json'
    ],

    CURLOPT_POSTFIELDS => json_encode([
      'fileId' => $fileId,
      'partSha1Array' => $partShas
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
    error_log('[B2-FINISH] Failed: HTTP ' . $httpCode . ' - ' . $message);
    throw new Exception('B2 error: ' . $message);
  }

  error_log('[B2-FINISH] ✅ Finished file: ' . $data['fileName']);

  echo json_encode([
    'success' => true,
    'fileName' => $data['fileName'],
    'fileId' => $data['fileId'],
    'size' => $data['contentLength']
  ]);

} catch (Exception $e) {
  error_log('[B2-FINISH] Exception: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['error' => $e->getMessage()]);
}
?>
