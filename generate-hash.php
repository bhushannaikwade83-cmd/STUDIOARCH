<?php
// Generate BCrypt hash for password
// Run this once, copy the hash, paste into database

$password = "admin123";
$hash = password_hash($password, PASSWORD_BCRYPT);

echo "Password: " . $password . "\n";
echo "Hash: " . $hash . "\n\n";

echo "Copy this hash and paste into admin_users table password column:\n";
echo $hash;
?>
