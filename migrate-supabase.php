<?php
/**
 * Supabase to MySQL Complete Migration
 * Transfers all data from Supabase to local MySQL
 */

$SUPABASE_URL = 'https://cyevdljkbdkdtvizlubc.supabase.co';
$SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5ZXZkbGprYmRrZHR2aXpsdWJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3ODQ1ODQsImV4cCI6MjA5NzM2MDU4NH0.1uUKjy45s5DaqeQ-XOoIxv6Fvs8PwVut3a1OBXCosY8';

$DB_HOST = 'localhost';
$DB_USER = 'digitrix_studioarchwebsite';
$DB_PASS = 'studioarch@70';
$DB_NAME = 'digitrix_studioarchwebsite';

$conn = new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME);
if ($conn->connect_error) die('❌ MySQL Connection failed: ' . $conn->connect_error);

echo "✅ Connected to MySQL\n\n";

function fetchFromSupabase($table) {
  global $SUPABASE_URL, $SUPABASE_KEY;
  $url = "$SUPABASE_URL/rest/v1/$table?limit=10000";
  $ch = curl_init($url);
  curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer $SUPABASE_KEY",
    "apikey: $SUPABASE_KEY",
    "Content-Type: application/json"
  ]);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  $response = curl_exec($ch);
  curl_close($ch);
  return json_decode($response, true);
}

// ===== ADMIN_USERS =====
echo "Migrating admin_users...\n";
$data = fetchFromSupabase('admin_users');
if ($data && is_array($data)) {
  foreach ($data as $row) {
    $email = $conn->real_escape_string($row['email'] ?? '');
    $name = $conn->real_escape_string($row['name'] ?? '');
    $role = $conn->real_escape_string($row['role'] ?? 'user');
    $sql = "INSERT IGNORE INTO admin_users (email, name, role) VALUES ('$email', '$name', '$role')";
    $conn->query($sql);
  }
  echo "✅ admin_users migrated\n";
} else echo "⚠️ No admin_users\n";

// ===== CONTACT_INFO =====
echo "Migrating contact_info...\n";
$data = fetchFromSupabase('contact_info');
if ($data && is_array($data)) {
  foreach ($data as $row) {
    $email = $conn->real_escape_string($row['email'] ?? '');
    $phone = $conn->real_escape_string($row['phone'] ?? '');
    $locations = $conn->real_escape_string($row['locations'] ?? '');
    $instagram = $conn->real_escape_string($row['instagram'] ?? '');
    $linkedin = $conn->real_escape_string($row['linkedin'] ?? '');
    $youtube = $conn->real_escape_string($row['youtube'] ?? '');
    $mapurl = $conn->real_escape_string($row['locationmapurl'] ?? '');
    $sql = "INSERT INTO contact_info (email, phone, locations, instagram, linkedin, youtube, locationmapurl)
            VALUES ('$email', '$phone', '$locations', '$instagram', '$linkedin', '$youtube', '$mapurl')";
    $conn->query($sql);
  }
  echo "✅ contact_info migrated\n";
} else echo "⚠️ No contact_info\n";

// ===== CONTACT_MESSAGES =====
echo "Migrating contact_messages...\n";
$data = fetchFromSupabase('contact_messages');
if ($data && is_array($data)) {
  foreach ($data as $row) {
    $name = $conn->real_escape_string($row['name'] ?? '');
    $email = $conn->real_escape_string($row['email'] ?? '');
    $message = $conn->real_escape_string($row['message'] ?? '');
    $sql = "INSERT INTO contact_messages (name, email, message) VALUES ('$name', '$email', '$message')";
    $conn->query($sql);
  }
  echo "✅ contact_messages migrated\n";
} else echo "⚠️ No contact_messages\n";

// ===== CONTENT_SETTINGS =====
echo "Migrating content_settings...\n";
$data = fetchFromSupabase('content_settings');
if ($data && is_array($data)) {
  foreach ($data as $row) {
    $key = $conn->real_escape_string($row['key_name'] ?? $row['key'] ?? '');
    $value = $conn->real_escape_string($row['value'] ?? '');
    $sql = "INSERT IGNORE INTO content_settings (key_name, value) VALUES ('$key', '$value')";
    $conn->query($sql);
  }
  echo "✅ content_settings migrated\n";
} else echo "⚠️ No content_settings\n";

