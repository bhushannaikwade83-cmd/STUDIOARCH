<?php
// B2 Authorization - Fixed to use GET for v4 authorize_account
require_once __DIR__ . '/config.php';

// CORS Headers - CRITICAL
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight
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
  // B2 Credentials - TODO: REVOKE OLD KEYS AFTER EXPOSURE
  $b2_key_id = '379cd0b52bbf';
  $b2_app_key = '0040a614cfa7c97e3de2377263ad7e9b55c68b587d';
  $b2_bucket_id = '0327892cfdc0dba592e0b1f';
  $b2_bucket_name = 'STUDIO-ARCH';

  error_log('[B2-AUTH] Authorizing with B2 v4...');

  if (!function_exists('curl_init')) {
    throw new Exception('cURL is not enabled on this server');
  }

  // Step 1: GET b2_authorize_account (v4 API endpoint)
  $ch = curl_init('https://api.backblazeb2.com/b2api/v4/b2_authorize_account');

  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPGET => true,
    CURLOPT_USERPWD => $b2_key_id . ':' . $b2_app_key,
    CURLOPT_HTTPAUTH => CURLAUTH_BASIC,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
  ]);

  $authResponse = curl_exec($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $curlError = curl_error($ch);
  curl_close($ch);

  error_log('[B2-AUTH] HTTP Code: ' . $httpCode);
  if ($curlError) {
    error_log('[B2-AUTH] CURL Error: ' . $curlError);
  }
  error_log('[B2-AUTH] Response: ' . substr($authResponse ?: '', 0, 500));

  if ($curlError) {
    throw new Exception('B2 connection error: ' . $curlError);
  }

  $authData = json_decode($authResponse, true);

  if ($httpCode !== 200) {
    $message = $authData['message'] ?? $authData['error'] ?? 'Unknown B2 error';
    error_log('[B2-AUTH] HTTP ' . $httpCode . ': ' . $message);
    throw new Exception('B2 auth failed: HTTP ' . $httpCode . ' - ' . $message);
  }

  if (!is_array($authData)) {
    throw new Exception('Invalid JSON returned by B2');
  }

  // Parse v4 response structure
  $b2AuthToken = $authData['authorizationToken'] ?? null;
  $storageApi = $authData['apiInfo']['storageApi'] ?? [];
  $b2ApiUrl = $storageApi['apiUrl'] ?? null;
  $downloadUrl = $storageApi['downloadUrl'] ?? null;

  if (!$b2AuthToken || !$b2ApiUrl) {
    throw new Exception('B2 missing authorizationToken or storage API URL');
  }

  error_log('[B2-AUTH] ✅ Authorized');

  // Step 2: Get upload URL using cURL
  $ch = curl_init($b2ApiUrl . '/b2api/v2/b2_get_upload_url');

  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,

    CURLOPT_HTTPHEADER => [
      'Authorization: ' . $b2AuthToken,
      'Content-Type: application/json'
    ],

    CURLOPT_POSTFIELDS => json_encode([
      'bucketId' => $b2_bucket_id
    ]),

    CURLOPT_TIMEOUT => 30,
    CURLOPT_CONNECTTIMEOUT => 10,

    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
  ]);

  $uploadUrlResponse = curl_exec($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $curlError = curl_error($ch);
  curl_close($ch);

  if ($curlError) {
    throw new Exception('B2 upload URL curl error: ' . $curlError);
  }

  $uploadUrlData = json_decode($uploadUrlResponse, true);

  if ($httpCode !== 200) {
    $message = $uploadUrlData['message'] ?? $uploadUrlData['error'] ?? 'Unknown B2 error';
    throw new Exception('B2 upload URL failed: HTTP ' . $httpCode . ' - ' . $message);
  }

  if (
    empty($uploadUrlData['uploadUrl']) ||
    empty($uploadUrlData['authorizationToken'])
  ) {
    throw new Exception('B2 did not return uploadUrl/authorizationToken');
  }

  error_log('[B2-AUTH] ✅ Got upload URL');

  // Return to frontend - only upload-specific auth token, not account auth token
  echo json_encode([
    'success' => true,
    'uploadUrl' => $uploadUrlData['uploadUrl'],
    'authToken' => $uploadUrlData['authorizationToken'],
    'bucketName' => $b2_bucket_name,
    'downloadUrl' => $downloadUrl,
    'apiUrl' => $b2ApiUrl
  ]);

} catch (Exception $e) {
  error_log('[B2-AUTH] Exception: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['error' => $e->getMessage()]);
}
?>
