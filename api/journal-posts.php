<?php
// Journal Posts API Endpoint
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  $conn = getConnection();
  $result = $conn->query('SELECT * FROM journal_posts ORDER BY created_at DESC');
  $posts = [];
  while ($row = $result->fetch_assoc()) {
    $posts[] = $row;
  }
  echo json_encode($posts);
  $conn->close();

} elseif ($method === 'POST') {
  verifyToken();
  $input = json_decode(file_get_contents('php://input'), true);
  $title = $input['title'] ?? null;
  $content = $input['content'] ?? null;
  $date = $input['date'] ?? null;
  $category = $input['category'] ?? null;

  if (!$title) {
    http_response_code(400);
    echo json_encode(['error' => 'Title required']);
    exit();
  }

  $conn = getConnection();
  $stmt = $conn->prepare('INSERT INTO journal_posts (title, content, date, category) VALUES (?, ?, ?, ?)');
  $stmt->bind_param('ssss', $title, $content, $date, $category);

  if ($stmt->execute()) {
    http_response_code(201);
    echo json_encode(['success' => true, 'id' => $stmt->insert_id]);
  } else {
    http_response_code(500);
    echo json_encode(['error' => 'Insert failed']);
  }

  $stmt->close();
  $conn->close();

} elseif ($method === 'PUT') {
  verifyToken();
  $id = $_GET['id'] ?? null;
  $input = json_decode(file_get_contents('php://input'), true);

  if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'ID required']);
    exit();
  }

  $conn = getConnection();
  $stmt = $conn->prepare('UPDATE journal_posts SET title = ?, content = ?, date = ?, category = ? WHERE id = ?');
  $stmt->bind_param('ssssi', $input['title'], $input['content'], $input['date'], $input['category'], $id);

  if ($stmt->execute()) {
    echo json_encode(['success' => true]);
  } else {
    http_response_code(500);
    echo json_encode(['error' => 'Update failed']);
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
  $stmt = $conn->prepare('DELETE FROM journal_posts WHERE id = ?');
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
