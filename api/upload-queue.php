<?php
// Upload Queue Manager - Background processing for large files
// Database: tracks upload progress, manages B2 multipart uploads

require_once __DIR__ . '/config.php';

header('Content-Type: application/json');

// Create mysqli connection for this script
$conn = new mysqli($db_host, $db_user, $db_pass, $db_name);

if ($conn->connect_error) {
  http_response_code(500);
  die(json_encode(['error' => 'Database connection failed: ' . $conn->connect_error]));
}

$conn->set_charset("utf8mb4");

function initializeUploadsTable($conn) {
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

  if (!$conn->query($sql)) {
    throw new Exception('Failed to create table: ' . $conn->error);
  }
}

function createUploadRequest($conn, $fileName, $fileSize, $folder = 'uploads/', $projectId = null, $fieldName = null) {
  initializeUploadsTable($conn);

  $uploadId = uniqid('upload_', true);
  $chunkSize = 6 * 1024 * 1024; // 6MB chunks
  $chunksTotal = ceil($fileSize / $chunkSize);

  $stmt = $conn->prepare("
    INSERT INTO uploads (upload_id, file_name, file_size, chunks_total, folder, project_id, field_name)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  ");

  if (!$stmt) {
    throw new Exception('Prepare failed: ' . $conn->error);
  }

  $stmt->bind_param('ssiisss', $uploadId, $fileName, $fileSize, $chunksTotal, $folder, $projectId, $fieldName);

  if (!$stmt->execute()) {
    throw new Exception('Execute failed: ' . $stmt->error);
  }

  $stmt->close();

  error_log('[UPLOAD-QUEUE] Created request: ' . $uploadId . ' (' . round($fileSize/1024/1024, 1) . 'MB in ' . $chunksTotal . ' chunks)');

  return [
    'uploadId' => $uploadId,
    'chunksTotal' => $chunksTotal,
    'chunkSize' => $chunkSize
  ];
}

function getUploadStatus($conn, $uploadId) {
  initializeUploadsTable($conn);

  $stmt = $conn->prepare("
    SELECT id, upload_id, file_name, file_size, status, progress, chunks_uploaded, chunks_total, b2_url, error_message, completed_at
    FROM uploads
    WHERE upload_id = ?
    LIMIT 1
  ");

  if (!$stmt) {
    throw new Exception('Prepare failed: ' . $conn->error);
  }

  $stmt->bind_param('s', $uploadId);

  if (!$stmt->execute()) {
    throw new Exception('Execute failed: ' . $stmt->error);
  }

  $result = $stmt->get_result();
  $upload = $result->fetch_assoc();

  $stmt->close();

  if (!$upload) {
    throw new Exception('Upload not found');
  }

  return [
    'uploadId' => $upload['upload_id'],
    'fileName' => $upload['file_name'],
    'fileSize' => $upload['file_size'],
    'status' => $upload['status'],
    'progress' => (int)$upload['progress'],
    'chunksUploaded' => (int)$upload['chunks_uploaded'],
    'chunksTotal' => (int)$upload['chunks_total'],
    'url' => $upload['b2_url'],
    'error' => $upload['error_message'],
    'completedAt' => $upload['completed_at']
  ];
}

function updateUploadProgress($conn, $uploadId, $chunksUploaded, $progress) {
  $stmt = $conn->prepare("
    UPDATE uploads
    SET chunks_uploaded = ?, progress = ?
    WHERE upload_id = ?
  ");

  if (!$stmt) {
    throw new Exception('Prepare failed: ' . $conn->error);
  }

  $stmt->bind_param('iis', $chunksUploaded, $progress, $uploadId);

  if (!$stmt->execute()) {
    throw new Exception('Execute failed: ' . $stmt->error);
  }

  $stmt->close();
}

function markUploadComplete($conn, $uploadId, $b2Url) {
  $stmt = $conn->prepare("
    UPDATE uploads
    SET status = 'completed', b2_url = ?, progress = 100, completed_at = NOW()
    WHERE upload_id = ?
  ");

  if (!$stmt) {
    throw new Exception('Prepare failed: ' . $conn->error);
  }

  $stmt->bind_param('ss', $b2Url, $uploadId);

  if (!$stmt->execute()) {
    throw new Exception('Execute failed: ' . $stmt->error);
  }

  $stmt->close();

  error_log('[UPLOAD-QUEUE] Completed: ' . $uploadId . ' → ' . $b2Url);
}

function markUploadFailed($conn, $uploadId, $error) {
  $stmt = $conn->prepare("
    UPDATE uploads
    SET status = 'failed', error_message = ?
    WHERE upload_id = ?
  ");

  if (!$stmt) {
    throw new Exception('Prepare failed: ' . $conn->error);
  }

  $stmt->bind_param('ss', $error, $uploadId);

  if (!$stmt->execute()) {
    throw new Exception('Execute failed: ' . $stmt->error);
  }

  $stmt->close();

  error_log('[UPLOAD-QUEUE] Failed: ' . $uploadId . ' - ' . $error);
}

// REST API
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  try {
    verifyToken();
    $action = $_GET['action'] ?? null;
    $input = json_decode(file_get_contents('php://input'), true);

    if ($action === 'create') {
      $result = createUploadRequest(
        $conn,
        $input['fileName'] ?? '',
        $input['fileSize'] ?? 0,
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

    $status = getUploadStatus($conn, $uploadId);
    echo json_encode(['success' => true, 'data' => $status]);
  } catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
  }
}

$conn->close();
?>
