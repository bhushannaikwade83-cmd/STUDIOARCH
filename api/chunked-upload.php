<?php
require 'config.php';

$response = ['success' => false];

error_log('[CHUNKED-UPLOAD] Received ' . $_SERVER['REQUEST_METHOD'] . ' request');

try {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    error_log('[CHUNKED-UPLOAD] ERROR: Method not allowed: ' . $_SERVER['REQUEST_METHOD']);
    exit();
  }

  // Verify auth
  error_log('[CHUNKED-UPLOAD] Verifying auth...');
  $token_data = requireAuth();
  error_log('[CHUNKED-UPLOAD] Auth verified: ' . json_encode($token_data));

  // Get upload parameters
  $uploadId = $_POST['uploadId'] ?? null;
  $chunkIndex = intval($_POST['chunkIndex'] ?? 0);
  $totalChunks = intval($_POST['totalChunks'] ?? 0);
  $fileName = $_POST['fileName'] ?? 'upload';

  error_log('[CHUNKED-UPLOAD] Chunk params: uploadId=' . $uploadId . ' chunkIndex=' . $chunkIndex . '/' . $totalChunks . ' fileName=' . $fileName);
  error_log('[CHUNKED-UPLOAD] File info: ' . json_encode($_FILES['file'] ?? ['error' => 'No file']));

  if (!$uploadId || !isset($_FILES['file'])) {
    http_response_code(400);
    $err = 'Missing: uploadId=' . ($uploadId ? 'ok' : 'missing') . ', file=' . (isset($_FILES['file']) ? 'ok' : 'missing');
    echo json_encode(['error' => $err]);
    error_log('[CHUNKED-UPLOAD] ERROR: ' . $err);
    exit();
  }

  // Create temp directory for chunks
  $tempDir = sys_get_temp_dir() . "/studioarch_chunks/{$uploadId}";
  error_log('[CHUNKED-UPLOAD] Temp dir: ' . $tempDir);

  if (!is_dir($tempDir)) {
    if (!mkdir($tempDir, 0755, true)) {
      throw new Exception('Failed to create temp directory: ' . $tempDir);
    }
    error_log('[CHUNKED-UPLOAD] Created temp dir');
  }

  // Save chunk
  $chunkFile = "{$tempDir}/chunk_{$chunkIndex}";
  error_log('[CHUNKED-UPLOAD] Saving chunk to: ' . $chunkFile . ' (size: ' . $_FILES['file']['size'] . ')');

  if (!move_uploaded_file($_FILES['file']['tmp_name'], $chunkFile)) {
    throw new Exception('Failed to save chunk: ' . error_get_last()['message']);
  }

  error_log('[CHUNKED-UPLOAD] Chunk saved successfully');

  $response['success'] = true;
  $response['chunkIndex'] = $chunkIndex;
  $response['uploadId'] = $uploadId;

  // Check if all chunks received
  $uploadedChunks = glob("{$tempDir}/chunk_*");
  $response['chunksReceived'] = count($uploadedChunks);
  $response['totalChunks'] = $totalChunks;

  error_log('[CHUNKED-UPLOAD] Chunks received: ' . count($uploadedChunks) . '/' . $totalChunks);

  // Combine chunks when all received
  if (count($uploadedChunks) === $totalChunks) {
    error_log('[CHUNKED-UPLOAD] All chunks received, combining...');

    $finalFile = $tempDir . '/' . $fileName;
    $finalHandle = fopen($finalFile, 'wb');

    for ($i = 0; $i < $totalChunks; $i++) {
      $chunk = fopen("{$tempDir}/chunk_{$i}", 'rb');
      stream_copy_to_stream($chunk, $finalHandle);
      fclose($chunk);
      unlink("{$tempDir}/chunk_{$i}");
    }
    fclose($finalHandle);

    $response['completed'] = true;
    $response['finalFile'] = $finalFile;
    $response['fileSize'] = filesize($finalFile);

    error_log('[CHUNKED-UPLOAD] COMPLETED! File size: ' . filesize($finalFile));

    // Clean up empty chunk directory
    @rmdir($tempDir);
  }

  http_response_code(200);
  echo json_encode($response);

} catch (Exception $e) {
  http_response_code(500);
  error_log('[CHUNKED-UPLOAD] EXCEPTION: ' . $e->getMessage());
  echo json_encode(['error' => $e->getMessage()]);
}
?>
