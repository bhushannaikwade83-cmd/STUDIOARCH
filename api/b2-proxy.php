<?php
// B2 Cloud Storage Proxy - handles authentication server-side to bypass CORS
require_once 'config.php';

$response = ['success' => false];

try {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
  }

  // Verify auth
  requireAuth();

  if (!isset($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No file provided']);
    exit();
  }

  $file = $_FILES['file'];
  $fileName = $_POST['fileName'] ?? $file['name'];

  error_log('[B2-PROXY] Upload request: ' . $fileName . ' (' . $file['size'] . ' bytes)');

  // Get B2 credentials from env
  $b2_key_id = getenv('B2_KEY_ID') ?: $_POST['keyId'] ?? '';
  $b2_app_key = getenv('B2_APPLICATION_KEY') ?: $_POST['appKey'] ?? '';
  $b2_bucket_id = getenv('B2_BUCKET_ID') ?: $_POST['bucketId'] ?? '';
  $b2_bucket_name = getenv('B2_BUCKET_NAME') ?: $_POST['bucketName'] ?? '';

  if (!$b2_key_id || !$b2_app_key || !$b2_bucket_id) {
    error_log('[B2-PROXY] ERROR: Missing B2 credentials');
    http_response_code(500);
    echo json_encode(['error' => 'B2 credentials not configured']);
    exit();
  }

  // Step 1: Authorize with B2
  error_log('[B2-PROXY] Authorizing with B2...');
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

  $b2AuthToken = $authData['authorizationToken'] ?? null;
  $b2ApiUrl = $authData['apiUrl'] ?? null;

  if (!$b2AuthToken || !$b2ApiUrl) {
    throw new Exception('B2 missing auth token or API URL');
  }

  error_log('[B2-PROXY] Authorized. Getting upload URL...');

  // Step 2: Get upload URL
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

  $uploadUrl = $uploadUrlData['uploadUrl'] ?? null;
  $uploadToken = $uploadUrlData['authorizationToken'] ?? null;

  if (!$uploadUrl || !$uploadToken) {
    throw new Exception('B2 missing upload URL or token');
  }

  error_log('[B2-PROXY] Got upload URL. Uploading file...');

  // Step 3: Calculate SHA1
  $fileContent = file_get_contents($file['tmp_name']);
  $sha1 = sha1($fileContent);

  // Step 4: Upload file
  $uploadContext = stream_context_create([
    'http' => [
      'method' => 'POST',
      'header' => [
        'Authorization: ' . $uploadToken,
        'X-Bz-File-Name: ' . $fileName,
        'X-Bz-Content-Sha1: ' . $sha1,
        'Content-Type: application/octet-stream'
      ],
      'content' => $fileContent,
      'timeout' => 600  // 10 minutes for large files
    ]
  ]);

  $uploadResponse = file_get_contents($uploadUrl, false, $uploadContext);
  $uploadResult = json_decode($uploadResponse, true);

  if (!$uploadResult || isset($uploadResult['error'])) {
    throw new Exception('B2 upload error: ' . ($uploadResult['error'] ?? 'Unknown'));
  }

  error_log('[B2-PROXY] Upload complete: ' . $uploadResult['fileName']);

  // Step 5: Generate public URL
  // Format: https://f000.backblazeb2.com/file/BUCKET_NAME/fileName
  $fileUrl = 'https://f000.backblazeb2.com/file/' . $b2_bucket_name . '/' . $uploadResult['fileName'];

  $response = [
    'success' => true,
    'fileId' => $uploadResult['fileId'],
    'fileName' => $uploadResult['fileName'],
    'url' => $fileUrl,
    'size' => $uploadResult['contentLength']
  ];

  http_response_code(200);
  echo json_encode($response);

} catch (Exception $e) {
  error_log('[B2-PROXY] Exception: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['error' => $e->getMessage()]);
}
?>
