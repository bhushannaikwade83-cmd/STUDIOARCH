import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import NavMenu from '../components/NavMenu';
import { useJournalPosts } from '../hooks/useMariaDbData';
import { LoadingScreenWithText } from '../components/LoadingScreen';

const DEFAULT_ARTICLES = [
  { id: 1, title: "The Future of Sustainable Luxury Architecture", date: "June 2024", excerpt: "Exploring how cutting-edge sustainable practices are reshaping the landscape of luxury architecture without compromising on aesthetic excellence.", category: "Sustainability" },
  { id: 2, title: "Materiality in Modern Design: A Deep Dive", date: "May 2024", excerpt: "Understanding how the choice of materials can elevate a space from functional to extraordinary, and the artistry behind material selection.", category: "Design" },
  { id: 3, title: "Light as Architecture: Creating Spaces Through Illumination", date: "April 2024", excerpt: "Discover how we leverage light—both natural and artificial—as a fundamental design element to transform architectural spaces.", category: "Design" },
  { id: 4, title: "Case Study: The Obsidian Villa's Journey", date: "March 2024", excerpt: "Behind the scenes of one of our most ambitious projects. From conceptualization to completion, exploring the challenges and triumphs.", category: "Projects" },
];

export default function Journal() {
  const { data: supabaseArticles, loading, error } = useJournalPosts();
  const [articles, setArticles] = useState([]);

  // Update articles when Supabase data is loaded (only Supabase, no fallback)
  useEffect(() => {
    if (supabaseArticles) {
      setArticles(supabaseArticles);
    }
  }, [supabaseArticles]);

  if (loading) {
    return <LoadingScreenWithText text="Loading Journal..." />;
  }

  if (error) {
    return (
      <div className="bg-black text-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Failed to load journal</p>
          <p className="text-stone-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black text-white min-h-screen">
      <NavMenu />

      <div className="bg-black border-b border-white/10 py-20 px-8">
        <div className="max-w-7xl mx-auto">
          <Link to="/" className="flex items-center gap-2 mb-8 hover:opacity-60 transition-opacity">
            <ArrowLeft size={20} /><span className="text-sm uppercase tracking-widest">Back</span>
          </Link>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-6xl md:text-8xl font-light mb-6 text-white">Journal</motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }} className="text-stone-400 text-lg">
            Insights, thoughts, and stories from our studio
          </motion.p>
        </div>
      </div>

      <section className="py-32 px-8 bg-black">
        <div className="max-w-4xl mx-auto">
          {articles.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-stone-400 text-lg">No journal posts yet.</p>
            </div>
          ) : (
          <div className="space-y-16">
            {articles.map((article: { id: number; title: string; date: string; excerpt: string; category: string }, idx: number) => (
              <motion.div key={article.id} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.15, duration: 0.8 }}
                className="group border-b border-white/10 pb-16 last:border-b-0">
                <div className="flex items-start justify-between gap-8">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-xs uppercase tracking-widest bg-white/10 text-white px-3 py-1 rounded border border-white/20">{article.category}</span>
                      <span className="text-sm text-stone-500">{article.date}</span>
                    </div>
                    <h3 className="text-3xl font-light mb-4 group-hover:opacity-60 transition-opacity text-white">{article.title}</h3>
                    <p className="text-lg text-stone-400 leading-relaxed">{article.excerpt}</p>
                  </div>
                  <motion.button whileHover={{ x: 5 }} className="flex-shrink-0 text-stone-500 hover:text-white transition-colors mt-2"><ArrowRight size={24} /></motion.button>
                </div>
              </motion.div>
            ))}
          </div>
          )}
        </div>
      </section>
    </div>
  );
}
