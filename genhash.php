<?php
// Admin Password Hash Generator
// Password: admin@studioarch.com

$password = 'admin@studioarch.com';
$hash = password_hash($password, PASSWORD_BCRYPT);

echo "Password: " . htmlspecialchars($password) . "\n";
echo "Hash: " . htmlspecialchars($hash) . "\n\n";
echo "SQL Query:\n";
echo "UPDATE admin_users SET password = '" . $hash . "' WHERE email = 'admin@studioarch.com';\n";
?>
