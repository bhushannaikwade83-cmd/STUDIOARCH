import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';
import { useState, useRef } from 'react';
import { useProjects } from '../hooks/useSupabaseData';
import { LoadingScreenWithText } from '../components/LoadingScreen';

export default function ProjectsSupabase() {
  const { data: projects, loading, error } = useProjects();
  const [selectedProject, setSelectedProject] = useState<typeof projects[0] | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [hoveredProjectId, setHoveredProjectId] = useState<number | null>(null);
  const fadeTimeoutRef = useRef<{ [key: number]: NodeJS.Timeout }>({});

  if (loading) {
    return <LoadingScreenWithText text="Loading Projects..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Failed to load projects</p>
          <p className="text-stone-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const getGridClass = (size: string) => {
    if (size === 'large') return 'md:col-span-2 md:row-span-2';
    return 'md:col-span-1 md:row-span-1';
  };

  const handleHoverStart = (projectId: number) => {
    if (fadeTimeoutRef.current[projectId]) {
      clearTimeout(fadeTimeoutRef.current[projectId]);
    }
    setHoveredProjectId(projectId);
  };

  const handleHoverEnd = (projectId: number) => {
    fadeTimeoutRef.current[projectId] = setTimeout(() => {
      if (hoveredProjectId === projectId) {
        setHoveredProjectId(null);
      }
    }, 300);
  };

  const openProject = (project: typeof projects[0]) => {
    setSelectedProject(project);
    setSelectedImageIndex(0);
  };

  const closeProject = () => {
    setSelectedProject(null);
    setSelectedImageIndex(0);
  };

  const nextImage = () => {
    if (selectedProject && selectedProject.images) {
      setSelectedImageIndex((prev) => (prev + 1) % selectedProject.images.length);
    }
  };

  const prevImage = () => {
    if (selectedProject && selectedProject.images) {
      setSelectedImageIndex((prev) => (prev - 1 + selectedProject.images.length) % selectedProject.images.length);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-16"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-stone-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft size={20} />
            <span>Back to Home</span>
          </Link>

          <h1 className="text-5xl md:text-6xl font-light tracking-tight mb-6">
            Our Projects
          </h1>
          <p className="text-xl text-stone-400 max-w-2xl">
            A curated selection of our most significant architectural works
          </p>
        </motion.div>

        {projects.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-stone-400">No projects available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-max">
            {projects.map((project, idx) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={getGridClass(project.size || 'medium')}
              >
                <motion.button
                  onClick={() => openProject(project)}
                  onHoverStart={() => handleHoverStart(project.id)}
                  onHoverEnd={() => handleHoverEnd(project.id)}
                  className="w-full h-full relative overflow-hidden rounded-lg group"
                >
                  {project.images && project.images.length > 0 ? (
                    <img
                      src={project.images[0]}
                      alt={project.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-stone-800 flex items-center justify-center">
                      <span className="text-stone-600">No image</span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-300"></div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: hoveredProjectId === project.id ? 1 : 0,
                    }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 flex flex-col justify-center px-6"
                  >
                    <h3 className="text-2xl md:text-3xl font-light mb-2">{project.name}</h3>
                    <p className="text-sm text-stone-300 mb-3">{project.location}</p>
                    <p className="text-xs text-stone-400">{project.year}</p>
                  </motion.div>
                </motion.button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Project Detail Modal */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeProject}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-black border border-white/10 rounded-lg overflow-hidden max-w-4xl w-full"
            >
              <div className="relative">
                {selectedProject.images && selectedProject.images.length > 0 ? (
                  <div className="relative h-96 md:h-[500px] overflow-hidden bg-stone-900">
                    <motion.img
                      key={selectedImageIndex}
                      src={selectedProject.images[selectedImageIndex]}
                      alt={selectedProject.name}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      className="w-full h-full object-cover"
                    />

                    {selectedProject.images.length > 1 && (
                      <>
                        <button
                          onClick={prevImage}
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-2 rounded transition-colors"
                        >
                          ←
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-2 rounded transition-colors"
                        >
                          →
                        </button>

                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                          {selectedProject.images.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedImageIndex(idx)}
                              className={`w-2 h-2 rounded-full transition-colors ${
                                idx === selectedImageIndex ? 'bg-white' : 'bg-white/40'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="h-96 md:h-[500px] bg-stone-900 flex items-center justify-center">
                    <span className="text-stone-600">No image available</span>
                  </div>
                )}

                <button
                  onClick={closeProject}
                  className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 text-white p-2 rounded transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8">
                <h2 className="text-4xl font-light mb-4">{selectedProject.name}</h2>

                <div className="grid grid-cols-3 gap-8 mb-8">
                  <div>
                    <p className="text-xs text-stone-500 uppercase tracking-widest mb-2">
                      Location
                    </p>
                    <p className="text-lg font-light">{selectedProject.location}</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 uppercase tracking-widest mb-2">
                      Year
                    </p>
                    <p className="text-lg font-light">{selectedProject.year}</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 uppercase tracking-widest mb-2">
                      Category
                    </p>
                    <p className="text-lg font-light">{selectedProject.category}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-widest mb-4">
                    About
                  </p>
                  <p className="text-stone-400 leading-relaxed">
                    {selectedProject.description}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
