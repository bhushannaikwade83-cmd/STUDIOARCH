/**
 * MariaDB Data Hooks
 * Replaces Supabase hooks with API-based data fetching from MariaDB
 */

import { useState, useEffect, useCallback } from 'react';
import { apiCall } from '../utils/api';
import { getToken } from '../utils/auth';

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
  return useMariaDbTable('/projects');
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

// Admin Auth hook
export function useAdminAuth() {
  return {
    loginWithSupabase: async (email, password) => {
      try {
        const result = await fetch('https://digitrixmedia.com/studioarch/api/auth/login', {
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
      return await apiCall(`/${table}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    remove: async (table, id) => {
      console.log(`🗑️ [API Delete] ${table}/${id}`);
      return await apiCall(`/${table}/${id}`, {
        method: 'DELETE',
      });
    },
  };
}
