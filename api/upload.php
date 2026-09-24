<?php
// File Upload Endpoint
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'Method not allowed']);
  exit();
}

// Get file info from headers
$fileName = $_SERVER['HTTP_X_FILE_NAME'] ?? 'file';
$fileType = $_SERVER['HTTP_X_FILE_TYPE'] ?? 'projects'; // projects, gallery, videos
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';

// Read file data
$fileData = file_get_contents('php://input');

if (empty($fileData)) {
  http_response_code(400);
  echo json_encode(['error' => 'No file data received']);
  exit();
}

// Validate file size (500MB max)
$maxSize = 500 * 1024 * 1024;
if (strlen($fileData) > $maxSize) {
  http_response_code(413);
  echo json_encode(['error' => 'File exceeds 500MB limit']);
  exit();
}

// Validate file type
$isImage = strpos($contentType, 'image/') === 0;
$isVideo = strpos($contentType, 'video/') === 0;

if (!$isImage && !$isVideo) {
  http_response_code(400);
  echo json_encode(['error' => 'Only images and videos allowed']);
  exit();
}

error_log('[DEBUG] Upload started - fileName: ' . $fileName . ', fileType: ' . $fileType . ', size: ' . strlen($fileData) . ' bytes');

try {
  // Create upload directory
  $uploadDir = __DIR__ . '/../uploads/' . $fileType;
  error_log('[DEBUG] Upload dir: ' . $uploadDir);
  error_log('[DEBUG] Upload dir exists: ' . (is_dir($uploadDir) ? 'YES' : 'NO'));

  if (!is_dir($uploadDir)) {
    error_log('[DEBUG] Creating directory...');
    if (!mkdir($uploadDir, 0777, true)) {
      throw new Exception('Failed to create upload directory: ' . $uploadDir);
    }
    chmod($uploadDir, 0777);
    error_log('[DEBUG] Directory created successfully');
  }

  // Generate unique filename
  $timestamp = time();
  $safeName = preg_replace('/[^a-zA-Z0-9.-]/', '_', $fileName);
  $uniqueFileName = $timestamp . '-' . $safeName;
  $filePath = $uploadDir . '/' . $uniqueFileName;
  error_log('[DEBUG] File path: ' . $filePath);

  // Save file
  error_log('[DEBUG] Writing ' . strlen($fileData) . ' bytes to file...');
  $bytesWritten = file_put_contents($filePath, $fileData);

  if ($bytesWritten === false) {
    throw new Exception('Failed to save file to: ' . $filePath);
  }

  if ($bytesWritten !== strlen($fileData)) {
    throw new Exception('Partial write: wrote ' . $bytesWritten . ' of ' . strlen($fileData) . ' bytes');
  }

  chmod($filePath, 0644);
  error_log('[DEBUG] File saved successfully: ' . $filePath . ' (' . $bytesWritten . ' bytes)');

  // Generate web URL
  $webUrl = '/studioarch/uploads/' . $fileType . '/' . $uniqueFileName;
  $fullUrl = 'https://digitrixmedia.com' . $webUrl;

  // Log success
  error_log('✅ [Upload] SUCCESS: ' . $fullUrl . ' (' . round(strlen($fileData) / (1024 * 1024), 2) . 'MB)');

  http_response_code(200);
  echo json_encode([
    'success' => true,
    'url' => $fullUrl,
    'path' => $webUrl,
    'fileName' => $uniqueFileName,
    'size' => strlen($fileData)
  ]);

} catch (Exception $e) {
  error_log('❌ [Upload] Error: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['error' => $e->getMessage()]);
}
?>
