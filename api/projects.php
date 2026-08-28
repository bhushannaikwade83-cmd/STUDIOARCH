<?php
// Projects API Endpoint with integrated file handling
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

// Handle _method override for PUT (because PHP doesn't parse multipart for PUT)
if ($method === 'POST' && isset($_GET['_method']) && $_GET['_method'] === 'PUT') {
  $method = 'PUT';
  error_log('[DEBUG] Treating POST as PUT due to _method=PUT parameter');
}

error_log('[DEBUG] REQUEST_METHOD: ' . $method);
error_log('[DEBUG] Content-Type: ' . ($_SERVER['CONTENT_TYPE'] ?? 'NOT SET'));
error_log('[DEBUG] $_POST keys: ' . json_encode(array_keys($_POST)));
error_log('[DEBUG] $_FILES keys: ' . json_encode(array_keys($_FILES)));
error_log('[DEBUG] $_REQUEST keys: ' . json_encode(array_keys($_REQUEST)));

// When a request body is bigger than post_max_size, PHP throws away BOTH
// $_POST and $_FILES, leaving them empty. Without this check the request
// looks like "no title was sent" instead of "your upload was too big".
if (($method === 'POST' || $method === 'PUT') && empty($_POST) && empty($_FILES)) {
  $contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
  if ($contentLength > 0) {
    $postMax = ini_get('post_max_size');
    $uploadMax = ini_get('upload_max_filesize');
    error_log('[ERROR] Request body discarded by PHP. Content-Length: ' . $contentLength
      . ' | post_max_size: ' . $postMax . ' | upload_max_filesize: ' . $uploadMax);
    http_response_code(413);
    echo json_encode([
      'error' => 'Upload too large. The server currently accepts up to ' . $postMax
        . ' per request (upload_max_filesize: ' . $uploadMax . '). '
        . 'Increase post_max_size and upload_max_filesize in cPanel > MultiPHP INI Editor.',
      'contentLength' => $contentLength,
      'postMaxSize' => $postMax,
      'uploadMaxFilesize' => $uploadMax
    ]);
    exit();
  }
}

// Collects files that could not be saved, so the response can report them
// instead of silently pretending every upload succeeded.
$failedUploads = [];

