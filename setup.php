<?php
// Setup script - creates required directories

$dirs = [
  'uploads/projects',
  'uploads/gallery',
  'uploads/videos'
];

echo "<h2>Creating directories...</h2>";

foreach ($dirs as $dir) {
  $path = __DIR__ . '/' . $dir;

  if (!is_dir($path)) {
    if (mkdir($path, 0777, true)) {
      echo "✅ Created: $dir<br>";
      chmod($path, 0777);
    } else {
      echo "❌ Failed: $dir<br>";
    }
  } else {
    echo "✅ Already exists: $dir<br>";
    chmod($path, 0777);
  }
}

echo "<h3>Done! Now delete this file and test upload.</h3>";
?>
