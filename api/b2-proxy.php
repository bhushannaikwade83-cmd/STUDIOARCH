<?php
// B2 Cloud Storage Proxy - Backend Upload Handler
// Pattern: Browser → /api/b2-proxy → B2 (like BJNP project)

require_once 'config.php';

$response = ['success' => false];

try {
  // Verify method
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
  }

  // Verify auth
  requireAuth();

  // Get file from request body
  $fileContent = file_get_contents('php://input');
  if (empty($fileContent)) {
    http_response_code(400);
    echo json_encode(['error' => 'No file data provided']);
    exit();
  }

  // Get metadata from headers
  $fileName = $_SERVER['HTTP_X_FILE_NAME'] ?? 'upload.bin';
  $folder = $_SERVER['HTTP_X_FOLDER'] ?? 'uploads/';
  $contentType = $_SERVER['HTTP_X_CONTENT_TYPE'] ?? 'application/octet-stream';

  error_log('[B2-PROXY] Upload: ' . $fileName . ' (' . strlen($fileContent) . ' bytes)');

  // Get B2 credentials
  $b2_key_id = '379cd0b52bbf';
  $b2_app_key = '004a72718b0ba180f5b742b7a1f4840d3c9ec904b4';
  $b2_bucket_id = '0327892cfdc0dba592e0b1f';
  $b2_bucket_name = 'STUDIO-ARCH';

  // Step 1: Authorize with B2
  error_log('[B2-PROXY] Authorizing...');
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

  error_log('[B2-PROXY] Authorized');

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

  error_log('[B2-PROXY] Got upload URL');

  // Step 3: Calculate SHA1
  $sha1 = sha1($fileContent);
  $fullFileName = $folder . $fileName;
  $encodedFileName = $fullFileName;

  error_log('[B2-PROXY] SHA1: ' . $sha1);

  // Step 4: Upload file to B2
  $uploadContext = stream_context_create([
    'http' => [
      'method' => 'POST',
      'header' => [
        'Authorization: ' . $uploadToken,
        'X-Bz-File-Name: ' . $encodedFileName,
        'X-Bz-Content-Sha1: ' . $sha1,
        'Content-Type: ' . $contentType
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
  $publicUrl = 'https://f000.backblazeb2.com/file/' . $b2_bucket_name . '/' . $uploadResult['fileName'];

  $response = [
    'success' => true,
    'fileName' => $uploadResult['fileName'],
    'fileId' => $uploadResult['fileId'],
    'publicUrl' => $publicUrl,
    'b2Url' => $publicUrl,
    'contentLength' => $uploadResult['contentLength']
  ];

  http_response_code(200);
  echo json_encode($response);

} catch (Exception $e) {
  error_log('[B2-PROXY] Exception: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['error' => $e->getMessage()]);
}
?>
