import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Youtube } from 'lucide-react';
import NavMenu from '../components/NavMenu';
import { useEventVideos } from '../hooks/useMariaDbData';
import { LoadingScreenWithText } from '../components/LoadingScreen';

export default function Events() {
  const { data: supabaseVideos, loading, error } = useEventVideos();
  const [videos, setVideos] = useState([]);

  // Update videos when Supabase data is loaded
  useEffect(() => {
    if (supabaseVideos && supabaseVideos.length > 0) {
      setVideos(supabaseVideos);
    }
  }, [supabaseVideos]);

  if (loading) {
    return <LoadingScreenWithText text="Loading Events..." />;
  }

  if (error) {
    return (
      <div className="bg-black text-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Failed to load events</p>
          <p className="text-stone-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black text-white min-h-screen">
      <NavMenu />

      {/* Page Header */}
      <div className="pt-32 px-8 pb-12">
        <Link to="/" className="inline-flex items-center gap-2 text-stone-400 hover:text-white transition-colors mb-8 group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm uppercase tracking-widest">Back</span>
        </Link>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-7xl font-light mb-4"
        >
          Events
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-stone-400 text-lg max-w-2xl"
        >
          Watch our latest events, showcases, and project walkthroughs
        </motion.p>
      </div>

      {/* Video Grid */}
      <div className="px-8 pb-32">
        {videos.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-stone-600"
          >
            <Youtube size={48} className="mb-4 opacity-30" />
            <p className="text-sm uppercase tracking-widest">No videos yet. Add them via the Admin panel.</p>
          </motion.div>
        ) : (
          <div className="space-y-16">
            {/* YouTube Videos Section */}
            {videos.filter(v => v.type === 'youtube').length > 0 && (
              <div>
                <h2 className="text-3xl font-light mb-8">YouTube Videos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {videos.filter(v => v.type === 'youtube').map((video, idx) => (
                    <motion.div
                      key={video.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1, duration: 0.6 }}
                      className="rounded-lg overflow-hidden bg-stone-900 border border-white/10 hover:border-white/20 transition-colors"
                    >
                      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                        {video.youtube_id && (
                          <iframe
                            className="absolute inset-0 w-full h-full"
                            src={`https://www.youtube-nocookie.com/embed/${video.youtube_id}?rel=0&modestbranding=1`}
                            title={video.title}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        )}
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-sm font-light tracking-wide text-stone-300">{video.title}</p>
                        <p className="text-xs text-yellow-600 mt-1 uppercase tracking-widest">📺 YouTube</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Uploaded Videos Section */}
            {videos.filter(v => v.type === 'upload').length > 0 && (
              <div>
                <h2 className="text-3xl font-light mb-8">Videos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {videos.filter(v => v.type === 'upload').map((video, idx) => {
                    // Use URL from database (local cPanel server URL)
                    const videoUrl = video.url;

                    console.log(`🎬 Video ${idx}: "${video.title}"`);
                    console.log(`   Database URL: ${video.url}`);
                    console.log(`   Final URL: ${videoUrl}`);

                    return (
                      <motion.div
                        key={video.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1, duration: 0.6 }}
                        className="rounded-lg overflow-hidden bg-stone-900 border border-white/10 hover:border-white/20 transition-colors"
                      >
                        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                          {video.url && (
                            <video
                              className="absolute inset-0 w-full h-full"
                              controls
                              controlsList="nodownload"
                              preload="metadata"
                              style={{ background: '#1c1917' }}
                              onError={(e) => {
                                console.error(`❌ Video error for "${video.title}":`, e);
                                console.error(`   URL: ${videoUrl}`);
                              }}
                              onLoadStart={() => console.log(`⬇️ Loading: ${video.title}`)}
                              onCanPlay={() => console.log(`✅ Can play: ${video.title}`)}
                            >
                              <source src={videoUrl} type="video/mp4" />
                              Your browser does not support the video tag.
                            </video>
                          )}
                        </div>
                        <div className="px-4 py-3">
                          <p className="text-sm font-light tracking-wide text-stone-300">{video.title}</p>
                          <p className="text-xs text-blue-600 mt-1 uppercase tracking-widest">🎬 Video</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
