<?php
// Upload Queue Manager - Background processing for large files
// Database: tracks upload progress, manages B2 multipart uploads

require_once __DIR__ . '/config.php';

header('Content-Type: application/json');

function initializeUploadsTable($pdo) {
  $sql = "
    CREATE TABLE IF NOT EXISTS uploads (
      id INT PRIMARY KEY AUTO_INCREMENT,
      upload_id VARCHAR(255) UNIQUE NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_size BIGINT NOT NULL,
      b2_file_id VARCHAR(255),
      b2_url VARCHAR(2048),
      status VARCHAR(50) DEFAULT 'pending',
      progress INT DEFAULT 0,
      chunks_total INT,
      chunks_uploaded INT DEFAULT 0,
      folder VARCHAR(255) DEFAULT 'uploads/',
      b2_part_shas JSON,
      error_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL,
      project_id INT,
      field_name VARCHAR(100)
    )
  ";

  $pdo->exec($sql);
}

function createUploadRequest($pdo, $fileName, $fileSize, $folder = 'uploads/', $projectId = null, $fieldName = null) {
  initializeUploadsTable($pdo);

  $uploadId = uniqid('upload_', true);
  $chunkSize = 6 * 1024 * 1024; // 6MB chunks for Vercel
  $chunksTotal = ceil($fileSize / $chunkSize);

  $stmt = $pdo->prepare("
    INSERT INTO uploads (upload_id, file_name, file_size, chunks_total, folder, project_id, field_name)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  ");

  $stmt->execute([$uploadId, $fileName, $fileSize, $chunksTotal, $folder, $projectId, $fieldName]);

  error_log('[UPLOAD-QUEUE] Created request: ' . $uploadId . ' (' . round($fileSize/1024/1024, 1) . 'MB in ' . $chunksTotal . ' chunks)');

  return [
    'uploadId' => $uploadId,
    'chunksTotal' => $chunksTotal,
    'chunkSize' => $chunkSize
  ];
}

function getUploadStatus($pdo, $uploadId) {
  initializeUploadsTable($pdo);

  $stmt = $pdo->prepare("
    SELECT id, upload_id, file_name, file_size, status, progress, chunks_uploaded, chunks_total, b2_url, error_message, completed_at
    FROM uploads
    WHERE upload_id = ?
    LIMIT 1
  ");

  $stmt->execute([$uploadId]);
  $upload = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$upload) {
    throw new Exception('Upload not found');
  }

  return [
    'uploadId' => $upload['upload_id'],
    'fileName' => $upload['file_name'],
    'fileSize' => $upload['file_size'],
    'status' => $upload['status'],
    'progress' => $upload['progress'],
    'chunksUploaded' => $upload['chunks_uploaded'],
    'chunksTotal' => $upload['chunks_total'],
    'url' => $upload['b2_url'],
    'error' => $upload['error_message'],
    'completedAt' => $upload['completed_at']
  ];
}

function updateUploadProgress($pdo, $uploadId, $chunksUploaded, $progress) {
  $stmt = $pdo->prepare("
    UPDATE uploads
    SET chunks_uploaded = ?, progress = ?
    WHERE upload_id = ?
  ");

  $stmt->execute([$chunksUploaded, $progress, $uploadId]);
}

function markUploadComplete($pdo, $uploadId, $b2Url) {
  $stmt = $pdo->prepare("
    UPDATE uploads
    SET status = 'completed', b2_url = ?, progress = 100, completed_at = NOW()
    WHERE upload_id = ?
  ");

  $stmt->execute([$b2Url, $uploadId]);

  error_log('[UPLOAD-QUEUE] Completed: ' . $uploadId . ' → ' . $b2Url);
}

function markUploadFailed($pdo, $uploadId, $error) {
  $stmt = $pdo->prepare("
    UPDATE uploads
    SET status = 'failed', error_message = ?
    WHERE upload_id = ?
  ");

  $stmt->execute([$error, $uploadId]);

  error_log('[UPLOAD-QUEUE] Failed: ' . $uploadId . ' - ' . $error);
}

// REST API
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  try {
    $action = $_GET['action'] ?? null;
    $input = json_decode(file_get_contents('php://input'), true);

    if ($action === 'create') {
      $result = createUploadRequest(
        $pdo,
        $input['fileName'],
        $input['fileSize'],
        $input['folder'] ?? 'uploads/',
        $input['projectId'] ?? null,
        $input['fieldName'] ?? null
      );
      echo json_encode(['success' => true, 'data' => $result]);
    } else {
      throw new Exception('Unknown action');
    }
  } catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
  }
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
  try {
    $uploadId = $_GET['uploadId'] ?? null;

    if (!$uploadId) {
      throw new Exception('Missing uploadId');
    }

    $status = getUploadStatus($pdo, $uploadId);
    echo json_encode(['success' => true, 'data' => $status]);
  } catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
  }
}
?>
