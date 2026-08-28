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
