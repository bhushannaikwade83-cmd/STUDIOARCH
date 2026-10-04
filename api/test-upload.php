<?php
// Simple test upload endpoint - no auth, no security (TEST ONLY!)
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    if (!isset($_FILES['file'])) {
        throw new Exception('No file provided');
    }

    $file = $_FILES['file'];

    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('Upload error: ' . $file['error']);
    }

    // Create upload directory
    $upload_dir = __DIR__ . '/../uploads/videos/test';
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0755, true);
    }

    // Generate filename
    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = 'test_' . time() . '_' . uniqid() . '.' . $ext;
    $filepath = $upload_dir . '/' . $filename;

    // Move file
    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        throw new Exception('Failed to save file');
    }

    $file_size = filesize($filepath);
    $url = 'https://digitrixmedia.com/studioarch/uploads/videos/test/' . $filename;

    error_log('[TEST-UPLOAD] File saved: ' . $filename . ' (' . round($file_size/1024/1024, 1) . 'MB)');

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'filename' => $filename,
        'size' => $file_size,
        'url' => $url,
        'time' => date('Y-m-d H:i:s')
    ]);

} catch (Exception $e) {
    error_log('[TEST-UPLOAD] Error: ' . $e->getMessage());
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
