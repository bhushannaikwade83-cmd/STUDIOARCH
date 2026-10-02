<?php
// B2 Authorization - PHP version with CORS headers
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
  // B2 Credentials
  $b2_key_id = '379cd0b52bbf';
  $b2_app_key = '0040a614cfa7c97e3de2377263ad7e9b55c68b587d';
  $b2_bucket_id = '0327892cfdc0dba592e0b1f';
  $b2_bucket_name = 'STUDIO-ARCH';

  error_log('[B2-AUTH] Authorizing with B2...');

  // Check if cURL is available
  if (!function_exists('curl_init')) {
    throw new Exception('cURL is not enabled on this server');
  }

  // Step 1: Authorize with B2 using cURL
  $auth_string = base64_encode($b2_key_id . ':' . $b2_app_key);

  $ch = curl_init();
  curl_setopt($ch, CURLOPT_URL, 'https://api.backblazeb2.com/b2api/v2/b2_authorize_account');
  curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Basic $auth_string"]);
  curl_setopt($ch, CURLOPT_POST, 1);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
  curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
  curl_setopt($ch, CURLOPT_TIMEOUT, 30);

  $authResponse = curl_exec($ch);
  $curlError = curl_error($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);

  if ($curlError) {
    error_log('[B2-AUTH] cURL error: ' . $curlError);
    throw new Exception('B2 auth failed: ' . $curlError);
  }

  if ($httpCode !== 200) {
    error_log('[B2-AUTH] HTTP ' . $httpCode . ': ' . $authResponse);
    throw new Exception('B2 auth failed: HTTP ' . $httpCode);
  }

  $authData = json_decode($authResponse, true);
  if (!$authData || isset($authData['error'])) {
    error_log('[B2-AUTH] B2 API error: ' . json_encode($authData));
    throw new Exception('B2 error: ' . ($authData['error'] ?? 'Invalid response'));
  }

  $b2AuthToken = $authData['authorizationToken'];
  $b2ApiUrl = $authData['apiUrl'];
  $downloadUrl = $authData['downloadUrl'];

  error_log('[B2-AUTH] ✅ Authorized');

  // Step 2: Get upload URL using cURL
  $ch = curl_init();
  curl_setopt($ch, CURLOPT_URL, $b2ApiUrl . '/b2api/v2/b2_get_upload_url');
  curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: $b2AuthToken",
    "Content-Type: application/json"
  ]);
  curl_setopt($ch, CURLOPT_POST, 1);
  curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['bucketId' => $b2_bucket_id]));
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
  curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
  curl_setopt($ch, CURLOPT_TIMEOUT, 30);

  $uploadUrlResponse = curl_exec($ch);
  $curlError = curl_error($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);

  if ($curlError) {
    error_log('[B2-AUTH] Upload URL cURL error: ' . $curlError);
    throw new Exception('Failed to get upload URL: ' . $curlError);
  }

  if ($httpCode !== 200) {
    error_log('[B2-AUTH] Upload URL HTTP ' . $httpCode . ': ' . $uploadUrlResponse);
    throw new Exception('Failed to get upload URL: HTTP ' . $httpCode);
  }

  $uploadUrlData = json_decode($uploadUrlResponse, true);

  if (!isset($uploadUrlData['uploadUrl'])) {
    error_log('[B2-AUTH] No upload URL in response: ' . json_encode($uploadUrlData));
    throw new Exception('No upload URL from B2');
  }

  error_log('[B2-AUTH] ✅ Got upload URL');

  // Return to frontend
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
