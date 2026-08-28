import { useState } from 'react';

export default function Upload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleUpload = async () => {
    if (!file) {
      setError('Select a file first!');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const response = await fetch('https://digitrixmedia.com/studioarch/api/upload', {
        method: 'POST',
        headers: {
          'X-File-Name': file.name,
          'X-File-Type': 'gallery',
          'Content-Type': file.type,
        },
        body: arrayBuffer,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
      setFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white rounded-lg shadow">
      <h1 className="text-3xl font-bold mb-6">📤 File Upload</h1>

      {/* Upload Section */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-6">
        <input
          type="file"
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            setError(null);
          }}
          disabled={uploading}
          className="w-full"
        />
        <p className="text-sm text-gray-500 mt-2">Images & Videos up to 500MB</p>
      </div>

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={uploading || !file}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400"
      >
        {uploading ? '⏳ Uploading...' : '🚀 Upload File'}
      </button>

      {/* Error Message */}
      {error && <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>}

      {/* Success Result */}
      {result && (
        <div className="mt-6 p-4 bg-green-100 rounded-lg">
          <h2 className="text-lg font-bold text-green-800 mb-4">✅ Upload Success!</h2>

          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">File URL:</p>
              <input
                type="text"
                value={result.url}
                readOnly
                className="w-full p-2 bg-white border rounded mt-1 font-mono text-sm"
              />
              <button
                onClick={() => navigator.clipboard.writeText(result.url)}
                className="mt-2 px-4 py-1 bg-green-600 text-white rounded text-sm"
              >
                📋 Copy URL
              </button>
            </div>

            <div>
              <p className="text-sm text-gray-600">File Name:</p>
              <input
                type="text"
                value={result.fileName}
                readOnly
                className="w-full p-2 bg-white border rounded mt-1 font-mono text-sm"
              />
            </div>

            <div>
              <p className="text-sm text-gray-600">File Size:</p>
              <p className="text-sm font-mono">{(result.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
          </div>

          <button
            onClick={() => setResult(null)}
            className="mt-4 w-full px-4 py-2 bg-gray-300 rounded"
          >
            Upload Another File
          </button>
        </div>
      )}
    </div>
  );
}
