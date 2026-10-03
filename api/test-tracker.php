<?php
// Test upload tracker
header('Content-Type: application/json');

$action = $_GET['action'] ?? 'get';
echo json_encode([
  'action' => $action,
  'method' => $_SERVER['REQUEST_METHOD'],
  'success' => true,
  'test' => 'ok'
]);
?>
