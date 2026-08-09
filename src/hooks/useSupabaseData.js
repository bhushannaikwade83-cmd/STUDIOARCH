import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Generic hook to fetch data from Supabase table
 * @param {string} table - Table name
 * @param {object} options - Query options (filters, ordering, etc.)
 * @returns {object} - { data, loading, error, refetch }
 */
export function useSupabaseTable(table, options = {}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)

      console.log(`📥 [Supabase Fetch] Starting fetch from "${table}":`, {
        table,
        options,
        timestamp: new Date().toISOString()
      })

      let query = supabase.from(table).select(options.select || '*')

      // Apply filters
      if (options.filters) {
        console.log(`🔍 [Supabase Fetch] Applying filters:`, options.filters)
        Object.entries(options.filters).forEach(([key, value]) => {
          query = query.eq(key, value)
        })
      }

      // Apply ordering
      if (options.orderBy) {
        console.log(`📊 [Supabase Fetch] Applying order:`, {
          orderBy: options.orderBy,
          ascending: options.ascending !== false
        })
        query = query.order(options.orderBy, {
          ascending: options.ascending !== false,
        })
      }

      // Apply limit
      if (options.limit) {
        console.log(`⛔ [Supabase Fetch] Applying limit:`, options.limit)
        query = query.limit(options.limit)
      }

      const { data: result, error: err } = await query

      if (err) {
        console.error(`❌ [Supabase Fetch] Supabase error from "${table}":`, {
          table,
          error: err,
          message: err.message,
          code: err.code,
          timestamp: new Date().toISOString()
        })
        throw err
      }

      console.log(`✅ [Supabase Fetch] Success from "${table}":`, {
        table,
        recordCount: result?.length || 0,
        firstRecord: result?.[0],
        timestamp: new Date().toISOString()
      })

      setData(result || [])
    } catch (err) {
      console.error(`❌ [Supabase Fetch] Exception from "${table}":`, {
        table,
        errorMessage: err.message,
        fullError: err,
        timestamp: new Date().toISOString()
      })
      setError(err.message || 'Failed to fetch data')
      setData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [table, JSON.stringify(options)])

  return { data, loading, error, refetch: fetchData }
}

/**
 * Hook to fetch all projects
 */
export function useProjects() {
  return useSupabaseTable('projects', {
    orderBy: 'display_order',
    ascending: true,
  })
}

/**
 * Hook to fetch project by ID
 */
