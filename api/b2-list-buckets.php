<?php
// Debug endpoint to list B2 buckets
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');

try {
  $b2_key_id = getenv('B2_KEY_ID');
  $b2_app_key = getenv('B2_APP_KEY');

  if (!$b2_key_id || !$b2_app_key) {
    throw new Exception('B2 credentials not configured');
  }

  // Authorize
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
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);

  if ($httpCode !== 200) {
    throw new Exception('B2 auth failed: HTTP ' . $httpCode);
  }

  $authData = json_decode($authResponse, true);
  $b2AuthToken = $authData['authorizationToken'];
  $storageApi = $authData['apiInfo']['storageApi'];
  $b2ApiUrl = $storageApi['apiUrl'];

  // List buckets
  $ch = curl_init($b2ApiUrl . '/b2api/v2/b2_list_buckets');
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
      'Authorization: ' . $b2AuthToken,
      'Content-Type: application/json'
    ],
    CURLOPT_POSTFIELDS => json_encode([
      'accountId' => $authData['accountId']
    ]),
    CURLOPT_TIMEOUT => 30,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
  ]);

  $bucketsResponse = curl_exec($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);

  $bucketsData = json_decode($bucketsResponse, true);

  echo json_encode([
    'success' => true,
    'buckets' => $bucketsData['buckets'] ?? [],
    'message' => 'Use the bucketId from this list in B2_BUCKET_ID environment variable'
  ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['error' => $e->getMessage()]);
}
?>
