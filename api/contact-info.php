<?php
// Contact Info API Endpoint
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  $conn = getConnection();
  $result = $conn->query('SELECT * FROM contact_info LIMIT 1');
  $info = $result->fetch_assoc();
  echo json_encode($info ?: []);
  $conn->close();

} elseif ($method === 'POST') {
  verifyToken();
  $input = json_decode(file_get_contents('php://input'), true);

  $conn = getConnection();
  $stmt = $conn->prepare(
    'INSERT INTO contact_info (email, phone, locations, instagram, linkedin, youtube, locationmapurl) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE email = VALUES(email), phone = VALUES(phone), locations = VALUES(locations), instagram = VALUES(instagram), linkedin = VALUES(linkedin), youtube = VALUES(youtube), locationmapurl = VALUES(locationmapurl)'
  );

  $stmt->bind_param('sssssss', $input['email'], $input['phone'], $input['locations'], $input['instagram'], $input['linkedin'], $input['youtube'], $input['locationmapurl']);

  if ($stmt->execute()) {
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
