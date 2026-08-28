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
  // Update the first (and only) contact_info record (id = 1)
  $stmt = $conn->prepare(
    'UPDATE contact_info SET email = ?, phone = ?, locations = ?, instagram = ?, linkedin = ?, youtube = ?, locationmapurl = ? WHERE id = 1'
  );

  $stmt->bind_param('sssssss', $input['email'], $input['phone'], $input['locations'], $input['instagram'], $input['linkedin'], $input['youtube'], $input['locationmapurl']);

  if ($stmt->execute()) {
    echo json_encode(['success' => true]);
  } else {
    http_response_code(500);
    echo json_encode(['error' => 'Update failed']);
  }

  $stmt->close();
  $conn->close();
} else {
  http_response_code(405);
  echo json_encode(['error' => 'Method not allowed']);
}
?>
