<?php
// Authentication Endpoint for StudioArch
// Upload to: https://digitrixmedia.com/studioarch/api/auth/login

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit();
}

// Database Configuration
$db_host = 'localhost';
$db_user = 'digitrix_studioarchwebsite';
$db_pass = 'studioarch@70';
$db_name = 'digitrix_studioarchwebsite';

// JWT Secret (keep same as Node backend)
$jwt_secret = 'your_super_secret_jwt_key_change_this_in_production';

// Get JSON input - try multiple methods
$input = [];

// Method 1: JSON from raw input
$raw_input = file_get_contents('php://input');
if (!empty($raw_input)) {
  $input = json_decode($raw_input, true) ?? [];
}

// Method 2: Fall back to $_POST if available
if (empty($input)) {
  $input = $_POST;
}

$email = $input['email'] ?? null;
$password = $input['password'] ?? null;

if (!$email || !$password) {
  http_response_code(400);
  echo json_encode(['error' => 'Email and password required']);
  exit();
}

try {
  // Connect to database
  $conn = new mysqli($db_host, $db_user, $db_pass, $db_name);

  if ($conn->connect_error) {
    throw new Exception('Database connection failed: ' . $conn->connect_error);
  }

  // Query user from database
  $stmt = $conn->prepare('SELECT id, email, password, name FROM admin_users WHERE email = ?');

  if (!$stmt) {
    throw new Exception('SQL prepare failed: ' . $conn->error);
  }

  $stmt->bind_param('s', $email);
  $stmt->execute();
  $result = $stmt->get_result();

  if ($result->num_rows === 0) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid credentials']);
    $stmt->close();
    $conn->close();
    exit();
  }

  $user = $result->fetch_assoc();

  // Verify password (using password_verify for hashed passwords)
  if (!$user['password'] || !password_verify($password, $user['password'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid credentials']);
    $stmt->close();
    $conn->close();
    exit();
  }

  // Create JWT token (simple implementation)
  $header = base64_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
  $payload = base64_encode(json_encode([
    'id' => $user['id'],
    'email' => $user['email'],
    'iat' => time(),
    'exp' => time() + (7 * 24 * 60 * 60) // 7 days
  ]));

  $signature = base64_encode(hash_hmac('sha256', "$header.$payload", $jwt_secret, true));
  $token = "$header.$payload.$signature";

  // Return success response
  http_response_code(200);
  echo json_encode([
    'success' => true,
    'token' => $token,
    'user' => [
      'id' => $user['id'],
      'email' => $user['email'],
      'name' => $user['name']
    ]
  ]);

  $stmt->close();
  $conn->close();

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['error' => $e->getMessage()]);
}
?>
