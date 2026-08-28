<?php
// Gallery Items API Endpoint
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  $conn = getConnection();
  $result = $conn->query('SELECT * FROM gallery_items ORDER BY created_at DESC');
  $items = [];
  while ($row = $result->fetch_assoc()) {
    $items[] = $row;
  }
  echo json_encode($items);
  $conn->close();

} elseif ($method === 'POST') {
  verifyToken();
  $input = json_decode(file_get_contents('php://input'), true);
  $folder_name = $input['folder_name'] ?? null;
  $image_url = $input['image_url'] ?? null;
  $title = $input['title'] ?? null;

  if (!$folder_name || !$image_url) {
    http_response_code(400);
    echo json_encode(['error' => 'Folder name and image URL required']);
    exit();
  }

  $conn = getConnection();
  $stmt = $conn->prepare('INSERT INTO gallery_items (folder_name, image_url, title) VALUES (?, ?, ?)');
  $stmt->bind_param('sss', $folder_name, $image_url, $title);

  if ($stmt->execute()) {
    http_response_code(201);
    echo json_encode(['success' => true, 'id' => $stmt->insert_id]);
  } else {
    http_response_code(500);
    echo json_encode(['error' => 'Insert failed']);
  }

  $stmt->close();
  $conn->close();

} elseif ($method === 'DELETE') {
  verifyToken();
  $id = $_GET['id'] ?? null;

  if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'ID required']);
    exit();
  }

  $conn = getConnection();
  $stmt = $conn->prepare('DELETE FROM gallery_items WHERE id = ?');
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
