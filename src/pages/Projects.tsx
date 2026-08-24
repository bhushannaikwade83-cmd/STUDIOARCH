import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useProjects } from '../hooks/useMariaDbData';
import { LoadingScreenWithText } from '../components/LoadingScreen';

export const PROJECTS = [
  {
    id: 1,
    name: "The Obsidian Villa",
    location: "Mykonos, Greece",
    year: "2024",
    category: "Residential",
    description: "A stunning cliffside villa featuring panoramic Aegean views with cutting-edge sustainable architecture and minimalist design.",
    images: [
      "/architecture-1.jpg",
      "/architecture-2.jpg",
    ],
    size: 'large',
    locationmapurl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3132.4234567890!2d25.3932!3d37.4467!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzfCsDI2JzQ1LjciTiAyNcKwMjMnNDUuNiJF!5e0!3m2!1sen!2sus!4v1234567890'
  },
  {
    id: 2,
    name: "Nexus Headquarters",
    location: "Singapore",
    year: "2023",
    category: "Commercial",
    description: "A futuristic corporate headquarters integrating smart building technology with luxury office spaces.",
    images: [
      "/architecture-3.jpg",
    ],
    size: 'medium',
    locationmapurl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.6234567890!2d103.8198!3d1.3521!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMcKwMjEnMDcuNiJOIDEwM8KwNDknMDcuNCJF!5e0!3m2!1sen!2sus!4v1234567890'
  },
  {
    id: 3,
    name: "Alpine Retreat",
    location: "Zermatt, Switzerland",
    year: "2024",
    category: "Hospitals",
    description: "Exclusive medical facility combining traditional aesthetics with modern healthcare technology.",
    images: [
      "/architecture-4.jpg",
    ],
    size: 'medium',
    locationmapurl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2732.5234567890!2d7.7491!3d46.0207!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z0JTQtdC50L3Qv9C40YM!5e0!3m2!1sen!2sus!4v1234567890'
  },
  {
    id: 4,
    name: "Lumina Pavilion",
    location: "Kyoto, Japan",
    year: "2022",
    category: "Schools",
    description: "An avant-garde educational center showcasing the fusion of Eastern philosophy and Western design principles.",
    images: [
      "/architecture-5.jpg",
      "/architecture-1.jpg",
    ],
    size: 'large',
    locationmapurl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3268.2234567890!2d135.7681!3d35.0116!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzXCsDAwJzQ1LjgiTiAxMzXCsDQ2JzA1LjAiRQ!5e0!3m2!1sen!2sus!4v1234567890'
  },
  {
    id: 5,
    name: "Urban Sanctuary",
    location: "New York, USA",
    year: "2023",
    category: "Residential",
    description: "A contemporary urban residence blending industrial elements with warm minimalist interiors.",
    images: [
      "/architecture-2.jpg",
    ],
    size: 'small',
    locationmapurl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3024.1234567890!2d-74.0060!3d40.7128!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z0JTQtdC50L3Qv9C40YM!5e0!3m2!1sen!2sus!4v1234567890'
  },
  {
    id: 6,
    name: "Coastal Living",
    location: "Malibu, California",
    year: "2024",
    category: "PMC",
    description: "Premium mixed-use complex with breathtaking views and sustainable architecture.",
    images: [
      "/architecture-3.jpg",
      "/architecture-4.jpg",
    ],
    size: 'large',
    locationmapurl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3318.7234567890!2d-118.6837!3d34.0195!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z0JTQtdC50L3Qv9C40YM!5e0!3m2!1sen!2sus!4v1234567890'
  },
  {
    id: 7,
    name: "Serenity Interiors",
    location: "Dubai, UAE",
    year: "2024",
    category: "Interior",
    description: "Luxurious interior design project showcasing sophisticated minimalism with premium materials and curated lighting to create harmonious living spaces.",
    images: [
      "/architecture-1.jpg",
      "/architecture-2.jpg",
    ],
    size: 'large',
    locationmapurl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3618.3234567890!2d55.2708!3d25.2048!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjXCsDEyJzE3LjMiTiA1NcKwMTYnMDUuMiJF!5e0!3m2!1sen!2sus!4v1234567890'
  },
];

