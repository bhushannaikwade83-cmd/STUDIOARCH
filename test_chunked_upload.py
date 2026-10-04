#!/usr/bin/env python3
"""
Test chunked video upload using Python
Upload in 25MB chunks like the frontend
"""

import os
import sys
import time
import uuid
import requests
from pathlib import Path

# Config
CHUNK_SIZE = 25 * 1024 * 1024  # 25MB chunks
API_BASE = "https://digitrixmedia.com/studioarch"
UPLOAD_ENDPOINT = f"{API_BASE}/api/upload-chunk.php"

def upload_chunks(video_path, token=None):
    """Upload video in 25MB chunks"""
    if not os.path.exists(video_path):
        print(f"❌ Video not found: {video_path}")
        return None

    # If no token provided, ask user
    if not token:
        print("❌ JWT token required!")
        print("\n📝 To get token:")
        print("  1. Login to admin panel")
        print("  2. Open browser console (F12)")
        print("  3. Run: localStorage.getItem('studioarch_jwt_token')")
        print("  4. Copy token")
        token = input("\n🔑 Paste JWT token: ").strip()
        if not token:
            print("❌ Token required!")
            return None

    file_size = os.path.getsize(video_path)
    filename = os.path.basename(video_path)
    total_chunks = (file_size + CHUNK_SIZE - 1) // CHUNK_SIZE

    print(f"\n{'='*70}")
    print(f"🐍 PYTHON CHUNKED UPLOAD TEST")
    print(f"{'='*70}")
    print(f"\n📹 Video: {filename}")
    print(f"📊 Size: {file_size / 1024 / 1024:.1f}MB")
    print(f"📦 Chunks: {total_chunks} x {CHUNK_SIZE / 1024 / 1024:.0f}MB")

    # Generate upload ID
    upload_id = f"upload_{int(time.time())}_{uuid.uuid4().hex[:8]}"

    print(f"🆔 Upload ID: {upload_id}")
    print(f"🌐 Endpoint: {UPLOAD_ENDPOINT}")

    upload_start = time.time()
    chunk_times = []

    # Upload each chunk
    try:
        with open(video_path, 'rb') as f:
            for chunk_index in range(total_chunks):
                chunk_start = time.time()

                # Read chunk
                chunk_data = f.read(CHUNK_SIZE)
                chunk_size = len(chunk_data)

                # Prepare multipart form data
                files = {'chunk': ('chunk', chunk_data)}
                data = {
                    'uploadId': upload_id,
                    'chunkIndex': str(chunk_index),
                    'totalChunks': str(total_chunks),
                    'fileName': filename
                }

                # Upload chunk
                print(f"\n⬆️  Uploading chunk {chunk_index + 1}/{total_chunks}...", end='', flush=True)

                headers = {'Authorization': f'Bearer {token}'}
                response = requests.post(UPLOAD_ENDPOINT, files=files, data=data, headers=headers, timeout=300)

                chunk_time = time.time() - chunk_start
                chunk_times.append(chunk_time)

                if response.status_code != 200:
                    print(f"\n❌ Chunk upload failed: HTTP {response.status_code}")
                    print(f"   Response: {response.text[:200]}")
                    return None

                result = response.json()
                if not result.get('success'):
                    print(f"\n❌ Error: {result.get('error')}")
                    return None

                speed = chunk_size / 1024 / 1024 / chunk_time
                print(f" ✅ {chunk_size / 1024 / 1024:.1f}MB in {chunk_time:.1f}s ({speed:.1f}MB/s)")

        total_upload_time = time.time() - upload_start

        print(f"\n{'='*70}")
        print(f"✅ ALL CHUNKS UPLOADED!")
        print(f"{'='*70}")
        print(f"⏱️  Total upload time: {total_upload_time:.2f}s")
        print(f"📊 Average speed: {file_size / 1024 / 1024 / total_upload_time:.1f}MB/s")

        # Call finalize
        print(f"\n🔄 Calling finalize endpoint...")
        finalize_start = time.time()

        finalize_url = f"{UPLOAD_ENDPOINT}?action=finalize&uploadId={upload_id}"
        finalize_response = requests.get(finalize_url, headers=headers, timeout=600)

        finalize_time = time.time() - finalize_start

        if finalize_response.status_code != 200:
            print(f"❌ Finalize failed: HTTP {finalize_response.status_code}")
            print(f"   Response: {finalize_response.text[:200]}")
            return None

        finalize_result = finalize_response.json()
        if not finalize_result.get('success'):
            print(f"❌ Error: {finalize_result.get('error')}")
            return None

        final_url = finalize_result.get('data', {}).get('url')
        final_filename = finalize_result.get('filename')

        print(f"✅ Finalize complete!")
        print(f"⏱️  Finalize time: {finalize_time:.2f}s")
        print(f"📹 Final file: {final_filename}")
        print(f"🔗 URL: {final_url}")

        # Summary
        print(f"\n{'='*70}")
        print(f"📊 SUMMARY")
        print(f"{'='*70}")
        print(f"File size:      {file_size / 1024 / 1024:.1f}MB")
        print(f"Total chunks:   {total_chunks}")
        print(f"Avg chunk time: {sum(chunk_times) / len(chunk_times):.2f}s")
        print(f"Upload time:    {total_upload_time:.2f}s ({file_size / 1024 / 1024 / total_upload_time:.1f}MB/s)")
        print(f"Finalize time:  {finalize_time:.2f}s")
        print(f"TOTAL TIME:     {total_upload_time + finalize_time:.2f}s")
        print(f"{'='*70}")

        return {
            'upload_id': upload_id,
            'filename': final_filename,
            'url': final_url,
            'upload_time': total_upload_time,
            'finalize_time': finalize_time,
            'total_time': total_upload_time + finalize_time
        }

    except Exception as e:
        print(f"\n❌ Error: {e}")
        return None

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 test_chunked_upload.py <video_path>")
        print("\nExample:")
        print("  python3 test_chunked_upload.py ~/Downloads/video.mp4")
        return

    video_path = sys.argv[1]
    upload_chunks(video_path)

if __name__ == "__main__":
    main()
