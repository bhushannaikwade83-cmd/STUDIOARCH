<?php
// Projects API Endpoint
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

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

  $input = json_decode(file_get_contents('php://input'), true);
  $title = $input['name'] ?? null; // Frontend sends 'name', DB column is 'title'
  $location = $input['location'] ?? null;
  $year = $input['year'] ?? null;
  $category = $input['category'] ?? null;
  $description = $input['description'] ?? null;
  $images = $input['images'] ?? null;

  if (!$title) {
    http_response_code(400);
    echo json_encode(['error' => 'Project title required']);
    exit();
  }

  $conn = getConnection();
  $sql = 'INSERT INTO projects (title, location, year, category, description, images, display_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, NOW(), NOW())';

  error_log('[DEBUG] Preparing SQL: ' . $sql);
  $stmt = $conn->prepare($sql);

  if (!$stmt) {
    error_log('[ERROR] Prepare failed: ' . $conn->error);
    http_response_code(500);
    echo json_encode(['error' => 'SQL Error: ' . $conn->error]);
    $conn->close();
    exit();
  }

  $images_json = $images ? json_encode($images) : null;
  error_log('[DEBUG] Binding params: ' . $title . ', ' . $location . ', ' . $year . ', ' . $category . ', ' . $description);
  $stmt->bind_param('ssssss', $title, $location, $year, $category, $description, $images_json);

  if ($stmt->execute()) {
    http_response_code(201);
    echo json_encode([
      'success' => true,
      'id' => $stmt->insert_id,
      'name' => $name
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

  // Get ID from URL query parameter
  $id = $_GET['id'] ?? null;
  if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'ID required']);
    exit();
  }

  $input = json_decode(file_get_contents('php://input'), true);
  $title = $input['name'] ?? null;
  $location = $input['location'] ?? null;
  $year = $input['year'] ?? null;
  $category = $input['category'] ?? null;
  $description = $input['description'] ?? null;
  $images = $input['images'] ?? null;

  $conn = getConnection();
  $images_json = $images ? json_encode($images) : null;
  $stmt = $conn->prepare(
    'UPDATE projects SET title = ?, location = ?, year = ?, category = ?, description = ?, images = ?, updated_at = NOW() WHERE id = ?'
  );

  $stmt->bind_param('ssssssi', $title, $location, $year, $category, $description, $images_json, $id);

  if ($stmt->execute()) {
    echo json_encode(['success' => true]);
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
