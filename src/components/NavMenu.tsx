import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/philosophy', label: 'Philosophy' },
  { to: '/journal', label: 'Journal' },
  { to: '/events', label: 'Events' },
  { to: '/contact', label: 'Contact' },
];

export default function NavMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const open = () => {
    if (toggleTimeoutRef.current) clearTimeout(toggleTimeoutRef.current);
    setMenuOpen(true);
    toggleTimeoutRef.current = setTimeout(() => { toggleTimeoutRef.current = null; }, 500);
  };

  const close = () => {
    if (toggleTimeoutRef.current) clearTimeout(toggleTimeoutRef.current);
    setMenuOpen(false);
    toggleTimeoutRef.current = setTimeout(() => { toggleTimeoutRef.current = null; }, 500);
  };

  return (
    <>
      {/* Logo */}
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
              animate={{ opacity: 0, filter: 'brightness(1)' }}
              whileHover={{ opacity: 1, filter: 'brightness(2)' }}
              transition={{ duration: 0.3 }}
              style={{ filter: 'brightness(1)' }}
            />
          </div>
        </motion.div>
      </Link>

      {/* Hamburger Button */}
      <motion.button
        initial={{ opacity: 1 }}
        animate={{ opacity: menuOpen ? 0 : 1 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); open(); }}
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
              {NAV_LINKS.map(({ to, label }) => (
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

            {/* Close Button */}
            <motion.button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); close(); }}
              className="flex flex-col gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-md p-3 md:p-4 rounded-full border border-white/20 transition-colors cursor-pointer pointer-events-auto"
            >
              <span className="w-5 md:w-6 h-0.5 bg-white transition-all duration-300 rotate-45 translate-y-2 origin-center pointer-events-none" />
              <span className="w-5 md:w-6 h-0.5 bg-white transition-all duration-300 -rotate-45 -translate-y-2 origin-center pointer-events-none" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
