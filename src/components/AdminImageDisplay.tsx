import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface AdminImageDisplayProps {
  src: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}

/**
 * Display image with error handling and fallback
 * Shows placeholder if image fails to load
 */
export function AdminImageDisplay({ src, alt, className = 'w-full h-full object-cover', loading = 'eager' }: AdminImageDisplayProps) {
  const [hasError, setHasError] = useState(false);

  if (!src) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-stone-800">
        <ImageIcon size={24} className="text-stone-600" />
      </div>
    );
  }

  return (
    <>
      {hasError && (
        <div className="w-full h-full flex items-center justify-center bg-stone-800">
          <div className="text-center">
            <ImageIcon size={24} className="text-stone-600 mx-auto mb-2" />
            <p className="text-xs text-stone-500">Failed to load</p>
          </div>
        </div>
      )}
      {!hasError && (
        <img
          src={src}
          alt={alt}
          className={className}
          loading={loading}
          crossOrigin="anonymous"
          onError={() => {
            console.error('❌ Image failed to load:', src);
            setHasError(true);
          }}
        />
      )}
    </>
  );
}
