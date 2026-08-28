import { motion } from 'framer-motion';
import { ArrowLeft, Instagram, Linkedin, Youtube } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import NavMenu from '../components/NavMenu';
import { createContactMessage, getContactInfo } from '../utils/api';
import { LoadingScreenWithText } from '../components/LoadingScreen';

const DEFAULT_CONTACT = {
  email: 'inquiry@1studioarch.com',
  phone: '+44 (0) 20 1234 5678',
  locations: 'London, UK\nNew York, USA\nSingapore, SG',
  maps_url: 'https://maps.app.goo.gl/qvxxeaDYMDN9NpBe7',
  instagram: '#',
  linkedin: '#',
  youtube: '#',
};

// Get the appropriate map embed URL
function getMapEmbedUrl(storedEmbedUrl: string | null, mapsUrl: string): string {
  // If custom embed URL is provided, use it
  if (storedEmbedUrl && storedEmbedUrl.trim()) {
    return storedEmbedUrl;
  }

  // Otherwise use default location
  return `https://www.google.com/maps?q=Studio+Arch+Mumbai&output=embed`;
}

export default function Contact() {
  const [info, setInfo] = useState(DEFAULT_CONTACT);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [formStatus, setFormStatus] = useState({ loading: false, success: false, error: '' });

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setFormStatus({ loading: false, success: false, error: 'All fields are required' });
      return;
    }

    setFormStatus({ loading: true, success: false, error: '' });
    try {
      await createContactMessage({
        name: formData.name.trim(),
        email: formData.email.trim(),
        message: formData.message.trim(),
      });
      setFormStatus({ loading: false, success: true, error: '' });
      setFormData({ name: '', email: '', message: '' });
      setTimeout(() => setFormStatus({ loading: false, success: false, error: '' }), 5000);
    } catch (error) {
      setFormStatus({ loading: false, success: false, error: error instanceof Error ? error.message : 'Failed to send message' });
    }
  };

  // Fetch contact info from database
  useEffect(() => {
    const loadContactInfo = async () => {
      try {
        console.log('📍 Contact: Fetching contact info...');
        const data = await getContactInfo();
        console.log('📍 Contact: API response:', data);
        if (data && data.email) {
          console.log('📍 Contact: Setting info from database:', data);
          setInfo(data);
        } else {
          console.log('📍 Contact: No email in response, using defaults');
        }
      } catch (error) {
        console.error('❌ Contact: Failed to fetch contact info:', error);
      }
    };
    loadContactInfo();
  }, []);

  return (
    <div className="bg-black text-white min-h-screen">
      <NavMenu />

      <div className="bg-black border-b border-white/10 py-20 px-8">
        <div className="max-w-7xl mx-auto">
          <Link to="/" className="flex items-center gap-2 mb-8 hover:opacity-60 transition-opacity">
            <ArrowLeft size={20} /><span className="text-sm uppercase tracking-widest">Back</span>
          </Link>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-6xl md:text-8xl font-light mb-6 text-white">
            Get in Touch
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }} className="text-stone-400 text-lg max-w-2xl">
            Let's discuss how we can bring your architectural vision to life. We're excited to hear about your project.
          </motion.p>
        </div>
      </div>

      <section className="py-32 px-8 bg-black">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="space-y-12">
            <div>
              <h3 className="text-2xl font-light mb-6">Contact Information</h3>
              <div className="space-y-6">
                <div>
                  <label className="text-sm uppercase tracking-widest text-stone-500 block mb-2">Email</label>
                  <a href={`mailto:${info.email}`} className="text-lg text-white hover:opacity-60 transition-opacity">{info.email}</a>
                </div>
                {info.phone && (
                  <div>
                    <label className="text-sm uppercase tracking-widest text-stone-500 block mb-2">Phone</label>
                    <a href={`tel:${info.phone}`} className="text-lg text-white hover:opacity-60 transition-opacity">{info.phone}</a>
                  </div>
                )}
                <div
                  onClick={() => {
                    console.log('🔗 Clicked locations. maps_url:', info.maps_url);
                    if (info.maps_url && info.maps_url.trim()) {
                      console.log('✅ Opening:', info.maps_url);
                      window.open(info.maps_url, '_blank');
                    } else {
                      console.warn('❌ No maps_url set');
                    }
                  }}
                  className="cursor-pointer group"
                  role="button"
                  tabIndex={0}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      if (info.maps_url && info.maps_url.trim()) {
                        window.open(info.maps_url, '_blank');
                      }
                    }
                  }}
                >
                  <label className="text-sm uppercase tracking-widest text-stone-500 block mb-2 group-hover:text-white transition-colors">Locations</label>
                  <div className="space-y-2 p-3 rounded border-2 border-transparent group-hover:border-white/30 transition-colors">
                    {info.locations && info.locations.split('\n').filter((l: string) => l.trim()).map((loc: string, i: number) => (
                      <p key={i} className="text-lg text-white group-hover:opacity-80 transition-opacity">
                        {loc}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Google Maps Embed */}
            {info.maps_url && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="mt-12"
              >
                <h3 className="text-2xl font-light mb-6">Our Location</h3>
                <div
                  className="w-full h-96 bg-gradient-to-b from-stone-800 to-stone-900 rounded-lg overflow-hidden border-2 border-white/10 shadow-2xl cursor-pointer group hover:border-white/30 transition-all"
                  onClick={() => {
                    if (info.maps_url) {
                      window.open(info.maps_url, '_blank');
                    }
                  }}
                  title="Click to open full map"
                >
                  <iframe
                    src={getMapEmbedUrl(info.location_map_url, info.maps_url)}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen={true}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Studio-Arch Location"
                  />
                </div>
                <p className="text-xs text-stone-500 mt-3 text-center">Click map to view full details</p>
              </motion.div>
            )}

            <div>
              <h3 className="text-2xl font-light mb-6">Follow Us</h3>
              <div className="flex gap-6">
                {info.instagram && info.instagram !== '#' && (
                  <motion.a href={info.instagram} target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.2 }} className="text-stone-400 hover:text-white transition-colors"><Instagram size={24} /></motion.a>
                )}
                {info.linkedin && info.linkedin !== '#' && (
                  <motion.a href={info.linkedin} target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.2 }} className="text-stone-400 hover:text-white transition-colors"><Linkedin size={24} /></motion.a>
                )}
                {info.youtube && info.youtube !== '#' && (
                  <motion.a href={info.youtube} target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.2 }} className="text-stone-400 hover:text-white transition-colors"><Youtube size={24} /></motion.a>
                )}
              </div>
            </div>

          </motion.div>

          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
            <h3 className="text-2xl font-light mb-8">Send us a Message</h3>
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div>
                <label className="text-sm uppercase tracking-widest text-stone-500 block mb-2">Name</label>
                <input type="text" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Your name" className="w-full bg-transparent border-b border-stone-700 py-3 outline-none focus:border-white transition-colors text-lg text-white" />
              </div>
              <div>
                <label className="text-sm uppercase tracking-widest text-stone-500 block mb-2">Email</label>
                <input type="email" value={formData.email} onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="your@email.com" className="w-full bg-transparent border-b border-stone-700 py-3 outline-none focus:border-white transition-colors text-lg text-white" />
              </div>
              <div>
                <label className="text-sm uppercase tracking-widest text-stone-500 block mb-2">Message</label>
                <textarea value={formData.message} onChange={e => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Tell us about your project..." rows={6} className="w-full bg-transparent border-b border-stone-700 py-3 outline-none focus:border-white transition-colors text-lg text-white resize-none" />
              </div>
              {formStatus.success && <p className="text-green-400 text-sm">✓ Message sent successfully!</p>}
              {formStatus.error && <p className="text-red-400 text-sm">{formStatus.error}</p>}
              <motion.button type="submit" disabled={formStatus.loading} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className={`mt-8 border-2 border-white text-white px-12 py-4 text-xs uppercase tracking-widest transition-all duration-300 w-full md:w-auto ${
                  formStatus.loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white hover:text-black'
                }`}>
                {formStatus.loading ? 'Sending...' : 'Send Message'}
              </motion.button>
            </form>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
