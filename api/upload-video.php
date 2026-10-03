<?php
// Direct server upload - simple, fast, no B2 or background processing
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'Method not allowed']);
  exit();
}

try {
  // Verify token
  verifyToken();

  // Check file exists
  if (!isset($_FILES['video'])) {
    throw new Exception('No video file provided');
  }

  $file = $_FILES['video'];

  // Validate
  if ($file['error'] !== UPLOAD_ERR_OK) {
    throw new Exception('Upload error: ' . $file['error']);
  }

  $max_size = 500 * 1024 * 1024; // 500MB
  if ($file['size'] > $max_size) {
    throw new Exception('File too large (max 500MB)');
  }

  if (!preg_match('/^video\//i', $file['type'])) {
    throw new Exception('File must be a video');
  }

  // Create upload directory if not exists
  $upload_dir = __DIR__ . '/../uploads/videos';
  if (!is_dir($upload_dir)) {
    mkdir($upload_dir, 0755, true);
  }

  // Generate filename
  $timestamp = time();
  $random = uniqid();
  $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
  $filename = $timestamp . '-' . $random . '.' . $ext;
  $filepath = $upload_dir . '/' . $filename;

  // Move uploaded file
  if (!move_uploaded_file($file['tmp_name'], $filepath)) {
    throw new Exception('Failed to save file');
  }

  // Get public URL
  $url = 'https://digitrixmedia.com/studioarch/uploads/videos/' . $filename;

  error_log('[UPLOAD] Video uploaded: ' . $filename . ' (' . round($file['size']/1024/1024, 1) . 'MB)');

  http_response_code(200);
  echo json_encode([
    'success' => true,
    'url' => $url,
    'filename' => $filename,
    'size' => $file['size']
  ]);

} catch (Exception $e) {
  error_log('[UPLOAD] Error: ' . $e->getMessage());
  http_response_code(400);
  echo json_encode(['error' => $e->getMessage()]);
}
?>
