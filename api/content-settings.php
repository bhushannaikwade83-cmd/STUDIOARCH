<?php
// Content Settings API Endpoint
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  // Get all settings
  $conn = getConnection();
  $result = $conn->query('SELECT * FROM content_settings');

  if (!$result) {
    http_response_code(500);
    echo json_encode(['error' => 'Query failed']);
    exit();
  }

  $settings = [];
  while ($row = $result->fetch_assoc()) {
    $settings[] = $row;
  }

  echo json_encode($settings);
  $conn->close();

} elseif ($method === 'POST') {
  // Create/Update setting (requires auth)
  requireAuth();

  $input = json_decode(file_get_contents('php://input'), true);
  $key_name = $input['key_name'] ?? null;
  $value = $input['value'] ?? null;

  if (!$key_name) {
    http_response_code(400);
    echo json_encode(['error' => 'Key name required']);
    exit();
  }

  $conn = getConnection();
  $stmt = $conn->prepare(
    'INSERT INTO content_settings (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)'
  );

  $stmt->bind_param('ss', $key_name, $value);

  if ($stmt->execute()) {
    http_response_code(201);
    echo json_encode(['success' => true]);
  } else {
    http_response_code(500);
    echo json_encode(['error' => 'Insert failed']);
  }

  $stmt->close();
  $conn->close();

} else {
  http_response_code(405);
  echo json_encode(['error' => 'Method not allowed']);
}
?>
