<?php
// Projects API Endpoint with integrated file handling
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

// Helper: Process uploaded files and return URLs
function processUploadedFiles($fileInputName = 'files') {
  $uploadedUrls = [];

  if (!isset($_FILES[$fileInputName])) {
    return $uploadedUrls;
  }

  $files = $_FILES[$fileInputName];
  $fileCount = is_array($files['name']) ? count($files['name']) : 1;

  if ($fileCount === 1 && is_string($files['name'])) {
    // Single file
    $files = [
      'name' => [$files['name']],
      'type' => [$files['type']],
      'tmp_name' => [$files['tmp_name']],
      'size' => [$files['size']],
      'error' => [$files['error']]
    ];
  }

  for ($i = 0; $i < count($files['name']); $i++) {
    if ($files['error'][$i] !== UPLOAD_ERR_OK) {
      error_log('[ERROR] File upload error: ' . $files['error'][$i]);
      continue;
    }

    $fileName = $files['name'][$i];
    $fileType = $files['type'][$i];
    $tmpPath = $files['tmp_name'][$i];
    $fileSize = $files['size'][$i];

    // Validate
    $isImage = strpos($fileType, 'image/') === 0;
    $isVideo = strpos($fileType, 'video/') === 0;

    if (!$isImage && !$isVideo) {
      error_log('[ERROR] Invalid file type: ' . $fileType);
      continue;
    }

    if ($fileSize > 500 * 1024 * 1024) {
      error_log('[ERROR] File too large: ' . $fileSize);
      continue;
    }

    // Create upload directory
    $uploadDir = __DIR__ . '/../uploads/projects';
    if (!is_dir($uploadDir)) {
      mkdir($uploadDir, 0777, true);
    }

    // Generate unique filename
    $timestamp = time();
    $safeName = preg_replace('/[^a-zA-Z0-9.-]/', '_', $fileName);
    $uniqueFileName = $timestamp . '-' . $safeName;
    $filePath = $uploadDir . '/' . $uniqueFileName;

    // Move uploaded file
    if (move_uploaded_file($tmpPath, $filePath)) {
      chmod($filePath, 0644);
      $webUrl = 'https://digitrixmedia.com/studioarch/uploads/projects/' . $uniqueFileName;
      $uploadedUrls[] = $webUrl;
      error_log('[Upload] File saved: ' . $webUrl);
    } else {
      error_log('[ERROR] Failed to move file: ' . $filePath);
    }
  }

  return $uploadedUrls;
}

if ($method === 'GET') {
  // Get all projects
  $conn = getConnection();
  $result = $conn->query('SELECT * FROM projects ORDER BY created_at DESC');

  if (!$result) {
    http_response_code(500);
    echo json_encode(['error' => 'Query failed']);
    exit();
  }

  $projects = [];
  while ($row = $result->fetch_assoc()) {
    $projects[] = $row;
  }

  echo json_encode($projects);
  $conn->close();

} elseif ($method === 'POST') {
  // Create project (requires auth)
  verifyToken();

  // Get form data
  $title = $_POST['name'] ?? null;
  $location = $_POST['location'] ?? null;
  $year = $_POST['year'] ?? null;
  $category = $_POST['category'] ?? null;
  $description = $_POST['description'] ?? null;

  // Get existing image URLs from form data
  $existingImages = $_POST['existingImages'] ?? null;
  $existingImagesArray = $existingImages ? json_decode($existingImages, true) : [];

  // Process newly uploaded files
  $uploadedUrls = processUploadedFiles('files');

  // Combine existing and new images
  $allImages = array_merge($existingImagesArray, $uploadedUrls);
  $images = !empty($allImages) ? $allImages : null;

  if (!$title) {
    http_response_code(400);
    echo json_encode(['error' => 'Project title required']);
    exit();
  }

  $conn = getConnection();
  $sql = 'INSERT INTO projects (title, location, year, category, description, images, display_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, NOW(), NOW())';

  $stmt = $conn->prepare($sql);

  if (!$stmt) {
    http_response_code(500);
    echo json_encode(['error' => 'SQL Error: ' . $conn->error]);
    $conn->close();
    exit();
  }

  $images_json = $images ? json_encode($images) : null;
  $stmt->bind_param('ssssss', $title, $location, $year, $category, $description, $images_json);

  if ($stmt->execute()) {
    http_response_code(201);
    echo json_encode([
      'success' => true,
      'id' => $stmt->insert_id,
      'images' => $images,
      'uploadedUrls' => $uploadedUrls
    ]);
  } else {
    http_response_code(500);
    echo json_encode(['error' => 'Insert failed']);
  }

  $stmt->close();
  $conn->close();

} elseif ($method === 'PUT') {
  // Update project
  verifyToken();

  $id = $_GET['id'] ?? null;
  if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'ID required']);
    exit();
  }

  // Get form data
  $title = $_POST['name'] ?? null;
  $location = $_POST['location'] ?? null;
  $year = $_POST['year'] ?? null;
  $category = $_POST['category'] ?? null;
  $description = $_POST['description'] ?? null;

  // Get existing image URLs from form data
  $existingImages = $_POST['existingImages'] ?? null;
  $existingImagesArray = $existingImages ? json_decode($existingImages, true) : [];

  // Process newly uploaded files
  $uploadedUrls = processUploadedFiles('files');

  // Combine existing and new images
  $allImages = array_merge($existingImagesArray, $uploadedUrls);
  $images = !empty($allImages) ? $allImages : null;

  $conn = getConnection();
  $images_json = $images ? json_encode($images) : null;
  $stmt = $conn->prepare(
    'UPDATE projects SET title = ?, location = ?, year = ?, category = ?, description = ?, images = ?, updated_at = NOW() WHERE id = ?'
  );

  $stmt->bind_param('ssssssi', $title, $location, $year, $category, $description, $images_json, $id);

  if ($stmt->execute()) {
    echo json_encode([
      'success' => true,
      'images' => $images,
      'uploadedUrls' => $uploadedUrls
    ]);
  } else {
    http_response_code(500);
    echo json_encode(['error' => 'Update failed']);
  }

  $stmt->close();
  $conn->close();

} elseif ($method === 'DELETE') {
  // Delete project
  verifyToken();

  $id = $_GET['id'] ?? null;
  if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'ID required']);
    exit();
  }

  $conn = getConnection();
  $stmt = $conn->prepare('DELETE FROM projects WHERE id = ?');
  $stmt->bind_param('i', $id);

  if ($stmt->execute()) {
    echo json_encode(['success' => true]);
  } else {
    http_response_code(500);
    echo json_encode(['error' => 'Delete failed']);
  }

  $stmt->close();
  $conn->close();

} else {
  http_response_code(405);
  echo json_encode(['error' => 'Method not allowed']);
}
?>
