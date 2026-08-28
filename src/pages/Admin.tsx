import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, Menu, X, Home, Settings, Edit2, Image, FileText, ArrowLeft, Youtube, Trash2, Plus, Mail, Check, Download, Zap } from 'lucide-react';
import { compressImage, compressVideo, formatFileSize, shouldCompress } from '../utils/compression';
import { login, logout as logoutAuth, isAuthenticated as checkAuth, getToken } from '../utils/auth';

// Send FormData with real upload progress. fetch() cannot report upload
// progress, so large video uploads look frozen - XHR exposes it.
const postFormDataWithProgress = (
  url: string,
  formData: FormData,
  token: string | null,
  onProgress?: (percent: number, loaded: number, total: number) => void
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress?.(percent, event.loaded, event.total);
      }
    };

    xhr.onload = () => {
      try {
        resolve(JSON.parse(xhr.responseText));
      } catch {
        reject(new Error(`Server returned an unreadable response (HTTP ${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.ontimeout = () => reject(new Error('Upload timed out'));
    xhr.timeout = 30 * 60 * 1000; // 30 minutes for large videos

    xhr.send(formData);
  });
};

// Backend upload function
const uploadToBackend = async (file: File, fileType: string, onProgress?: (progress: number) => void) => {
  try {
    console.log('[Upload] Starting upload for file:', file.name, 'Type:', fileType, 'Size:', file.size);
    const arrayBuffer = await file.arrayBuffer();
    console.log('[Upload] ArrayBuffer ready, size:', arrayBuffer.byteLength);
    onProgress?.(50);

    console.log('[Upload] Sending to: https://digitrixmedia.com/studioarch/api/upload');
    const safeName = file.name.replace(/[^\w.-]/g, '_');
    const response = await fetch('https://digitrixmedia.com/studioarch/api/upload', {
      method: 'POST',
      headers: {
        'X-File-Name': safeName,
        'X-File-Type': fileType,
        'Content-Type': file.type,
      },
      body: arrayBuffer,
    });

    console.log('[Upload] Response received. Status:', response.status, response.statusText);
    onProgress?.(100);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Upload] HTTP Error:', response.status, errorText);
      return { success: false, error: `Upload failed: ${response.statusText} - ${errorText}` };
    }

    const data = await response.json();
    console.log('[Upload] Response data:', data);

    if (data.success) {
      console.log('[Upload] SUCCESS! URL:', data.url);
      return { success: true, url: data.url };
    } else {
      console.error('[Upload] Server error:', data.error);
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error('[Upload] Exception:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Upload failed' };
  }
};
import { useProjects, useJournalPosts, useContactMessages, useGallery, useEventVideos, useContentSettings } from '../hooks/useMariaDbData';
import { LoadingScreenWithText } from '../components/LoadingScreen';
import { AdminImageDisplay } from '../components/AdminImageDisplay';
import { AdminDashboardSection } from '../components/AdminDashboard';
import { createJournalPost, updateJournalPost, deleteJournalPost, deleteContactMessage, deleteEventVideo, createProject, updateProject, deleteProject, updateContactInfo, updateContentSettings, getContactInfo, getGallery, createGalleryFolder, deleteGalleryFolder, createGalleryItem, deleteGalleryItem, createEventVideo, updateEventVideo } from '../utils/api';

const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB - videos are uploaded uncompressed
const MAX_PROJECT_FILES = 20; // images + videos combined, per project

type EventVideo = { id: number; youtube_id?: string; title: string; url?: string; isYoutube: boolean; };
type JournalPost = { id: number; title: string; date: string; excerpt: string; category: string; };
type Project = { id: number; name: string; location: string; year: string; category: string; description: string; locationmapurl?: string; images?: string[]; };
type GalleryImage = { id: number; url: string; title: string; };

const DEFAULT_JOURNAL_POSTS: JournalPost[] = [
  { id: 1, title: "The Future of Sustainable Luxury Architecture", date: "June 2024", excerpt: "Exploring how cutting-edge sustainable practices are reshaping the landscape of luxury architecture without compromising on aesthetic excellence.", category: "Sustainability" },
  { id: 2, title: "Materiality in Modern Design: A Deep Dive", date: "May 2024", excerpt: "Understanding how the choice of materials can elevate a space from functional to extraordinary, and the artistry behind material selection.", category: "Design" },
  { id: 3, title: "Light as Architecture: Creating Spaces Through Illumination", date: "April 2024", excerpt: "Discover how we leverage light—both natural and artificial—as a fundamental design element to transform architectural spaces.", category: "Design" },
  { id: 4, title: "Case Study: The Obsidian Villa's Journey", date: "March 2024", excerpt: "Behind the scenes of one of our most ambitious projects. From conceptualization to completion, exploring the challenges and triumphs.", category: "Projects" },
];

const DEFAULT_PROJECTS: Project[] = [
  { id: 1, name: "The Obsidian Villa", location: "Mykonos, Greece", year: "2024", category: "Residential", description: "A stunning cliffside villa featuring panoramic Aegean views with cutting-edge sustainable architecture and minimalist design.", images: ["/architecture-1.jpg", "/architecture-2.jpg"] },
  { id: 2, name: "Nexus Headquarters", location: "Singapore", year: "2023", category: "Commercial", description: "A futuristic corporate headquarters integrating smart building technology with luxury office spaces.", images: ["/architecture-3.jpg"] },
  { id: 3, name: "Alpine Retreat", location: "Zermatt, Switzerland", year: "2024", category: "Hospitals", description: "Exclusive medical facility combining traditional aesthetics with modern healthcare technology.", images: ["/architecture-4.jpg"] },
  { id: 4, name: "Lumina Pavilion", location: "Kyoto, Japan", year: "2022", category: "Schools", description: "An avant-garde educational center showcasing the fusion of Eastern philosophy and Western design principles.", images: ["/architecture-5.jpg", "/architecture-1.jpg"] },
  { id: 5, name: "Urban Sanctuary", location: "New York, USA", year: "2023", category: "Residential", description: "A contemporary urban residence blending industrial elements with warm minimalist interiors.", images: ["/architecture-2.jpg"] },
  { id: 6, name: "Coastal Living", location: "Malibu, California", year: "2024", category: "PMC", description: "Premium mixed-use complex with breathtaking views and sustainable architecture.", images: ["/architecture-3.jpg", "/architecture-4.jpg"] },
];

const DEFAULT_CONTACT = { email: 'inquiry@1studioarch.com', phone: '+44 (0) 20 1234 5678', locations: 'London, UK\nNew York, USA\nSingapore, SG', instagram: '#', linkedin: '#', youtube: '#', locationmapurl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3024.1234567890!2d-0.1276!3d51.5074!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNTHCsDMwJzI2LjYiTiAwwrAwN0myMzUuNiJX!5e0!3m2!1sen!2sus!4v1234567890' };

export default function Admin() {
  const navigate = useNavigate();
  const { data: supabaseProjects, refetch: refetchProjects, loading: projectsLoading } = useProjects();

  // Debug: Check where project data comes from
  useEffect(() => {
    console.log('📦 [Admin] supabaseProjects:', supabaseProjects);
    console.log('📦 [Admin] localStorage keys:', Object.keys(localStorage));
    const stored = localStorage.getItem('projects');
    if (stored) console.log('📦 [Admin] localStorage.projects:', JSON.parse(stored));
  }, [supabaseProjects]);
  const { data: supabaseJournalPosts, refetch: refetchJournalPosts, loading: journalLoading } = useJournalPosts();
  const { data: contactMessages, refetch: refetchMessages, loading: messagesLoading } = useContactMessages();
  const { data: galleryFolders, refetch: refetchGallery, loading: galleryLoading } = useGallery();
  const { data: videos, refetch: refetchVideos, loading: videosLoading } = useEventVideos();
  const { settings: contentSettings, loading: settingsLoading } = useContentSettings();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');

  // CRITICAL: Auto-fetch fresh projects from database every time user views projects section
  useEffect(() => {
    if (activeSection === 'projects') {
      console.log('📂 [Admin] Viewing projects section - fetching fresh data from database');
      refetchProjects();
    }
  }, [activeSection]);

  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [userSession, setUserSession] = useState(null);
  const [homeQuote, setHomeQuote] = useState("Space is the beginning of all architecture. The creation of light and shade, the volume of material, and the void between them define the soul of design.");
  const [philosophyText, setPhilosophyText] = useState("At 1StudioArch, we believe architecture is the thoughtful arrangement of space, light, and material...");
  const [isSavingContent, setIsSavingContent] = useState(false);
  const [isUploadingProject, setIsUploadingProject] = useState(false);
  const [isUploadingEdit, setIsUploadingEdit] = useState(false);
  const [selectedProjectFiles, setSelectedProjectFiles] = useState<File[] | null>(null);
  const [selectedEditFiles, setSelectedEditFiles] = useState<File[] | null>(null);
  const [isCompressingProjectFiles, setIsCompressingProjectFiles] = useState(false);
  const [isCompressingEditFiles, setIsCompressingEditFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [projectFilePreviewUrls, setProjectFilePreviewUrls] = useState<string[]>([]);
  const [editFilePreviewUrls, setEditFilePreviewUrls] = useState<string[]>([]);

  // Generate local preview thumbnails for pending (not-yet-uploaded) create-form files
  useEffect(() => {
    const urls = (selectedProjectFiles || []).map(f => URL.createObjectURL(f));
    setProjectFilePreviewUrls(urls);
    return () => { urls.forEach(u => URL.revokeObjectURL(u)); };
  }, [selectedProjectFiles]);

  // Generate local preview thumbnails for pending (not-yet-uploaded) edit-form files
  useEffect(() => {
    const urls = (selectedEditFiles || []).map(f => URL.createObjectURL(f));
    setEditFilePreviewUrls(urls);
    return () => { urls.forEach(u => URL.revokeObjectURL(u)); };
  }, [selectedEditFiles]);

  const handleRemoveSelectedProjectFile = (index: number) => {
    setSelectedProjectFiles(prev => (prev || []).filter((_, i) => i !== index));
  };

  const handleRemoveSelectedEditFile = (index: number) => {
    setSelectedEditFiles(prev => (prev || []).filter((_, i) => i !== index));
  };
  const [filesReadyToCreate, setFilesReadyToCreate] = useState(false);
  const [filesReadyToUpdate, setFilesReadyToUpdate] = useState(false);

  // Events - Using Supabase
  const [eventVideos, setEventVideos] = useState(videos || []);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoFile, setNewVideoFile] = useState<File | null>(null);
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [videoError, setVideoError] = useState('');
  const [videoCompressing, setVideoCompressing] = useState(false);
  const [videoCompressProgress, setVideoCompressProgress] = useState(0);

  // Update eventVideos when Supabase data loads
  useEffect(() => {
    if (videos && videos.length > 0) {
      setEventVideos(videos);
    }
  }, [videos]);

  // Restore session on mount
  useEffect(() => {
    if (checkAuth()) {
      setIsAuthenticated(true);
    }
  }, []);

  // Contact
  const [contactInfo, setContactInfo] = useState(DEFAULT_CONTACT);
  const [contactLoading, setContactLoading] = useState(true);

  // Journal
  const [journalPosts, setJournalPosts] = useState<JournalPost[]>([]);
  const [newPost, setNewPost] = useState({ title: '', date: '', excerpt: '', category: '' });
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editPostData, setEditPostData] = useState<Partial<JournalPost>>({});

  // Update journal posts when Supabase data is loaded (only Supabase, no fallback)
  useEffect(() => {
    if (supabaseJournalPosts) {
      setJournalPosts(supabaseJournalPosts as JournalPost[]);
    }
  }, [supabaseJournalPosts]);

  // Fetch contact info from database
  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const data = await getContactInfo();
        if (data && data.email) {
          setContactInfo(data);
        }
      } catch (error) {
        console.error('Failed to fetch contact info:', error);
      } finally {
        setContactLoading(false);
      }
    };
    fetchContactInfo();
  }, []);

  // Projects
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [editProjectData, setEditProjectData] = useState<Partial<Project>>({});
  const [newProjectData, setNewProjectData] = useState<Partial<Project>>({ name: '', location: '', year: new Date().getFullYear().toString(), category: '', description: '', images: [] });
  const [newProjectImages, setNewProjectImages] = useState<string[]>([]);
  const [newProjectVideos, setNewProjectVideos] = useState<string[]>([]);

  // Gallery Images - Pre-populated with existing public images
  const DEFAULT_GALLERY: GalleryImage[] = [
    { id: 1, url: '/architecture-1.jpg', title: 'Architecture 1' },
    { id: 2, url: '/architecture-2.jpg', title: 'Architecture 2' },
    { id: 3, url: '/architecture-3.jpg', title: 'Architecture 3' },
    { id: 4, url: '/architecture-4.jpg', title: 'Architecture 4' },
    { id: 5, url: '/architecture-5.jpg', title: 'Architecture 5' },
  ];
  // Gallery - Using Supabase
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImageTitle, setNewImageTitle] = useState('');
  const [imageError, setImageError] = useState('');
  const [imageCompressing, setImageCompressing] = useState(false);
  const [imageCompressProgress, setImageCompressProgress] = useState(0);
  const [editingProjectImages, setEditingProjectImages] = useState<string[]>([]);
  const [editingProjectVideos, setEditingProjectVideos] = useState<string[]>([]);
  const [newProjectImageUrl, setNewProjectImageUrl] = useState('');
  const [newProjectImageFile, setNewProjectImageFile] = useState<File | null>(null);

  // A project's 20-file cap counts images, videos and files still waiting
  // to be uploaded together.
  const createFormFileCount =
    newProjectImages.length + newProjectVideos.length + (selectedProjectFiles?.length || 0);
  const editFormFileCount =
    editingProjectImages.length + editingProjectVideos.length + (selectedEditFiles?.length || 0);

  // Update gallery images when Supabase gallery data loads
  useEffect(() => {
    if (galleryFolders && galleryFolders.length > 0) {
      const allImages: GalleryImage[] = [];
      galleryFolders.forEach((folder: any) => {
        if (folder.gallery_items) {
          folder.gallery_items.forEach((item: any) => {
            allImages.push({
              id: item.id,
              url: item.image_url,
              title: item.title,
              folderId: folder.id
            });
          });
        }
      });
      setGalleryImages(allImages);
    }
  }, [galleryFolders]);

  const extractYoutubeId = (url: string): string | null => {
    const patterns = [/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/, /^([a-zA-Z0-9_-]{11})$/];
    for (const pattern of patterns) { const match = url.match(pattern); if (match) return match[1]; }
    return null;
  };

  const showSuccessNotification = (message: string) => {
    setSuccessMessage(message); setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const isVideoUrl = (url: string) => {
    if (!url) return false;
    if (url.startsWith('data:video/')) return true;
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setVideoError('');

    if (!newVideoTitle.trim()) {
      setVideoError('Please enter a video title.');
      return;
    }

    if (!newVideoUrl.trim() && !newVideoFile) {
      setVideoError('Please provide either a YouTube URL or upload a video file.');
      return;
    }

    // YouTube URL - Save directly to Supabase
    if (newVideoUrl.trim()) {
      try {
        const youtubeId = extractYoutubeId(newVideoUrl.trim());
        if (!youtubeId) { setVideoError('Invalid YouTube URL.'); return; }

        const result = await createEventVideo({
          title: newVideoTitle.trim(),
          youtube_id: youtubeId,
          url: newVideoUrl.trim(),
          type: 'youtube',
          category: 'YouTube',
          display_order: eventVideos.length
        });

        if (result.success) {
          refetchVideos();
          setNewVideoUrl('');
          setNewVideoFile(null);
          setNewVideoTitle('');
          showSuccessNotification('YouTube video added to Events page!');
        } else {
          setVideoError('Failed to save video to database');
        }
      } catch (error) {
        setVideoError(error instanceof Error ? error.message : 'Error adding YouTube video');
      }
      return;
    }

    // Video File Upload - Upload as-is (don't compress videos)
    if (newVideoFile) {
      try {
        setVideoCompressing(true);
        setVideoCompressProgress(0);

        // Upload video to backend
        const uploadResult = await uploadToBackend(newVideoFile, 'videos', (progress) => {
          setVideoCompressProgress(progress);
        });

        if (uploadResult.success) {
          console.log('✅ Upload successful, saving to database:', uploadResult.url);

          // Save to database
          const dbResult = await insertVideo('event_videos', {
            title: newVideoTitle.trim(),
            url: uploadResult.url,
            type: 'upload',
            category: 'Upload',
            display_order: eventVideos.length
          });

          console.log('Database insert result:', dbResult);

          if (dbResult.success) {
            console.log('✅ Database save successful, refetching videos...');

            // Optimistically add to UI immediately
            const newVideo = {
              id: Date.now(),
              title: newVideoTitle.trim(),
              url: uploadResult.url,
              category: 'Upload',
              display_order: eventVideos.length,
              created_at: new Date().toISOString(),
              isYoutube: false
            };
            setEventVideos(prev => [...prev, newVideo]);

            // Also refetch from database
            setTimeout(() => {
              refetchVideos();
            }, 500);

            setNewVideoUrl('');
            setNewVideoFile(null);
            setNewVideoTitle('');
            setVideoCompressing(false);
            setVideoCompressProgress(0);
            showSuccessNotification(`Video uploaded! (${formatFileSize(newVideoFile.size)})`);
          } else {
            console.error('❌ Database save failed:', dbResult);
            setVideoError(`Failed to save video info to database: ${dbResult.error || 'Unknown error'}`);
          }
        } else {
          console.error('❌ Upload failed:', uploadResult.error);
          setVideoError(uploadResult.error || 'Failed to upload video');
        }
      } catch (error) {
        setVideoError(error instanceof Error ? error.message : 'Failed to upload video');
        setVideoCompressing(false);
        setVideoCompressProgress(0);
        console.error('Video upload error:', error);
      }
    }
  };

  const handleRemoveVideo = async (id: number) => {
    try {
      // Delete from database
      await deleteEventVideo(id);
      // Remove from UI
      setEventVideos(prev => prev.filter(v => v.id !== id));
      showSuccessNotification('Video deleted!');
      // Refetch to sync
      await refetchVideos();
    } catch (error) {
      setVideoError(error instanceof Error ? error.message : 'Failed to delete video');
    }
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewVideoFile(file);
      setVideoError('');
    }
  };

  const handleAddImage = async (e: React.FormEvent) => {
    e.preventDefault();
    setImageError('');

    if (!newImageTitle.trim()) {
      setImageError('Please enter an image title.');
      return;
    }

    if (!newImageUrl.trim() && !newImageFile) {
      setImageError('Please provide either an image URL or upload an image file.');
      return;
    }

    // URL-based image - Save directly to Supabase
    if (newImageUrl.trim()) {
      try {
        // Use first folder or create one
        let folderId = galleryFolders?.[0]?.id;
        if (!folderId) {
          const folderResult = await createGalleryFolder({ name: 'Portfolio', display_order: 0 });
          if (folderResult.success && folderResult.id) {
            folderId = folderResult.id;
          }
        }

        const result = await createGalleryItem({
          folder_id: folderId,
          title: newImageTitle.trim(),
          image_url: newImageUrl.trim(),
          display_order: galleryImages.length
        });

        if (result.success) {
          // Refresh gallery data
          try {
            console.log('📸 Fetching gallery data...');
            const galleryData = await getGallery();
            console.log('📸 Gallery data received:', galleryData);
            if (galleryData && Array.isArray(galleryData)) {
              console.log('📸 Setting gallery images:', galleryData.length);
              setGalleryImages(galleryData);
            } else {
              console.warn('📸 Gallery data not an array:', galleryData);
            }
          } catch (error) {
            console.error('📸 Failed to fetch gallery:', error);
          }
          setNewImageUrl('');
          setNewImageTitle('');
          showSuccessNotification('Image added to gallery!');
        } else {
          setImageError('Failed to save image to database');
        }
      } catch (error) {
        setImageError(error instanceof Error ? error.message : 'Error adding image');
      }
      return;
    }

    // File-based image - Compress with high quality (92%) for upload
    if (newImageFile) {
      try {
        setImageCompressing(true);
        setImageCompressProgress(0);

        const compressedFile = await compressImage(newImageFile, (progress) => {
          setImageCompressProgress(progress);
        });

        // Upload to backend
        const uploadResult = await uploadToBackend(compressedFile, 'gallery', (progress) => {
          setImageCompressProgress(progress);
        });

        if (uploadResult.success) {
          console.log('✅ Upload successful, saving to database:', uploadResult.url);

          // Use first folder or create one
          let folderId = galleryFolders?.[0]?.id;
          if (!folderId) {
            const folderResult = await createGalleryFolder({ name: 'Portfolio', display_order: 0 });
            if (folderResult.success && folderResult.id) {
              folderId = folderResult.id;
            }
          }

          // Save to database - save proxy URL directly (simpler!)
          const dbResult = await createGalleryItem({
            folder_id: folderId,
            title: newImageTitle.trim(),
            image_url: uploadResult.url, // Save proxy URL directly
            display_order: galleryImages.length
          });

          console.log('Database insert result:', dbResult);

          if (dbResult.success) {
            console.log('✅ Database save successful, updating UI...');

            // Refetch gallery data
            try {
              console.log('📸 Fetching gallery data...');
              const galleryData = await getGallery();
              console.log('📸 Gallery data received:', galleryData);
              if (galleryData && Array.isArray(galleryData)) {
                console.log('📸 Setting gallery images:', galleryData.length);
                setGalleryImages(galleryData);
              }
            } catch (error) {
              console.error('📸 Failed to fetch gallery:', error);
            }

            setNewImageUrl('');
            setNewImageFile(null);
            setNewImageTitle('');
            setImageCompressing(false);
            setImageCompressProgress(0);
            showSuccessNotification(`Image uploaded! High quality 92% (${formatFileSize(compressedFile.size)})`);

            // Refetch gallery data from database
            await refetchGallery();
          } else {
            console.error('❌ Database save failed:', dbResult);
            setImageError(`Failed to save image info to database: ${dbResult.error || 'Unknown error'}`);
          }
        } else {
          console.error('❌ Upload failed:', uploadResult.error);
          setImageError(uploadResult.error || 'Failed to upload image');
        }
      } catch (error) {
        setImageError(error instanceof Error ? error.message : 'Failed to upload image');
        setImageCompressing(false);
        setImageCompressProgress(0);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewImageFile(file);
      setImageError('');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result.success) {
      setIsAuthenticated(true);
      setUserSession(result.user);
      setEmail('');
      setPassword('');
      setPasswordError('');
      showSuccessNotification('Logged in successfully!');
    } else {
      setPasswordError(result.error || 'Login failed');
    }
  };

  const handleLogout = async () => {
    logoutAuth();
    setIsAuthenticated(false);
    setUserSession(null);
    setEmail('');
    setPassword('');
    setPasswordError('');
    setActiveSection('dashboard');
    navigate('/');
  };

  // Load content settings from database on mount
  useEffect(() => {
    const loadContentSettings = async () => {
      try {
        const response = await fetch('https://digitrixmedia.com/studioarch/api/content-settings', {
          cache: 'no-store'
        });
        const data = await response.json();
        if (Array.isArray(data)) {
          data.forEach(setting => {
            if (setting.key_name === 'home_quote') setHomeQuote(setting.value);
            if (setting.key_name === 'philosophy_text') setPhilosophyText(setting.value);
          });
        }
      } catch (error) {
        console.error('Failed to load content settings:', error);
      }
    };
    loadContentSettings();
  }, []);

  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingContent(true);
    try {
      const token = getToken();
      const settings = [
        { key_name: 'home_quote', value: homeQuote },
        { key_name: 'philosophy_text', value: philosophyText }
      ];

      for (const setting of settings) {
        const response = await fetch('https://digitrixmedia.com/studioarch/api/content-settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(setting),
        });

        if (!response.ok) throw new Error(`Failed to save ${setting.key_name}`);
      }

      showSuccessNotification('✅ Content saved to database!');
    } catch (error) {
      console.error('Failed to save content:', error);
      showSuccessNotification('Failed to save content: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSavingContent(false);
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    // Update contact_info via API
    try {
      await updateContactInfo({
        email: contactInfo.email,
        phone: contactInfo.phone,
        locations: contactInfo.locations,
        instagram: contactInfo.instagram,
        linkedin: contactInfo.linkedin,
        youtube: contactInfo.youtube,
        locationmapurl: contactInfo.locationmapurl,
      });
      showSuccessNotification('Contact info saved!');
    } catch (error) {
      showSuccessNotification('Failed to save contact info');
    }
  };

  const handleAddJournalPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.title.trim()) return;
    try {
      await createJournalPost({
        title: newPost.title.trim(),
        date: newPost.date,
        content: newPost.excerpt,
        category: newPost.category,
      });
      setNewPost({ title: '', date: '', excerpt: '', category: '' });
      refetchJournalPosts();
      showSuccessNotification('Journal post added!');
    } catch (error) {
      showSuccessNotification('Failed to add post');
    }
  };

  const handleDeleteJournalPost = async (id: number) => {
    if (confirm('Delete this journal post?')) {
      try {
        await deleteJournalPost(id);
        refetchJournalPosts();
        showSuccessNotification('Post removed.');
      } catch (error) {
        showSuccessNotification('Failed to delete post');
      }
    }
  };

  const handleSaveJournalPost = async (id: number) => {
    try {
      await updateJournalPost(id, {
        title: editPostData.title,
        date: editPostData.date,
        content: editPostData.excerpt,
        category: editPostData.category,
      });
      setEditingPostId(null);
      setEditPostData({});
      refetchJournalPosts();
      showSuccessNotification('Post updated!');
    } catch (error) {
      showSuccessNotification('Failed to update post');
    }
  };

  const handleSaveProject = async (id: number) => {
    try {
      setIsUploadingEdit(true);
      console.log('🚀 Saving project', id);
      console.log('📸 Existing images:', editingProjectImages, 'videos:', editingProjectVideos);
      console.log('📁 Selected files:', selectedEditFiles?.length || 0);

      // Create FormData for multipart request with files
      const formData = new FormData();
      formData.append('name', editProjectData.title || '');
      formData.append('location', editProjectData.location || '');
      formData.append('year', editProjectData.year || '');
      formData.append('category', editProjectData.category || '');
      formData.append('description', editProjectData.description || '');
      formData.append('existingImages', JSON.stringify(editingProjectImages));
      formData.append('existingVideos', JSON.stringify(editingProjectVideos));

      // Add any pending files
      if (selectedEditFiles && selectedEditFiles.length > 0) {
        console.log('📤 Adding', selectedEditFiles.length, 'new files to upload');
        for (let i = 0; i < selectedEditFiles.length; i++) {
          // The [] suffix is required: without it PHP keeps only the last
          // file instead of building an array in $_FILES
          formData.append('files[]', selectedEditFiles[i]);
          console.log('✅ Added file:', selectedEditFiles[i].name);
        }
      } else {
        console.log('⚠️ No new files to upload');
      }

      const token = getToken();
      // Use POST instead of PUT because PHP doesn't auto-parse multipart data for PUT!
      // Add _method=PUT to indicate this is an update
      const result = await postFormDataWithProgress(
        `https://digitrixmedia.com/studioarch/api/projects?id=${id}&_method=PUT`,
        formData,
        token,
        (percent, loaded, total) => {
          setUploadProgress(percent);
          console.log(`⬆️ Upload ${percent}% (${formatFileSize(loaded)} / ${formatFileSize(total)})`);
        }
      );
      setUploadProgress(0);

      if (result.success) {
        setEditingProjectId(null);
        setEditProjectData({});
        setEditingProjectImages([]);
        setEditingProjectVideos([]);
        setSelectedEditFiles(null);

        const failed = result.failedUploads || [];
        if (failed.length > 0) {
          console.warn('⚠️ Some files failed to upload:', failed);
          showSuccessNotification(`⚠️ Project updated, but ${failed.length} file(s) failed: ${failed[0].reason}`);
        } else {
          showSuccessNotification('Project updated!');
        }

        // Wait a moment then refresh to ensure database is updated
        setTimeout(() => {
          refetchProjects();
        }, 500);
      } else {
        throw new Error(result.error || 'Update failed');
      }
    } catch (error) {
      console.error('❌ Project update failed:', error);
      showSuccessNotification('Failed to update project: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsUploadingEdit(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveImage = async (id: number) => {
    try {
      // Delete from database
      const result = await deleteGalleryItem(id);
      if (result.success) {
        // Remove from UI
        setGalleryImages(prev => prev.filter(img => img.id !== id));
        showSuccessNotification('Image deleted!');
        // Refetch to sync
        await refetchGallery();
      } else {
        setImageError('Failed to delete image');
      }
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Failed to delete image');
    }
  };

  const handleAddProjectImage = () => {
    if (editingProjectImages.length >= 20) { showSuccessNotification('Maximum 20 images/videos per project'); return; }
    if (!newProjectImageUrl.trim() && !newProjectImageFile) { return; }

    if (newProjectImageFile) {
      uploadToBackend(newProjectImageFile, 'projects', (progress) => {
        console.log(`Uploading ${newProjectImageFile.name}: ${progress}%`);
      }).then((result) => {
        if (result.success) {
          setEditingProjectImages(prev => [...prev, result.url]);
        }
        setNewProjectImageUrl('');
        setNewProjectImageFile(null);
      });
    } else {
      setEditingProjectImages(prev => [...prev, newProjectImageUrl.trim()]);
      setNewProjectImageUrl('');
    }
  };

  const handleMultipleEditProjectImageUpload = (files: FileList | null) => {
    if (!files) return;

    const filesToAdd = Array.from(files);
    const canAdd = 20 - editingProjectImages.length;

    if (filesToAdd.length > canAdd) {
      showSuccessNotification(`Can only add ${canAdd} more files (limit: 20)`);
      return;
    }

    setIsUploadingEdit(true);
    let processedCount = 0;

    filesToAdd.forEach((file) => {
      const isVideo = file.type.startsWith('video/');

      if (isVideo) {
        // Upload videos (handles large files, no delay)
        uploadToBackend(file, 'projects', (progress) => {
          console.log(`Uploading ${file.name}: ${progress}%`);
        }).then((result) => {
          if (result.success) {
            console.log(`✅ Video uploaded: ${result.url}`);
            setEditingProjectImages(prev => [...prev, result.url]);
            processedCount++;

            if (processedCount === filesToAdd.length) {
              showSuccessNotification(`✅ Added ${filesToAdd.length} file(s)`);
              setNewProjectImageFile(null);
              setIsUploadingEdit(false);
            }
          }
        }).catch((error) => {
          console.error('Upload error:', error);
          processedCount++;
          if (processedCount === filesToAdd.length) {
            setIsUploadingEdit(false);
          }
        });
      } else {
        // Images: Upload to backend
        uploadToBackend(file, 'projects', (progress) => {
          console.log(`Uploading ${file.name}: ${progress}%`);
        }).then((result) => {
          if (result.success) {
            console.log(`✅ Image uploaded: ${result.url}`);
            setEditingProjectImages(prev => [...prev, result.url]);
            processedCount++;

            if (processedCount === filesToAdd.length) {
              showSuccessNotification(`✅ Added ${filesToAdd.length} file(s)`);
              setNewProjectImageFile(null);
              setIsUploadingEdit(false);
            }
          } else {
            console.error('Upload failed:', result.error);
            processedCount++;
            if (processedCount === filesToAdd.length) {
              setIsUploadingEdit(false);
            }
          }
        }).catch((error) => {
          console.error('Upload error:', error);
          processedCount++;
          if (processedCount === filesToAdd.length) {
            setIsUploadingEdit(false);
          }
        });
      }
    });
  };

  const handleRemoveProjectImage = (index: number) => {
    setEditingProjectImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteProject = async (id: number) => {
    if (confirm('Are you sure you want to delete this project?')) {
      try {
        const token = getToken();
        const response = await fetch(`https://digitrixmedia.com/studioarch/api/projects?id=${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const result = await response.json();
        console.log('🗑️ DELETE RESPONSE:', result);

        if (result.success) {
          console.log('✅ Deleted ID:', id);
          showSuccessNotification('Project deleted!');

          console.log('🔄 Fetching projects after DELETE...');
          await refetchProjects();
          console.log('✅ Refetch complete');
        } else {
          console.error('Delete failed:', result.error);
          showSuccessNotification('Failed to delete: ' + (result.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Delete error:', error);
        showSuccessNotification('Delete error: ' + (error instanceof Error ? error.message : 'Unknown'));
      }
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 Starting project creation...');

    if (!newProjectData.name?.trim()) {
      console.error('❌ Project name is required');
      showSuccessNotification('Enter project name');
      return;
    }

    try {
      setIsUploadingProject(true);

      // Create FormData for multipart request with files
      const formData = new FormData();
      formData.append('name', newProjectData.name.trim());
      formData.append('location', newProjectData.location?.trim() || '');
      formData.append('year', newProjectData.year || new Date().getFullYear().toString());
      formData.append('category', newProjectData.category?.trim() || '');
      formData.append('description', newProjectData.description?.trim() || '');
      formData.append('existingImages', JSON.stringify(newProjectImages));
      formData.append('existingVideos', JSON.stringify(newProjectVideos));

      // Add any pending files
      if (selectedProjectFiles) {
        for (let i = 0; i < selectedProjectFiles.length; i++) {
          // The [] suffix is required: without it PHP keeps only the last
          // file instead of building an array in $_FILES
          formData.append('files[]', selectedProjectFiles[i]);
        }
      }

      const token = getToken();
      const result = await postFormDataWithProgress(
        'https://digitrixmedia.com/studioarch/api/projects',
        formData,
        token,
        (percent, loaded, total) => {
          setUploadProgress(percent);
          console.log(`⬆️ Upload ${percent}% (${formatFileSize(loaded)} / ${formatFileSize(total)})`);
        }
      );
      setUploadProgress(0);
      console.log('📥 Response:', result);

      if (result.success) {
        console.log('✅ Project created successfully!');
        console.log('📸 Uploaded URLs:', result.uploadedUrls);
        setNewProjectData({ name: '', location: '', year: new Date().getFullYear().toString(), category: '', description: '' });
        setNewProjectImages([]);
        setNewProjectVideos([]);
        setSelectedProjectFiles(null);
        setFilesReadyToCreate(false);
        setIsUploadingProject(false);

        const failed = result.failedUploads || [];
        if (failed.length > 0) {
          console.warn('⚠️ Some files failed to upload:', failed);
          showSuccessNotification(`⚠️ Project saved, but ${failed.length} file(s) failed: ${failed[0].reason}`);
        } else {
          showSuccessNotification('✅ Project created successfully!');
        }
        // Wait a moment then refresh to ensure database is updated
        setTimeout(() => {
          refetchProjects();
        }, 500);
      } else {
        throw new Error(result.error || 'Creation failed');
      }
    } catch (error) {
      console.error('❌ Project creation failed:', error);
      showSuccessNotification('Failed to create project: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsUploadingProject(false);
      setUploadProgress(0);
    }
  };

  const handleAddNewProjectImage = () => {
    if (newProjectImages.length >= 20) { showSuccessNotification('Maximum 20 images/videos per project'); return; }
    if (!newProjectImageUrl.trim() && !newProjectImageFile) { return; }

    if (newProjectImageFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setNewProjectImages(prev => [...prev, dataUrl]);
        setNewProjectImageUrl('');
        setNewProjectImageFile(null);
      };
      reader.readAsDataURL(newProjectImageFile);
    } else {
      setNewProjectImages(prev => [...prev, newProjectImageUrl.trim()]);
      setNewProjectImageUrl('');
    }
  };

  const handleSelectProjectFiles = async (files: FileList | null) => {
    if (!files) return;

    const canAdd = MAX_PROJECT_FILES - createFormFileCount;
    if (canAdd <= 0) {
      showSuccessNotification(`Only ${MAX_PROJECT_FILES} files allowed per project`);
      return;
    }
    if (files.length > canAdd) {
      showSuccessNotification(`Only ${MAX_PROJECT_FILES} files allowed per project - you can add ${canAdd} more`);
      return;
    }

    setIsCompressingProjectFiles(true);
    showSuccessNotification(`📦 Processing ${files.length} file(s)...`);

    const originalFiles = Array.from(files);
    const processedFiles: File[] = [];

    for (const file of originalFiles) {
      try {
        if (file.type.startsWith('video/')) {
          // Videos: no compression, just enforce 500MB limit
          if (file.size > MAX_VIDEO_SIZE) {
            showSuccessNotification(`❌ ${file.name} is ${formatFileSize(file.size)} - videos must be under 500MB`);
            continue;
          }
          console.log(`🎬 Video accepted: ${file.name} (${formatFileSize(file.size)})`);
          processedFiles.push(file);
        } else if (file.type.startsWith('image/')) {
          const compressed = shouldCompress(file) ? await compressImage(file) : file;
          console.log(`✅ Image ${file.name}: ${formatFileSize(file.size)} → ${formatFileSize(compressed.size)}`);
          processedFiles.push(compressed);
        } else {
          showSuccessNotification(`❌ ${file.name} - only images and videos allowed`);
        }
      } catch (error) {
        console.error(`Failed to process ${file.name}:`, error);
        processedFiles.push(file); // fallback to original if compression fails
      }
    }

    setSelectedProjectFiles(prev => [...(prev || []), ...processedFiles]);
    setIsCompressingProjectFiles(false);
    if (processedFiles.length > 0) {
      showSuccessNotification(`✅ ${processedFiles.length} file(s) ready. Click "Create Project" to upload and save.`);
    }
  };

  const handleSelectEditFiles = async (files: FileList | null) => {
    if (!files) return;

    const canAdd = MAX_PROJECT_FILES - editFormFileCount;
    if (canAdd <= 0) {
      showSuccessNotification(`Only ${MAX_PROJECT_FILES} files allowed per project`);
      return;
    }
    if (files.length > canAdd) {
      showSuccessNotification(`Only ${MAX_PROJECT_FILES} files allowed per project - you can add ${canAdd} more`);
      return;
    }

    setIsCompressingEditFiles(true);
    showSuccessNotification(`📦 Processing ${files.length} file(s)...`);

    const originalFiles = Array.from(files);
    const processedFiles: File[] = [];

    for (const file of originalFiles) {
      try {
        if (file.type.startsWith('video/')) {
          // Videos: no compression, just enforce 500MB limit
          if (file.size > MAX_VIDEO_SIZE) {
            showSuccessNotification(`❌ ${file.name} is ${formatFileSize(file.size)} - videos must be under 500MB`);
            continue;
          }
          console.log(`🎬 Video accepted: ${file.name} (${formatFileSize(file.size)})`);
          processedFiles.push(file);
        } else if (file.type.startsWith('image/')) {
          const compressed = shouldCompress(file) ? await compressImage(file) : file;
          console.log(`✅ Image ${file.name}: ${formatFileSize(file.size)} → ${formatFileSize(compressed.size)}`);
          processedFiles.push(compressed);
        } else {
          showSuccessNotification(`❌ ${file.name} - only images and videos allowed`);
        }
      } catch (error) {
        console.error(`Failed to process ${file.name}:`, error);
        processedFiles.push(file); // fallback to original if compression fails
      }
    }

    setSelectedEditFiles(prev => [...(prev || []), ...processedFiles]);
    setIsCompressingEditFiles(false);
    if (processedFiles.length > 0) {
      showSuccessNotification(`✅ ${processedFiles.length} file(s) ready. Click "Save" to upload and update.`);
    }
  };

  const handleUploadEditFiles = async () => {
    if (!selectedEditFiles) return;

    const filesToAdd = Array.from(selectedEditFiles);
    const canAdd = 20 - editingProjectImages.length;

    if (filesToAdd.length > canAdd) {
      showSuccessNotification(`Can only add ${canAdd} more files (limit: 20)`);
      return;
    }

    setIsUploadingEdit(true);
    let processedCount = 0;

    for (const file of filesToAdd) {
      try {
        // Compress if needed
        let fileToUpload = file;
        if (shouldCompress(file)) {
          showSuccessNotification(`📦 Compressing ${file.name}...`);
          if (file.type.startsWith('video/')) {
            fileToUpload = (await compressVideo(file, (progress) => {
              console.log(`Compressing: ${progress}%`);
            })) as File;
          } else {
            fileToUpload = (await compressImage(file, (progress) => {
              console.log(`Compressing: ${progress}%`);
            })) as File;
          }
        }

        // Convert to base64
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          setEditingProjectImages(prev => [...prev, dataUrl]);
          processedCount++;

          if (processedCount === filesToAdd.length) {
            showSuccessNotification(`✅ All files uploaded successfully!`);
            setSelectedEditFiles(null);
            setFilesReadyToUpdate(false);
            setIsUploadingEdit(false);
          }
        };
        reader.readAsDataURL(fileToUpload);
      } catch (error) {
        console.error('File processing error:', error);
        processedCount++;
        if (processedCount === filesToAdd.length) {
          setIsUploadingEdit(false);
        }
      }
    }
  };

  const handleUploadProjectFiles = async () => {
    if (!selectedProjectFiles) return;

    const filesToAdd = Array.from(selectedProjectFiles);
    const canAdd = 20 - newProjectImages.length;

    if (filesToAdd.length > canAdd) {
      showSuccessNotification(`Can only add ${canAdd} more files (limit: 20)`);
      return;
    }

    setIsUploadingProject(true);
    let processedCount = 0;

    for (const file of filesToAdd) {
      const isVideo = file.type.startsWith('video/');

      try {
        if (isVideo) {
          // Upload videos (handles large files, no delay)
          uploadToBackend(file, 'projects', (progress) => {
            console.log(`Uploading ${file.name}: ${progress}%`);
          }).then((result) => {
            if (result.success) {
              console.log(`✅ Video uploaded: ${result.url}`);
              setNewProjectImages(prev => [...prev, result.url]);
              processedCount++;

              if (processedCount === filesToAdd.length) {
                showSuccessNotification(`✅ All files uploaded successfully!`);
                setSelectedProjectFiles(null);
                setFilesReadyToCreate(false);
                setIsUploadingProject(false);
              }
            }
          }).catch((error) => {
            console.error('Upload error:', error);
            processedCount++;
            if (processedCount === filesToAdd.length) {
              setIsUploadingProject(false);
            }
          });
        } else {
          // Images: Upload to backend
          uploadToBackend(file, 'projects', (progress) => {
            console.log(`Uploading ${file.name}: ${progress}%`);
          }).then((result) => {
            if (result.success) {
              console.log(`✅ Image uploaded: ${result.url}`);
              setNewProjectImages(prev => [...prev, result.url]);
              processedCount++;

              if (processedCount === filesToAdd.length) {
                showSuccessNotification(`✅ All files uploaded successfully!`);
                setSelectedProjectFiles(null);
                setFilesReadyToCreate(false);
                setIsUploadingProject(false);
              }
            } else {
              showSuccessNotification(`Failed to upload ${file.name}`);
              processedCount++;
              if (processedCount === filesToAdd.length) {
                setIsUploadingProject(false);
              }
            }
          }).catch((error) => {
            console.error('Upload error:', error);
            showSuccessNotification(`Error uploading ${file.name}`);
            processedCount++;
            if (processedCount === filesToAdd.length) {
              setIsUploadingProject(false);
            }
          });
        }
      } catch (error) {
        console.error('File processing error:', error);
        processedCount++;
        if (processedCount === filesToAdd.length) {
          setIsUploadingProject(false);
        }
      }
    }
  };

  const handleMultipleProjectImageUpload = (files: FileList | null) => {
    if (!files) return;

    const filesToAdd = Array.from(files);
    const canAdd = 20 - newProjectImages.length;

    if (filesToAdd.length > canAdd) {
      showSuccessNotification(`Can only add ${canAdd} more files (limit: 20)`);
      return;
    }

    setIsUploadingProject(true);
    let processedCount = 0;

    filesToAdd.forEach((file) => {
      const isVideo = file.type.startsWith('video/');

      if (isVideo) {
        // Upload video
        uploadToBackend(file, 'projects', (progress) => {
          console.log(`Uploading ${file.name}: ${progress}%`);
        }).then((result) => {
          if (result.success) {
            setNewProjectImages(prev => [...prev, result.url]);
            processedCount++;
            if (processedCount === filesToAdd.length) {
              showSuccessNotification(`✅ Added ${filesToAdd.length} file(s)`);
              setNewProjectImageFile(null);
              setIsUploadingProject(false);
            }
          } else {
            showSuccessNotification(`Failed to upload ${file.name}`);
            processedCount++;
            if (processedCount === filesToAdd.length) {
              setIsUploadingProject(false);
            }
          }
        }).catch((error) => {
          console.error('Upload error:', error);
          showSuccessNotification(`Error uploading ${file.name}`);
          processedCount++;
          if (processedCount === filesToAdd.length) {
            setIsUploadingProject(false);
          }
        });
      } else {
        // Convert images to base64
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          setNewProjectImages(prev => [...prev, dataUrl]);
          processedCount++;

          if (processedCount === filesToAdd.length) {
            showSuccessNotification(`✅ Added ${filesToAdd.length} file(s)`);
            setNewProjectImageFile(null);
            setIsUploadingProject(false);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleRemoveNewProjectImage = (index: number) => {
    setNewProjectImages(prev => prev.filter((_, i) => i !== index));
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 relative overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 opacity-50"></div>

        {/* Top Right Logo */}
        <Link to="/">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed top-4 md:top-6 right-4 md:right-8 z-40 hover:opacity-80 transition-opacity"
          >
            <div className="relative w-40 h-12 md:w-48 md:h-16">
              <motion.img
                src="/logo-bw.png"
                alt="1StudioArch"
                className="absolute inset-0 w-full h-full object-contain"
                animate={{ opacity: 1 }}
                whileHover={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              />
              <motion.img
                src="/logo-color.png"
                alt="1StudioArch"
                className="absolute inset-0 w-full h-full object-contain"
                animate={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-md relative z-10"
        >
          {/* Top accent line */}
          <div className="h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent mb-8"></div>

          {/* Login Card */}
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/15 rounded-2xl p-10 shadow-2xl">

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-8"></div>

            {/* Login Heading */}
            <div className="mb-8">
              <h2 className="text-lg font-light tracking-widest uppercase text-center mb-2">Admin Access</h2>
              <p className="text-xs text-stone-400 text-center">Secure Management Portal</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Input */}
              <motion.div whileHover={{ scale: 1.01 }} className="group">
                <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2.5 group-hover:text-stone-300 transition-colors">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@studioarch.com"
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:bg-white/10 focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all"
                />
              </motion.div>

              {/* Password Input */}
              <motion.div whileHover={{ scale: 1.01 }} className="group">
                <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2.5 group-hover:text-stone-300 transition-colors">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:bg-white/10 focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all"
                />
                {passwordError && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-400/90 text-xs mt-2 flex items-center gap-2"
                  >
                    <span>⚠</span> {passwordError}
                  </motion.p>
                )}
              </motion.div>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: "0 20px 50px rgba(255,255,255,0.15)" }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full bg-white text-black py-3 rounded-lg font-light uppercase tracking-widest text-sm hover:bg-stone-100 transition-all duration-300 shadow-lg mt-6"
              >
                Access Portal
              </motion.button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-xs text-stone-500 text-center">© 2026 1StudioArch. All rights reserved.</p>
            </div>
          </div>

          {/* Bottom accent line */}
          <div className="h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent mt-8"></div>
        </motion.div>
      </div>
    );
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'projects', label: 'Manage Projects', icon: Edit2 },
    { id: 'journal', label: 'Manage Journal', icon: FileText },
    { id: 'messages', label: 'Messages', icon: Mail },
    { id: 'contact', label: 'Edit Contact', icon: Mail },
    { id: 'images', label: 'Image Gallery', icon: Image },
    { id: 'events', label: 'Events Videos', icon: Youtube },
    { id: 'content', label: 'Content', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {showSuccess && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-green-500/20 border border-green-500/40 text-green-300 px-6 py-3 rounded-lg backdrop-blur-md flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full" />
          <span className="text-sm uppercase tracking-widest">{successMessage}</span>
        </motion.div>
      )}

      {/* Header */}
      <div className="fixed top-0 w-full z-40 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <motion.button onClick={() => setSidebarOpen(!sidebarOpen)} whileHover={{ opacity: 0.7 }} className="lg:hidden">
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </motion.button>
            <motion.button onClick={() => navigate(-1)} whileHover={{ opacity: 0.7 }} className="flex items-center gap-2 hover:opacity-60 transition-opacity">
              <ArrowLeft size={20} /><span className="text-sm uppercase tracking-widest hidden sm:inline">Back</span>
            </motion.button>
            <Link to="/" className="group hover:opacity-90 transition-opacity">
              <div className="relative w-48 h-14">
                <img src="/logo-bw.png" alt="1StudioArch" className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-100 group-hover:opacity-0" />
                <img src="/logo-color.png" alt="1StudioArch" className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-0 group-hover:opacity-100" />
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-stone-400 hidden sm:inline">{userSession?.email}</span>
            <motion.button onClick={handleLogout} whileHover={{ scale: 1.05 }} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded transition-colors">
              <LogOut size={18} /><span className="text-sm uppercase tracking-widest hidden sm:inline">Logout</span>
            </motion.button>
          </div>
        </div>
      </div>

      <div className="flex pt-20">
        {/* Sidebar */}
        <motion.div animate={{ x: sidebarOpen ? 0 : -300 }} transition={{ duration: 0.3 }} className="fixed left-0 top-20 h-[calc(100vh-80px)] w-64 bg-white/5 backdrop-blur-md border-r border-white/10 p-6 overflow-y-auto lg:relative lg:translate-x-0">
          <div className="space-y-2">
            {menuItems.map(item => {
              const Icon = item.icon;
              return (
                <motion.button key={item.id} onClick={() => setActiveSection(item.id)} whileHover={{ x: 5 }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-colors ${activeSection === item.id ? 'bg-white/20 text-white' : 'text-stone-400 hover:bg-white/10 hover:text-white'}`}>
                  <Icon size={20} /><span className="text-sm uppercase tracking-widest">{item.label}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Content */}
        <div className="flex-1 px-6 lg:px-12 py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

            {/* Dashboard */}
            {activeSection === 'dashboard' && (
              <AdminDashboardSection
                stats={{
                  totalProjects: supabaseProjects.length,
                  journalPosts: journalPosts.length,
                  eventVideos: eventVideos.length,
                  galleryImages: galleryFolders.reduce((sum, folder) => sum + (folder.gallery_items?.length || 0), 0),
                }}
              />
            )}

            {/* Projects */}
            {activeSection === 'projects' && (
              <div>
                <h2 className="text-4xl font-light mb-8">Manage Projects</h2>

                {/* Add New Project Form */}
                <form onSubmit={handleCreateProject} className="bg-white/5 border border-white/10 rounded-lg p-6 mb-8">
                  <h3 className="text-lg font-light mb-6 flex items-center gap-2"><Plus size={18} /> Create New Project</h3>
                  <div className="space-y-4 mb-6">
                    {/* Project Name */}
                    <div>
                      <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2">Project Name</label>
                      <input
                        type="text"
                        value={newProjectData.name || ''}
                        onChange={e => setNewProjectData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. Luxury Villa"
                        className="w-full bg-white/10 border border-white/20 rounded px-4 py-3 text-white text-sm placeholder-stone-500 focus:outline-none focus:border-white/40"
                      />
                    </div>

                    {/* Grid for Location, Year, Category */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2">Location</label>
                        <input
                          type="text"
                          value={newProjectData.location || ''}
                          onChange={e => setNewProjectData(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="e.g. Mykonos, Greece"
                          className="w-full bg-white/10 border border-white/20 rounded px-4 py-3 text-white text-sm placeholder-stone-500 focus:outline-none focus:border-white/40"
                        />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2">Year</label>
                        <input
                          type="text"
                          value={newProjectData.year || ''}
                          onChange={e => setNewProjectData(prev => ({ ...prev, year: e.target.value }))}
                          placeholder={new Date().getFullYear().toString()}
                          className="w-full bg-white/10 border border-white/20 rounded px-4 py-3 text-white text-sm placeholder-stone-500 focus:outline-none focus:border-white/40"
                        />
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2">Category</label>
                        <select
                          value={newProjectData.category || ''}
                          onChange={e => setNewProjectData(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full bg-white/10 border border-white/20 rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-white/40 appearance-none cursor-pointer"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23a8a29e' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 1rem center',
                            paddingRight: '2.5rem',
                          }}
                        >
                          <option value="" className="bg-stone-900 text-white">Select category</option>
                          <option value="Residential" className="bg-stone-900 text-white">Residential</option>
                          <option value="Commercial" className="bg-stone-900 text-white">Commercial</option>
                          <option value="Hospitals" className="bg-stone-900 text-white">Hospitals</option>
                          <option value="Schools" className="bg-stone-900 text-white">Schools</option>
                          <option value="PMC" className="bg-stone-900 text-white">PMC</option>
                          <option value="Interior" className="bg-stone-900 text-white">Interior</option>
                        </select>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2">Description</label>
                      <textarea
                        value={newProjectData.description || ''}
                        onChange={e => setNewProjectData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Project description..."
                        rows={3}
                        className="w-full bg-white/10 border border-white/20 rounded px-4 py-3 text-white text-sm placeholder-stone-500 focus:outline-none focus:border-white/40 resize-none"
                      />
                    </div>

                    {/* Project Images/Videos */}
                    <div>
                      <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2">
                        Project Images/Videos ({createFormFileCount}/{MAX_PROJECT_FILES})
                        {createFormFileCount >= MAX_PROJECT_FILES && (
                          <span className="ml-2 text-amber-400 normal-case tracking-normal">Limit reached - only {MAX_PROJECT_FILES} allowed</span>
                        )}
                      </label>
                      {newProjectImages.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                          {newProjectImages.map((img, idx) => (
                            <div key={idx} className="relative group">
                              <div className="bg-white/10 rounded overflow-hidden aspect-square flex items-center justify-center">
                                {img.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                  <img src={img} alt="preview" className="w-full h-full object-cover" />
                                ) : img.match(/\.(mp4|webm|mov|avi|mkv)$/i) ? (
                                  <video src={img} className="w-full h-full object-cover" muted playsInline preload="metadata" controls />
                                ) : (
                                  <div className="text-xs text-stone-500 text-center px-2 break-all">{img.slice(-30)}</div>
                                )}
                              </div>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                type="button"
                                onClick={() => setNewProjectImages(prev => prev.filter((_, i) => i !== idx))}
                                className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X size={12} className="text-white" />
                              </motion.button>
                            </div>
                          ))}
                        </div>
                      )}
                      {createFormFileCount < MAX_PROJECT_FILES && (
                        <div className="space-y-2">
                          <input
                            type="file"
                            multiple
                            accept="image/*,video/*"
                            onChange={e => { handleSelectProjectFiles(e.target.files); e.target.value = ''; }}
                            className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-stone-400 text-sm file:bg-white file:text-black file:px-2 file:py-1 file:border-0 file:rounded file:text-xs file:cursor-pointer file:mr-2 hover:file:bg-stone-200"
                          />
                        </div>
                      )}

                      {/* Pending files preview - confirm before Create Project */}
                      {isCompressingProjectFiles && (
                        <div className="mt-3 text-xs text-stone-400 flex items-center gap-2">
                          <span className="animate-pulse">📦 Compressing...</span>
                        </div>
                      )}
                      {selectedProjectFiles && selectedProjectFiles.length > 0 && (
                        <div className="mt-3">
                          <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2">Selected Files ({selectedProjectFiles.length}) - Ready to Upload</label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {selectedProjectFiles.map((file, idx) => (
                              <div key={idx} className="relative group">
                                <div className="bg-white/10 rounded overflow-hidden aspect-square flex items-center justify-center border border-green-500/40">
                                  {file.type.startsWith('image/') ? (
                                    <img src={projectFilePreviewUrls[idx]} alt="preview" className="w-full h-full object-cover" />
                                  ) : (
                                    <video src={projectFilePreviewUrls[idx]} className="w-full h-full object-cover" muted playsInline preload="metadata" controls />
                                  )}
                                </div>
                                <div className="absolute bottom-1 left-1 right-1 bg-black/70 text-[10px] text-white px-1 py-0.5 rounded truncate">{formatFileSize(file.size)}</div>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  type="button"
                                  onClick={() => handleRemoveSelectedProjectFile(idx)}
                                  className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X size={12} className="text-white" />
                                </motion.button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>

                  {isUploadingProject && uploadProgress > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-stone-400 mb-1">
                        <span>Uploading to server...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-white/10 rounded overflow-hidden">
                        <div className="h-full bg-green-500 transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}

                  <motion.button
                    type="submit"
                    disabled={isUploadingProject}
                    whileHover={isUploadingProject ? {} : { scale: 1.02 }}
                    className={`w-full px-6 py-3 rounded font-light uppercase tracking-widest text-sm flex items-center justify-center gap-2 ${
                      isUploadingProject
                        ? 'bg-stone-400 text-stone-600 cursor-not-allowed opacity-50'
                        : 'bg-white text-black hover:bg-stone-200'
                    }`}
                  >
                    {isUploadingProject
                      ? (uploadProgress > 0 ? `⏳ Uploading ${uploadProgress}%` : '⏳ Creating...')
                      : <><Plus size={16} /> Create Project</>}
                  </motion.button>
                </form>

                {/* Existing Projects List */}
                <h3 className="text-xl font-light mb-4">Existing Projects ({supabaseProjects.length})</h3>
                {projectsLoading ? (
                  <div className="py-12">
                    <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
                      <motion.img
                        src="/logo-bw.png"
                        alt="Loading..."
                        className="h-32 w-auto mx-auto mb-4"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <p className="text-stone-400 uppercase tracking-widest text-sm">Loading projects...</p>
                    </div>
                  </div>
                ) : (
                <div className="space-y-4">
                  {supabaseProjects.map(project => (
                    <motion.div key={project.id} className="bg-white/5 border border-white/10 rounded-lg p-6">
                      {editingProjectId === project.id ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(['title', 'location', 'year', 'category'] as const).map(field => (
                              <div key={field}>
                                <label className="text-xs uppercase tracking-widest text-stone-400 block mb-1">{field}</label>
                                <input value={(editProjectData[field as keyof typeof editProjectData] ?? project[field as keyof typeof project]) as string} onChange={e => setEditProjectData(prev => ({ ...prev, [field]: e.target.value }))}
                                  className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-white/40" />
                              </div>
                            ))}
                          </div>
                          <div>
                            <label className="text-xs uppercase tracking-widest text-stone-400 block mb-1">Description</label>
                            <textarea value={(editProjectData.description ?? project.description)} onChange={e => setEditProjectData(prev => ({ ...prev, description: e.target.value }))}
                              rows={3} className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-white/40 resize-none" />
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-widest text-stone-400 mb-3">
                              Total files: {editFormFileCount}/{MAX_PROJECT_FILES}
                              {editFormFileCount >= MAX_PROJECT_FILES && (
                                <span className="ml-2 text-amber-400 normal-case tracking-normal">Limit reached - only {MAX_PROJECT_FILES} allowed</span>
                              )}
                            </div>
                            <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2">Images ({editingProjectImages.length})</label>
                            {editingProjectImages.length > 0 && (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                                {editingProjectImages.map((img, idx) => (
                                  <div key={idx} className="relative group">
                                    <div className="bg-white/10 rounded overflow-hidden aspect-square flex items-center justify-center">
                                      <img src={img} alt="preview" className="w-full h-full object-cover" />
                                    </div>
                                    <motion.button
                                      whileHover={{ scale: 1.1 }}
                                      onClick={() => handleRemoveProjectImage(idx)}
                                      className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X size={12} className="text-white" />
                                    </motion.button>
                                  </div>
                                ))}
                              </div>
                            )}

                            <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2">Videos ({editingProjectVideos.length})</label>
                            {editingProjectVideos.length > 0 && (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                                {editingProjectVideos.map((vid, idx) => (
                                  <div key={idx} className="relative group">
                                    <div className="bg-white/10 rounded overflow-hidden aspect-square flex items-center justify-center">
                                      <video src={vid} className="w-full h-full object-cover" muted playsInline preload="metadata" controls />
                                    </div>
                                    <motion.button
                                      whileHover={{ scale: 1.1 }}
                                      onClick={() => setEditingProjectVideos(prev => prev.filter((_, i) => i !== idx))}
                                      className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X size={12} className="text-white" />
                                    </motion.button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <label className="block">
                              <input
                                type="file"
                                multiple
                                accept="image/*,video/*"
                                onChange={(e) => { handleSelectEditFiles(e.target.files); e.target.value = ''; }}
                                className="hidden"
                              />
                              <motion.div whileHover={{ scale: 1.02 }} className="px-4 py-2 bg-white/10 border border-white/20 rounded text-sm uppercase tracking-widest hover:bg-white/20 cursor-pointer text-center">
                                {isUploadingEdit ? '⏳ Uploading...' : '📁 Add Files'}
                              </motion.div>
                            </label>

                            {isUploadingEdit && uploadProgress > 0 && (
                              <div className="mt-3">
                                <div className="flex justify-between text-xs text-stone-400 mb-1">
                                  <span>Uploading to server...</span>
                                  <span>{uploadProgress}%</span>
                                </div>
                                <div className="w-full h-2 bg-white/10 rounded overflow-hidden">
                                  <div className="h-full bg-green-500 transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                                </div>
                              </div>
                            )}
                            {filesReadyToUpdate && !isUploadingEdit && (
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                onClick={handleUploadEditFiles}
                                className="w-full mt-2 px-3 py-2 bg-blue-500/30 border border-blue-500/50 rounded text-sm uppercase tracking-widest hover:bg-blue-500/40"
                              >
                                Upload Files
                              </motion.button>
                            )}

                            {/* Pending files preview - confirm before Save */}
                            {isCompressingEditFiles && (
                              <div className="mt-3 text-xs text-stone-400 flex items-center gap-2">
                                <span className="animate-pulse">📦 Compressing...</span>
                              </div>
                            )}
                            {selectedEditFiles && selectedEditFiles.length > 0 && (
                              <div className="mt-3">
                                <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2">Selected Files ({selectedEditFiles.length}) - Ready to Save</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                  {selectedEditFiles.map((file, idx) => (
                                    <div key={idx} className="relative group">
                                      <div className="bg-white/10 rounded overflow-hidden aspect-square flex items-center justify-center border border-green-500/40">
                                        {file.type.startsWith('image/') ? (
                                          <img src={editFilePreviewUrls[idx]} alt="preview" className="w-full h-full object-cover" />
                                        ) : (
                                          <video src={editFilePreviewUrls[idx]} className="w-full h-full object-cover" muted playsInline preload="metadata" controls />
                                        )}
                                      </div>
                                      <div className="absolute bottom-1 left-1 right-1 bg-black/70 text-[10px] text-white px-1 py-0.5 rounded truncate">{formatFileSize(file.size)}</div>
                                      <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        type="button"
                                        onClick={() => handleRemoveSelectedEditFile(idx)}
                                        className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <X size={12} className="text-white" />
                                      </motion.button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <motion.button whileHover={{ scale: 1.02 }} onClick={() => {
                              handleSaveProject(project.id);
                            }} className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded text-sm uppercase tracking-widest hover:bg-stone-200">
                              <Check size={14} /> Save
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.02 }} onClick={() => { setEditingProjectId(null); setEditProjectData({}); setEditingProjectImages([]); setEditingProjectVideos([]); setSelectedEditFiles(null); }} className="px-4 py-2 bg-white/10 border border-white/20 rounded text-sm uppercase tracking-widest hover:bg-white/20">Cancel</motion.button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h3 className="text-lg font-light mb-1">{project.name}</h3>
                            <p className="text-sm text-stone-400">{project.location} · {project.year} · {project.category}</p>
                            <p className="text-sm text-stone-500 mt-2 max-w-xl">{project.description}</p>
                            {project.images && project.images.length > 0 && (
                              <>
                                <p className="text-xs text-stone-500 mt-2">
                                  📁 {Array.isArray(project.images) ? project.images.length : 0} file(s)
                                  {project.images.length > 1 && (
                                    <span className="text-stone-600">
                                      {' • '}
                                      {project.images.filter((img: string) =>
                                        img.toLowerCase().match(/\.(mp4|webm|mov|avi|mkv)$/)
                                      ).length} video(s)
                                    </span>
                                  )}
                                </p>
                              </>
                            )}
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <motion.button whileHover={{ scale: 1.05 }} onClick={() => {
                              setEditingProjectId(project.id);
                              setEditProjectData({
                                title: project.title || '',
                                location: project.location || '',
                                year: project.year || '',
                                category: project.category || '',
                                description: project.description || '',
                              });
                              setEditingProjectImages(Array.isArray(project.images) ? project.images : []);
                              setEditingProjectVideos(Array.isArray(project.videos) ? project.videos : []);
                            }}
                              className="px-4 py-2 bg-white/10 border border-white/20 rounded text-sm uppercase tracking-widest hover:bg-white/20">Edit</motion.button>
                            <motion.button whileHover={{ scale: 1.05 }} onClick={() => handleDeleteProject(project.id)}
                              className="p-2 bg-red-500/20 border border-red-500/40 rounded hover:bg-red-500/30">
                              <Trash2 size={14} className="text-red-400" />
                            </motion.button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
                )}
              </div>
            )}

            {/* Journal */}
            {activeSection === 'journal' && (
              <div>
                <h2 className="text-4xl font-light mb-8">Manage Journal</h2>
                <form onSubmit={handleAddJournalPost} className="bg-white/5 border border-white/10 rounded-lg p-6 mb-8">
                  <h3 className="text-lg font-light mb-6 flex items-center gap-2"><Plus size={18} /> Add New Post</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="md:col-span-2">
                      <label className="text-xs uppercase tracking-widest text-stone-400 block mb-1">Title</label>
                      <input value={newPost.title} onChange={e => setNewPost(p => ({ ...p, title: e.target.value }))} placeholder="Article title" className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm placeholder-stone-500 focus:outline-none focus:border-white/40" />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-widest text-stone-400 block mb-1">Category</label>
                      <input value={newPost.category} onChange={e => setNewPost(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Design" className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm placeholder-stone-500 focus:outline-none focus:border-white/40" />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-widest text-stone-400 block mb-1">Date</label>
                      <input value={newPost.date} onChange={e => setNewPost(p => ({ ...p, date: e.target.value }))} placeholder="e.g. June 2024" className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm placeholder-stone-500 focus:outline-none focus:border-white/40" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs uppercase tracking-widest text-stone-400 block mb-1">Excerpt</label>
                      <textarea value={newPost.excerpt} onChange={e => setNewPost(p => ({ ...p, excerpt: e.target.value }))} placeholder="Short description..." rows={2} className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm placeholder-stone-500 focus:outline-none focus:border-white/40 resize-none" />
                    </div>
                  </div>
                  <motion.button type="submit" whileHover={{ scale: 1.02 }} className="flex items-center gap-2 bg-white text-black px-5 py-2 rounded font-light uppercase tracking-widest text-sm hover:bg-stone-200">
                    <Plus size={14} /> Add Post
                  </motion.button>
                </form>
                {journalLoading ? (
                  <div className="py-12">
                    <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
                      <motion.img
                        src="/logo-bw.png"
                        alt="Loading..."
                        className="h-32 w-auto mx-auto mb-4"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <p className="text-stone-400 uppercase tracking-widest text-sm">Loading journal posts...</p>
                    </div>
                  </div>
                ) : journalPosts.length === 0 ? (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center text-stone-500">
                    <p className="text-sm uppercase tracking-widest">No journal posts yet. Create one above!</p>
                  </div>
                ) : (
                <div className="space-y-4">
                  {journalPosts.map(post => (
                    <motion.div key={post.id} className="bg-white/5 border border-white/10 rounded-lg p-6">
                      {editingPostId === post.id ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                              <label className="text-xs uppercase tracking-widest text-stone-400 block mb-1">Title</label>
                              <input value={(editPostData.title ?? post.title)} onChange={e => setEditPostData(prev => ({ ...prev, title: e.target.value }))} className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-white/40" />
                            </div>
                            <div>
                              <label className="text-xs uppercase tracking-widest text-stone-400 block mb-1">Category</label>
                              <input value={(editPostData.category ?? post.category)} onChange={e => setEditPostData(prev => ({ ...prev, category: e.target.value }))} className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-white/40" />
                            </div>
                            <div>
                              <label className="text-xs uppercase tracking-widest text-stone-400 block mb-1">Date</label>
                              <input value={(editPostData.date ?? post.date)} onChange={e => setEditPostData(prev => ({ ...prev, date: e.target.value }))} className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-white/40" />
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-xs uppercase tracking-widest text-stone-400 block mb-1">Excerpt</label>
                              <textarea value={(editPostData.excerpt ?? post.excerpt)} onChange={e => setEditPostData(prev => ({ ...prev, excerpt: e.target.value }))} rows={3} className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-white/40 resize-none" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <motion.button whileHover={{ scale: 1.02 }} onClick={() => handleSaveJournalPost(post.id)} className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded text-sm uppercase tracking-widest hover:bg-stone-200">
                              <Check size={14} /> Save
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.02 }} onClick={() => { setEditingPostId(null); setEditPostData({}); }} className="px-4 py-2 bg-white/10 border border-white/20 rounded text-sm uppercase tracking-widest hover:bg-white/20">Cancel</motion.button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-xs bg-white/10 px-2 py-0.5 rounded border border-white/20">{post.category}</span>
                              <span className="text-xs text-stone-500">{post.date}</span>
                            </div>
                            <h3 className="font-light text-white mb-1">{post.title}</h3>
                            <p className="text-sm text-stone-500 line-clamp-2">{post.excerpt}</p>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <motion.button whileHover={{ scale: 1.05 }} onClick={() => { setEditingPostId(post.id); setEditPostData({}); }} className="px-3 py-2 bg-white/10 border border-white/20 rounded text-xs uppercase tracking-widest hover:bg-white/20">Edit</motion.button>
                            <motion.button whileHover={{ scale: 1.05 }} onClick={() => handleDeleteJournalPost(post.id)} className="p-2 bg-red-500/20 border border-red-500/40 rounded hover:bg-red-500/30">
                              <Trash2 size={14} className="text-red-400" />
                            </motion.button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
                )}
              </div>
            )}

            {/* Messages */}
            {activeSection === 'messages' && (
              <div>
                <h2 className="text-4xl font-light mb-8">Contact Messages</h2>
                {messagesLoading ? (
                  <div className="py-12">
                    <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
                      <motion.img
                        src="/logo-bw.png"
                        alt="Loading..."
                        className="h-32 w-auto mx-auto mb-4"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <p className="text-stone-400 uppercase tracking-widest text-sm">Loading messages...</p>
                    </div>
                  </div>
                ) : contactMessages && contactMessages.length > 0 ? (
                  <div className="space-y-4">
                    {contactMessages.map((msg: any) => (
                      <motion.div key={msg.id} className="bg-white/5 border border-white/10 rounded-lg p-6">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h3 className="font-light text-white text-lg">{msg.name}</h3>
                              <span className="text-xs text-stone-500">{new Date(msg.created_at).toLocaleDateString()}</span>
                            </div>
                            <a href={`mailto:${msg.email}`} className="text-sm text-stone-400 hover:text-white mb-3 inline-block">{msg.email}</a>
                            <p className="text-stone-400 mt-3">{msg.message}</p>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            onClick={() => deleteContactMessage(msg.id).then(() => refetchMessages()).catch(() => null)}
                            className="p-2 bg-red-500/20 border border-red-500/40 rounded hover:bg-red-500/30"
                          >
                            <Trash2 size={14} className="text-red-400" />
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center text-stone-500">
                    <Mail size={36} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm uppercase tracking-widest">No messages yet</p>
                  </div>
                )}
              </div>
            )}

            {/* Contact */}
            {activeSection === 'contact' && (
              <div>
                <h2 className="text-4xl font-light mb-8">Edit Contact Page</h2>
                <form onSubmit={handleSaveContact} className="space-y-6 max-w-2xl">
                  <motion.div whileHover={{ x: 3 }} className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-4">
                    <h3 className="text-lg font-light mb-4">Contact Information</h3>
                    <div>
                      <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2">Email</label>
                      <input type="email" value={contactInfo.email} onChange={e => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white text-sm focus:outline-none focus:border-white/40" />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2">Phone Number</label>
                      <input type="tel" value={contactInfo.phone || ''} onChange={e => setContactInfo(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+1 (555) 123-4567" className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white text-sm placeholder-stone-500 focus:outline-none focus:border-white/40" />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2">Locations (one per line)</label>
                      <textarea value={contactInfo.locations} onChange={e => setContactInfo(prev => ({ ...prev, locations: e.target.value }))}
                        rows={4} className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white text-sm focus:outline-none focus:border-white/40 resize-none" />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2">Location Map Embed URL</label>
                      <textarea value={contactInfo.locationmapurl || ''} onChange={e => setContactInfo(prev => ({ ...prev, locationmapurl: e.target.value }))}
                        placeholder="Google Maps embed URL or similar" rows={2} className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white text-sm placeholder-stone-500 focus:outline-none focus:border-white/40 resize-none" />
                      <p className="text-xs text-stone-500 mt-1">Paste the full iframe src URL from Google Maps or another map service</p>
                    </div>
                  </motion.div>
                  <motion.div whileHover={{ x: 3 }} className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-4">
                    <h3 className="text-lg font-light mb-4">Social Links</h3>
                    <div>
                      <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2">Instagram URL</label>
                      <input value={contactInfo.instagram} onChange={e => setContactInfo(prev => ({ ...prev, instagram: e.target.value }))}
                        placeholder="https://instagram.com/..." className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white text-sm placeholder-stone-500 focus:outline-none focus:border-white/40" />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2">LinkedIn URL</label>
                      <input value={contactInfo.linkedin} onChange={e => setContactInfo(prev => ({ ...prev, linkedin: e.target.value }))}
                        placeholder="https://linkedin.com/..." className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white text-sm placeholder-stone-500 focus:outline-none focus:border-white/40" />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2">YouTube URL</label>
                      <input value={contactInfo.youtube || ''} onChange={e => setContactInfo(prev => ({ ...prev, youtube: e.target.value }))}
                        placeholder="https://youtube.com/..." className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white text-sm placeholder-stone-500 focus:outline-none focus:border-white/40" />
                    </div>
                  </motion.div>
                  <motion.button type="submit" whileHover={{ scale: 1.02 }} className="w-full bg-white text-black px-6 py-3 rounded font-light uppercase tracking-widest hover:bg-stone-200 transition-colors">
                    Save Contact Info
                  </motion.button>
                </form>
              </div>
            )}

            {/* Images */}
            {activeSection === 'images' && (
              <div>
                <h2 className="text-4xl font-light mb-8">Image Gallery</h2>
                <form onSubmit={handleAddImage} className="bg-white/5 border border-white/10 rounded-lg p-6 mb-8">
                  <h3 className="text-lg font-light mb-8 flex items-center gap-2"><Plus size={18} /> Add New Image</h3>

                  <div className="space-y-8">
                    {/* Image Title */}
                    <div>
                      <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2">Image Title *</label>
                      <input type="text" value={newImageTitle} onChange={e => { setNewImageTitle(e.target.value); setImageError(''); }} placeholder="e.g. Architecture Shot" className="w-full bg-white/10 border border-white/20 rounded px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-white/40 text-sm" />
                    </div>

                    {/* URL Option */}
                    <div>
                      <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2">Option 1: Image URL</label>
                      <input type="text" value={newImageUrl} onChange={e => { setNewImageUrl(e.target.value); setImageError(''); setNewImageFile(null); }} placeholder="https://example.com/image.jpg" className="w-full bg-white/10 border border-white/20 rounded px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-white/40 text-sm" />
                      <p className="text-xs text-stone-500 mt-2">Use images from /public folder like "/architecture-1.jpg" or paste full URLs</p>
                    </div>

                    {/* File Upload Option */}
                    <div>
                      <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2">Option 2: Upload Image File</label>
                      <input type="file" accept="image/*" onChange={handleFileChange} className="w-full bg-white/10 border border-white/20 rounded px-4 py-3 text-stone-400 focus:outline-none focus:border-white/40 text-sm file:bg-white file:text-black file:px-4 file:py-2 file:border-0 file:rounded file:uppercase file:tracking-widest file:text-xs file:font-light file:cursor-pointer file:mr-3 hover:file:bg-stone-200" />
                      <p className="text-xs text-stone-500 mt-2">Supported: JPG, PNG, GIF, WebP, SVG (Max 10MB)</p>
                      {newImageFile && <p className="text-xs text-green-400 mt-2">✓ File selected: {newImageFile.name}</p>}
                    </div>

                    {/* Compression Progress */}
                    {imageCompressing && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Zap size={14} className="text-amber-500 animate-pulse" />
                          <span className="text-xs uppercase tracking-widest text-amber-500">Compressing image...</span>
                          <span className="text-xs text-stone-500">{imageCompressProgress}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 transition-all"
                            style={{ width: `${imageCompressProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Error Message */}
                    {imageError && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{imageError}</p>}

                    {/* Submit Button */}
                    <motion.button
                      type="submit"
                      disabled={imageCompressing}
                      whileHover={{ scale: imageCompressing ? 1 : 1.02 }}
                      className={`w-full px-6 py-3 rounded font-light uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-colors ${
                        imageCompressing
                          ? 'bg-stone-600 text-stone-400 cursor-not-allowed'
                          : 'bg-white text-black hover:bg-stone-200'
                      }`}
                    >
                      <Plus size={16} /> {imageCompressing ? 'Compressing...' : 'Add Image'}
                    </motion.button>
                  </div>
                </form>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {galleryImages.length === 0 ? (
                    <div className="col-span-full bg-white/5 border border-white/10 rounded-lg p-8 text-center text-stone-500">
                      <Image size={36} className="mx-auto mb-3 opacity-30" />
                      <p className="text-sm uppercase tracking-widest">No images added yet</p>
                    </div>
                  ) : galleryImages.map(image => (
                    <motion.div key={image.id} whileHover={{ y: -5 }} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                      <div className="h-40 bg-stone-900 flex items-center justify-center overflow-hidden relative">
                        <AdminImageDisplay src={image.url} alt={image.title} loading="lazy" className="w-full h-full object-cover" />
                      </div>
                      <div className="p-4">
                        <p className="text-sm font-light mb-2 truncate">{image.title}</p>
                        <p className="text-xs text-stone-500 mb-3 truncate">{image.url}</p>
                        <div className="flex gap-2">
                          <motion.a whileHover={{ scale: 1.05 }} href={image.url} target="_blank" rel="noopener noreferrer" className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded text-xs uppercase tracking-widest hover:bg-white/20 flex items-center justify-center gap-1">
                            <Download size={12} /> View
                          </motion.a>
                          <motion.button whileHover={{ scale: 1.05 }} onClick={() => handleRemoveImage(image.id)} className="flex-1 px-3 py-2 bg-red-500/20 border border-red-500/40 rounded text-xs uppercase tracking-widest hover:bg-red-500/30">Delete</motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Events */}
            {activeSection === 'events' && (
              <div>
                <h2 className="text-4xl font-light mb-2">Events Videos</h2>
                <p className="text-stone-400 text-sm mb-2">Add YouTube videos or upload video files to display on the Events page.</p>
                <p className="text-amber-600/70 text-xs mb-8 bg-amber-500/10 border border-amber-500/20 rounded px-3 py-2 inline-block">
                  ⚠️ Note: Uploaded videos are available during the current session. For permanent videos, use YouTube links.
                </p>
                <form onSubmit={handleAddVideo} className="bg-white/5 border border-white/10 rounded-lg p-6 mb-8">
                  <h3 className="text-lg font-light mb-8 flex items-center gap-2"><Plus size={18} /> Add New Video</h3>
                  <div className="space-y-8">
                    {/* Video Title */}
                    <div>
                      <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2">Video Title *</label>
                      <input type="text" value={newVideoTitle} onChange={e => { setNewVideoTitle(e.target.value); setVideoError(''); }} placeholder="e.g. Bungalow Design Walkthrough" className="w-full bg-white/10 border border-white/20 rounded px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-white/40 text-sm" />
                    </div>

                    {/* YouTube URL Option */}
                    <div>
                      <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2">Option 1: YouTube URL</label>
                      <input type="text" value={newVideoUrl} onChange={e => { setNewVideoUrl(e.target.value); setVideoError(''); setNewVideoFile(null); }} placeholder="https://www.youtube.com/watch?v=..." className="w-full bg-white/10 border border-white/20 rounded px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-white/40 text-sm" />
                      <p className="text-xs text-stone-500 mt-2">Paste YouTube video URL</p>
                    </div>

                    {/* Video File Upload Option */}
                    <div>
                      <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2">Option 2: Upload Video File</label>
                      <input type="file" accept="video/*" onChange={handleVideoFileChange} className="w-full bg-white/10 border border-white/20 rounded px-4 py-3 text-stone-400 focus:outline-none focus:border-white/40 text-sm file:bg-white file:text-black file:px-4 file:py-2 file:border-0 file:rounded file:uppercase file:tracking-widest file:text-xs file:font-light file:cursor-pointer file:mr-3 hover:file:bg-stone-200" />
                      <p className="text-xs text-stone-500 mt-2">Supported: MP4, WebM, Ogg (Max 500MB)</p>
                      {newVideoFile && <p className="text-xs text-green-400 mt-2">✓ File selected: {newVideoFile.name}</p>}
                    </div>

                    {/* Compression Progress */}
                    {videoCompressing && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Zap size={14} className="text-amber-500 animate-pulse" />
                          <span className="text-xs uppercase tracking-widest text-amber-500">Compressing video...</span>
                          <span className="text-xs text-stone-500">{videoCompressProgress}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 transition-all"
                            style={{ width: `${videoCompressProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Error Message */}
                    {videoError && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{videoError}</p>}

                    {/* Submit Button */}
                    <motion.button
                      type="submit"
                      disabled={videoCompressing}
                      whileHover={{ scale: videoCompressing ? 1 : 1.02 }}
                      className={`w-full px-6 py-3 rounded font-light uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-colors ${
                        videoCompressing
                          ? 'bg-stone-600 text-stone-400 cursor-not-allowed'
                          : 'bg-white text-black hover:bg-stone-200'
                      }`}
                    >
                      <Plus size={16} /> {videoCompressing ? 'Compressing...' : 'Add Video'}
                    </motion.button>
                  </div>
                </form>
                <div className="space-y-4">
                  {eventVideos.length === 0 ? (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center text-stone-500">
                      <Youtube size={36} className="mx-auto mb-3 opacity-30" />
                      <p className="text-sm uppercase tracking-widest">No videos added yet</p>
                    </div>
                  ) : (
                    <>
                      {/* YouTube Videos */}
                      {eventVideos.filter(v => v.isYoutube).length > 0 && (
                        <div>
                          <h4 className="text-sm font-light uppercase tracking-widest text-stone-400 mb-3">YouTube Videos ({eventVideos.filter(v => v.isYoutube).length})</h4>
                          <div className="space-y-2">
                            {eventVideos.filter(v => v.isYoutube).map((video, idx) => (
                              <motion.div key={video.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center gap-4">
                                {video.youtube_id && <img src={`https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`} alt={video.title} className="w-28 h-16 object-cover rounded flex-shrink-0" />}
                                <div className="flex-1 min-w-0">
                                  <p className="font-light text-white truncate">{video.title}</p>
                                  <p className="text-xs text-yellow-600 mt-1">📺 YouTube</p>
                                </div>
                                <motion.button whileHover={{ scale: 1.1 }} onClick={() => handleRemoveVideo(video.id)} className="p-2 bg-red-500/20 border border-red-500/40 rounded hover:bg-red-500/30 flex-shrink-0">
                                  <Trash2 size={16} className="text-red-400" />
                                </motion.button>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Uploaded Videos */}
                      {eventVideos.filter(v => !v.isYoutube).length > 0 && (
                        <div>
                          <h4 className="text-sm font-light uppercase tracking-widest text-stone-400 mb-3">Uploaded Videos ({eventVideos.filter(v => !v.isYoutube).length})</h4>
                          <div className="space-y-2">
                            {eventVideos.filter(v => !v.isYoutube).map((video, idx) => (
                              <motion.div key={video.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center gap-4">
                                <div className="w-28 h-16 bg-stone-800 rounded flex items-center justify-center flex-shrink-0">
                                  <Youtube size={24} className="text-stone-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-light text-white truncate">{video.title}</p>
                                  <p className="text-xs text-blue-600 mt-1">🎬 Video File</p>
                                </div>
                                <motion.button whileHover={{ scale: 1.1 }} onClick={() => handleRemoveVideo(video.id)} className="p-2 bg-red-500/20 border border-red-500/40 rounded hover:bg-red-500/30 flex-shrink-0">
                                  <Trash2 size={16} className="text-red-400" />
                                </motion.button>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Content */}
            {activeSection === 'content' && (
              <div>
                <h2 className="text-4xl font-light mb-8">Content Management</h2>
                <form onSubmit={handleSaveContent} className="space-y-6">
                  <motion.div whileHover={{ x: 5 }} className="bg-white/5 border border-white/10 rounded-lg p-6">
                    <h3 className="text-lg font-light mb-2">Home Page Quote</h3>
                    <textarea value={homeQuote} onChange={e => setHomeQuote(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-white/40 resize-none" rows={4} />
                  </motion.div>
                  <motion.div whileHover={{ x: 5 }} className="bg-white/5 border border-white/10 rounded-lg p-6">
                    <h3 className="text-lg font-light mb-2">Studio Philosophy</h3>
                    <textarea value={philosophyText} onChange={e => setPhilosophyText(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-white/40 resize-none" rows={4} />
                  </motion.div>
                  <motion.button
                    type="submit"
                    disabled={isSavingContent}
                    whileHover={isSavingContent ? {} : { scale: 1.02 }}
                    className={`${isSavingContent ? 'bg-stone-400 text-stone-600 cursor-not-allowed opacity-50' : 'bg-white text-black hover:bg-stone-200'} px-6 py-2 rounded font-light uppercase tracking-widest text-sm`}
                  >
                    {isSavingContent ? '⏳ Saving...' : '💾 Save All Content'}
                  </motion.button>
                </form>
              </div>
            )}

            {/* Settings */}
            {activeSection === 'settings' && (
              <div>
                <h2 className="text-4xl font-light mb-8">Settings</h2>
                <div className="space-y-6 max-w-2xl">
                  <motion.div whileHover={{ x: 5 }} className="bg-white/5 border border-white/10 rounded-lg p-6">
                    <h3 className="text-lg font-light mb-4">Admin Account</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm uppercase tracking-widest text-stone-400 block mb-2">Email</label>
                        <p className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white">{userSession?.email}</p>
                      </div>
                      <p className="text-xs text-stone-500">
                        To change your password, please use Supabase's password reset feature or contact your system administrator.
                      </p>
                    </div>
                  </motion.div>
                </div>
              </div>
            )}

          </motion.div>
        </div>
      </div>
    </div>
  );
}