export function useProjectById(id) {
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetch() {
      try {
        setLoading(true)
        const { data, error: err } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .single()

        if (err) throw err
        setProject(data)
      } catch (err) {
        console.error('Error fetching project:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (id) fetch()
  }, [id])

  return { project, loading, error }
}

/**
 * Hook to fetch gallery with folders and items
 */
export function useGallery() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = async () => {
    try {
      setLoading(true)
      const { data: folders, error: err } = await supabase
        .from('gallery_folders')
        .select('*, gallery_items(*)')
        .order('display_order', { ascending: true })

      if (err) throw err
      setData(folders || [])
    } catch (err) {
      console.error('Error fetching gallery:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refetch()
  }, [])

  return { data, loading, error, refetch }
}

/**
 * Hook to fetch event videos
 */
export function useEventVideos() {
  return useSupabaseTable('event_videos', {
    orderBy: 'display_order',
    ascending: true,
  })
}

/**
 * Hook to fetch journal posts
 */
export function useJournalPosts() {
  return useSupabaseTable('journal_posts', {
    orderBy: 'created_at',
    ascending: false,
  })
}

/**
 * Hook to fetch contact messages
 */
export function useContactMessages() {
  return useSupabaseTable('contact_messages', {
    orderBy: 'created_at',
    ascending: false,
  })
}

/**
 * Hook to fetch content settings
 */
export function useContentSettings() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetch() {
      try {
        setLoading(true)
        const { data, error: err } = await supabase
          .from('content_settings')
          .select('*')
          .single()

        if (err && err.code !== 'PGRST116') throw err // PGRST116 = no rows
        setSettings(data || null)
      } catch (err) {
        console.error('Error fetching settings:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetch()
  }, [])

  return { settings, loading, error }
}

/**
 * Hook for mutation operations (INSERT, UPDATE, DELETE)
 */
export function useSupabaseMutation() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function insert(table, data) {
    try {
      setLoading(true)
      setError(null)

      console.log(`📤 [Supabase Insert] Starting insert into "${table}":`, {
        table,
        dataKeys: Object.keys(data),
        dataSize: JSON.stringify(data).length,
        timestamp: new Date().toISOString()
      })
      console.log(`📋 [Supabase Insert] Data:`, data)

      const { data: result, error: err } = await supabase
        .from(table)
        .insert([data])
        .select()

      if (err) {
        console.error(`❌ [Supabase Insert] Supabase error:`, {
          table,
          error: err,
          message: err.message,
          code: err.code,
          timestamp: new Date().toISOString()
        })
        throw err
      }

      console.log(`✅ [Supabase Insert] Success:`, {
        table,
        insertedRecords: result?.length,
        firstRecord: result?.[0],
        timestamp: new Date().toISOString()
      })

      return { success: true, data: result }
    } catch (err) {
      console.error(`❌ [Supabase Insert] Exception:`, {
        table,
        errorMessage: err.message,
        fullError: err,
        timestamp: new Date().toISOString()
      })
      setError(err.message || 'Insert failed')
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  async function update(table, id, data) {
    try {
      setLoading(true)
      setError(null)
      const { data: result, error: err } = await supabase
        .from(table)
        .update(data)
        .eq('id', id)
        .select()

      if (err) throw err
      if (!result?.length) {
        throw new Error('Update failed')
      }
      return { success: true, data: result }
    } catch (err) {
      console.error(`Error updating ${table}:`, err)
      setError(err.message || 'Update failed')
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  async function remove(table, id) {
    try {
      setLoading(true)
      setError(null)
      const { error: err } = await supabase.from(table).delete().eq('id', id)

      if (err) throw err
      return { success: true }
    } catch (err) {
      console.error(`Error deleting from ${table}:`, err)
      setError(err.message || 'Delete failed')
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  return { insert, update, remove, loading, error }
}

/**
 * Hook for storage operations (file uploads)
 */
export function useSupabaseStorage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function uploadFile(bucket, path, file) {
    try {
      setLoading(true)
      setError(null)

      const { data, error: err } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (err) throw err

      // Get public URL
      const { data: publicUrl } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path)

      return { success: true, url: publicUrl.publicUrl, path: data.path }
    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message || 'Upload failed')
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  async function deleteFile(bucket, path) {
    try {
      setLoading(true)
      setError(null)

      const { error: err } = await supabase.storage.from(bucket).remove([path])

      if (err) throw err
      return { success: true }
    } catch (err) {
      console.error('Delete error:', err)
      setError(err.message || 'Delete failed')
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  return { uploadFile, deleteFile, loading, error }
}

/**
 * Hook to fetch contact information
 */
export function useContactInfo() {
  const [contactInfo, setContactInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = async () => {
    try {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('contact_info')
        .select('*')
        .single()

      if (err && err.code !== 'PGRST116') throw err // PGRST116 = no rows
      setContactInfo(data || null)
    } catch (err) {
      console.error('Error fetching contact info:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refetch()
  }, [])

  return { contactInfo, loading, error, refetch }
}

/**
 * Hook to send contact message
 */
export async function sendContactMessage(name, email, message) {
  try {
    const { data, error } = await supabase
      .from('contact_messages')
      .insert([{ name, email, message }])
      .select()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error sending message:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Hook for Admin authentication using Supabase Auth
 */
export function useAdminAuth() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function loginWithSupabase(email, password) {
    try {
      setLoading(true)
      setError(null)

      console.log('🔐 Attempting Supabase Auth login...')

      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      })

      if (err) {
        console.error('❌ Supabase Auth error:', err.message)
        setError('Invalid email or password')
        return { success: false, error: 'Invalid email or password', user: null }
      }

      if (!data.user) {
        console.error('❌ No user returned from Supabase Auth')
        setError('Invalid credentials')
        return { success: false, error: 'Invalid credentials', user: null }
      }

      console.log('✅ Supabase Auth successful for:', data.user.email)

      return {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          role: 'admin'
        },
        session: data.session
      }
    } catch (err) {
      console.error('❌ Auth exception:', err)
      setError(err.message || 'Login failed')
      return { success: false, error: err.message, user: null }
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    try {
      const { error: err } = await supabase.auth.signOut()
      if (err) {
        console.error('❌ Logout error:', err)
        return { success: false }
      }
      console.log('✅ Logged out successfully')
      return { success: true }
    } catch (err) {
      console.error('❌ Logout exception:', err)
      return { success: false }
    }
  }

  async function getSession() {
    try {
      const { data, error: err } = await supabase.auth.getSession()
      if (err) throw err
      return data.session
    } catch (err) {
      console.error('❌ Get session error:', err)
      return null
    }
  }

  async function restoreSession() {
    try {
      const session = await getSession()
      if (session && session.user) {
        console.log('✅ Session restored for:', session.user.email)
        return {
          success: true,
          user: {
            id: session.user.id,
            email: session.user.email,
            role: 'admin'
          },
          session
        }
      }
      return { success: false, user: null, session: null }
    } catch (err) {
      console.error('❌ Restore session error:', err)
      return { success: false, user: null, session: null }
    }
  }

  return { loginWithSupabase, logout, getSession, restoreSession, loading, error }
}
