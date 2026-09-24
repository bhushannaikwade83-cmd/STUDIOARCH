import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion';
import { ArrowRight, ChevronDown, MapPin, Mail, Instagram, Linkedin, Menu, X } from 'lucide-react';

const PROJECTS = [
  {
    id: 1,
    name: "The Obsidian Villa",
    location: "Mykonos, Greece",
    year: "2024",
    category: "Luxury Residence",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2000"
  },
  {
    id: 2,
    name: "Nexus Headquarters",
    location: "Singapore",
    year: "2023",
    category: "Commercial",
    image: "https://images.unsplash.com/photo-1486718448742-163732cd3d3c?q=80&w=2000"
  },
  {
    id: 3,
    name: "Alpine Retreat",
    location: "Zermatt, Switzerland",
    year: "2024",
    category: "Hospitality",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2000"
  },
  {
    id: 4,
    name: "Lumina Pavilion",
    location: "Kyoto, Japan",
    year: "2022",
    category: "Cultural",
    image: "https://images.unsplash.com/photo-1486718448742-163732cd3d3c?q=80&w=2000"
  },
];

const SERVICES = [
  { title: "Master Planning", description: "Visionary urban and landscape design" },
  { title: "Residential Design", description: "Bespoke luxury living spaces" },
  { title: "Commercial Spaces", description: "Innovative corporate environments" },
  { title: "Interior Architecture", description: "Curated material experiences" },
];

