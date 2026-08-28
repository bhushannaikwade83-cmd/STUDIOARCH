<?php
// One-time migration: add a separate `videos` column to the projects table
// and move any video URLs currently stored in `images` over to it.
//
// Run once by visiting: https://digitrixmedia.com/studioarch/api/migrate-add-videos-column.php
// Delete this file afterwards.

require_once 'config.php';

$conn = getConnection();
$report = [];

// 1. Add the videos column if it is not already there
$check = $conn->query("SHOW COLUMNS FROM projects LIKE 'videos'");
if ($check->num_rows === 0) {
  if ($conn->query("ALTER TABLE projects ADD COLUMN videos LONGTEXT NULL AFTER images")) {
    $report[] = 'Added `videos` column';
  } else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to add column: ' . $conn->error]);
    exit();
  }
} else {
  $report[] = '`videos` column already exists';
}

// 2. Split existing rows: move video URLs out of `images` and into `videos`
$videoPattern = '/\.(mp4|webm|mov|avi|mkv|m4v)$/i';
$rows = $conn->query('SELECT id, images, videos FROM projects');
$moved = 0;

while ($row = $rows->fetch_assoc()) {
  $stored = json_decode($row['images'] ?? '[]', true) ?: [];
  if (empty($stored)) {
    continue;
  }

  $images = [];
  $videos = json_decode($row['videos'] ?? '[]', true) ?: [];

  foreach ($stored as $url) {
    if (preg_match($videoPattern, $url)) {
      if (!in_array($url, $videos, true)) {
        $videos[] = $url;
      }
    } else {
      $images[] = $url;
    }
  }

  // Only write when something actually moved
  if (count($images) !== count($stored)) {
    $imagesJson = json_encode($images, JSON_UNESCAPED_SLASHES);
    $videosJson = json_encode($videos, JSON_UNESCAPED_SLASHES);

    $update = $conn->prepare('UPDATE projects SET images = ?, videos = ? WHERE id = ?');
    $update->bind_param('ssi', $imagesJson, $videosJson, $row['id']);
    $update->execute();
    $update->close();

    $moved++;
    $report[] = "Project {$row['id']}: moved " . (count($stored) - count($images)) . ' video(s) to `videos`';
  }
}

// 3. Rewrite any remaining escaped slashes in images so stored JSON is clean
$rows = $conn->query('SELECT id, images, videos FROM projects');
while ($row = $rows->fetch_assoc()) {
  $images = json_decode($row['images'] ?? '[]', true) ?: [];
  $videos = json_decode($row['videos'] ?? '[]', true) ?: [];

  $imagesJson = json_encode($images, JSON_UNESCAPED_SLASHES);
  $videosJson = json_encode($videos, JSON_UNESCAPED_SLASHES);

  if ($imagesJson !== $row['images'] || $videosJson !== ($row['videos'] ?? '')) {
    $update = $conn->prepare('UPDATE projects SET images = ?, videos = ? WHERE id = ?');
    $update->bind_param('ssi', $imagesJson, $videosJson, $row['id']);
    $update->execute();
    $update->close();
    $report[] = "Project {$row['id']}: cleaned escaped slashes";
  }
}

$conn->close();

echo json_encode([
  'success' => true,
  'projectsUpdated' => $moved,
  'report' => $report
], JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
