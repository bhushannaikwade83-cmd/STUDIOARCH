<?php
require 'config.php';

$response = ['success' => false];

try {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
  }

  // Verify auth
  $token_data = requireAuth();

  // Get upload parameters
  $uploadId = $_POST['uploadId'] ?? null;
  $chunkIndex = intval($_POST['chunkIndex'] ?? 0);
  $totalChunks = intval($_POST['totalChunks'] ?? 0);
  $fileName = $_POST['fileName'] ?? 'upload';

  if (!$uploadId || !isset($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing upload parameters']);
    exit();
  }

  // Create temp directory for chunks
  $tempDir = sys_get_temp_dir() . "/studioarch_chunks/{$uploadId}";
  if (!is_dir($tempDir)) {
    mkdir($tempDir, 0755, true);
  }

  // Save chunk
  $chunkFile = "{$tempDir}/chunk_{$chunkIndex}";
  if (!move_uploaded_file($_FILES['file']['tmp_name'], $chunkFile)) {
    throw new Exception('Failed to save chunk');
  }

  $response['success'] = true;
  $response['chunkIndex'] = $chunkIndex;
  $response['uploadId'] = $uploadId;

  // Check if all chunks received
  $uploadedChunks = glob("{$tempDir}/chunk_*");
  $response['chunksReceived'] = count($uploadedChunks);
  $response['totalChunks'] = $totalChunks;

  // Combine chunks when all received
  if (count($uploadedChunks) === $totalChunks) {
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

    // Clean up empty chunk directory
    @rmdir($tempDir);
  }

  http_response_code(200);
  echo json_encode($response);

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['error' => $e->getMessage()]);
}
?>