// Helper: Process uploaded files, returning image and video URLs separately
// as ['images' => [...], 'videos' => [...]]
function processUploadedFiles($fileInputName = 'files') {
  global $failedUploads;

  $uploadErrorMessages = [
    UPLOAD_ERR_INI_SIZE   => 'File is larger than the server upload limit (php.ini upload_max_filesize)',
    UPLOAD_ERR_FORM_SIZE  => 'File is larger than the form upload limit',
    UPLOAD_ERR_PARTIAL    => 'File was only partially uploaded',
    UPLOAD_ERR_NO_FILE    => 'No file was uploaded',
    UPLOAD_ERR_NO_TMP_DIR => 'Server is missing a temporary folder',
    UPLOAD_ERR_CANT_WRITE => 'Server failed to write the file to disk',
    UPLOAD_ERR_EXTENSION  => 'A PHP extension blocked the upload',
  ];

  $uploadedUrls = ['images' => [], 'videos' => []];

  if (!isset($_FILES[$fileInputName])) {
    return $uploadedUrls;
  }

  $files = $_FILES[$fileInputName];

  // A single file arrives as scalars; multiple files (sent as files[])
  // arrive as parallel arrays. Normalise to the array shape.
  if (is_string($files['name'])) {
    $files = [
      'name' => [$files['name']],
      'type' => [$files['type']],
      'tmp_name' => [$files['tmp_name']],
      'size' => [$files['size']],
      'error' => [$files['error']]
    ];
  }

  error_log('[DEBUG] processUploadedFiles received ' . count($files['name']) . ' file(s): ' . implode(', ', $files['name']));

  for ($i = 0; $i < count($files['name']); $i++) {
    $fileName = $files['name'][$i];

    if ($files['error'][$i] !== UPLOAD_ERR_OK) {
      $errCode = $files['error'][$i];
      $errMsg = $uploadErrorMessages[$errCode] ?? ('Upload error code ' . $errCode);
      error_log('[ERROR] File upload error for ' . $fileName . ': ' . $errMsg);
      $failedUploads[] = ['name' => $fileName, 'reason' => $errMsg];
      continue;
    }

    $fileType = $files['type'][$i];
    $tmpPath = $files['tmp_name'][$i];
    $fileSize = $files['size'][$i];

    // Validate
    $isImage = strpos($fileType, 'image/') === 0;
    $isVideo = strpos($fileType, 'video/') === 0;

    if (!$isImage && !$isVideo) {
      error_log('[ERROR] Invalid file type for ' . $fileName . ': ' . $fileType);
      $failedUploads[] = ['name' => $fileName, 'reason' => 'Only images and videos are allowed'];
      continue;
    }

    if ($fileSize > 500 * 1024 * 1024) {
      error_log('[ERROR] File too large: ' . $fileName . ' (' . $fileSize . ' bytes)');
      $failedUploads[] = ['name' => $fileName, 'reason' => 'File exceeds 500MB limit'];
      continue;
    }

    // Videos and images live in separate folders
    $subFolder = $isVideo ? 'videos' : 'projects';
    $uploadDir = __DIR__ . '/../uploads/' . $subFolder;
    if (!is_dir($uploadDir)) {
      mkdir($uploadDir, 0777, true);
    }

    // Generate unique filename (uniqid prevents collisions when several
    // files land in the same second)
    $safeName = preg_replace('/[^a-zA-Z0-9.-]/', '_', $fileName);
    $uniqueFileName = time() . '-' . uniqid() . '-' . $safeName;
    $filePath = $uploadDir . '/' . $uniqueFileName;

    // Move uploaded file
    if (move_uploaded_file($tmpPath, $filePath)) {
      chmod($filePath, 0644);
      $webUrl = 'https://digitrixmedia.com/studioarch/uploads/' . $subFolder . '/' . $uniqueFileName;
      $uploadedUrls[$isVideo ? 'videos' : 'images'][] = $webUrl;
      error_log('[Upload] File saved (' . ($isVideo ? 'video' : 'image') . '): ' . $webUrl);
    } else {
      error_log('[ERROR] Failed to move file: ' . $filePath);
      $failedUploads[] = ['name' => $fileName, 'reason' => 'Server could not save the file'];
    }
  }

  return $uploadedUrls;
}

