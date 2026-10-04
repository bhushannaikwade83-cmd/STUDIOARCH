#!/usr/bin/env python3
"""
Test uploading video to PHP endpoint using Python
Compare speed with other methods
"""

import os
import sys
import time
import requests
from pathlib import Path

# Config
PHP_ENDPOINT = "https://digitrixmedia.com/studioarch/api/test-upload.php"
# For local testing: use http://localhost:5173/api/test-upload.php or setup local PHP server

def find_test_video():
    """Find a test video to upload"""
    possible_paths = [
        "/Users/bhushan/Desktop/PROJECTS/studioarch-main2/test_video.mp4",
        os.path.expanduser("~/Downloads/video.mp4"),
        os.path.expanduser("~/Downloads/sample.mp4"),
        os.path.expanduser("~/Videos/test.mp4"),
    ]

    for path in possible_paths:
        if os.path.exists(path):
            return path

    return None

def upload_video(video_path, endpoint=PHP_ENDPOINT):
    """Upload video to PHP endpoint"""
    if not os.path.exists(video_path):
        print(f"❌ Video not found: {video_path}")
        return None

    file_size = os.path.getsize(video_path)
    filename = os.path.basename(video_path)

    print(f"\n📹 Uploading: {filename}")
    print(f"📊 Size: {file_size / 1024 / 1024:.1f}MB")
    print(f"🌐 Endpoint: {endpoint}")

    try:
        # Upload with progress
        start_time = time.time()

        with open(video_path, 'rb') as f:
            files = {'file': f}
            response = requests.post(endpoint, files=files, timeout=300)

        upload_time = time.time() - start_time

        if response.status_code != 200:
            print(f"❌ Upload failed: HTTP {response.status_code}")
            print(f"   Response: {response.text}")
            return None

        result = response.json()

        if not result.get('success'):
            print(f"❌ Error: {result.get('error')}")
            return None

        print(f"\n✅ Upload successful!")
        print(f"   Filename: {result.get('filename')}")
        print(f"   Size: {result.get('size') / 1024 / 1024:.1f}MB")
        print(f"   URL: {result.get('url')}")
        print(f"⏱️  Upload time: {upload_time:.2f}s")
        print(f"📊 Speed: {file_size / 1024 / 1024 / upload_time:.1f}MB/s")

        return result

    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def main():
    """Main test"""
    print("=" * 70)
    print("🐍 PYTHON VIDEO UPLOAD TEST (to PHP endpoint)")
    print("=" * 70)

    # Find test video
    video_path = find_test_video()

    if not video_path:
        print("\n❌ No test video found!")
        print("\n📝 Steps:")
        print("  1. Get a test video (any MP4 file)")
        print("  2. Place it at: ~/Downloads/video.mp4")
        print("  3. Run this script again")
        print("\n💡 Or specify video path:")
        print("  python3 test_upload_python.py /path/to/video.mp4")
        return

    # Get endpoint from args if provided
    endpoint = PHP_ENDPOINT
    if len(sys.argv) > 2:
        endpoint = sys.argv[2]

    print(f"\n📹 Using video: {video_path}")

    # Test upload
    result = upload_video(video_path, endpoint)

    if result:
        print("\n" + "=" * 70)
        print("✅ TEST COMPLETE - Python uploaded successfully!")
        print("=" * 70)
    else:
        print("\n" + "=" * 70)
        print("❌ TEST FAILED")
        print("=" * 70)

if __name__ == "__main__":
    # Usage: python3 test_upload_python.py [video_path] [endpoint]
    if len(sys.argv) > 1:
        video_path = sys.argv[1]
    else:
        video_path = find_test_video()

    if video_path:
        endpoint = sys.argv[2] if len(sys.argv) > 2 else PHP_ENDPOINT
        upload_video(video_path, endpoint)
    else:
        main()
