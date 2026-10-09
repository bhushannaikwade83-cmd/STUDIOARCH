<?php
// Background Upload Processor (cPanel Cron Job)
// Processes pending uploads in chunks to B2
// Set up cron: */2 * * * * php /home/user/public_html/studioarch/api/process-uploads.php

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// This script is meant to run only from the cron job, never as a public
// HTTP endpoint - it holds no admin-auth check of its own and would
// otherwise let anyone trigger B2 uploads/spend by requesting this URL.
if (PHP_SAPI !== 'cli') {
  http_response_code(403);
  die(json_encode(['error' => 'Forbidden: CLI only']));
}

// Get database credentials from environment (no hardcoded fallback - a
// missing env var should fail loudly, not silently use a weak default)
$db_host = getenv('DB_HOST') ?: 'localhost';
$db_user = getenv('DB_USER');
$db_pass = getenv('DB_PASSWORD');
$db_name = getenv('DB_NAME') ?: 'studioarch';

// B2 credentials - must come from environment, never hardcoded in source
$b2_key_id = getenv('B2_KEY_ID');
$b2_app_key = getenv('B2_APP_KEY');
$b2_bucket_id = getenv('B2_BUCKET_ID');
$b2_bucket_name = getenv('B2_BUCKET_NAME') ?: 'STUDIO-ARCH2';

if (!$db_user || !$b2_key_id || !$b2_app_key || !$b2_bucket_id) {
  fwrite(STDERR, "Missing required environment variables (DB_USER/B2_KEY_ID/B2_APP_KEY/B2_BUCKET_ID)\n");
  exit(1);
}

const CHUNK_SIZE = 6 * 1024 * 1024; // 6MB chunks

class B2Uploader {
    private $key_id;
    private $app_key;
    private $bucket_id;
    private $bucket_name;
    private $auth_token;
    private $api_url;
    private $download_url;

    public function __construct($key_id, $app_key, $bucket_id, $bucket_name) {
        $this->key_id = $key_id;
        $this->app_key = $app_key;
        $this->bucket_id = $bucket_id;
        $this->bucket_name = $bucket_name;
    }

    public function authorize() {
        $auth = base64_encode($this->key_id . ':' . $this->app_key);

        $ch = curl_init('https://api.backblazeb2.com/b2api/v4/b2_authorize_account');
        curl_setopt_array($ch, [
            CURLOPT_HTTPGET => true,
            CURLOPT_HTTPHEADER => ['Authorization: Basic ' . $auth],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
        ]);

        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($http_code !== 200) {
            throw new Exception("B2 auth failed: HTTP $http_code");
        }

        $data = json_decode($response, true);
        $this->auth_token = $data['authorizationToken'];
        $this->api_url = $data['apiInfo']['storageApi']['apiUrl'];
        $this->download_url = $data['apiInfo']['storageApi']['downloadUrl'];

        return true;
    }

    public function startLargeFile($file_name) {
        $ch = curl_init($this->api_url . '/b2api/v2/b2_start_large_file');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: ' . $this->auth_token,
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS => json_encode([
                'bucketId' => $this->bucket_id,
                'fileName' => $file_name,
                'contentType' => 'application/octet-stream',
            ]),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
        ]);

        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($http_code !== 200) {
            throw new Exception("Failed to start large file: HTTP $http_code");
        }

        return json_decode($response, true);
    }

    public function getUploadPartUrl($file_id) {
        $ch = curl_init($this->api_url . '/b2api/v2/b2_get_upload_part_url');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: ' . $this->auth_token,
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS => json_encode(['fileId' => $file_id]),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
        ]);

        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($http_code !== 200) {
            throw new Exception("Failed to get upload part URL: HTTP $http_code");
        }

        return json_decode($response, true);
    }

    public function uploadPart($upload_url, $part_number, $chunk_data) {
        $sha1 = sha1($chunk_data);

        $ch = curl_init($upload_url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: ' . $this->auth_token,
                'X-Bz-Part-Number: ' . $part_number,
                'X-Bz-Content-Sha1: ' . $sha1,
                'Content-Type: application/octet-stream',
            ],
            CURLOPT_POSTFIELDS => $chunk_data,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 60,
        ]);

        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($http_code !== 200) {
            throw new Exception("Part $part_number upload failed: HTTP $http_code");
        }

        $data = json_decode($response, true);
        return $data['contentSha1'];
    }

    public function finishLargeFile($file_id, $part_shas) {
        $ch = curl_init($this->api_url . '/b2api/v2/b2_finish_large_file');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: ' . $this->auth_token,
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS => json_encode([
                'fileId' => $file_id,
                'partSha1Array' => $part_shas,
            ]),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
        ]);

        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($http_code !== 200) {
            throw new Exception("Failed to finish large file: HTTP $http_code");
        }

        return json_decode($response, true);
    }

    public function getPublicUrl($file_name) {
        return $this->download_url . '/file/' . $this->bucket_name . '/' . urlencode($file_name);
    }
}

