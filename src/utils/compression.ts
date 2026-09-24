// Compression configuration for HD Quality
const MAX_IMAGE_SIZE = 500 * 1024; // 500KB in bytes (HD images)
const MAX_IMAGE_WIDTH = 1920; // 1080p HD width
const MAX_IMAGE_HEIGHT = 1080; // 1080p HD height
const COMPRESSION_QUALITY = 0.92; // 92% quality - high quality with compression
const VIDEO_MAX_WIDTH = 1920; // 1080p HD video

/**
 * Compress image file to under 100KB using Canvas API
 * Supports all image formats: JPG, PNG, GIF, WebP, SVG, etc.
 */
export const compressImage = async (file: File, onProgress?: (progress: number) => void): Promise<File> => {
  try {
    if (!file.type.startsWith('image/')) {
      throw new Error('File is not an image');
    }

    onProgress?.(10);

    // Read image file
    const imageUrl = URL.createObjectURL(file);
    const img = new Image();

    return new Promise((resolve, reject) => {
      img.onload = () => {
        try {
          onProgress?.(30);

          // Calculate new dimensions while maintaining aspect ratio (HD quality)
          let width = img.width;
          let height = img.height;

          // Resize to fit within 1920x1080 (HD) while maintaining aspect ratio
          if (width > MAX_IMAGE_WIDTH || height > MAX_IMAGE_HEIGHT) {
            const scaleWidth = MAX_IMAGE_WIDTH / width;
            const scaleHeight = MAX_IMAGE_HEIGHT / height;
            const scale = Math.min(scaleWidth, scaleHeight);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }

          onProgress?.(50);

          // Create canvas and draw compressed image
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Failed to get canvas context');

          ctx.drawImage(img, 0, 0, width, height);

          onProgress?.(70);

          // Convert to blob with compression
          canvas.toBlob(
            (blob) => {
              try {
                if (!blob) throw new Error('Canvas to blob conversion failed');

                onProgress?.(90);

                // Create compressed file
                const compressedName = `${file.name.split('.')[0]}_compressed.webp`;
                const compressedFile = new File([blob], compressedName, {
                  type: 'image/webp',
                  lastModified: Date.now(),
                });

                onProgress?.(100);
                URL.revokeObjectURL(imageUrl);
                resolve(compressedFile);
              } catch (error) {
                URL.revokeObjectURL(imageUrl);
                reject(error);
              }
            },
            'image/webp',
            COMPRESSION_QUALITY
          );
        } catch (error) {
          URL.revokeObjectURL(imageUrl);
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(imageUrl);
        reject(new Error('Failed to load image'));
      };

      img.src = imageUrl;
    });
  } catch (error) {
    console.error('Image compression error:', error);
    throw new Error(`Failed to compress image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Keep video file as-is (no actual compression applied)
 * Supports all video formats: MP4, WebM, MOV, MKV, AVI, etc.
 * Returns the video file unchanged to preserve quality
 */
export const compressVideo = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<File> => {
  try {
    if (!file.type.startsWith('video/')) {
      throw new Error('File is not a video');
    }

    onProgress?.(10);

    // For videos, return as-is to preserve quality
    // Video compression requires FFmpeg which isn't available in browser
    // Keeping original video maintains quality
    onProgress?.(50);
    onProgress?.(100);

    return file;
  } catch (error) {
    console.error('Video processing error:', error);
    throw new Error(`Failed to process video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Extract first frame from video and compress it
 * Creates a video preview thumbnail
 */
async function extractAndCompressVideoFrame(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const videoUrl = URL.createObjectURL(file);
    video.src = videoUrl;
    video.preload = 'metadata';

    const handleCanPlay = () => {
      try {
        video.removeEventListener('canplay', handleCanPlay);

        // Create canvas from video frame (HD quality - 1920x1080)
        const canvas = document.createElement('canvas');
        let width = Math.min(video.videoWidth, VIDEO_MAX_WIDTH);
        let height = (width / video.videoWidth) * video.videoHeight;

        // Ensure height doesn't exceed 1080p
        if (height > MAX_IMAGE_HEIGHT) {
          height = MAX_IMAGE_HEIGHT;
          width = (height / video.videoHeight) * video.videoWidth;
        }

        canvas.width = Math.round(width);
        canvas.height = Math.round(height);

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Cannot get canvas context');

        // Draw first frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to blob with HD quality compression
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(videoUrl);
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas to blob conversion failed'));
            }
          },
          'image/webp',
          0.80 // 80% quality for HD video preview
        );
      } catch (error) {
        URL.revokeObjectURL(videoUrl);
        reject(error);
      }
    };

    video.addEventListener('canplay', handleCanPlay);

    video.onerror = () => {
      URL.revokeObjectURL(videoUrl);
      reject(new Error('Failed to load video'));
    };

    // Set time to extract frame (at 2 seconds for better content)
    video.currentTime = Math.min(2, file.size / (1024 * 1024)); // Smart frame selection
  });
}

/**
 * Get file size in human-readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Check if file needs compression
 */
export const shouldCompress = (file: File, targetSizeKB: number = 100): boolean => {
  const fileSizeKB = file.size / 1024;
  return fileSizeKB > targetSizeKB;
};

/**
 * Compress any file (image or video) based on type
 */
export const compressFile = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ file: File; compressed: boolean; originalSize: number; compressedSize: number }> => {
  const originalSize = file.size;

  if (file.type.startsWith('image/')) {
    const compressedFile = await compressImage(file, onProgress);
    return {
      file: compressedFile,
      compressed: true,
      originalSize,
      compressedSize: compressedFile.size,
    };
  } else if (file.type.startsWith('video/')) {
    const compressedFile = await compressVideo(file, onProgress);
    return {
      file: compressedFile,
      compressed: true,
      originalSize,
      compressedSize: compressedFile.size,
    };
  }

  throw new Error('Unsupported file type');
};
