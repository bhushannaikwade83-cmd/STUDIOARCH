<?php
// Upload progress tracker - tracks each upload in real-time
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');

try {
  verifyToken();

  $action = $_GET['action'] ?? 'get';

  if ($action === 'init') {
    // Initialize new upload tracking
    $uploadId = $_POST['uploadId'] ?? null;
    $projectId = $_POST['projectId'] ?? null;
    $fileName = $_POST['fileName'] ?? null;
    $fileSize = $_POST['fileSize'] ?? null;

    if (!$uploadId || !projectId || !$fileName) {
      throw new Exception('Missing required fields');
    }

    $conn = new mysqli('localhost', 'digitrix_studioarchwebsite', 'studioarch@70', 'digitrix_studioarchwebsite');
    if ($conn->connect_error) {
      throw new Exception('Database connection failed');
    }

    $status = 'uploading';
    $progress = 0;
    $createdAt = date('Y-m-d H:i:s');

    $sql = "INSERT INTO upload_tracking (uploadId, projectId, fileName, fileSize, progress, status, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE progress=?, status=?";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param('sisiiissi', $uploadId, $projectId, $fileName, $fileSize, $progress, $status, $createdAt, $progress, $status);

    if (!$stmt->execute()) {
      throw new Exception('Failed to initialize upload tracking');
    }

    http_response_code(200);
    echo json_encode([
      'success' => true,
      'uploadId' => $uploadId,
      'message' => 'Upload tracking initialized'
    ]);

  } elseif ($action === 'update') {
    // Update progress
    $uploadId = $_POST['uploadId'] ?? null;
    $progress = $_POST['progress'] ?? null;
    $status = $_POST['status'] ?? 'uploading';
    $error = $_POST['error'] ?? null;

    if (!$uploadId) {
      throw new Exception('Missing uploadId');
    }

    $conn = new mysqli('localhost', 'digitrix_studioarchwebsite', 'studioarch@70', 'digitrix_studioarchwebsite');
    if ($conn->connect_error) {
      throw new Exception('Database connection failed');
    }

    $sql = "UPDATE upload_tracking SET progress=?, status=?, error=? WHERE uploadId=?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('isss', $progress, $status, $error, $uploadId);

    if (!$stmt->execute()) {
      throw new Exception('Failed to update upload progress');
    }

    http_response_code(200);
    echo json_encode([
      'success' => true,
      'message' => 'Progress updated'
    ]);

  } elseif ($action === 'get') {
    // Get all uploads for user
    $conn = new mysqli('localhost', 'digitrix_studioarchwebsite', 'studioarch@70', 'digitrix_studioarchwebsite');
    if ($conn->connect_error) {
      throw new Exception('Database connection failed');
    }

    $sql = "SELECT uploadId, projectId, fileName, fileSize, progress, status, error, createdAt, updatedAt
            FROM upload_tracking
            ORDER BY createdAt DESC
            LIMIT 50";

    $result = $conn->query($sql);
    if (!$result) {
      throw new Exception('Failed to fetch uploads');
    }

    $uploads = [];
    while ($row = $result->fetch_assoc()) {
      $uploads[] = $row;
    }

    http_response_code(200);
    echo json_encode([
      'success' => true,
      'uploads' => $uploads
    ]);

  } elseif ($action === 'complete') {
    // Mark upload as complete
    $uploadId = $_POST['uploadId'] ?? null;
    $videoUrl = $_POST['videoUrl'] ?? null;
    $projectId = $_POST['projectId'] ?? null;

    if (!$uploadId) {
      throw new Exception('Missing uploadId');
    }

    $conn = new mysqli('localhost', 'digitrix_studioarchwebsite', 'studioarch@70', 'digitrix_studioarchwebsite');
    if ($conn->connect_error) {
      throw new Exception('Database connection failed');
    }

    // Update tracking status
    $status = 'completed';
    $progress = 100;
    $sql = "UPDATE upload_tracking SET progress=?, status=?, videoUrl=? WHERE uploadId=?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('isss', $progress, $status, $videoUrl, $uploadId);

    if (!$stmt->execute()) {
      throw new Exception('Failed to complete upload tracking');
    }

    // If projectId provided, add video URL to project
    if ($projectId && $videoUrl) {
      $projectSql = "SELECT videos FROM projects WHERE id=?";
      $projectStmt = $conn->prepare($projectSql);
      $projectStmt->bind_param('i', $projectId);
      $projectStmt->execute();
      $projectResult = $projectStmt->get_result();

      if ($projectResult->num_rows > 0) {
        $project = $projectResult->fetch_assoc();
        $videos = json_decode($project['videos'] ?? '[]', true);
        if (!in_array($videoUrl, $videos)) {
          $videos[] = $videoUrl;
        }

        $videosJson = json_encode($videos);
        $updateSql = "UPDATE projects SET videos=? WHERE id=?";
        $updateStmt = $conn->prepare($updateSql);
        $updateStmt->bind_param('si', $videosJson, $projectId);
        $updateStmt->execute();
      }
    }

    http_response_code(200);
    echo json_encode([
      'success' => true,
      'message' => 'Upload completed'
    ]);
  }

} catch (Exception $e) {
  error_log('[UPLOAD-TRACKER] Error: ' . $e->getMessage());
  http_response_code(400);
  echo json_encode(['error' => $e->getMessage()]);
}
?>
