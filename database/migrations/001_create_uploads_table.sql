-- Create uploads table for background upload queue system
-- Run this in your database: mysql -u user -p database < this_file.sql

CREATE TABLE IF NOT EXISTS uploads (
  id INT PRIMARY KEY AUTO_INCREMENT,
  upload_id VARCHAR(255) UNIQUE NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  b2_file_id VARCHAR(255),
  b2_url VARCHAR(2048),
  status VARCHAR(50) DEFAULT 'pending',
  progress INT DEFAULT 0,
  chunks_total INT,
  chunks_uploaded INT DEFAULT 0,
  folder VARCHAR(255) DEFAULT 'uploads/',
  b2_part_shas JSON,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  project_id INT,
  field_name VARCHAR(100),

  KEY idx_status (status),
  KEY idx_upload_id (upload_id),
  KEY idx_project_id (project_id),
  KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
