import React, { useState, useEffect } from 'react';

interface Upload {
  uploadId: string;
  projectId: number;
  fileName: string;
  fileSize?: number;
  progress: number;
  status: 'uploading' | 'reassembling' | 'completed' | 'failed';
  error?: string;
  createdAt: string;
  videoUrl?: string;
}

export function UploadProgressTracker() {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch uploads periodically
  useEffect(() => {
    const fetchUploads = async () => {
      try {
        const token = localStorage.getItem('studioarch_jwt_token');
        const response = await fetch(
          'https://digitrixmedia.com/studioarch/api/upload-tracker.php?action=get',
          {
            headers: {
              'Authorization': `Bearer ${token || ''}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.uploads) {
            setUploads(data.uploads);
          }
        }
      } catch (err) {
        console.error('Failed to fetch uploads:', err);
      }
    };

    // Fetch immediately and then every 2 seconds
    fetchUploads();
    const interval = setInterval(fetchUploads, 2000);

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
        return '⬆️';
      case 'reassembling':
        return '🔄';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '📹';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploading':
        return 'bg-blue-500';
      case 'reassembling':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const activeUploads = uploads.filter(
    u => u.status === 'uploading' || u.status === 'reassembling'
  );
  const completedUploads = uploads.filter(
    u => u.status === 'completed' || u.status === 'failed'
  );

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg"
        title="Upload Progress"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3v-6" />
        </svg>
      </button>

      {/* Notification Badge */}
      {activeUploads.length > 0 && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
          {activeUploads.length}
        </div>
      )}

      {/* Panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 max-h-96 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-lg font-bold mb-4 text-gray-900">📤 Upload Progress</h3>

            {/* Active Uploads */}
            {activeUploads.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  {activeUploads.length} Uploading
                </h4>
                {activeUploads.map(upload => (
                  <div
                    key={upload.uploadId}
                    className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    {/* File Info */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {upload.fileName}
                        </p>
                        <p className="text-xs text-gray-500">
                          Project ID: {upload.projectId}
                        </p>
                      </div>
                      <span className="text-lg ml-2">{getStatusIcon(upload.status)}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-gray-700">
                          {upload.status === 'reassembling' ? 'Reassembling...' : 'Uploading'}
                        </span>
                        <span className="text-xs font-bold text-gray-900">{upload.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`${getStatusColor(
                            upload.status
                          )} h-full rounded-full transition-all duration-300`}
                          style={{ width: `${upload.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Error */}
                    {upload.error && (
                      <p className="text-xs text-red-600 mt-1">{upload.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Completed Uploads */}
            {completedUploads.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Recent Uploads
                </h4>
                {completedUploads.slice(0, 5).map(upload => (
                  <div
                    key={upload.uploadId}
                    className={`mb-2 p-2 rounded-lg text-xs ${
                      upload.status === 'completed'
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{getStatusIcon(upload.status)}</span>
                      <span className="flex-1 ml-2 truncate text-gray-900 font-medium">
                        {upload.fileName}
                      </span>
                      <span
                        className={`${
                          upload.status === 'completed' ? 'text-green-600' : 'text-red-600'
                        } font-bold`}
                      >
                        {upload.status === 'completed' ? 'Done' : 'Failed'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {uploads.length === 0 && (
              <p className="text-center text-gray-500 text-sm">No uploads yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
