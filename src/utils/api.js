// API Client with JWT Auth

import { getToken } from './auth.js';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/studioarch/api`
  : 'https://digitrixmedia.com/studioarch/api';

console.log('🔧 [API] Environment:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  API_BASE: API_BASE,
  allEnv: import.meta.env
});

export async function apiCall(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint}`;
  console.log(`📡 [API] ${options.method || 'GET'} ${endpoint}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error(`❌ [API] Error ${response.status}:`, error);
      throw new Error(error.error || `API Error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ [API] Success`);
    return data;
  } catch (error) {
    console.error(`❌ [API] Exception:`, error.message);
    throw error;
  }
}

// Data Fetching

export async function getProjects() {
  return apiCall('/projects');
}

export async function createProject(data) {
  return apiCall('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProject(id, data) {
  return apiCall(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteProject(id) {
  return apiCall(`/projects/${id}`, { method: 'DELETE' });
}

export async function getEventVideos() {
  return apiCall('/event-videos');
}

export async function createEventVideo(data) {
  return apiCall('/event-videos', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteEventVideo(id) {
  return apiCall(`/event-videos/${id}`, { method: 'DELETE' });
}

export async function getJournalPosts() {
  return apiCall('/journal-posts');
}

export async function createJournalPost(data) {
  return apiCall('/journal-posts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateJournalPost(id, data) {
  return apiCall(`/journal-posts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteJournalPost(id) {
  return apiCall(`/journal-posts/${id}`, { method: 'DELETE' });
}

export async function getContactMessages() {
  return apiCall('/contact-messages');
}

export async function createContactMessage(data) {
  return apiCall('/contact-messages', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteContactMessage(id) {
  return apiCall(`/contact-messages/${id}`, { method: 'DELETE' });
}

export async function getContactInfo() {
  return apiCall('/contact-info');
}

export async function updateContactInfo(data) {
  return apiCall('/contact-info', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getContentSettings() {
  return apiCall('/content-settings');
}

export async function updateContentSettings(data) {
  return apiCall('/content-settings', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Gallery endpoints
export async function getGallery() {
  return apiCall('/gallery-items');
}

export async function createGalleryFolder(data) {
  // Gallery doesn't have separate folder creation - just return a temp ID
  return { success: true, id: Date.now() };
}

export async function deleteGalleryFolder(id) {
  // Gallery doesn't have folder deletion endpoint
  return { success: true };
}

export async function createGalleryItem(data) {
  return apiCall('/gallery-items', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteGalleryItem(id) {
  return apiCall(`/gallery-items?id=${id}`, { method: 'DELETE' });
}

// Chunked upload for large files (100MB+)
const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
const MAX_PARALLEL_CHUNKS = 4;

export async function uploadFileChunked(file, endpoint, onProgress) {
  const token = getToken();
  const headers = {
    'Authorization': token ? `Bearer ${token}` : '',
  };

  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const uploadId = Date.now().toString();
  let uploadedBytes = 0;

  // Upload chunks in parallel (4 at a time)
  const uploadChunk = async (chunkIndex) => {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('file', chunk);
    formData.append('uploadId', uploadId);
    formData.append('chunkIndex', chunkIndex);
    formData.append('totalChunks', totalChunks);
    formData.append('fileName', file.name);

    const url = `${API_BASE}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': headers.Authorization },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Upload failed: ${response.status}`);
    }

    uploadedBytes += chunk.size;
    const progress = Math.round((uploadedBytes / file.size) * 100);
    onProgress?.(progress);

    return response.json();
  };

  // Upload in batches of MAX_PARALLEL_CHUNKS
  const results = [];
  for (let i = 0; i < totalChunks; i += MAX_PARALLEL_CHUNKS) {
    const batch = [];
    for (let j = i; j < Math.min(i + MAX_PARALLEL_CHUNKS, totalChunks); j++) {
      batch.push(uploadChunk(j));
    }
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
  }

  return results[results.length - 1]; // Return final response
}
