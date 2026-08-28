<?php
// Contact Messages API Endpoint
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  $conn = getConnection();
  $result = $conn->query('SELECT * FROM contact_messages ORDER BY created_at DESC');
  $messages = [];
  while ($row = $result->fetch_assoc()) {
    $messages[] = $row;
  }
  echo json_encode($messages);
  $conn->close();

} elseif ($method === 'POST') {
  $input = json_decode(file_get_contents('php://input'), true);
  $name = $input['name'] ?? null;
  $email = $input['email'] ?? null;
  $message = $input['message'] ?? null;

  if (!$name || !$email || !$message) {
    http_response_code(400);
    echo json_encode(['error' => 'All fields required']);
    exit();
  }

  $conn = getConnection();
  $stmt = $conn->prepare('INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)');
  $stmt->bind_param('sss', $name, $email, $message);

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
  try {
    requireAuth();
  } catch (Exception $e) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication failed: ' . $e->getMessage()]);
    exit();
  }

  $id = $_GET['id'] ?? null;

  if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'ID required']);
    exit();
  }

  try {
    $conn = getConnection();
    $stmt = $conn->prepare('DELETE FROM contact_messages WHERE id = ?');
    if (!$stmt) {
      throw new Exception('Prepare failed: ' . $conn->error);
    }

    $stmt->bind_param('i', $id);

    if ($stmt->execute()) {
      echo json_encode(['success' => true]);
    } else {
      http_response_code(500);
      echo json_encode(['error' => 'Delete failed: ' . $stmt->error]);
    }

    $stmt->close();
    $conn->close();
  } catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
  }
} else {
  http_response_code(405);
  echo json_encode(['error' => 'Method not allowed']);
}
?>
