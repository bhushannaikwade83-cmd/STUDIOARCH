<?php
// Chunked upload handler - receives chunks and reassembles them
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');

try {
  // Verify token
  verifyToken();

  $action = $_GET['action'] ?? 'upload';

  if ($action === 'upload') {
    // Upload a single chunk
    if (!isset($_FILES['chunk'])) {
      throw new Exception('No chunk provided');
    }

    $chunk = $_FILES['chunk'];
    $uploadId = $_POST['uploadId'] ?? null;
    $chunkIndex = $_POST['chunkIndex'] ?? null;
    $totalChunks = $_POST['totalChunks'] ?? null;
    $fileName = $_POST['fileName'] ?? null;

    if (!$uploadId || $chunkIndex === null || !$totalChunks || !$fileName) {
      throw new Exception('Missing required parameters');
    }

    if ($chunk['error'] !== UPLOAD_ERR_OK) {
      throw new Exception('Chunk upload error: ' . $chunk['error']);
    }

    // Create temp directory for chunks
    $temp_dir = sys_get_temp_dir() . '/studioarch_uploads';
    if (!is_dir($temp_dir)) {
      mkdir($temp_dir, 0755, true);
    }

    // Save chunk
    $chunk_path = $temp_dir . '/' . $uploadId . '_' . $chunkIndex;
    if (!move_uploaded_file($chunk['tmp_name'], $chunk_path)) {
      throw new Exception('Failed to save chunk');
    }

    error_log("[CHUNK] Saved chunk $chunkIndex/$totalChunks for $uploadId");

    http_response_code(200);
    echo json_encode([
      'success' => true,
      'uploadId' => $uploadId,
      'chunkIndex' => (int)$chunkIndex,
      'totalChunks' => (int)$totalChunks,
    ]);

  } else if ($action === 'finalize') {
    // Reassemble all chunks into final file
    $uploadId = $_GET['uploadId'] ?? null;

    if (!$uploadId) {
      throw new Exception('Missing uploadId');
    }

    $temp_dir = sys_get_temp_dir() . '/studioarch_uploads';

    // Find all chunks for this upload
    $chunks = glob($temp_dir . '/' . $uploadId . '_*');
    if (empty($chunks)) {
      throw new Exception('No chunks found for this upload');
    }

    // Sort chunks by index
    usort($chunks, function($a, $b) {
      $a_index = (int)explode('_', basename($a))[1];
      $b_index = (int)explode('_', basename($b))[1];
      return $a_index - $b_index;
    });

    // Create upload directory (absolute path)
    $upload_dir = '/home/digitrix/public_html/studioarch/uploads/videos';
    if (!is_dir($upload_dir)) {
      mkdir($upload_dir, 0755, true);
    }

    error_log("[FINALIZE] Upload dir: " . $upload_dir . " | Exists: " . (is_dir($upload_dir) ? 'YES' : 'NO'));

    // Generate filename
    $timestamp = time();
    $random = uniqid();
    $ext = 'mp4'; // Default to mp4 for videos
    $filename = $timestamp . '-' . $random . '.' . $ext;
    $filepath = $upload_dir . '/' . $filename;

    // Reassemble chunks
    $output = fopen($filepath, 'wb');
    if (!$output) {
      throw new Exception('Failed to create output file');
    }

    $total_size = 0;
    foreach ($chunks as $chunk_file) {
      $chunk_data = file_get_contents($chunk_file);
      if ($chunk_data === false) {
        fclose($output);
        throw new Exception('Failed to read chunk');
      }

      fwrite($output, $chunk_data);
      $total_size += strlen($chunk_data);
      unlink($chunk_file); // Delete chunk after reassembly
    }

    fclose($output);

    // Get public URL
    $url = 'https://digitrixmedia.com/studioarch/uploads/videos/' . $filename;

    error_log("[CHUNK] Finalized upload $uploadId: $filename (" . round($total_size/1024/1024, 1) . "MB)");

    http_response_code(200);
    echo json_encode([
      'success' => true,
      'uploadId' => $uploadId,
      'filename' => $filename,
      'size' => $total_size,
      'data' => [
        'url' => $url,
      ],
    ]);

  } else {
    throw new Exception('Unknown action');
  }

} catch (Exception $e) {
  error_log('[CHUNK] Error: ' . $e->getMessage());
  http_response_code(400);
  echo json_encode(['error' => $e->getMessage()]);
}
?>