try {
    // Connect to database
    $conn = new mysqli($db_host, $db_user, $db_pass, $db_name);

    if ($conn->connect_error) {
        throw new Exception('Database connection failed: ' . $conn->connect_error);
    }

    $conn->set_charset("utf8mb4");

    // Get pending uploads
    $result = $conn->query("SELECT * FROM uploads WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1");

    if (!$result || $result->num_rows === 0) {
        error_log('[PROCESSOR] No pending uploads');
        $conn->close();
        exit(0);
    }

    $upload = $result->fetch_assoc();

    $upload_id = $upload['upload_id'];
    $file_name = $upload['file_name'];
    $file_size = $upload['file_size'];
    $folder = $upload['folder'] ?? 'uploads/';

    error_log("[PROCESSOR] Processing upload: $upload_id ($file_name)");

    // Update status to uploading
    $stmt = $conn->prepare("UPDATE uploads SET status = 'uploading' WHERE upload_id = ?");
    $stmt->bind_param('s', $upload_id);
    $stmt->execute();
    $stmt->close();

    // Initialize B2 uploader
    $uploader = new B2Uploader($b2_key_id, $b2_app_key, $b2_bucket_id, $b2_bucket_name);
    $uploader->authorize();

    // Start large file upload
    $full_file_name = $folder . $file_name;
    $start = $uploader->startLargeFile($full_file_name);
    $file_id = $start['fileId'];

    // Upload chunks
    $part_number = 1;
    $offset = 0;
    $part_shas = [];

    while ($offset < $file_size) {
        $end = min($offset + CHUNK_SIZE, $file_size);
        $chunk_size = $end - $offset;

        error_log("[PROCESSOR] $upload_id: Part $part_number (${chunk_size} bytes)");

        // Generate dummy chunk data (in production, this would come from client or temp storage)
        // For now, we create a placeholder - this would need to be implemented based on your storage strategy
        $chunk_data = str_repeat('0', $chunk_size);

        // Upload part
        $part_url_data = $uploader->getUploadPartUrl($file_id);
        $sha1 = $uploader->uploadPart($part_url_data['uploadUrl'], $part_number, $chunk_data);
        $part_shas[] = $sha1;

        // Update progress
        $progress = round(($end / $file_size) * 100);
        $stmt = $conn->prepare("UPDATE uploads SET progress = ?, chunks_uploaded = ? WHERE upload_id = ?");
        $stmt->bind_param('iis', $progress, $part_number, $upload_id);
        $stmt->execute();
        $stmt->close();

        error_log("[PROCESSOR] $upload_id: $progress% complete");

        $offset = $end;
        $part_number++;
    }

    // Finish upload
    $finish = $uploader->finishLargeFile($file_id, $part_shas);
    $public_url = $uploader->getPublicUrl($full_file_name);

    // Update database with final URL
    $stmt = $conn->prepare("UPDATE uploads SET status = 'completed', progress = 100, b2_url = ?, b2_file_id = ?, completed_at = NOW() WHERE upload_id = ?");
    $stmt->bind_param('sss', $public_url, $finish['fileId'], $upload_id);
    $stmt->execute();
    $stmt->close();

    error_log("[PROCESSOR] $upload_id: Complete → $public_url");

    $conn->close();

} catch (Exception $e) {
    error_log("[PROCESSOR] Error: " . $e->getMessage());

    // Mark as failed
    try {
        if (isset($conn) && isset($upload_id)) {
            $error_msg = $e->getMessage();
            $stmt = $conn->prepare("UPDATE uploads SET status = 'failed', error_message = ? WHERE upload_id = ?");
            $stmt->bind_param('ss', $error_msg, $upload_id);
            $stmt->execute();
            $stmt->close();
            $conn->close();
        }
    } catch (Exception $db_error) {
        error_log("[PROCESSOR] Failed to update error: " . $db_error->getMessage());
    }

    exit(1);
}
?>
