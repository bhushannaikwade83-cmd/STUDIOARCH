<?php
// Database Configuration (Shared by all API endpoints)

$db_host = 'localhost';
$db_user = 'digitrix_studioarchwebsite';
$db_pass = 'studioarch@70';
$db_name = 'digitrix_studioarchwebsite';

// JWT Secret (must match frontend)
$jwt_secret = 'your_super_secret_jwt_key_change_this_in_production';

// API Base URL
$api_base = 'https://digitrixmedia.com/studioarch/api';

// Upload directories
$upload_dirs = [
  'projects' => '../uploads/projects',
  'gallery' => '../uploads/gallery',
  'videos' => '../uploads/videos',
];

// ============ CRITICAL: CORS Headers MUST be first (before any output) ============
// Set CORS headers for all requests - works with or without .htaccess
header('Access-Control-Allow-Origin: *', true);
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS', true);
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-File-Name, X-File-Type, X-Requested-With', true);
header('Access-Control-Max-Age: 86400', true);
header('Content-Type: application/json', true);

// Disable all caching - always get fresh data from database
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0', true);
header('Pragma: no-cache', true);
header('Expires: 0', true);

// Handle OPTIONS preflight requests immediately (before auth check)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit();
}

// Helper: Verify JWT Token
function verifyToken() {
  global $jwt_secret;

  // Try multiple ways to get Authorization header
  $auth_header = '';

  if (function_exists('getallheaders')) {
    $headers = getallheaders();
    $auth_header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
  }

  // Fallback to $_SERVER
  if (!$auth_header && isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $auth_header = $_SERVER['HTTP_AUTHORIZATION'];
  }

  error_log('[DEBUG] verifyToken - Auth header present: ' . ($auth_header ? 'YES' : 'NO'));

  if (!preg_match('/Bearer\s+(\S+)/', $auth_header, $matches)) {
    http_response_code(401);
    die(json_encode(['error' => 'Unauthorized - No token', 'header' => $auth_header]));
  }

  $token = $matches[1];
  $parts = explode('.', $token);

  if (count($parts) !== 3) {
    http_response_code(401);
    die(json_encode(['error' => 'Unauthorized - Invalid token']));
  }

  list($header, $payload, $signature) = $parts;

  // Verify signature
  $valid_signature = base64_encode(hash_hmac('sha256', "$header.$payload", $jwt_secret, true));

  if ($signature !== $valid_signature) {
    http_response_code(401);
    die(json_encode(['error' => 'Unauthorized - Invalid signature']));
  }

  // Decode and check expiration
  $decoded = json_decode(base64_decode($payload), true);

  if ($decoded['exp'] < time()) {
    http_response_code(401);
    die(json_encode(['error' => 'Unauthorized - Token expired']));
  }

  return $decoded;
}

// Helper: Connect to database
function getConnection() {
  global $db_host, $db_user, $db_pass, $db_name;

  $conn = new mysqli($db_host, $db_user, $db_pass, $db_name);

  if ($conn->connect_error) {
    http_response_code(500);
    die(json_encode(['error' => 'Database connection failed']));
  }

  return $conn;
}
?>
