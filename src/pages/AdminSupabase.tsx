import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, Menu, X, Home, Settings, Edit2, Image, FileText, ArrowLeft, Youtube, Trash2, Plus, Upload } from 'lucide-react';
import { useAdminAuth, useSupabaseMutation, useEventVideos, useContentSettings, useContactInfo } from '../hooks/useSupabaseData';

export default function AdminSupabase() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [userSession, setUserSession] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const { loginWithSupabase, logout, getSession } = useAdminAuth();
  const { insert: insertMutation, update: updateMutation, remove: removeMutation } = useSupabaseMutation();
  const { data: eventVideos, refetch: refetchVideos } = useEventVideos();
  const { settings: contentSettings } = useContentSettings();
  const { contactInfo, loading: contactLoading } = useContactInfo();

  // Check if user has active session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await getSession();
        if (session) {
          setIsAuthenticated(true);
          setUserSession({
            id: session.user.id,
            email: session.user.email,
            role: 'admin'
          });
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  // Form states - Content
  const [homeQuote, setHomeQuote] = useState(contentSettings?.home_quote || '');
  const [philosophyText, setPhilosophyText] = useState(contentSettings?.philosophy_text || '');

  // Form states - Contact Info
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactLocations, setContactLocations] = useState('');
  const [contactMapsUrl, setContactMapsUrl] = useState('');
  const [contactMapEmbedUrl, setContactMapEmbedUrl] = useState('');
  const [contactInstagram, setContactInstagram] = useState('');
  const [contactLinkedin, setContactLinkedin] = useState('');
  const [contactYoutube, setContactYoutube] = useState('');

  // Form states - Video/Messages
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [videoError, setVideoError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Update form when settings load
  useEffect(() => {
    if (contentSettings) {
      setHomeQuote(contentSettings.home_quote || '');
      setPhilosophyText(contentSettings.philosophy_text || '');
    }
  }, [contentSettings]);

  // Update form when contact info loads
  useEffect(() => {
    if (contactInfo) {
      setContactEmail(contactInfo.email || '');
      setContactPhone(contactInfo.phone || '');
      setContactLocations(contactInfo.locations || '');
      setContactMapsUrl(contactInfo.maps_url || '');
      setContactMapEmbedUrl(contactInfo.location_map_url || '');
      setContactInstagram(contactInfo.instagram || '');
      setContactLinkedin(contactInfo.linkedin || '');
      setContactYoutube(contactInfo.youtube || '');
    }
  }, [contactInfo]);

  const extractYoutubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const showSuccessNotification = (message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await loginWithSupabase(email, password);
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
    await logout();
    setIsAuthenticated(false);
    setUserSession(null);
    setActiveSection('dashboard');
    navigate('/');
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setVideoError('');
    const youtubeId = extractYoutubeId(newVideoUrl.trim());
    if (!youtubeId) {
      setVideoError('Invalid YouTube URL');
      return;
    }
    if (!newVideoTitle.trim()) {
      setVideoError('Please enter a title');
      return;
    }

    const result = await insertMutation('event_videos', {
      title: newVideoTitle.trim(),
      youtube_id: youtubeId,
      url: newVideoUrl.trim(),
    });

    if (result.success) {
      setNewVideoUrl('');
      setNewVideoTitle('');
      refetchVideos();
      showSuccessNotification('Video added successfully!');
    } else {
      setVideoError(result.error || 'Failed to add video');
    }
  };

  const handleRemoveVideo = async (id: number) => {
    const result = await removeMutation('event_videos', id);
    if (result.success) {
      refetchVideos();
      showSuccessNotification('Video removed');
    }
  };

  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await updateMutation('content_settings', contentSettings?.id || 1, {
      home_quote: homeQuote,
      philosophy_text: philosophyText,
    });

    if (result.success) {
      showSuccessNotification('Content saved successfully!');
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-white mx-auto mb-4"></div>
          <p className="text-stone-400">Checking authentication...</p>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-md"
        >
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-12">
            <Link to="/">
              <h1 className="text-3xl font-light tracking-widest uppercase mb-12 text-center hover:opacity-60 transition-opacity">
                StudioArch
              </h1>
            </Link>

            <h2 className="text-2xl font-light mb-8 text-center">Admin Portal</h2>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="text-sm uppercase tracking-widest text-stone-400 block mb-3">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@studioarch.com"
                  className="w-full bg-white/10 border border-white/20 rounded px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-white/40 transition-colors"
                />
              </div>
              <div>
                <label className="text-sm uppercase tracking-widest text-stone-400 block mb-3">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full bg-white/10 border border-white/20 rounded px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-white/40 transition-colors"
                />
                {passwordError && (
                  <p className="text-red-400 text-sm mt-2">{passwordError}</p>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full bg-white text-black py-3 rounded font-light uppercase tracking-widest hover:bg-stone-200 transition-colors"
              >
                Login
              </motion.button>
            </form>

            <p className="text-xs text-stone-500 mt-8 text-center">
              Powered by Supabase
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'content', label: 'Content', icon: FileText },
    { id: 'events', label: 'Events Videos', icon: Youtube },
    { id: 'gallery', label: 'Gallery', icon: Image },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Success Notification */}
      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-green-500/20 border border-green-500/40 text-green-300 px-6 py-3 rounded-lg backdrop-blur-md flex items-center gap-2"
        >
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span className="text-sm uppercase tracking-widest">{successMessage}</span>
        </motion.div>
      )}

      {/* Header */}
      <div className="fixed top-0 w-full z-40 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <motion.button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              whileHover={{ opacity: 0.7 }}
              className="lg:hidden"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </motion.button>
            <motion.button
              onClick={() => navigate(-1)}
              whileHover={{ opacity: 0.7 }}
              className="flex items-center gap-2 hover:opacity-60 transition-opacity"
            >
              <ArrowLeft size={20} />
              <span className="text-sm uppercase tracking-widest hidden sm:inline">Back</span>
            </motion.button>
            <Link to="/" className="hover:opacity-90 transition-opacity">
              <h1 className="text-xl font-light tracking-widest uppercase">StudioArch</h1>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-stone-400 hidden sm:inline">{userSession?.email}</span>
            <motion.button
              onClick={handleLogout}
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded transition-colors"
            >
              <LogOut size={18} />
              <span className="text-sm uppercase tracking-widest hidden sm:inline">Logout</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex pt-20">
        {/* Sidebar */}
        <motion.div
          animate={{ x: sidebarOpen ? 0 : -300 }}
          transition={{ duration: 0.3 }}
          className="fixed left-0 top-20 h-[calc(100vh-80px)] w-64 bg-white/5 backdrop-blur-md border-r border-white/10 p-6 overflow-y-auto lg:relative lg:translate-x-0"
        >
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  whileHover={{ x: 5 }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-colors ${
                    activeSection === item.id
                      ? 'bg-white/20 text-white'
                      : 'text-stone-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-sm uppercase tracking-widest">{item.label}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Content Area */}
        <div className="flex-1 px-6 lg:px-12 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Dashboard */}
            {activeSection === 'dashboard' && (
              <div>
                <h2 className="text-4xl font-light mb-8">Dashboard</h2>
                <p className="text-stone-400">Welcome to StudioArch Admin Panel</p>
              </div>
            )}

            {/* Content */}
            {activeSection === 'content' && (
              <div>
                <h2 className="text-4xl font-light mb-8">Content Management</h2>

                <form onSubmit={handleSaveContent} className="space-y-6">
                  <motion.div
                    whileHover={{ x: 5 }}
                    className="bg-white/5 border border-white/10 rounded-lg p-6"
                  >
                    <h3 className="text-lg font-light mb-2">Home Page Quote</h3>
                    <textarea
                      value={homeQuote}
                      onChange={(e) => setHomeQuote(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-white/40 transition-colors resize-none"
                      rows={4}
                    />
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      className="mt-4 bg-white text-black px-6 py-2 rounded font-light uppercase tracking-widest text-sm hover:bg-stone-200 transition-colors"
                    >
                      Save Changes
                    </motion.button>
                  </motion.div>

                  <motion.div
                    whileHover={{ x: 5 }}
                    className="bg-white/5 border border-white/10 rounded-lg p-6"
                  >
                    <h3 className="text-lg font-light mb-2">Studio Philosophy</h3>
                    <textarea
                      value={philosophyText}
                      onChange={(e) => setPhilosophyText(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-white/40 transition-colors resize-none"
                      rows={4}
                    />
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      className="mt-4 bg-white text-black px-6 py-2 rounded font-light uppercase tracking-widest text-sm hover:bg-stone-200 transition-colors"
                    >
                      Save Changes
                    </motion.button>
                  </motion.div>
                </form>
              </div>
            )}

            {/* Events */}
            {activeSection === 'events' && (
              <div>
                <h2 className="text-4xl font-light mb-2">Events Videos</h2>
                <p className="text-stone-400 text-sm mb-8">Add YouTube links to display on the Events page.</p>

                <form onSubmit={handleAddVideo} className="bg-white/5 border border-white/10 rounded-lg p-6 mb-8">
                  <h3 className="text-lg font-light mb-6 flex items-center gap-2">
                    <Plus size={18} /> Add New Video
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2">YouTube URL</label>
                      <input
                        type="text"
                        value={newVideoUrl}
                        onChange={(e) => { setNewVideoUrl(e.target.value); setVideoError(''); }}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full bg-white/10 border border-white/20 rounded px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-white/40 transition-colors text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2">Video Title</label>
                      <input
                        type="text"
                        value={newVideoTitle}
                        onChange={(e) => { setNewVideoTitle(e.target.value); setVideoError(''); }}
                        placeholder="e.g. Design Walkthrough"
                        className="w-full bg-white/10 border border-white/20 rounded px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-white/40 transition-colors text-sm"
                      />
                    </div>
                    {videoError && <p className="text-red-400 text-sm">{videoError}</p>}
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      className="bg-white text-black px-6 py-3 rounded font-light uppercase tracking-widest text-sm hover:bg-stone-200 transition-colors flex items-center gap-2"
                    >
                      <Plus size={16} /> Add Video
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
                    eventVideos.map((video) => (
                      <motion.div
                        key={video.id}
                        className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center gap-4"
                      >
                        <img
                          src={`https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`}
                          alt={video.title}
                          className="w-28 h-16 object-cover rounded flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-light text-white truncate">{video.title}</p>
                          <p className="text-xs text-stone-500 mt-1 truncate">{video.url}</p>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          onClick={() => handleRemoveVideo(video.id)}
                          className="p-2 bg-red-500/20 border border-red-500/40 rounded hover:bg-red-500/30 transition-colors flex-shrink-0"
                        >
                          <Trash2 size={16} className="text-red-400" />
                        </motion.button>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Gallery */}
            {activeSection === 'gallery' && (
              <div>
                <h2 className="text-4xl font-light mb-8">Gallery Management</h2>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  className="mb-8 bg-white text-black px-6 py-3 rounded font-light uppercase tracking-widest hover:bg-stone-200 transition-colors flex items-center gap-2"
                >
                  <Upload size={18} /> Upload Images
                </motion.button>
                <p className="text-stone-400">Gallery management coming soon...</p>
              </div>
            )}

            {/* Settings */}
            {activeSection === 'settings' && (
              <div className="space-y-8">
                <h2 className="text-4xl font-light mb-8">Settings</h2>

                {/* Contact Information Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 border border-white/10 rounded-lg p-8 space-y-6"
                >
                  <h3 className="text-2xl font-light mb-6">Contact Information</h3>

                  {contactLoading ? (
                    <p className="text-stone-400">Loading contact info...</p>
                  ) : (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const result = await updateMutation('contact_info', contactInfo?.id || 1, {
                          email: contactEmail,
                          phone: contactPhone,
                          locations: contactLocations,
                          maps_url: contactMapsUrl,
                          location_map_url: contactMapEmbedUrl,
                          instagram: contactInstagram,
                          linkedin: contactLinkedin,
                          youtube: contactYoutube,
                        });
                        if (result.success) {
                          showSuccessNotification('Contact info saved!');
                        }
                      }}
                      className="space-y-6"
                    >
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label className="text-sm uppercase tracking-widest text-stone-400 block mb-2">Email</label>
                          <input
                            type="email"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            placeholder="contact@example.com"
                            className="w-full bg-white/10 border border-white/20 rounded px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-white/40"
                          />
                        </div>
                        <div>
                          <label className="text-sm uppercase tracking-widest text-stone-400 block mb-2">Phone</label>
                          <input
                            type="tel"
                            value={contactPhone}
                            onChange={(e) => setContactPhone(e.target.value)}
                            placeholder="+44 (0) 20 1234 5678"
                            className="w-full bg-white/10 border border-white/20 rounded px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-white/40"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm uppercase tracking-widest text-stone-400 block mb-2">Locations (one per line)</label>
                        <textarea
                          value={contactLocations}
                          onChange={(e) => setContactLocations(e.target.value)}
                          placeholder="London, UK&#10;New York, USA&#10;Singapore, SG"
                          rows={4}
                          className="w-full bg-white/10 border border-white/20 rounded px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-white/40 resize-none"
                        />
                      </div>

                      <div>
                        <label className="text-sm uppercase tracking-widest text-stone-400 block mb-2">Google Maps URL (Share Link)</label>
                        <input
                          type="url"
                          value={contactMapsUrl}
                          onChange={(e) => setContactMapsUrl(e.target.value)}
                          placeholder="https://maps.app.goo.gl/..."
                          className="w-full bg-white/10 border border-white/20 rounded px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-white/40"
                        />
                        <p className="text-xs text-stone-500 mt-2">
                          Get from Google Maps → Share → Copy link. Users click locations to open this.
                        </p>
                      </div>

                      <div>
                        <label className="text-sm uppercase tracking-widest text-stone-400 block mb-2">Embedded Map URL (Optional)</label>
                        <textarea
                          value={contactMapEmbedUrl}
                          onChange={(e) => setContactMapEmbedUrl(e.target.value)}
                          placeholder="https://www.google.com/maps/embed?pb=..."
                          rows={3}
                          className="w-full bg-white/10 border border-white/20 rounded px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-white/40 resize-none"
                        />
                        <p className="text-xs text-stone-500 mt-2">
                          Paste Google Maps embed iframe src for custom map display. If empty, uses auto-generated embed from share link.
                        </p>
                      </div>

                      <div className="grid md:grid-cols-3 gap-6">
                        <div>
                          <label className="text-sm uppercase tracking-widest text-stone-400 block mb-2">Instagram URL</label>
                          <input
                            type="url"
                            value={contactInstagram}
                            onChange={(e) => setContactInstagram(e.target.value)}
                            placeholder="https://instagram.com/..."
                            className="w-full bg-white/10 border border-white/20 rounded px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-white/40"
                          />
                        </div>
                        <div>
                          <label className="text-sm uppercase tracking-widest text-stone-400 block mb-2">LinkedIn URL</label>
                          <input
                            type="url"
                            value={contactLinkedin}
                            onChange={(e) => setContactLinkedin(e.target.value)}
                            placeholder="https://linkedin.com/..."
                            className="w-full bg-white/10 border border-white/20 rounded px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-white/40"
                          />
                        </div>
                        <div>
                          <label className="text-sm uppercase tracking-widest text-stone-400 block mb-2">YouTube URL</label>
                          <input
                            type="url"
                            value={contactYoutube}
                            onChange={(e) => setContactYoutube(e.target.value)}
                            placeholder="https://youtube.com/..."
                            className="w-full bg-white/10 border border-white/20 rounded px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:border-white/40"
                          />
                        </div>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        className="w-full bg-white text-black py-3 rounded font-light uppercase tracking-widest hover:bg-stone-200 transition-colors"
                      >
                        Save Contact Info
                      </motion.button>
                    </form>
                  )}
                </motion.div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
