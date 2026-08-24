import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity, AlertCircle } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  trend?: number;
  icon: React.ReactNode;
  color: 'white' | 'stone' | 'gray';
  index: number;
}

export function DashboardCard({ title, value, subtitle, trend, icon, color, index }: DashboardCardProps) {
  const colorClasses = {
    white: 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20',
    stone: 'bg-stone-500/5 border-stone-500/10 hover:bg-stone-500/10 hover:border-stone-500/20',
    gray: 'bg-gray-500/5 border-gray-500/10 hover:bg-gray-500/10 hover:border-gray-500/20',
  };

  const accentColors = {
    white: 'text-white',
    stone: 'text-stone-300',
    gray: 'text-gray-300',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(255,255,255,0.1)' }}
      className={`${colorClasses[color]} border rounded-xl p-6 backdrop-blur-md cursor-pointer transition-all duration-300`}
    >
      {/* Icon */}
      <div className={`w-12 h-12 ${color === 'white' ? 'bg-white/10' : 'bg-stone-500/10'} rounded-lg flex items-center justify-center mb-4`}>
        <motion.div whileHover={{ scale: 1.1 }} transition={{ type: 'spring' }}>
          {icon}
        </motion.div>
      </div>

      {/* Title */}
      <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">{title}</p>

      {/* Value */}
      <div className="flex items-baseline justify-between mb-4">
        <h3 className={`text-3xl font-light ${accentColors[color]}`}>{value}</h3>
        {trend !== undefined && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`flex items-center gap-1 text-sm ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}
          >
            {trend > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span>{Math.abs(trend)}%</span>
          </motion.div>
        )}
      </div>

      {/* Subtitle */}
      <p className="text-xs text-stone-500">{subtitle}</p>

      {/* Progress bar */}
      {trend !== undefined && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
          className={`h-1 mt-4 rounded-full origin-left ${trend > 0 ? 'bg-gradient-to-r from-green-500/50 to-green-500' : 'bg-gradient-to-r from-red-500/50 to-red-500'}`}
        />
      )}
    </motion.div>
  );
}

interface DashboardStats {
  totalProjects: number;
  journalPosts: number;
  eventVideos: number;
  galleryImages: number;
}

export function AdminDashboardSection({ stats }: { stats: DashboardStats }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-light mb-3">Welcome back, Admin! 👋</h1>
        <p className="text-stone-400">Here's what's happening with your studio today.</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard
          index={0}
          title="Total Projects"
          value={stats.totalProjects}
          subtitle="Active projects"
          trend={100}
          icon={<Activity size={24} className="text-white" />}
          color="white"
        />
        <DashboardCard
          index={1}
          title="Journal Posts"
          value={stats.journalPosts}
          subtitle="Total posts"
          trend={100}
          icon={<Activity size={24} className="text-stone-300" />}
          color="stone"
        />
        <DashboardCard
          index={2}
          title="Event Videos"
          value={stats.eventVideos}
          subtitle="Total videos"
          trend={0}
          icon={<Activity size={24} className="text-gray-300" />}
          color="gray"
        />
        <DashboardCard
          index={3}
          title="Gallery Images"
          value={stats.galleryImages}
          subtitle="Total images"
          trend={25}
          icon={<Activity size={24} className="text-white" />}
          color="white"
        />
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-10"
      >
        <h2 className="text-2xl font-light mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Manage Projects', desc: 'Edit projects', delay: 0 },
            { label: 'Manage Journal', desc: 'Create posts', delay: 1 },
            { label: 'Event Videos', desc: 'Upload videos', delay: 2 },
            { label: 'Gallery', desc: 'Manage images', delay: 3 },
          ].map((action, idx) => (
            <motion.button
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + action.delay * 0.1 }}
              whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(255,255,255,0.1)' }}
              whileTap={{ scale: 0.95 }}
              className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg p-4 transition-all text-left"
            >
              <p className="text-sm font-light text-white mb-1">{action.label}</p>
              <p className="text-xs text-stone-500">{action.desc}</p>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Status Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-10 bg-white/5 border border-white/10 rounded-lg p-6 backdrop-blur-md"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-light">System Status</h2>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
            <AlertCircle size={20} className="text-green-400" />
          </motion.div>
        </div>
        <div className="space-y-4">
          {[
            { label: 'Website Status', status: 'Operational', color: 'green' },
            { label: 'Database', status: 'Connected', color: 'green' },
            { label: 'Local Storage', status: 'Active', color: 'green' },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + idx * 0.1 }}
              className="flex items-center justify-between py-3 border-b border-white/10 last:border-0"
            >
              <span className="text-sm text-stone-300">{item.label}</span>
              <motion.span
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className={`text-xs font-light text-${item.color}-400`}
              >
                {item.status}
              </motion.span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