// ===== EVENT_VIDEOS =====
echo "Migrating event_videos...\n";
$data = fetchFromSupabase('event_videos');
if ($data && is_array($data)) {
  foreach ($data as $row) {
    $title = $conn->real_escape_string($row['title'] ?? '');
    $url = $conn->real_escape_string($row['url'] ?? '');
    $youtube_id = $conn->real_escape_string($row['youtube_id'] ?? '');
    $isYoutube = $row['isYoutube'] ?? false ? 1 : 0;
    $sql = "INSERT INTO event_videos (title, url, youtube_id, isYoutube)
            VALUES ('$title', '$url', '$youtube_id', $isYoutube)";
    $conn->query($sql);
  }
  echo "✅ event_videos migrated\n";
} else echo "⚠️ No event_videos\n";

// ===== GALLERY_FOLDERS =====
echo "Migrating gallery_folders...\n";
$data = fetchFromSupabase('gallery_folders');
if ($data && is_array($data)) {
  foreach ($data as $row) {
    $name = $conn->real_escape_string($row['name'] ?? '');
    $desc = $conn->real_escape_string($row['description'] ?? '');
    $sql = "INSERT INTO gallery_folders (name, description) VALUES ('$name', '$desc')";
    $conn->query($sql);
  }
  echo "✅ gallery_folders migrated\n";
} else echo "⚠️ No gallery_folders\n";

// ===== GALLERY_ITEMS =====
echo "Migrating gallery_items...\n";
$data = fetchFromSupabase('gallery_items');
if ($data && is_array($data)) {
  foreach ($data as $row) {
    $folder = $conn->real_escape_string($row['folder_name'] ?? '');
    $url = $conn->real_escape_string($row['image_url'] ?? $row['url'] ?? '');
    $title = $conn->real_escape_string($row['title'] ?? '');
    $sql = "INSERT INTO gallery_items (folder_name, image_url, url, title)
            VALUES ('$folder', '$url', '$url', '$title')";
    $conn->query($sql);
  }
  echo "✅ gallery_items migrated\n";
} else echo "⚠️ No gallery_items\n";

// ===== JOURNAL_POSTS =====
echo "Migrating journal_posts...\n";
$data = fetchFromSupabase('journal_posts');
if ($data && is_array($data)) {
  foreach ($data as $row) {
    $title = $conn->real_escape_string($row['title'] ?? '');
    $content = $conn->real_escape_string($row['content'] ?? '');
    $excerpt = $conn->real_escape_string($row['excerpt'] ?? '');
    $category = $conn->real_escape_string($row['category'] ?? '');
    $date = $conn->real_escape_string($row['date'] ?? date('Y-m-d'));
    $sql = "INSERT INTO journal_posts (title, content, excerpt, category, date)
            VALUES ('$title', '$content', '$excerpt', '$category', '$date')";
    $conn->query($sql);
  }
  echo "✅ journal_posts migrated\n";
} else echo "⚠️ No journal_posts\n";

// ===== PROJECTS =====
echo "Migrating projects...\n";
$data = fetchFromSupabase('projects');
if ($data && is_array($data)) {
  foreach ($data as $row) {
    $name = $conn->real_escape_string($row['name'] ?? $row['title'] ?? '');
    $title = $conn->real_escape_string($row['title'] ?? $row['name'] ?? '');
    $desc = $conn->real_escape_string($row['description'] ?? '');
    $images = isset($row['images']) ? json_encode($row['images']) : '[]';
    $images = $conn->real_escape_string($images);
    $category = $conn->real_escape_string($row['category'] ?? '');
    $location = $conn->real_escape_string($row['location'] ?? '');
    $year = $conn->real_escape_string($row['year'] ?? '');
    $mapurl = $conn->real_escape_string($row['locationmapurl'] ?? '');
    $sql = "INSERT INTO projects (name, title, description, images, category, location, year, locationmapurl)
            VALUES ('$name', '$title', '$desc', '$images', '$category', '$location', '$year', '$mapurl')";
    $conn->query($sql);
  }
  echo "✅ projects migrated\n";
} else echo "⚠️ No projects\n";

echo "\n✅ Migration complete! All data transferred.\n";
$conn->close();
?>
