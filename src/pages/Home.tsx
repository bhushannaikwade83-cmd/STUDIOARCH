import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion';
import { Mail, Instagram, Linkedin, MapPin, Phone } from 'lucide-react';
import { PROJECTS } from './Projects';
import { useProjects, useGallery, useContactInfo } from '../hooks/useMariaDbData';

// Book-opening transition variants
const transitionVariants = [
  // Variant 1: Book opens from bottom-right to top-left
  {
    initial: { clipPath: 'polygon(100% 100%, 100% 100%, 100% 100%, 100% 100%)' },
    animate: { clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' },
    exit: { clipPath: 'polygon(0% 0%, 0% 0%, 0% 0%, 0% 0%)' },
  },
  // Variant 2: Book opens from top-left to bottom-right
  {
    initial: { clipPath: 'polygon(0% 0%, 0% 0%, 0% 0%, 0% 0%)' },
    animate: { clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' },
    exit: { clipPath: 'polygon(100% 100%, 100% 100%, 100% 100%, 100% 100%)' },
  },
];

export default function Home() {
  // Fetch projects from Supabase
  const { data: supabaseProjects, loading: projectsLoading } = useProjects();
  // Fetch carousel images from gallery with refetch
  const { data: galleryFolders, refetch: refetchGallery } = useGallery();
  // Fetch contact info from Supabase
  const { contactInfo } = useContactInfo();

  const [projects, setProjects] = useState<typeof PROJECTS>([]);
  const [carouselImages, setCarouselImages] = useState<string[]>([]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [autoCarouselIndex, setAutoCarouselIndex] = useState(0);
  const [autoCarouselActive, setAutoCarouselActive] = useState(true);
  const [hasScrolledPastCarousel, setHasScrolledPastCarousel] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredProjectId, setHoveredProjectId] = useState<number | null>(null);
  const fadeTimeoutRef = useRef<{ [key: number]: NodeJS.Timeout }>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { scrollYProgress, scrollY } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  // Update projects when Supabase data is loaded
  useEffect(() => {
    if (supabaseProjects && supabaseProjects.length > 0) {
      setProjects(supabaseProjects as typeof PROJECTS);
    }
  }, [supabaseProjects]);

  // Extract gallery images for carousel from database
  useEffect(() => {
    if (galleryFolders && Array.isArray(galleryFolders)) {
      const images = galleryFolders.flatMap((folder: any) =>
        (folder.gallery_items || []).map((item: any) => item.image_url)
      );

      if (images.length > 0) {
        setCarouselImages(images);
      }
    }
  }, [galleryFolders]);

  // Get unique categories
  const categories = Array.from(new Set(projects.map((p) => p.category)));

  // Filter projects - show only 1 per category
  const filteredProjects = (() => {
    const filtered = selectedCategory
      ? projects.filter((p) => p.category === selectedCategory)
      : projects;

    // Keep only 1 project per category
    const categoryMap = new Map();
    filtered.forEach((project) => {
      if (!categoryMap.has(project.category)) {
        categoryMap.set(project.category, project);
      }
    });

    return Array.from(categoryMap.values());
  })();

  // Handle project hover
  const handleProjectHoverStart = (projectId: number) => {
    if (fadeTimeoutRef.current[projectId]) {
      clearTimeout(fadeTimeoutRef.current[projectId]);
    }
    setHoveredProjectId(projectId);
  };

  const handleProjectHoverEnd = (projectId: number) => {
    if (hoveredProjectId === projectId) {
      fadeTimeoutRef.current[projectId] = setTimeout(() => {
        setHoveredProjectId(null);
      }, 4000);
    }
  };

  // Get grid class for masonry layout
  const getGridClass = (size: string) => {
    if (size === 'large') return 'md:col-span-2 md:row-span-2';
    if (size === 'medium') return 'md:col-span-1 md:row-span-1';
    return 'md:col-span-1 md:row-span-1';
  };

  // Get current transition variant based on index
  const getCurrentVariant = (index: number) => {
    return transitionVariants[index % transitionVariants.length];
  };

  // Preload next carousel image for smooth transitions
  useEffect(() => {
    if (carouselImages.length === 0) return;

    const nextIndex = (autoCarouselIndex + 1) % carouselImages.length;
    const nextImage = new Image();
    nextImage.src = carouselImages[nextIndex];
  }, [autoCarouselIndex, carouselImages]);

  // Auto carousel effect
  useEffect(() => {
    if (!autoCarouselActive || carouselImages.length === 0) return;

    const interval = setInterval(() => {
      setAutoCarouselIndex((prev) => (prev + 1) % carouselImages.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [autoCarouselActive, carouselImages]);

  // Handle scroll - restart carousel if user scrolls back up
  useEffect(() => {
    const unsubscribe = scrollY.onChange((value) => {
      if (value > 100) {
        setAutoCarouselActive(false);
        setHasScrolledPastCarousel(true);
      } else if (value < 50 && hasScrolledPastCarousel) {
        // User scrolled back to top
        setAutoCarouselActive(true);
        setHasScrolledPastCarousel(false);
      }
    });

    return unsubscribe;
  }, [scrollY, hasScrolledPastCarousel]);

  // Refetch gallery when page becomes visible (e.g., returning from admin)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('📸 Refetching gallery on page focus...');
        refetchGallery();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refetchGallery]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);

  const currentVariant = getCurrentVariant(autoCarouselIndex);

  return (
    <div ref={containerRef} className="bg-black text-white min-h-screen overflow-x-hidden selection:bg-white selection:text-black">
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-white origin-left z-50"
        style={{ scaleX }}
      />

      {/* Logo with hover color effect */}
      <Link to="/">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="fixed top-4 md:top-6 right-4 md:right-8 z-40 hover:opacity-80 transition-opacity"
        >
          <div className="relative w-40 h-12 md:w-48 md:h-16">
            {/* Black & White version (default) */}
            <motion.img
              src="/logo-bw.png"
              alt="1StudioArch"
              className="absolute inset-0 w-full h-full object-contain"
              animate={{ opacity: 1 }}
              whileHover={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
            {/* Color version (on hover) */}
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

      {/* Side Menu Button - Center Position */}
      <motion.button
        initial={{ opacity: 1 }}
        animate={{ opacity: menuOpen ? 0 : 1 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (toggleTimeoutRef.current) clearTimeout(toggleTimeoutRef.current);
          setMenuOpen(true);
          toggleTimeoutRef.current = setTimeout(() => {
            toggleTimeoutRef.current = null;
          }, 500);
        }}
        disabled={menuOpen}
        className="fixed left-4 md:left-8 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-md p-3 md:p-4 rounded-full border border-white/20 transition-colors cursor-pointer pointer-events-auto disabled:pointer-events-none"
      >
        <span className="w-5 md:w-6 h-0.5 bg-white transition-all duration-300 pointer-events-none" />
        <span className="w-5 md:w-6 h-0.5 bg-white transition-all duration-300 pointer-events-none" />
      </motion.button>

      {/* Side Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, x: -300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            transition={{ duration: 0.3 }}
            className="fixed left-0 top-0 h-screen w-56 md:w-64 bg-black/95 backdrop-blur-md text-white z-40 flex flex-col justify-between px-6 md:px-8 border-r border-white/10 py-12"
          >
            <div className="space-y-8 md:space-y-12">
              {[
                { to: '/', label: 'Home' },
                { to: '/philosophy', label: 'Philosophy' },
                { to: '/journal', label: 'Journal' },
                { to: '/events', label: 'Events' },
                { to: '/contact', label: 'Contact' },
              ].map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className="text-xl md:text-2xl font-light tracking-widest uppercase hover:opacity-60 transition-opacity block"
                >
                  {label}
                </Link>
              ))}
            </div>

            {/* Close Button at Bottom */}
            <motion.button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (toggleTimeoutRef.current) clearTimeout(toggleTimeoutRef.current);
                setMenuOpen(false);
                toggleTimeoutRef.current = setTimeout(() => {
                  toggleTimeoutRef.current = null;
                }, 500);
              }}
              className="flex flex-col gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-md p-3 md:p-4 rounded-full border border-white/20 transition-colors cursor-pointer pointer-events-auto"
            >
              <span className="w-5 md:w-6 h-0.5 bg-white transition-all duration-300 rotate-45 translate-y-2 origin-center pointer-events-none" />
              <span className="w-5 md:w-6 h-0.5 bg-white transition-all duration-300 -rotate-45 -translate-y-2 origin-center pointer-events-none" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto-Carousel Section - Layered Onion Peeling Effect */}
      <section className="relative h-[150vh] w-full overflow-hidden sticky top-0 bg-black z-10">
        {/* Background/Next Image Layer */}
        {carouselImages.length > 0 && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url('${carouselImages[(autoCarouselIndex + 1) % carouselImages.length]}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
            zIndex: 1,
          }}
        />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" style={{ zIndex: 2 }} />

        {/* Top Layer - Peels Away */}
        {carouselImages.length > 0 && (
        <AnimatePresence mode="wait">
          <motion.div
            key={autoCarouselIndex}
            initial={currentVariant.initial}
            animate={currentVariant.animate}
            exit={currentVariant.exit}
            transition={{
              duration: 3,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="absolute inset-0"
            style={{
              originX: 0.5,
              originY: 0.5,
              zIndex: 3,
            }}
          >
            <div
              className="w-full h-full"
              style={{
                backgroundImage: `url('${carouselImages[autoCarouselIndex]}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center center',
                backgroundRepeat: 'no-repeat',
              }}
            />

            {/* Architecture Quote - Transitions with image */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-12 right-12 max-w-sm bg-black/40 backdrop-blur-md px-6 py-4 rounded-lg border border-white/20"
            >
              <p className="text-base md:text-lg font-light italic text-white leading-relaxed">
                "Space is the beginning of all architecture. The creation of light and shade, the volume of material, and the void between them define the soul of design."
              </p>
            </motion.div>
          </motion.div>
        </AnimatePresence>
        )}
      </section>

      {/* Projects Section */}
      <section className="relative bg-black py-24 px-8">
        <div className="max-w-7xl mx-auto">
          {/* Section Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 className="text-5xl md:text-7xl font-light mb-6">Our Projects</h2>
            <p className="text-stone-400 text-lg max-w-2xl">
              Explore our portfolio of architectural masterpieces across diverse sectors
            </p>
          </motion.div>

          {/* Category Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            viewport={{ once: true }}
            className="mb-12 flex flex-wrap gap-20"
          >
            <motion.button
              whileHover={{ opacity: 1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory(null)}
              className={`font-light uppercase tracking-widest text-sm transition-all ${
                selectedCategory === null
                  ? 'text-white'
                  : 'text-stone-500 hover:text-white'
              }`}
            >
              All
            </motion.button>
            {categories.map((category) => (
              <motion.button
                key={category}
                whileHover={{ opacity: 1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(category)}
                className={`font-light uppercase tracking-widest text-sm transition-all ${
                  selectedCategory === category
                    ? 'text-white'
                    : 'text-stone-500 hover:text-white'
                }`}
              >
                {category}
              </motion.button>
            ))}
          </motion.div>

          {/* Projects Masonry Grid */}
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px] md:auto-rows-[350px]"
          >
            {filteredProjects && filteredProjects.map((project, idx) => (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                viewport={{ once: true }}
                className={`${getGridClass(project.size)} cursor-pointer relative overflow-hidden rounded-lg shadow-2xl`}
                onMouseEnter={() => handleProjectHoverStart(project.id)}
                onMouseLeave={() => handleProjectHoverEnd(project.id)}
                onTouchStart={() => handleProjectHoverStart(project.id)}
                onTouchEnd={() => handleProjectHoverEnd(project.id)}
              >
                <Link to="/projects" state={{ selectedCategory: project.category }} className="block w-full h-full relative">
                  <div className="w-full h-full relative bg-black">
                    {/* Image with opacity control */}
                    <div className="w-full h-full overflow-hidden bg-stone-900">
                      <motion.img
                        src={project.images?.[0] || ''}
                        alt={project.title || project.name || 'Project'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        animate={{
                          opacity: hoveredProjectId === project.id ? 1 : 0.2,
                          scale: hoveredProjectId === project.id ? 1.08 : 1,
                        }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
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
                      <span className="inline-block bg-white/20 text-white px-3 py-1 text-xs uppercase tracking-widest rounded mb-3 border border-white/20">
                        {project.category}
                      </span>
                      <h3 className="text-xl font-light mb-2 text-white">{project.name}</h3>
                      <p className="text-sm text-stone-300">{project.location} • {project.year}</p>
                    </motion.div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>

          {/* View All Button */}
          {selectedCategory && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-12 text-center"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(null)}
                className="border border-white/20 text-white px-8 py-3 rounded-lg font-light uppercase tracking-widest hover:bg-white/10 transition-colors"
              >
                View All Projects
              </motion.button>
            </motion.div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-black border-t border-white/10 py-24 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-16 mb-16">
            {/* Brand */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h4 className="text-2xl font-light mb-6">1StudioArch</h4>
              <p className="text-stone-400 mb-8 leading-relaxed">
                Redefining contemporary luxury through precision, materiality, and light. Creating spaces that endure beyond aesthetics.
              </p>
              <div className="flex gap-6">
                <motion.a
                  href="#"
                  whileHover={{ scale: 1.2 }}
                  className="text-stone-400 hover:text-white transition-colors"
                >
                  <Instagram size={20} />
                </motion.a>
                <motion.a
                  href="#"
                  whileHover={{ scale: 1.2 }}
                  className="text-stone-400 hover:text-white transition-colors"
                >
                  <Mail size={20} />
                </motion.a>
              </div>
            </motion.div>

            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <h5 className="uppercase tracking-widest text-xs text-stone-500 mb-8 font-semibold">Contact</h5>
              <div className="space-y-4">
                {contactInfo?.email && (
                  <motion.div
                    className="flex items-center gap-3 group cursor-pointer"
                    whileHover={{ x: 5 }}
                  >
                    <Mail size={16} className="text-stone-400 group-hover:text-white transition-colors" />
                    <a href={`mailto:${contactInfo.email}`} className="text-sm hover:text-stone-300 transition-colors">
                      {contactInfo.email}
                    </a>
                  </motion.div>
                )}
                {contactInfo?.phone && (
                  <motion.div
                    className="flex items-center gap-3 group cursor-pointer"
                    whileHover={{ x: 5 }}
                  >
                    <Phone size={16} className="text-stone-400 group-hover:text-white transition-colors" />
                    <a href={`tel:${contactInfo.phone}`} className="text-sm hover:text-stone-300 transition-colors">
                      {contactInfo.phone}
                    </a>
                  </motion.div>
                )}
                {contactInfo?.locations && (
                  <motion.div
                    className="flex items-start gap-3 group cursor-pointer"
                    whileHover={{ x: 5 }}
                    onClick={() => {
                      console.log('🔗 Footer: Clicked locations. maps_url:', contactInfo?.maps_url);
                      if (contactInfo?.maps_url && contactInfo.maps_url.trim()) {
                        console.log('✅ Footer: Opening:', contactInfo.maps_url);
                        window.open(contactInfo.maps_url, '_blank');
                      } else {
                        console.warn('❌ Footer: No maps_url set');
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        if (contactInfo?.maps_url && contactInfo.maps_url.trim()) {
                          window.open(contactInfo.maps_url, '_blank');
                        }
                      }
                    }}
                  >
                    <MapPin size={16} className="text-stone-400 group-hover:text-white transition-colors mt-0.5 flex-shrink-0" />
                    <div className="text-sm space-y-1">
                      {contactInfo.locations && contactInfo.locations.split('\n').filter((l: string) => l.trim()).map((loc: string, i: number) => (
                        <div key={i} className="text-stone-400 group-hover:text-white transition-colors">
                          {loc}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Newsletter */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <h5 className="uppercase tracking-widest text-xs text-stone-500 mb-8 font-semibold">Newsletter</h5>
              <p className="text-sm text-stone-400 mb-6">Subscribe for curated insights and project updates.</p>
              <div className="relative">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="bg-transparent border-b border-white/20 w-full py-3 outline-none focus:border-white transition-colors text-sm placeholder:text-stone-600"
                />
                <motion.button
                  whileHover={{ x: 3 }}
                  className="absolute right-0 bottom-3 text-white/60 hover:text-white transition-colors"
                >
                  →
                </motion.button>
              </div>
            </motion.div>
          </div>

          {/* Footer Bottom */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="pt-8 border-t border-white/10 text-[10px] uppercase tracking-widest text-stone-600 flex flex-col md:flex-row justify-between gap-4"
          >
            <span>© 2026 1StudioArch. All rights reserved.</span>
            <div className="flex gap-6">
              <a href="#" className="hover:text-stone-400 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-stone-400 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-stone-400 transition-colors">Cookies</a>
            </div>
          </motion.div>
        </div>
      </footer>
    </div>
  );
}
