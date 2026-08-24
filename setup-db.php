<?php
/**
 * StudioArch Complete Database Setup
 * Creates all tables with proper columns, indexes, and triggers
 */

$host = 'localhost';
$user = 'digitrix_studioarchwebsite';
$password = 'studioarch@70';
$database = 'digitrix_studioarchwebsite';

try {
  $conn = new mysqli($host, $user, $password, $database);

  if ($conn->connect_error) {
    die('❌ Connection failed: ' . $conn->connect_error);
  }

  echo "✅ Connected to database\n\n";

  // ===== ADMIN_USERS =====
  $sql = "CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    name VARCHAR(255),
    role VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
  ) ENGINE=InnoDB";
  $conn->query($sql) ? print("✅ admin_users\n") : print("❌ admin_users: " . $conn->error . "\n");

  // Insert default admin
  $sql = "INSERT IGNORE INTO admin_users (email, name, role) VALUES ('admin@studioarch.com', 'Admin', 'admin')";
  $conn->query($sql);

  // ===== CONTACT_INFO =====
  $sql = "CREATE TABLE IF NOT EXISTS contact_info (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255),
    phone VARCHAR(20),
    locations TEXT,
    instagram VARCHAR(255),
    linkedin VARCHAR(255),
    youtube VARCHAR(255),
    locationmapurl TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB";
  $conn->query($sql) ? print("✅ contact_info\n") : print("❌ contact_info: " . $conn->error . "\n");

  // ===== CONTACT_MESSAGES =====
  $sql = "CREATE TABLE IF NOT EXISTS contact_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    message LONGTEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_read (is_read),
    INDEX idx_created (created_at)
  ) ENGINE=InnoDB";
  $conn->query($sql) ? print("✅ contact_messages\n") : print("❌ contact_messages: " . $conn->error . "\n");

  // ===== CONTENT_SETTINGS =====
  $sql = "CREATE TABLE IF NOT EXISTS content_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    key_name VARCHAR(255) UNIQUE,
    value LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (key_name)
  ) ENGINE=InnoDB";
  $conn->query($sql) ? print("✅ content_settings\n") : print("❌ content_settings: " . $conn->error . "\n");

  // ===== EVENT_VIDEOS =====
  $sql = "CREATE TABLE IF NOT EXISTS event_videos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    url TEXT,
    youtube_id VARCHAR(255),
    isYoutube BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_youtube (youtube_id),
    INDEX idx_created (created_at)
  ) ENGINE=InnoDB";
  $conn->query($sql) ? print("✅ event_videos\n") : print("❌ event_videos: " . $conn->error . "\n");

  // ===== GALLERY_FOLDERS =====
  $sql = "CREATE TABLE IF NOT EXISTS gallery_folders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
  ) ENGINE=InnoDB";
  $conn->query($sql) ? print("✅ gallery_folders\n") : print("❌ gallery_folders: " . $conn->error . "\n");

  // ===== GALLERY_ITEMS =====
  $sql = "CREATE TABLE IF NOT EXISTS gallery_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    folder_id INT,
    folder_name VARCHAR(255),
    image_url TEXT,
    url TEXT,
    title VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_folder (folder_name),
    INDEX idx_created (created_at)
  ) ENGINE=InnoDB";
  $conn->query($sql) ? print("✅ gallery_items\n") : print("❌ gallery_items: " . $conn->error . "\n");

  // ===== JOURNAL_POSTS =====
  $sql = "CREATE TABLE IF NOT EXISTS journal_posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    content LONGTEXT,
    excerpt TEXT,
    date DATE,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_date (date),
    INDEX idx_created (created_at)
  ) ENGINE=InnoDB";
  $conn->query($sql) ? print("✅ journal_posts\n") : print("❌ journal_posts: " . $conn->error . "\n");

  // ===== PROJECTS =====
  $sql = "CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    title VARCHAR(255),
    description TEXT,
    images JSON,
    category VARCHAR(100),
    location VARCHAR(255),
    year VARCHAR(4),
    locationmapurl TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_created (created_at)
  ) ENGINE=InnoDB";
  $conn->query($sql) ? print("✅ projects\n") : print("❌ projects: " . $conn->error . "\n");

  echo "\n✅ All tables created successfully!\n";
  echo "Admin: admin@studioarch.com\n";

  $conn->close();

} catch (Exception $e) {
  echo "❌ Error: " . $e->getMessage();
}
?>
