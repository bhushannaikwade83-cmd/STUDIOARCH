import { motion } from 'framer-motion';

export function LoadingScreen() {
  return (
    <div className="bg-black text-white min-h-screen flex items-center justify-center">
      <div className="text-center space-y-8">
        <motion.div
          animate={{
            opacity: [0.6, 1, 0.6],
            scale: [0.95, 1, 0.95]
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="flex justify-center"
        >
          <img src="/logo-color.png" alt="Loading..." className="h-48 w-auto md:h-64 drop-shadow-lg" />
        </motion.div>
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <p className="text-white uppercase tracking-widest text-xs md:text-sm font-light">Loading...</p>
        </motion.div>
      </div>
    </div>
  );
}

export function LoadingScreenWithText(props: { text?: string }) {
  const text = props.text || 'Loading...';
  return (
    <div className="bg-black text-white min-h-screen flex items-center justify-center">
      <div className="text-center space-y-8">
        <motion.div
          animate={{
            opacity: [0.6, 1, 0.6],
            scale: [0.95, 1, 0.95]
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="flex justify-center"
        >
          <img src="/logo-color.png" alt={text} className="h-48 w-auto md:h-64 drop-shadow-lg" />
        </motion.div>
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <p className="text-white uppercase tracking-widest text-xs md:text-sm font-light">{text}</p>
        </motion.div>
      </div>
    </div>
  );
}
