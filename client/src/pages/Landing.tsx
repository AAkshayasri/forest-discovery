import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import { api } from '../services/api';
import { motion } from 'framer-motion';
import { 
  Search as SearchIcon, MapPin, ArrowRight, Sparkles, 
  Trees, Scan, MessageSquare, Camera, Award, Globe2 
} from 'lucide-react';

interface Forest {
  id: number;
  name: string;
  country: string;
  state: string;
  latitude: number;
  longitude: number;
  area: string;
  climate: string;
  description: string;
}

interface TrendingAnimal {
  id: number;
  forestId: number;
  name: string;
  scientificName: string;
  imageUrl: string;
  conservationStatus: string;
  distribution: string;
}

export const Landing: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredForests, setFeaturedForests] = useState<Forest[]>([]);
  const [loading, setLoading] = useState(true);

  const trendingSpecies: TrendingAnimal[] = [
    {
      id: 99992,
      forestId: 2,
      name: 'Bengal Tiger',
      scientificName: 'Panthera tigris tigris',
      imageUrl: 'https://images.unsplash.com/photo-1602491453631-e2a5ad90a131?q=80&w=800&auto=format&fit=crop',
      conservationStatus: 'Endangered',
      distribution: 'Sundarbans'
    },
    {
      id: 99991,
      forestId: 1,
      name: 'Jaguar',
      scientificName: 'Panthera onca',
      imageUrl: 'https://images.unsplash.com/photo-1575550959106-5a7defe28b56?q=80&w=800&auto=format&fit=crop',
      conservationStatus: 'Near Threatened',
      distribution: 'Amazon Rainforest'
    },
    {
      id: 99993,
      forestId: 3,
      name: 'Asiatic Lion',
      scientificName: 'Panthera leo persica',
      imageUrl: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?q=80&w=800&auto=format&fit=crop',
      conservationStatus: 'Endangered',
      distribution: 'Gir National Park'
    }
  ];

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const forests = await api.getForests();
        setFeaturedForests(forests.slice(0, 3));
      } catch (e) {
        console.error("Failed to load featured forests:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (!user) {
      showToast('Please sign in to search the field guide', 'info');
      navigate('/auth');
      return;
    }
    
    // Save to search history list context and redirect
    navigate(`/map?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleActionClick = (path: string) => {
    if (!user) {
      showToast('Authentication required. Redirecting to portal...', 'info');
      navigate('/auth');
    } else {
      navigate(path);
    }
  };

  return (
    <div className="bg-background text-on-background font-body-md overflow-x-hidden text-left select-none pb-12">
      
      {/* 1. Immersive Hero Discovery Panel */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-4 md:px-8 pt-24 overflow-hidden">
        
        {/* Soft glowing ambient backgrounds */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-primary/10 blur-[180px] opacity-75" />
          <div className="absolute top-1/3 right-10 w-[350px] h-[350px] rounded-full bg-secondary/5 blur-[120px]" />
          <div className="absolute bottom-10 left-10 w-[400px] h-[400px] rounded-full bg-[#1b4332]/20 blur-[160px]" />
        </div>

        <div className="max-w-4xl w-full text-center relative z-10 space-y-8 flex flex-col items-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-3.5 py-1.5 rounded-full bg-primary-container/20 border border-primary/25 text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5 font-label-sm"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            AI-First Wildlife Intelligence Platform
          </motion.div>

          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <h1 className="font-display-lg text-4xl sm:text-6xl font-bold leading-tight tracking-tight text-on-background">
              Search the Pulse of the <span className="text-primary italic">Global Wild</span>
            </h1>
            <p className="font-body-lg text-sm sm:text-base text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
              Explore satellite coordinate databases, request real-time species comparisons, analyze forest ecosystems, and classify spottings using Google's live Gemini AI model.
            </p>
          </motion.div>

          {/* Hero AI Search Bar */}
          <motion.form
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleSearchSubmit}
            className="w-full max-w-2xl glass-panel p-1.5 rounded-full flex items-center shadow-2xl transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/50 bg-surface-container-low/75 border border-outline-variant/65"
          >
            <div className="flex items-center px-4 gap-2 flex-1">
              <SearchIcon className="w-5 h-5 text-primary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ask about tigers, Amazon, Gir forest, or search query intent..."
                className="bg-transparent border-none focus:ring-0 w-full text-on-surface placeholder:text-outline/65 font-body-md py-3 outline-none text-xs sm:text-sm"
              />
            </div>
            <button
              type="submit"
              className="bg-primary text-on-primary font-label-md px-6 sm:px-8 py-3 rounded-full hover:bg-primary/95 transition-all active:scale-95 shadow-lg font-bold text-xs uppercase tracking-wider cursor-pointer"
            >
              Consult AI
            </button>
          </motion.form>

          {/* AI Quick actions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-3xl pt-4"
          >
            <button
              onClick={() => handleActionClick('/map')}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-surface-container border border-outline-variant/40 hover:border-primary/45 hover:text-primary transition-all text-xs font-semibold font-label-sm shadow cursor-pointer text-on-surface-variant"
            >
              <Globe2 className="w-4 h-4" />
              Satellite Map
            </button>
            <button
              onClick={() => handleActionClick('/chat')}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-surface-container border border-outline-variant/40 hover:border-primary/45 hover:text-primary transition-all text-xs font-semibold font-label-sm shadow cursor-pointer text-on-surface-variant"
            >
              <MessageSquare className="w-4 h-4" />
              AI Guide Chat
            </button>
            <button
              onClick={() => handleActionClick('/identify')}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-surface-container border border-outline-variant/40 hover:border-primary/45 hover:text-primary transition-all text-xs font-semibold font-label-sm shadow cursor-pointer text-on-surface-variant"
            >
              <Scan className="w-4 h-4" />
              Upload & Scan
            </button>
            <button
              onClick={() => handleActionClick('/sightings')}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-surface-container border border-outline-variant/40 hover:border-primary/45 hover:text-primary transition-all text-xs font-semibold font-label-sm shadow cursor-pointer text-on-surface-variant"
            >
              <Camera className="w-4 h-4" />
              Wildlife Sightings
            </button>
          </motion.div>
        </div>
      </section>

      {/* 2. Featured Forests Bento Grid */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-10 space-y-8 text-left">
        <div className="flex justify-between items-end border-b border-outline-variant/35 pb-4">
          <div>
            <h2 className="font-headline-lg text-2xl font-bold text-on-background flex items-center gap-2">
              <Trees className="w-6 h-6 text-primary" />
              Featured Protected Biospheres
            </h2>
            <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
              Explore species taxonomy lists and satellite overviews of global ecosystems.
            </p>
          </div>
          <button 
            onClick={() => handleActionClick('/map')}
            className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase hover:underline transition-all cursor-pointer font-label-sm"
          >
            Launch World Map <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-44 rounded-xl bg-surface-container animate-pulse border border-outline-variant/20" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {featuredForests.map((forest) => (
              <div 
                key={forest.id}
                onClick={() => {
                  if (!user) {
                    showToast('Authentication required.', 'info');
                    navigate('/auth');
                  } else {
                    navigate(`/map`);
                    // Delay slightly to allow loading map, then select
                    setTimeout(() => {
                      localStorage.setItem('wildatlas_auto_select_forest', forest.id.toString());
                    }, 200);
                  }
                }}
                className="group p-5 rounded-xl bg-surface-container-high/90 border border-outline-variant/35 hover:border-primary/45 cursor-pointer transition-all flex flex-col justify-between h-44 shadow-lg hover:-translate-y-0.5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-primary-container bg-primary/20 px-2 py-0.5 rounded-full border border-primary/20 font-label-sm uppercase">
                      {forest.climate.split(' ')[0]}
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-medium font-mono">{forest.area}</span>
                  </div>
                  <h3 className="font-headline-md text-base font-bold text-on-surface mt-2.5 group-hover:text-primary transition-colors">
                    {forest.name}
                  </h3>
                  <p className="text-[11px] text-on-surface-variant line-clamp-2 mt-1.5 leading-relaxed">
                    {forest.description}
                  </p>
                </div>
                <div className="flex items-center text-[10px] font-bold text-primary uppercase tracking-wider group-hover:translate-x-1 transition-transform font-label-sm mt-3">
                  Inspect Coordinates <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Trending Species Spotlight */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-10 space-y-8 text-left">
        <div className="flex justify-between items-end border-b border-outline-variant/35 pb-4">
          <div>
            <h2 className="font-headline-lg text-2xl font-bold text-on-background flex items-center gap-2">
              <Award className="w-6 h-6 text-secondary" />
              Trending Species Profiles
            </h2>
            <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
              Active conservation indices and taxonomy entries from the biologue guides.
            </p>
          </div>
          <button 
            onClick={() => handleActionClick('/chat')}
            className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase hover:underline transition-all cursor-pointer font-label-sm"
          >
            Ask AI Guide <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {trendingSpecies.map((animal) => (
            <div 
              key={animal.id}
               onClick={() => {
                if (!user) {
                  showToast('Authentication required.', 'info');
                  navigate('/auth');
                } else {
                  // Navigate to map page with speciesId query param
                  navigate(`/map?speciesId=${animal.id}`);
                }
              }}
              className="group rounded-xl overflow-hidden bg-surface-container border border-outline-variant/30 hover:border-primary/45 transition-all shadow-lg cursor-pointer flex flex-col justify-between"
            >
              <div className="h-48 overflow-hidden relative">
                <img 
                  src={animal.imageUrl} 
                  alt={animal.name}
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500" 
                />
                <div className="absolute top-3 left-3">
                  <span className="px-2 py-0.5 rounded bg-error-container/20 text-error border border-error/30 text-[8px] font-bold uppercase tracking-wider font-label-sm">
                    {animal.conservationStatus}
                  </span>
                </div>
              </div>
              <div className="p-4 text-left space-y-2">
                <div>
                  <h4 className="font-bold text-sm text-on-surface font-body-lg group-hover:text-primary transition-colors">{animal.name}</h4>
                  <p className="text-[10px] text-on-surface-variant italic mt-0.5 font-mono">{animal.scientificName}</p>
                </div>
                <div className="flex justify-between items-center border-t border-outline-variant/25 pt-3 mt-2 text-[10px] text-on-surface-variant font-medium">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    {animal.distribution}
                  </span>
                  <span className="text-primary font-semibold flex items-center">
                    Inspect Specs <ArrowRight className="w-3 h-3 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Footer */}
      <footer className="w-full max-w-7xl mx-auto mt-16 pt-8 border-t border-outline-variant/35 px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-xs text-on-surface-variant font-body-md">
        <p>© 2026 Wildlife Explorer. Driven by Google's live Gemini AI and regional conservation coordinates.</p>
        <div className="flex gap-4">
          <a href="#" className="hover:text-primary transition-colors">Privacy</a>
          <a href="#" className="hover:text-primary transition-colors">Ethics Guidelines</a>
          <a href="#" className="hover:text-primary transition-colors">Developer Console</a>
        </div>
      </footer>
    </div>
  );
};

const ChevronRight: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

export default Landing;