export default function Projects() {
  const location = useLocation();
  const selectedCategoryFromState = (location.state as any)?.selectedCategory || null;

  const { data: supabaseProjects, loading, error } = useProjects();
  const [projects, setProjects] = useState(() => PROJECTS);
  const [selectedProject, setSelectedProject] = useState<typeof PROJECTS[0] | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [hoveredProjectId, setHoveredProjectId] = useState<number | null>(null);
  const fadeTimeoutRef = useRef<{ [key: number]: NodeJS.Timeout }>({});
  const slideshowIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update projects when Supabase data is loaded
  useEffect(() => {
    if (supabaseProjects && supabaseProjects.length > 0) {
      setProjects(supabaseProjects as typeof PROJECTS);
    }
  }, [supabaseProjects]);

  // Auto-advance slideshow when project is selected (but NOT when video is playing)
  useEffect(() => {
    if (!selectedProject || selectedProject.images.length <= 1) return;

    // Don't auto-advance if current item is a video
    const currentImage = selectedProject.images[selectedImageIndex];
    if (isVideoUrl(currentImage)) {
      console.log('🎬 Video detected - auto-slide paused');
      return;
    }

    const startSlideshow = () => {
      slideshowIntervalRef.current = setInterval(() => {
        setSelectedImageIndex((prev) => (prev + 1) % selectedProject.images.length);
      }, 5000); // Change image every 5 seconds
    };

    startSlideshow();

    return () => {
      if (slideshowIntervalRef.current) {
        clearInterval(slideshowIntervalRef.current);
      }
    };
  }, [selectedProject, selectedImageIndex]);

  // Filter projects by selected category
  const filteredProjects = selectedCategoryFromState
    ? projects.filter((p) => p.category === selectedCategoryFromState)
    : projects;

  const getGridClass = (size: string) => {
    if (size === 'large') return 'md:col-span-2 md:row-span-2';
    if (size === 'medium') return 'md:col-span-1 md:row-span-1';
    return 'md:col-span-1 md:row-span-1';
  };

  const handleHoverStart = (projectId: number) => {
    // Clear any pending timeout when hovering
    if (fadeTimeoutRef.current[projectId]) {
      clearTimeout(fadeTimeoutRef.current[projectId]);
    }

    // Preload project images on hover for faster modal opening
    const project = filteredProjects.find(p => p.id === projectId);
    if (project && project.images) {
      project.images.forEach((img) => {
        if (!img.startsWith('data:') && !img.includes('blob:')) {
          const imgPreload = new Image();
          imgPreload.src = img;
        }
      });
    }

    setHoveredProjectId(projectId);
  };

  const handleHoverEnd = (projectId: number) => {
    // Only start fade timeout if we're leaving the currently hovered project
    if (hoveredProjectId === projectId) {
      // Set a 3-second delay before fading back
      fadeTimeoutRef.current[projectId] = setTimeout(() => {
        setHoveredProjectId(null);
      }, 3000);
    }
  };

  const isVideoUrl = (url: string) => {
    if (!url) return false;

    // Check for video MIME types in base64 data URLs
    if (url.startsWith('data:video/')) {
      return true;
    }

    // Check for video file extensions
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  if (loading) {
    return <LoadingScreenWithText text="Loading Projects..." />;
  }

  if (error) {
    return (
      <div className="bg-black text-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Failed to load projects</p>
          <p className="text-stone-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black text-white min-h-screen">
      {/* Header with visible back button and logo */}
      <div className="fixed top-0 w-full z-40 px-8 py-6 flex justify-between items-center bg-black/80 backdrop-blur-md border-b border-white/10">
        <Link to="/" className="flex items-center gap-2 hover:opacity-60 transition-opacity">
          <ArrowLeft size={20} className="text-white" />
          <span className="text-sm uppercase tracking-widest text-white">Back</span>
        </Link>
        <Link to="/" className="hover:opacity-80 transition-opacity">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="relative w-40 h-12 md:w-48 md:h-16"
          >
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
          </motion.div>
        </Link>
        <div className="w-20" />
      </div>

      {/* Title */}
      <div className="pt-32 px-8 pb-12 bg-black">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-7xl font-light mb-4 text-white"
        >
          {selectedCategoryFromState ? selectedCategoryFromState : 'Our Projects'}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-stone-400 text-lg max-w-2xl"
        >
          {selectedCategoryFromState
            ? `Explore our ${selectedCategoryFromState.toLowerCase()} projects`
            : 'Explore our portfolio of architectural masterpieces'
          }
        </motion.p>
      </div>

      {/* Masonry Gallery */}
      <div className="px-8 pb-32 bg-black">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[400px] md:auto-rows-[400px]">
          {filteredProjects.map((project, idx) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.6 }}
              className={`${getGridClass(project.size)} cursor-pointer relative overflow-hidden rounded-lg shadow-2xl`}
              onClick={() => {
                setSelectedProject(project);
                setSelectedImageIndex(0);
              }}
              onHoverStart={() => handleHoverStart(project.id)}
              onHoverEnd={() => handleHoverEnd(project.id)}
            >
              <div className="w-full h-full relative bg-black">
                {/* Image with fade on hover */}
                <div className="w-full h-full overflow-hidden bg-stone-900">
                  <motion.img
                    src={project.images[0]}
                    alt={project.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    animate={{
                      opacity: hoveredProjectId === project.id ? 1 : 0.15,
                      scale: hoveredProjectId === project.id ? 1.08 : 1,
                    }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>

                {/* Gradient Overlay */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
                  animate={{ opacity: hoveredProjectId === project.id ? 0.7 : 0.4 }}
                  transition={{ duration: 0.5 }}
                />

                {/* Project Info Overlay */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 p-6"
                  animate={{
                    opacity: hoveredProjectId === project.id ? 1 : 0,
                    y: hoveredProjectId === project.id ? 0 : 20,
                  }}
                  transition={{ duration: 0.4 }}
                >
                  <h3 className="text-xl md:text-2xl font-light mb-2 text-white">{project.name}</h3>
                  <p className="text-sm text-stone-300">{project.location} • {project.year}</p>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Project Detail Modal */}
      <AnimatePresence mode="wait">
        {selectedProject && (
          <motion.div
            initial={{ clipPath: 'polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)' }}
            animate={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' }}
            exit={{ clipPath: 'polygon(calc(100% - 80px) 24px, calc(100% - 80px) 24px, calc(100% - 80px) 64px, calc(100% - 80px) 64px)' }}
            transition={{ duration: 2.5, ease: [0.43, 0.13, 0.23, 0.96] }}
            className="fixed inset-0 bg-black z-50 overflow-y-auto"
            style={{ originX: 1, originY: 0 }}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedProject(null)}
              className="fixed top-6 right-8 z-50 hover:opacity-60 transition-opacity"
            >
              <X size={24} className="text-white" />
            </button>

            <div className="pt-20 px-8 pb-24 bg-black">
              {/* Project Header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="max-w-6xl mx-auto mb-16"
              >
                <span className="inline-block bg-white/10 text-white px-4 py-2 text-xs uppercase tracking-widest rounded mb-6 border border-white/20">
                  {selectedProject.category}
                </span>
                <h1 className="text-6xl md:text-7xl font-light mb-6 text-white">{selectedProject.name}</h1>
                <div className="flex items-center gap-8 mb-12">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-stone-500 mb-2">Location</p>
                    <p className="text-lg text-white">{selectedProject.location}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-stone-500 mb-2">Year</p>
                    <p className="text-lg text-white">{selectedProject.year}</p>
                  </div>
                </div>
              </motion.div>

              {/* Main Image Carousel */}
              {selectedProject.images && selectedProject.images.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.8 }}
                  className="w-full mb-12 -mx-8 px-8"
                >
                  <div className="relative flex items-center gap-4 mb-8">
                    {/* Previous Button */}
                    {selectedProject.images.length > 1 && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setSelectedImageIndex((selectedImageIndex - 1 + selectedProject.images.length) % selectedProject.images.length);
                          // Reset slideshow timer on manual click
                          if (slideshowIntervalRef.current) clearInterval(slideshowIntervalRef.current);
                          slideshowIntervalRef.current = setInterval(() => {
                            setSelectedImageIndex((prev) => (prev + 1) % selectedProject.images.length);
                          }, 5000);
                        }}
                        className="p-3 bg-white/10 border border-white/20 rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
                      >
                        <ChevronLeft size={24} className="text-white" />
                      </motion.button>
                    )}

                    {/* Main Image */}
                    <div className="h-[750px] flex-1 rounded-lg overflow-hidden shadow-lg bg-stone-900">
                      {isVideoUrl(selectedProject.images[selectedImageIndex]) ? (
                        <motion.div
                          key={selectedImageIndex}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5 }}
                          className="w-full h-full"
                        >
                          <video
                            src={selectedProject.images[selectedImageIndex]}
                            crossOrigin="anonymous"
                            controls
                            controlsList="nodownload"
                            preload="metadata"
                            className="w-full h-full object-cover"
                            style={{ background: '#1c1917' }}
                            onError={(e) => {
                              const video = e.target as HTMLVideoElement;
                              console.error('❌ Video error:', selectedProject.images[selectedImageIndex]);
                              console.error('Video error code:', video.error?.code, video.error?.message);
                              console.error('Full error:', video.error);
                            }}
                            onLoadStart={() => console.log('⬇️ Loading video...')}
                            onCanPlay={() => console.log('✅ Video ready to play')}
                          />
                        </motion.div>
                      ) : (
                        <motion.img
                          key={selectedImageIndex}
                          src={selectedProject.images[selectedImageIndex]}
                          alt={`${selectedProject.name} - View ${selectedImageIndex + 1}`}
                          className="w-full h-full object-cover"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5 }}
                        />
                      )}
                    </div>

                    {/* Next Button */}
                    {selectedProject.images.length > 1 && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setSelectedImageIndex((selectedImageIndex + 1) % selectedProject.images.length);
                          // Reset slideshow timer on manual click
                          if (slideshowIntervalRef.current) clearInterval(slideshowIntervalRef.current);
                          slideshowIntervalRef.current = setInterval(() => {
                            setSelectedImageIndex((prev) => (prev + 1) % selectedProject.images.length);
                          }, 5000);
                        }}
                        className="p-3 bg-white/10 border border-white/20 rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
                      >
                        <ChevronRight size={24} className="text-white" />
                      </motion.button>
                    )}
                  </div>

                  {/* Media Counter */}
                  <div className="text-sm text-stone-500 mb-4">
                    {isVideoUrl(selectedProject.images[selectedImageIndex]) ? '🎬 Video' : '🖼️ Image'} {selectedImageIndex + 1} of {selectedProject.images.length}
                  </div>

                  {/* Image Navigation Thumbnails */}
                  {selectedProject.images.length > 1 && (
                    <div className={`flex gap-4 pb-2 ${selectedProject.images.length <= 5 ? 'justify-center' : 'overflow-x-auto'}`}>
                      {selectedProject.images.map((img, idx) => (
                        <motion.button
                          key={idx}
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`h-20 w-24 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all relative bg-stone-800 ${
                            selectedImageIndex === idx ? 'border-white scale-105' : 'border-stone-600 hover:border-stone-500'
                          }`}
                          whileHover={{ scale: 1.05 }}
                        >
                          {isVideoUrl(img) ? (
                            <>
                              <div className="w-full h-full bg-black/80 flex items-center justify-center">
                                <span className="text-2xl">🎬</span>
                              </div>
                            </>
                          ) : (
                            <img
                              src={img}
                              alt={`Thumbnail ${idx + 1}`}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          )}
                        </motion.button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Location Map Section */}
              {selectedProject.locationmapurl && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="max-w-6xl mx-auto mb-12"
                >
                  <div className="border-t border-white/10 pt-12">
                    <h2 className="text-3xl font-light mb-6 text-white">Location</h2>
                    <div className="h-96 bg-stone-900 rounded-lg overflow-hidden">
                      <iframe
                        src={selectedProject.locationmapurl}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Description Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="max-w-6xl mx-auto"
              >
                <div className="border-t border-white/10 pt-12">
                  <h2 className="text-3xl font-light mb-6 text-white">Project Details</h2>
                  <p className="text-lg text-stone-400 leading-relaxed max-w-3xl">
                    {selectedProject.description} This architectural masterpiece represents the pinnacle of luxury design, combining innovative materials with timeless aesthetic principles. Every detail has been meticulously crafted to create spaces that not only function flawlessly but also inspire and elevate the human experience.
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
