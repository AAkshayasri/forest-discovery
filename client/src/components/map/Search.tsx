import React, { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, MapPin, X, Clock, Eye } from 'lucide-react';
import { api } from '../../services/api';
import { useSearchHistory } from '../../hooks/useSearchHistory';
import type { NormalizedPlace } from '../../services/datasetLoader';
import { normalizeRecord } from '../../services/datasetLoader';

interface SearchProps {
  onPlaceSelect: (place: NormalizedPlace) => void;
  onSpeciesSelect?: (speciesId: string | number) => void;
  onRegionSearch?: (results: NormalizedPlace[], query: string) => void;
  onClearSearch: () => void;
}

export const Search: React.FC<SearchProps> = ({
  onPlaceSelect,
  onSpeciesSelect,
  onRegionSearch,
  onClearSearch
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    forests: NormalizedPlace[];
    zoos: NormalizedPlace[];
    species: any[];
  }>({ forests: [], zoos: [], species: [] });
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  const { history, addSearch, clearHistory } = useSearchHistory();

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

  // Fetch suggestions as user types (debounced 200ms)
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults({ forests: [], zoos: [], species: [] });
        return;
      }

      setLoading(true);
      try {
        const data = await api.searchGlobal(query);
        const normalizedForests: NormalizedPlace[] = (data.forests || [])
          .map((f: any) => normalizeRecord(f, 'forest'))
          .filter((r: any) => r.valid)
          .map((r: any) => r.place);

        const normalizedZoos: NormalizedPlace[] = (data.zoos || [])
          .map((z: any) => normalizeRecord(z, 'zoo'))
          .filter((r: any) => r.valid)
          .map((r: any) => r.place);

        setResults({
          forests: normalizedForests,
          zoos: normalizedZoos,
          species: data.species || []
        });
        setIsOpen(true);
      } catch (error) {
        console.error("Error fetching global search results:", error);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const handleSelectPlace = (place: NormalizedPlace) => {
    setQuery(place.name);
    addSearch(place.name);
    onPlaceSelect(place);
    setIsOpen(false);
  };

  const handleSelectSpecies = (sp: any) => {
    setQuery(sp.name);
    addSearch(sp.name);
    if (onSpeciesSelect) onSpeciesSelect(sp.id || sp.species_id);
    setIsOpen(false);
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    addSearch(query.trim());
    setLoading(true);
    try {
      const data = await api.searchGlobal(query);
      const normalizedForests: NormalizedPlace[] = (data.forests || [])
        .map((f: any) => normalizeRecord(f, 'forest'))
        .filter((r: any) => r.valid)
        .map((r: any) => r.place);

      const normalizedZoos: NormalizedPlace[] = (data.zoos || [])
        .map((z: any) => normalizeRecord(z, 'zoo'))
        .filter((r: any) => r.valid)
        .map((r: any) => r.place);

      if (normalizedForests.length > 0) {
        const exactMatch = normalizedForests.find(
          (f) => f.name.toLowerCase() === query.toLowerCase().trim()
        );
        if (exactMatch) {
          handleSelectPlace(exactMatch);
        } else if (onRegionSearch) {
          onRegionSearch(normalizedForests, query);
        } else {
          handleSelectPlace(normalizedForests[0]);
        }
      } else if (normalizedZoos.length > 0) {
        handleSelectPlace(normalizedZoos[0]);
      } else if (data.species && data.species.length > 0) {
        handleSelectSpecies(data.species[0]);
      }
      setIsOpen(false);
    } catch (error) {
      console.error("Search submit failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults({ forests: [], zoos: [], species: [] });
    onClearSearch();
    setIsOpen(false);
  };

  const hasResults = results.forests.length > 0 || results.zoos.length > 0 || results.species.length > 0;

  return (
    <div ref={searchRef} className="relative w-full max-w-xl font-body-md select-none">
      <form
        onSubmit={handleSearchSubmit}
        className="relative flex items-center glass-panel bg-surface-container-high/95 p-1 rounded-full shadow-2xl transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/50 border border-outline-variant/60"
      >
        <div className="flex items-center px-4 gap-2 flex-1">
          <SearchIcon className="w-5 h-5 text-primary" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder="Search Forest, Zoo, Country, State, City, or Species..."
            className="w-full bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline/65 font-body-md py-2.5 outline-none text-xs sm:text-sm"
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
            className="bg-primary text-on-primary font-label-md px-5 py-2 rounded-full hover:bg-primary/90 transition-all active:scale-95 shadow-md font-semibold text-xs uppercase tracking-wider cursor-pointer"
          >
            Search
          </button>
        )}
      </form>

      {/* Suggestions Dropdown */}
      {isOpen && (
        <div className="absolute w-full mt-3 rounded-2xl glass-panel bg-[#151c24]/98 border border-outline-variant/60 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-from-top-2 duration-200 max-h-96 overflow-y-auto">
          
          {/* Recent Searches */}
          {history.length > 0 && !query && (
            <div className="p-2 border-b border-outline-variant/30">
              <div className="flex justify-between items-center px-3 py-1 text-[10px] font-bold text-primary tracking-wider uppercase font-label-sm">
                <span>Recent Searches</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearHistory();
                  }}
                  className="text-[9px] hover:underline text-on-surface-variant normal-case cursor-pointer font-label-sm"
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

          {loading ? (
            <div className="p-6 text-center text-xs text-on-surface-variant flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span>Searching forests, zoos, regions & species...</span>
            </div>
          ) : hasResults ? (
            <div className="p-2 divide-y divide-white/5 space-y-2">
              
              {/* Forests */}
              {results.forests.length > 0 && (
                <div className="pt-1">
                  <div className="px-3 py-1 text-[10px] font-bold text-[#a5d0b9] tracking-wider uppercase flex items-center gap-1.5 font-label-sm">
                    <span>🌳 Forests ({results.forests.length})</span>
                  </div>
                  {results.forests.map((forest) => (
                    <button
                      key={forest.id}
                      type="button"
                      onClick={() => handleSelectPlace(forest)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#1b4332]/40 text-on-surface text-left transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <MapPin className="w-4 h-4 text-[#10b981] group-hover:scale-110 transition-transform shrink-0" />
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-on-surface block truncate font-headline-md">
                            {forest.name}
                          </span>
                          <span className="text-[10px] text-[#8ba394] truncate block">
                            {forest.state ? forest.state + ', ' : ''}{forest.country}
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-[#a5d0b9] bg-[#1b4332] px-2 py-0.5 rounded shrink-0">
                        Forest
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Zoos */}
              {results.zoos.length > 0 && (
                <div className="pt-2">
                  <div className="px-3 py-1 text-[10px] font-bold text-[#fde68a] tracking-wider uppercase flex items-center gap-1.5 font-label-sm">
                    <span>🦁 Zoos & Wildlife Parks ({results.zoos.length})</span>
                  </div>
                  {results.zoos.map((zoo) => (
                    <button
                      key={zoo.id}
                      type="button"
                      onClick={() => handleSelectPlace(zoo)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#78350f]/40 text-on-surface text-left transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <MapPin className="w-4 h-4 text-[#f59e0b] group-hover:scale-110 transition-transform shrink-0" />
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-on-surface block truncate font-headline-md">
                            {zoo.name}
                          </span>
                          <span className="text-[10px] text-[#fbbf24]/80 truncate block">
                            {zoo.city ? zoo.city + ', ' : ''}{zoo.country}
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-[#fde68a] bg-[#78350f] px-2 py-0.5 rounded shrink-0">
                        Zoo
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Species */}
              {results.species.length > 0 && (
                <div className="pt-2">
                  <div className="px-3 py-1 text-[10px] font-bold text-primary tracking-wider uppercase flex items-center gap-1.5 font-label-sm">
                    <span>🐾 Verified Wildlife Species ({results.species.length})</span>
                  </div>
                  {results.species.map((sp) => (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => handleSelectSpecies(sp)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-primary/10 text-on-surface text-left transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {sp.imageUrl ? (
                          <img src={sp.imageUrl} alt={sp.name} className="w-7 h-7 rounded-md object-cover shrink-0" />
                        ) : (
                          <Eye className="w-4 h-4 text-primary shrink-0" />
                        )}
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-on-surface block truncate font-headline-md group-hover:text-primary">
                            {sp.name}
                          </span>
                          <span className="text-[10px] text-on-surface-variant italic truncate block">
                            {sp.scientificName}
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-primary bg-primary/20 px-2 py-0.5 rounded shrink-0">
                        {sp.speciesGroup || 'Species'}
                      </span>
                    </button>
                  ))}
                </div>
              )}

            </div>
          ) : query.trim().length >= 2 ? (
            <div className="p-6 text-center text-xs text-on-surface-variant">
              No matching forests, zoos, or species found for "{query}".
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default Search;
