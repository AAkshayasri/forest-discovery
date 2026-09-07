import React, { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, MapPin, Map, Navigation, X, Clock, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import { useSearchHistory } from '../../hooks/useSearchHistory';

interface Forest {
  id: number;
  name: string;
  country: string;
  state: string;
  latitude: number;
  longitude: number;
  description: string;
}

interface SearchProps {
  onForestSelect: (forest: Forest) => void;
  onRegionSearch: (results: Forest[], query: string) => void;
  onClearSearch: () => void;
}

export const Search: React.FC<SearchProps> = ({ onForestSelect, onRegionSearch, onClearSearch }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Forest[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  const { history, addSearch, clearHistory } = useSearchHistory();

  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loadingAiIntent, setLoadingAiIntent] = useState(false);

  // Close suggestions dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions as user types
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (query.trim().length < 2) {
        setSuggestions([]);
        setAiSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const results = await api.searchForests(query);
        setSuggestions(results);
        
        if (results.length === 0) {
          setLoadingAiIntent(true);
          try {
            const aiData = await api.getSearchIntent(query);
            setAiSuggestions(aiData.suggestions || []);
          } catch (aiErr) {
            console.error("AI search intent query failed:", aiErr);
            setAiSuggestions([]);
          } finally {
            setLoadingAiIntent(false);
          }
        } else {
          setAiSuggestions([]);
        }
        
        setIsOpen(true);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const handleSelectForest = (forest: Forest) => {
    setQuery(forest.name);
    addSearch(forest.name);
    onForestSelect(forest);
    setIsOpen(false);
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    addSearch(query.trim());
    setLoading(true);
    try {
      const results = await api.searchForests(query);
      if (results.length > 0) {
        // If query is an exact match for a forest, select it
        const exactMatch = results.find(
          (f: Forest) => f.name.toLowerCase() === query.toLowerCase().trim()
        );
        if (exactMatch) {
          handleSelectForest(exactMatch);
        } else {
          // Send all matching forests to region search (filters pins)
          onRegionSearch(results, query);
        }
      }
      setIsOpen(false);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    onClearSearch();
    setIsOpen(false);
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-xl font-body-md">
      <form onSubmit={handleSearchSubmit} className="relative flex items-center glass-panel p-1 rounded-full shadow-2xl transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/50">
        <div className="flex items-center px-4 gap-2 flex-1">
          <SearchIcon className="w-5 h-5 text-primary" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder="Search Forest, State, or Country..."
            className="w-full bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline/65 font-body-md py-2.5 outline-none"
          />
        </div>

        {query ? (
          <button
            type="button"
            onClick={handleClear}
            className="text-on-surface-variant hover:text-primary p-1.5 mr-2 rounded-full hover:bg-white/5 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="submit"
            className="bg-primary text-on-primary font-label-md px-6 py-2 rounded-full hover:bg-primary/90 transition-all active:scale-95 shadow-md font-semibold text-xs uppercase tracking-wider"
          >
            Search
          </button>
        )}
      </form>

      {/* Suggestions Dropdown */}
      {isOpen && (
        <div className="absolute w-full mt-3 rounded-xl glass-panel bg-[#201f1f]/95 border border-outline-variant/60 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 max-h-80 overflow-y-auto">
          
          {/* Recent Searches Header */}
          {history.length > 0 && !query && (
            <div className="p-2 border-b border-outline-variant/30">
              <div className="flex justify-between items-center px-3 py-1 text-[10px] font-bold text-primary tracking-wider uppercase">
                <span>Recent Searches</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearHistory();
                  }}
                  className="text-[9px] hover:underline text-on-surface-variant normal-case cursor-pointer"
                >
                  Clear History
                </button>
              </div>
              {history.map((h, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setQuery(h)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-primary/10 hover:text-primary text-on-surface-variant text-xs text-left cursor-pointer font-label-sm"
                >
                  <Clock className="w-3.5 h-3.5 text-outline" />
                  <span>{h}</span>
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="p-4 text-on-surface-variant text-xs flex items-center gap-2">
              <Navigation className="w-3.5 h-3.5 animate-spin text-primary" />
              Scanning biodatabase...
            </div>
          )}

          {suggestions.length > 0 ? (
            <div className="p-2">
              <div className="px-3 py-1.5 text-[10px] font-bold text-primary tracking-wider uppercase border-b border-white/5 mb-1 font-label-sm">
                Found Locations
              </div>
              {suggestions.map((forest) => {
                const isForestMatch = forest.name.toLowerCase().includes(query.toLowerCase());
                const isStateMatch = forest.state.toLowerCase().includes(query.toLowerCase());
                
                return (
                  <button
                    key={forest.id}
                    type="button"
                    onClick={() => handleSelectForest(forest)}
                    className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-primary/10 hover:text-primary text-on-surface-variant transition-all text-left cursor-pointer group"
                  >
                    {isForestMatch ? (
                      <MapPin className="w-5 h-5 text-primary mt-0.5 group-hover:scale-105 transition-transform" />
                    ) : (
                      <Map className="w-5 h-5 text-secondary mt-0.5 group-hover:scale-105 transition-transform" />
                    )}
                    <div>
                      <div className="font-semibold text-sm text-on-surface group-hover:text-primary">
                        {forest.name}
                      </div>
                      <div className="text-[11px] text-on-surface-variant font-body-md">
                        {forest.state}, {forest.country}
                        {isStateMatch && <span className="ml-2 text-[10px] text-secondary font-medium font-label-sm">(State Match)</span>}
                        {!isForestMatch && !isStateMatch && <span className="ml-2 text-[10px] text-secondary font-medium font-label-sm">(Country Match)</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            query.trim().length >= 2 && !loading && (
              <div className="p-2">
                <div className="p-4 text-on-surface-variant text-xs text-center border-b border-outline-variant/30">
                  No forests, states, or countries found.
                </div>
                {loadingAiIntent ? (
                  <div className="p-4 text-on-surface-variant text-[11px] flex items-center justify-center gap-2">
                    <Navigation className="w-3 animate-spin text-primary" />
                    Consulting AI Search Assistant...
                  </div>
                ) : aiSuggestions.length > 0 ? (
                  <div className="p-3 text-left">
                    <div className="text-[10px] font-bold text-primary tracking-wider uppercase flex items-center gap-1 font-label-sm mb-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
                      AI Search Assistant Suggestions
                    </div>
                    <p className="text-[10px] text-on-surface-variant mb-3 leading-normal font-body-md">
                      Gemini matched your search intent to these species. Click one to consult the AI Guide:
                    </p>
                    <div className="space-y-1">
                      {aiSuggestions.map((spec, sIdx) => (
                        <a
                          key={sIdx}
                          href="/chat"
                          onClick={() => {
                            localStorage.setItem('wildatlas_pending_prompt', `Tell me about ${spec}`);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container hover:bg-primary/15 hover:text-primary text-xs font-semibold text-on-surface-variant transition-all font-label-sm"
                        >
                          🦁 {spec}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default Search;