export default function App() {
  const [activeSection, setActiveSection] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredProject, setHoveredProject] = useState(null);
  const { scrollYProgress, scrollY } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  const parallaxY = useTransform(scrollY, [0, 1000], [0, 300]);
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.8]);

  return (
    <div className="bg-[#F5F5F0] text-[#1A1A1A] font-sans min-h-screen overflow-x-hidden selection:bg-[#1A1A1A] selection:text-white">
      {/* Scroll Progress Bar */}
      <motion.div className="fixed top-0 left-0 right-0 h-1 bg-[#1A1A1A] origin-left z-50" style={{ scaleX }} />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-40 px-8 py-6 flex justify-between items-center mix-blend-difference text-white backdrop-blur-sm bg-black/5">
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="text-2xl font-light tracking-widest uppercase"
        >
          1StudioArch
        </motion.h1>

        {/* Desktop Menu */}
        <div className="hidden md:flex gap-8 text-sm font-medium tracking-wide uppercase">
          {['Projects', 'Philosophy', 'Journal', 'Contact'].map((item, idx) => (
            <motion.button
              key={item}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: idx * 0.1 }}
              whileHover={{
                scale: 1.1,
                textShadow: "0 0 8px rgba(255,255,255,0.5)"
              }}
              className="hover:opacity-60 transition-all relative group"
            >
              {item}
              <span className="absolute bottom-0 left-0 w-0 h-px bg-white group-hover:w-full transition-all duration-300" />
            </motion.button>
          ))}
        </div>

        {/* Mobile Menu Button */}
        <motion.button
          className="md:hidden text-white"
          whileHover={{ scale: 1.1 }}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </motion.button>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 w-full z-30 bg-black/95 backdrop-blur-md py-8 px-8 md:hidden"
          >
            {['Projects', 'Philosophy', 'Journal', 'Contact'].map((item, idx) => (
              <motion.button
                key={item}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="block w-full text-left py-3 text-white uppercase tracking-widest text-sm font-medium hover:text-stone-300 transition-colors"
              >
                {item}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="h-screen w-full relative flex items-center justify-center p-8 bg-[#1A1A1A] text-white overflow-hidden">
        {/* Animated Background */}
        <motion.div
          style={{ y: parallaxY }}
          className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2000')] bg-cover bg-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/60" />

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="z-10 text-center max-w-6xl"
        >
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="text-sm tracking-[0.3em] uppercase mb-6 text-stone-300"
          >
            Architecture with Purpose
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="text-5xl md:text-7xl lg:text-8xl font-light mb-8 leading-tight"
          >
            Designing Spaces<br/>Beyond Time
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="text-stone-300 max-w-2xl mx-auto mb-12 text-lg"
          >
            Where precision meets poetry. Crafting luxury environments that transcend generations through thoughtful design and refined materiality.
          </motion.p>

          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            whileHover={{
              scale: 1.05,
              boxShadow: "0 0 30px rgba(255,255,255,0.3)"
            }}
            whileTap={{ scale: 0.95 }}
            className="border-2 border-white/40 px-12 py-4 text-xs uppercase tracking-widest hover:bg-white hover:text-[#1A1A1A] transition-all duration-300"
          >
            Explore Projects
          </motion.button>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-10 flex flex-col items-center gap-3"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-[10px] uppercase tracking-widest text-white/60">Scroll to explore</span>
          <ChevronDown size={18} className="text-white/60" />
        </motion.div>
      </section>

      {/* Services Section */}
      <section className="py-32 px-8 bg-[#F5F5F0]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row justify-between items-end mb-24"
          >
            <h3 className="text-4xl md:text-6xl font-light mb-8 md:mb-0">Our Services</h3>
            <p className="text-stone-500 max-w-sm">Comprehensive architectural solutions tailored to luxury standards.</p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-8">
            {SERVICES.map((service, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.6 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
                className="group cursor-pointer"
              >
                <div className="h-64 bg-gradient-to-br from-stone-300 to-stone-400 group-hover:from-stone-400 group-hover:to-stone-500 transition-all duration-500 mb-6 rounded" />
                <h4 className="text-xl font-medium mb-3 group-hover:text-stone-700 transition-colors">{service.title}</h4>
                <p className="text-stone-600">{service.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Projects Grid */}
      <section className="py-32 px-8 bg-white">
        <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row justify-between items-end mb-24"
        >
          <h3 className="text-4xl md:text-6xl font-light mb-8 md:mb-0">Selected Works</h3>
          <p className="text-stone-500 max-w-sm">Curating spaces that balance raw materiality with refined spatial narratives.</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 lg:gap-16">
          {PROJECTS.map((project, idx) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.15, duration: 0.8 }}
              viewport={{ once: true, margin: "-100px" }}
              onHoverStart={() => setHoveredProject(project.id)}
              onHoverEnd={() => setHoveredProject(null)}
              className="group cursor-pointer"
            >
              <div className="h-[500px] w-full mb-6 overflow-hidden relative rounded-lg shadow-lg">
                {/* Project Image */}
                <motion.div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url('${project.image}')` }}
                  animate={{ scale: hoveredProject === project.id ? 1.08 : 1 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />

                {/* Overlay */}
                <motion.div
                  className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-500"
                  animate={{
                    opacity: hoveredProject === project.id ? 1 : 0
                  }}
                />

                {/* Category Badge */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{
                    opacity: hoveredProject === project.id ? 1 : 0,
                    y: hoveredProject === project.id ? 0 : 20
                  }}
                  transition={{ duration: 0.4 }}
                  className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded"
                >
                  <span className="text-xs font-semibold text-[#1A1A1A] tracking-wide uppercase">{project.category}</span>
                </motion.div>
              </div>

              {/* Project Info */}
              <div className="flex justify-between items-start">
                <motion.div
                  animate={{
                    y: hoveredProject === project.id ? -5 : 0
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <h4 className="text-2xl font-medium mb-2">{project.name}</h4>
                  <p className="text-stone-500 text-sm">{project.location} • {project.year}</p>
                </motion.div>
                <motion.div
                  animate={{
                    x: hoveredProject === project.id ? 8 : 0,
                    opacity: hoveredProject === project.id ? 1 : 0.6
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <ArrowRight size={24} className="text-stone-700" />
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Design Philosophy */}
      <section className="py-40 bg-gradient-to-b from-[#EAEAEA] to-[#F5F5F0] px-8 text-center overflow-hidden">
        <div className="max-w-4xl mx-auto relative z-10">
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-sm tracking-[0.4em] uppercase text-stone-500 mb-12"
          >
            Our Essence
          </motion.h3>

          <motion.blockquote
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-light leading-relaxed italic text-[#1A1A1A] mb-12"
          >
            "Architecture is not merely the creation of buildings. It is the art of shaping experiences, emotions, and lasting impressions through the poetry of space."
          </motion.blockquote>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="flex flex-col items-center"
          >
            <motion.div
              layoutId="divider"
              className="h-px w-24 bg-[#1A1A1A] mb-8"
            />
            <p className="text-lg font-light text-stone-700 uppercase tracking-widest">1StudioArch Studio</p>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-8 bg-[#1A1A1A] text-white text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <h3 className="text-3xl md:text-5xl font-light mb-8">Ready to Transform Your Vision?</h3>
          <p className="text-stone-400 text-lg mb-12 max-w-2xl mx-auto">
            Let's discuss how 1StudioArch can bring your architectural dreams to life with precision and elegance.
          </p>
          <motion.button
            whileHover={{
              scale: 1.05,
              boxShadow: "0 0 30px rgba(255,255,255,0.2)"
            }}
            whileTap={{ scale: 0.95 }}
            className="border-2 border-white/40 px-12 py-4 text-xs uppercase tracking-widest hover:bg-white hover:text-[#1A1A1A] transition-all duration-300"
          >
            Get in Touch
          </motion.button>
        </motion.div>
      </section>

      {/* Footer / Contact */}
      <footer className="bg-[#0F0F0F] text-white py-24 px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-16 mb-24">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h4 className="text-2xl font-light mb-8">1StudioArch</h4>
            <p className="text-stone-400 mb-8 leading-relaxed">
              Redefining contemporary luxury through precision, materiality, and light. Creating spaces that endure beyond aesthetics.
            </p>
            <div className="flex gap-6">
              <motion.a
                href="#"
                whileHover={{ scale: 1.2, color: "#FFFFFF" }}
                className="text-stone-400 hover:text-white transition-colors"
              >
                <Instagram size={20} />
              </motion.a>
              <motion.a
                href="#"
                whileHover={{ scale: 1.2, color: "#FFFFFF" }}
                className="text-stone-400 hover:text-white transition-colors"
              >
                <Linkedin size={20} />
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
              <motion.div
                className="flex items-center gap-3 group cursor-pointer"
                whileHover={{ x: 5 }}
              >
                <Mail size={16} className="text-stone-400 group-hover:text-white transition-colors" />
                <a href="mailto:inquiry@1studioarch.com" className="text-sm hover:text-stone-300 transition-colors">
                  inquiry@1studioarch.com
                </a>
              </motion.div>
              <motion.div
                className="flex items-center gap-3 group"
                whileHover={{ x: 5 }}
              >
                <MapPin size={16} className="text-stone-400 group-hover:text-white transition-colors" />
                <span className="text-sm">London • New York • Singapore</span>
              </motion.div>
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
                <ArrowRight size={16} />
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
          className="max-w-7xl mx-auto pt-8 border-t border-white/10 text-[10px] uppercase tracking-widest text-stone-600 flex flex-col md:flex-row justify-between gap-4"
        >
          <span>© 2026 1StudioArch. All rights reserved.</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-stone-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-stone-400 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-stone-400 transition-colors">Cookies</a>
          </div>
        </motion.div>
      </footer>
    </div>
  );
}