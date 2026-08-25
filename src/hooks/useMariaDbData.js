/**
 * MariaDB Data Hooks
 * Replaces Supabase hooks with API-based data fetching from MariaDB
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiCall } from '../utils/api';
import { getToken } from '../utils/auth';

// Alias for backwards compatibility
export const useSupabaseTable = useMariaDbTable;

// Generic hook to fetch data from MariaDB API
export function useMariaDbTable(endpoint, options = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      console.log(`📥 [API Fetch] Starting fetch from "${endpoint}":`);
      const result = await apiCall(endpoint);
      setData(Array.isArray(result) ? result : result.data || []);
      setError(null);
      console.log(`✅ [API Fetch] Success from "${endpoint}":`, result);
    } catch (err) {
      console.error(`❌ [API Fetch] Error from "${endpoint}":`, err.message);
      setError(err.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

// Projects hook
export function useProjects() {
  const { data, loading, error, refetch } = useMariaDbTable('/projects');

  // Parse images JSON field
  const parsedData = useMemo(() => {
    return data.map(project => {
      try {
        const images = project.images
          ? (typeof project.images === 'string' ? JSON.parse(project.images) : project.images)
          : null;
        return { ...project, images };
      } catch (e) {
        console.warn(`Failed to parse images for project ${project.id}:`, e);
        return { ...project, images: null };
      }
    });
  }, [data]);

  return { data: parsedData, loading, error, refetch };
}

// Event Videos hook
export function useEventVideos() {
  return useMariaDbTable('/event-videos');
}

// Journal Posts hook
export function useJournalPosts() {
  return useMariaDbTable('/journal-posts');
}

// Contact Messages hook
export function useContactMessages() {
  return useMariaDbTable('/contact-messages');
}

// Gallery hook
export function useGallery() {
  const { data, loading, error, refetch } = useMariaDbTable('/gallery-items');
  return { data: data || [], galleryFolders: [], loading, error, refetch };
}

// Content Settings hook
export function useContentSettings() {
  const { data, loading, error } = useMariaDbTable('/content-settings');
  return { settings: data || {}, loading, error };
}

// Contact Info hook
export function useContactInfo() {
  const [contactInfo, setContactInfo] = useState({
    email: 'inquiry@1studioarch.com',
    phone: '+44 (0) 20 1234 5678',
    locations: 'London, UK\nNew York, USA\nSingapore, SG',
    instagram: '#',
    linkedin: '#',
    youtube: '#',
  });

  const fetchContactInfo = useCallback(async () => {
    try {
      console.log('📥 [API] Fetching contact info');
      const result = await apiCall('/contact-info');
      if (result && result.length > 0) {
        setContactInfo(result[0]);
      }
    } catch (err) {
      console.error('⚠️ [API] Using default contact info:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchContactInfo();
  }, [fetchContactInfo]);

  return { contactInfo, refetch: fetchContactInfo };
}

// Send contact message
export async function sendContactMessage(name, email, message) {
  try {
    console.log('📤 [API] Sending contact message:', { name, email });
    const result = await apiCall('/contact-messages', {
      method: 'POST',
      body: JSON.stringify({ name, email, message }),
    });
    console.log('✅ [API] Message sent successfully');
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ [API] Failed to send message:', error.message);
    return { success: false, error: error.message };
  }
}

// Admin Auth hook
export function useAdminAuth() {
  return {
    loginWithSupabase: async (email, password) => {
      try {
        const apiBase = import.meta.env.VITE_API_URL
          ? `${import.meta.env.VITE_API_URL}/studioarch/api`
          : 'https://digitrixmedia.com/studioarch/api';
        const result = await fetch(`${apiBase}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await result.json();
        if (!result.ok) throw new Error(data.error || 'Login failed');
        localStorage.setItem('studioarch_jwt_token', data.token);
        return { success: true, user: data.user };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    logout: async () => {
      localStorage.removeItem('studioarch_jwt_token');
    },
    restoreSession: async () => {
      const token = localStorage.getItem('studioarch_jwt_token');
      return token ? { success: true, user: { email: 'admin' } } : { success: false };
    },
  };
}

// Mutation hook for create/update/delete
export function useSupabaseMutation() {
  return {
    insert: async (table, data) => {
      console.log(`📤 [API Insert] ${table}:`, data);
      return await apiCall(`/${table}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (table, id, data) => {
      console.log(`📝 [API Update] ${table}/${id}:`, data);
      return await apiCall(`/${table}?id=${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    remove: async (table, id) => {
      console.log(`🗑️ [API Delete] ${table}/${id}`);
      return await apiCall(`/${table}?id=${id}`, {
        method: 'DELETE',
      });
    },
  };
}
