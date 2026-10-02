<?php
// Create upload authorization - PHP only provides auth, NO FILE HANDLING
require_once '../config.php';

try {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
  }

  // Verify auth
  requireAuth();

  // Get file info from request
  $input = json_decode(file_get_contents('php://input'), true);
  $fileName = $input['fileName'] ?? 'upload.bin';
  $fileSize = $input['fileSize'] ?? 0;
  $fileType = $input['fileType'] ?? 'application/octet-stream';

  if ($fileSize > 600 * 1024 * 1024) {
    http_response_code(413);
    echo json_encode(['error' => 'File too large (max 600MB)']);
    exit();
  }

  error_log('[UPLOAD-CREATE] Auth for: ' . $fileName . ' (' . $fileSize . ' bytes)');

  // B2 Credentials
  $b2_key_id = '379cd0b52bbf';
  $b2_app_key = '004a72718b0ba180f5b742b7a1f4840d3c9ec904b4';
  $b2_bucket_id = '0327892cfdc0dba592e0b1f';
  $b2_bucket_name = 'STUDIO-ARCH';

  // Authorize with B2
  $auth = base64_encode($b2_key_id . ':' . $b2_app_key);
  $authResponse = file_get_contents('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', false,
    stream_context_create([
      'http' => [
        'method' => 'POST',
        'header' => 'Authorization: Basic ' . $auth . "\r\n",
        'timeout' => 30
      ]
    ])
  );

  if (!$authResponse) {
    throw new Exception('B2 authorization failed');
  }

  $authData = json_decode($authResponse, true);
  if (isset($authData['error'])) {
    throw new Exception('B2 auth error: ' . $authData['error']);
  }

  $b2AuthToken = $authData['authorizationToken'];
  $b2ApiUrl = $authData['apiUrl'];
  $downloadUrl = $authData['downloadUrl'];

  // Get upload URL for multipart
  $uploadUrlContext = stream_context_create([
    'http' => [
      'method' => 'POST',
      'header' => [
        'Authorization: ' . $b2AuthToken,
        'Content-Type: application/json'
      ],
      'content' => json_encode(['bucketId' => $b2_bucket_id]),
      'timeout' => 30
    ]
  ]);

  $uploadUrlResponse = file_get_contents($b2ApiUrl . '/b2api/v2/b2_get_upload_url', false, $uploadUrlContext);
  $uploadUrlData = json_decode($uploadUrlResponse, true);

  if (!$uploadUrlData['uploadUrl']) {
    throw new Exception('Could not get B2 upload URL');
  }

  $fileKey = 'uploads/' . date('Y-m-d') . '/' . time() . '-' . basename($fileName);

  echo json_encode([
    'success' => true,
    'uploadId' => uniqid('upload_'),
    'fileKey' => $fileKey,
    'uploadUrl' => $uploadUrlData['uploadUrl'],
    'authToken' => $uploadUrlData['authorizationToken'],
    'bucketName' => $b2_bucket_name,
    'downloadUrl' => $downloadUrl,
    'apiUrl' => $b2ApiUrl,
    'b2AuthToken' => $b2AuthToken
  ]);

} catch (Exception $e) {
  error_log('[UPLOAD-CREATE] Exception: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['error' => $e->getMessage()]);
}
?>
