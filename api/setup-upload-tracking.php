<?php
// Setup upload_tracking table
$conn = new mysqli('localhost', 'digitrix_studioarchwebsite', 'studioarch@70', 'digitrix_studioarchwebsite');

if ($conn->connect_error) {
  die('Connection failed: ' . $conn->connect_error);
}

$sql = "CREATE TABLE IF NOT EXISTS upload_tracking (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uploadId VARCHAR(100) UNIQUE NOT NULL,
  projectId INT,
  fileName VARCHAR(255) NOT NULL,
  fileSize BIGINT,
  progress INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'uploading',
  error TEXT,
  videoUrl VARCHAR(500),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX(uploadId),
  INDEX(projectId),
  INDEX(status)
)";

if ($conn->query($sql) === TRUE) {
  echo "Table created successfully\n";
} else {
  echo "Error creating table: " . $conn->error . "\n";
}

$conn->close();
?>
