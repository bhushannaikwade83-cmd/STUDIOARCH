import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Projects from './pages/Projects';
import Philosophy from './pages/Philosophy';
import Journal from './pages/Journal';
import Contact from './pages/Contact';
import Admin from './pages/Admin';
import Events from './pages/Events';
import Upload from './pages/Upload';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/projects" element={<Projects />} />
      <Route path="/philosophy" element={<Philosophy />} />
      <Route path="/journal" element={<Journal />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/events" element={<Events />} />
      <Route path="/upload" element={<Upload />} />
    </Routes>
  );
}