if ($method === 'GET') {
  // Get all projects
  $conn = getConnection();
  error_log('[DEBUG] GET request - querying projects table');
  error_log('[DEBUG] Connected to DB: ' . $conn->host_info . ' | Server: ' . php_uname('n'));

  $dbNameResult = $conn->query('SELECT DATABASE() as db');
  $dbNameRow = $dbNameResult->fetch_assoc();
  error_log('[DEBUG] Current database in use: ' . $dbNameRow['db']);

  $countResult = $conn->query('SELECT COUNT(*) as total FROM projects');
  $countRow = $countResult->fetch_assoc();
  error_log('[DEBUG] Total rows in projects table right now: ' . $countRow['total']);

  $result = $conn->query('SELECT * FROM projects ORDER BY created_at DESC');

  if (!$result) {
    error_log('[ERROR] Query failed: ' . $conn->error);
    http_response_code(500);
    echo json_encode(['error' => 'Query failed: ' . $conn->error]);
    $conn->close();
    exit();
  }

  $projects = [];
  while ($row = $result->fetch_assoc()) {
    $projects[] = $row;
  }

  error_log('[DEBUG] GET returning ' . count($projects) . ' projects');
  echo json_encode($projects, JSON_UNESCAPED_SLASHES);
  $conn->close();

} elseif ($method === 'POST') {
  // Create project (requires auth)
  error_log('[DEBUG] POST - Auth header present: ' . (isset($_SERVER['HTTP_AUTHORIZATION']) ? 'YES' : 'NO'));
  try {
    verifyToken();
  } catch (Exception $e) {
    error_log('[ERROR] verifyToken failed: ' . $e->getMessage());
    throw $e;
  }

  // Get form data
  $title = $_POST['name'] ?? null;
  $location = $_POST['location'] ?? null;
  $year = $_POST['year'] ?? null;
  $category = $_POST['category'] ?? null;
  $description = $_POST['description'] ?? null;

  // Get existing URLs from form data
  $existingImages = $_POST['existingImages'] ?? null;
  $existingImagesArray = $existingImages ? json_decode($existingImages, true) : [];
  $existingVideos = $_POST['existingVideos'] ?? null;
  $existingVideosArray = $existingVideos ? json_decode($existingVideos, true) : [];

  // Process newly uploaded files (returns images and videos separately)
  $uploadedUrls = processUploadedFiles('files');

  // Combine existing and new, keeping images and videos in their own columns
  $images = array_merge($existingImagesArray, $uploadedUrls['images']);
  $videos = array_merge($existingVideosArray, $uploadedUrls['videos']);

  if (!$title) {
    http_response_code(400);
    echo json_encode(['error' => 'Project title required']);
    exit();
  }

  $conn = getConnection();
  $sql = 'INSERT INTO projects (title, location, year, category, description, images, videos, display_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())';

  $stmt = $conn->prepare($sql);

  if (!$stmt) {
    http_response_code(500);
    echo json_encode(['error' => 'SQL Error: ' . $conn->error]);
    $conn->close();
    exit();
  }

  // JSON_UNESCAPED_SLASHES keeps URLs readable in the database
  $images_json = json_encode($images ?: [], JSON_UNESCAPED_SLASHES);
  $videos_json = json_encode($videos ?: [], JSON_UNESCAPED_SLASHES);
  $stmt->bind_param('sssssss', $title, $location, $year, $category, $description, $images_json, $videos_json);

  if ($stmt->execute()) {
    error_log('[SUCCESS] Project created with ID: ' . $stmt->insert_id);
    http_response_code(201);
    echo json_encode([
      'success' => true,
      'id' => $stmt->insert_id,
      'images' => $images,
      'videos' => $videos,
      'uploadedUrls' => $uploadedUrls,
      'failedUploads' => $failedUploads
    ], JSON_UNESCAPED_SLASHES);
  } else {
    error_log('[ERROR] INSERT execute failed: ' . $stmt->error);
    http_response_code(500);
    echo json_encode(['error' => 'Insert failed: ' . $stmt->error]);
  }

  $stmt->close();
  $conn->close();

} elseif ($method === 'PUT') {
  // Update project
  try {
    verifyToken();
  } catch (Exception $e) {
    error_log('[ERROR] verifyToken failed in PUT: ' . $e->getMessage());
    throw $e;
  }

  $id = $_GET['id'] ?? null;
  if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'ID required']);
    exit();
  }

  $conn = getConnection();

  // CRITICAL FIX: Fetch existing project first to preserve values
  error_log('[DEBUG] Fetching existing project ' . $id);
  $existingStmt = $conn->prepare('SELECT * FROM projects WHERE id = ?');
  $existingStmt->bind_param('i', $id);
  $existingStmt->execute();
  $existingResult = $existingStmt->get_result();
  $existingProject = $existingResult->fetch_assoc();

  if (!$existingProject) {
    http_response_code(404);
    echo json_encode(['error' => 'Project not found']);
    $conn->close();
    exit();
  }

  error_log('[DEBUG] Existing project found: ' . json_encode($existingProject));

  // Get form data - use existing values as defaults if not provided
  $title = $_POST['name'] ?? $existingProject['title'];
  $location = $_POST['location'] ?? $existingProject['location'];
  $year = $_POST['year'] ?? $existingProject['year'];
  $category = $_POST['category'] ?? $existingProject['category'];
  $description = $_POST['description'] ?? $existingProject['description'];

  error_log('[DEBUG] Update values - title: ' . $title . ', location: ' . $location);

  // Prefer the lists the client sent (they reflect removals made in the UI);
  // fall back to what is already stored when the client sent nothing.
  if (isset($_POST['existingImages'])) {
    $existingImagesArray = json_decode($_POST['existingImages'], true) ?: [];
  } else {
    $existingImagesArray = json_decode($existingProject['images'] ?? '[]', true) ?: [];
  }

  if (isset($_POST['existingVideos'])) {
    $existingVideosArray = json_decode($_POST['existingVideos'], true) ?: [];
  } else {
    $existingVideosArray = json_decode($existingProject['videos'] ?? '[]', true) ?: [];
  }

  error_log('[DEBUG] Existing images: ' . count($existingImagesArray) . ', videos: ' . count($existingVideosArray));

  // Process newly uploaded files (images and videos come back separately)
  $uploadedUrls = processUploadedFiles('files');
  error_log('[DEBUG] Newly uploaded - images: ' . count($uploadedUrls['images']) . ', videos: ' . count($uploadedUrls['videos']));

  // Combine existing and new (APPEND, don't replace)
  $allImages = array_merge($existingImagesArray, $uploadedUrls['images']);
  $allVideos = array_merge($existingVideosArray, $uploadedUrls['videos']);

  // JSON_UNESCAPED_SLASHES keeps URLs readable in the database
  $images_json = json_encode($allImages ?: [], JSON_UNESCAPED_SLASHES);
  $videos_json = json_encode($allVideos ?: [], JSON_UNESCAPED_SLASHES);

  error_log('[DEBUG] About to update project ' . $id . ' - images: ' . count($allImages) . ', videos: ' . count($allVideos));

  $stmt = $conn->prepare(
    'UPDATE projects SET title = ?, location = ?, year = ?, category = ?, description = ?, images = ?, videos = ?, updated_at = NOW() WHERE id = ?'
  );

  if (!$stmt) {
    error_log('[ERROR] Prepare failed: ' . $conn->error);
    http_response_code(500);
    echo json_encode(['error' => 'Prepare failed: ' . $conn->error]);
    $conn->close();
    exit();
  }

  error_log('[DEBUG] Binding params - title: ' . $title . ', id: ' . $id);
  $stmt->bind_param('sssssssi', $title, $location, $year, $category, $description, $images_json, $videos_json, $id);

  if ($stmt->execute()) {
    error_log('[DEBUG] Update successful. Rows affected: ' . $stmt->affected_rows);
    echo json_encode([
      'success' => true,
      'images' => $allImages,
      'videos' => $allVideos,
      'uploadedUrls' => $uploadedUrls,
      'failedUploads' => $failedUploads,
      'affectedRows' => $stmt->affected_rows
    ], JSON_UNESCAPED_SLASHES);
  } else {
    error_log('[ERROR] Execute failed: ' . $stmt->error);
    http_response_code(500);
    echo json_encode(['error' => 'Update failed: ' . $stmt->error]);
  }

  $stmt->close();
  $conn->close();

} elseif ($method === 'DELETE') {
  // Delete project
  verifyToken();

  $id = $_GET['id'] ?? null;
  error_log('[DEBUG] DELETE request - ID: ' . ($id ?? 'NULL'));

  if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'ID required']);
    exit();
  }

  $conn = getConnection();
  error_log('[DEBUG] About to delete project with ID: ' . $id);

  $stmt = $conn->prepare('DELETE FROM projects WHERE id = ?');
  if (!$stmt) {
    error_log('[ERROR] Prepare failed: ' . $conn->error);
    http_response_code(500);
    echo json_encode(['error' => 'Prepare failed: ' . $conn->error]);
    $conn->close();
    exit();
  }

  $stmt->bind_param('i', $id);
  error_log('[DEBUG] Bound parameter ID: ' . $id);

  if ($stmt->execute()) {
    error_log('[SUCCESS] Project deleted. ID: ' . $id . ', Rows affected: ' . $stmt->affected_rows);
    echo json_encode(['success' => true, 'affectedRows' => $stmt->affected_rows]);
  } else {
    error_log('[ERROR] DELETE execute failed: ' . $stmt->error);
    http_response_code(500);
    echo json_encode(['error' => 'Delete failed: ' . $stmt->error]);
  }

  $stmt->close();
  $conn->close();

} else {
  http_response_code(405);
  echo json_encode(['error' => 'Method not allowed']);
}
?>
