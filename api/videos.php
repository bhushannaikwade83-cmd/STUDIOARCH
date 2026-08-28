<?php
// Event Videos API Endpoint
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  // Get all videos
  $conn = getConnection();
  $result = $conn->query('SELECT * FROM event_videos ORDER BY created_at DESC');

  if (!$result) {
    http_response_code(500);
    echo json_encode(['error' => 'Query failed']);
    exit();
  }

  $videos = [];
  while ($row = $result->fetch_assoc()) {
    $videos[] = $row;
  }

  echo json_encode($videos);
  $conn->close();

} elseif ($method === 'POST') {
  // Create video (requires auth)
  verifyToken();

  $input = json_decode(file_get_contents('php://input'), true);
  $title = $input['title'] ?? null;
  $url = $input['url'] ?? null;

  if (!$title || !$url) {
    http_response_code(400);
    echo json_encode(['error' => 'Title and URL required']);
    exit();
  }

  $conn = getConnection();
  $stmt = $conn->prepare(
    'INSERT INTO event_videos (title, url) VALUES (?, ?)'
  );

  $stmt->bind_param('ss', $title, $url);

  if ($stmt->execute()) {
    http_response_code(201);
    echo json_encode([
      'success' => true,
      'id' => $stmt->insert_id,
      'title' => $title,
      'url' => $url
    ]);
  } else {
    http_response_code(500);
    echo json_encode(['error' => 'Insert failed']);
  }

  $stmt->close();
  $conn->close();

} elseif ($method === 'DELETE') {
  // Delete video
  verifyToken();

  $id = $_GET['id'] ?? null;
  if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'ID required']);
    exit();
  }

  $conn = getConnection();
  $stmt = $conn->prepare('DELETE FROM event_videos WHERE id = ?');
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
