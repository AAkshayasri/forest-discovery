import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { MapView } from '../components/map/MapView';
import { Search } from '../components/map/Search';
import { WildlifeDetails } from './WildlifeDetails';
import {
  X, Trees, ThermometerSun, Ruler,
  ChevronRight, Sparkles, Info, MapPin, Navigation, Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Forest {
  id: number;
  name: string;
  country: string;
  state: string;
  latitude: number;
  longitude: number;
  boundary?: any;
  description: string;
  area?: string;
  climate?: string;
}

interface Zoo {
  id: number;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  notable_species: string;
}

interface Wildlife {
  id: number;
  forestId: number;
  name: string;
  scientificName: string;
  type: 'animal' | 'bird' | 'reptile';
  imageUrl: string;
  habitat: string;
  diet: string;
  behaviour: string;
  lifespan: string;
  conservationStatus: string;
  interestingFacts: string[];
  distribution: string;
}

const REFERENCE_CITIES: { [key: string]: { name: string; lat: number; lng: number } } = {
  london: { name: "London, UK", lat: 51.5074, lng: -0.1278 },
  newyork: { name: "New York, USA", lat: 40.7128, lng: -74.0060 },
  singapore: { name: "Singapore", lat: 1.3521, lng: 103.8198 },
  sydney: { name: "Sydney, Australia", lat: -33.8688, lng: 151.2093 },
  nairobi: { name: "Nairobi, Kenya", lat: -1.2921, lng: 36.8219 }
};

export const MapExplorer: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const speciesIdParam = searchParams.get('speciesId');
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');
  const zoomParam = searchParams.get('zoom');
  const forestIdParam = searchParams.get('forestId');
  const zooIdParam = searchParams.get('zooId');

  const [initialCenter] = useState<{ lat: number; lng: number; zoom?: number } | null>(() => {
    if (latParam && lngParam) {
      const lat = parseFloat(latParam);
      const lng = parseFloat(lngParam);
      const zoom = zoomParam ? parseInt(zoomParam, 10) : 8;
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng, zoom: isNaN(zoom) ? 8 : zoom };
      }
    }
    return null;
  });

  const [forests, setForests] = useState<Forest[]>([]);
  const [filteredForests, setFilteredForests] = useState<Forest[]>([]);
  const [selectedForest, setSelectedForest] = useState<Forest | null>(null);

  const [zoos, setZoos] = useState<Zoo[]>([]);
  const [selectedZoo, setSelectedZoo] = useState<Zoo | null>(null);

  // Routing states
  const [refLocation, setRefLocation] = useState<string>('london');
  const [routeInfo, setRouteInfo] = useState<any | null>(null);
  const [calculatingRoute, setCalculatingRoute] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Sidebar states
  const [wildlife, setWildlife] = useState<Wildlife[]>([]);
  const [activeTab, setActiveTab] = useState<'animal' | 'bird' | 'reptile'>('animal');
  const [loadingWildlife, setLoadingWildlife] = useState(false);
  const [searchTitle, setSearchTitle] = useState<string | null>(null);
  
  // AI Overview States
  const [aiOverview, setAiOverview] = useState<any | null>(null);
  const [loadingAiOverview, setLoadingAiOverview] = useState(false);

  // Wildlife details modal state
  const [selectedWildlifeId, setSelectedWildlifeId] = useState<number | null>(null);

  // Sync selectedWildlifeId with query parameter
  useEffect(() => {
    if (speciesIdParam) {
      const id = Number(speciesIdParam);
      if (!isNaN(id)) {
        setSelectedWildlifeId(id);
      }
    } else {
      setSelectedWildlifeId(null);
    }
  }, [speciesIdParam]);

  // Fetch forests and zoos on mount
  useEffect(() => {
    const initData = async () => {
      try {
        const [forestsData, zoosData] = await Promise.all([
          api.getForests(),
          api.getZoos()
        ]);
        setForests(forestsData);
        setFilteredForests(forestsData);
        setZoos(zoosData);

        // Check if there is a forestId or zooId in query parameters
        if (forestIdParam) {
          const fid = parseInt(forestIdParam, 10);
          const matched = forestsData.find((f: any) => f.id === fid);
          if (matched) {
            setSelectedForest(matched);
            return;
          }
        }

        if (zooIdParam) {
          const zid = parseInt(zooIdParam, 10);
          const matched = zoosData.find((z: any) => z.id === zid);
          if (matched) {
            setSelectedZoo(matched);
            return;
          }
        }

        // Check if there is a speciesId in the query params
        const urlParams = new URLSearchParams(window.location.search);
        const speciesIdParamVal = urlParams.get('speciesId');
        if (speciesIdParamVal) {
          const wildlifeId = Number(speciesIdParamVal);
          if (!isNaN(wildlifeId)) {
            // Fetch wildlife details to get its forestId
            const wDetails = await api.getWildlifeById(wildlifeId);
            if (wDetails && wDetails.forestId) {
              const found = forestsData.find((f: any) => f.id === wDetails.forestId);
              if (found) {
                setSelectedForest(found);
              }
            }
          }
        } else {
          // Auto select forest from landing redirect
          const pendingForestId = localStorage.getItem('wildatlas_auto_select_forest');
          if (pendingForestId) {
            localStorage.removeItem('wildatlas_auto_select_forest');
            const found = forestsData.find((f: any) => f.id.toString() === pendingForestId);
            if (found) {
              setSelectedForest(found);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load map explorer initial data:", error);
      }
    };
    initData();
  }, []);

  // Fetch wildlife when a forest is selected
  useEffect(() => {
    if (!selectedForest) {
      setWildlife([]);
      return;
    }

    const fetchWildlife = async () => {
      setLoadingWildlife(true);
      try {
        const data = await api.getForestWildlife(selectedForest.id);
        setWildlife(data);

        // Check query param first
        const urlParams = new URLSearchParams(window.location.search);
        const speciesIdParamVal = urlParams.get('speciesId');
        if (speciesIdParamVal) {
          const foundWildlife = data.find((w: any) => w.id.toString() === speciesIdParamVal);
          if (foundWildlife) {
            setActiveTab(foundWildlife.type);
            setSelectedWildlifeId(foundWildlife.id);
          }
        } else {
          // Auto select wildlife if there's a pending selection
          const pendingWildlifeId = localStorage.getItem('wildatlas_auto_select_wildlife');
          if (pendingWildlifeId) {
            localStorage.removeItem('wildatlas_auto_select_wildlife');
            const foundWildlife = data.find((w: any) => w.id.toString() === pendingWildlifeId);
            if (foundWildlife) {
              setActiveTab(foundWildlife.type);
              setSelectedWildlifeId(foundWildlife.id);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load wildlife:", error);
      } finally {
        setLoadingWildlife(false);
      }
    };

    fetchWildlife();
  }, [selectedForest]);

  // Fetch AI Overview on forest select
  useEffect(() => {
    if (!selectedForest) {
      setAiOverview(null);
      return;
    }
    const fetchAiOverview = async () => {
      setLoadingAiOverview(true);
      setAiOverview(null);
      try {
        const data = await api.getForestOverview(selectedForest.name, selectedForest.description);
        setAiOverview(data);
      } catch (err) {
        console.error("Failed to load AI overview:", err);
      } finally {
        setLoadingAiOverview(false);
      }
    };
    fetchAiOverview();
  }, [selectedForest]);

  const handleForestSelect = (forest: Forest) => {
    setSelectedForest(forest);
    setSelectedZoo(null);
    setRouteInfo(null);
    setFilteredForests(forests); // Reset filters on direct select
    setSearchTitle(null);
  };

  const handleZooSelect = (zoo: Zoo) => {
    setSelectedZoo(zoo);
    setSelectedForest(null);
    setRouteInfo(null);
  };

  const calculateRouteInfo = async (destLat: number, destLng: number) => {
    setCalculatingRoute(true);
    setRouteInfo(null);
    setGpsError(null);
    try {
      let startLat: number;
      let startLng: number;

      if (refLocation === 'gps') {
        if (!navigator.geolocation) {
          throw new Error("Geolocation is not supported by your browser");
        }
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        startLat = pos.coords.latitude;
        startLng = pos.coords.longitude;
      } else {
        const city = REFERENCE_CITIES[refLocation];
        if (!city) return;
        startLat = city.lat;
        startLng = city.lng;
      }

      const res = await api.calculateRoute({
        startLat,
        startLng,
        destLat,
        destLng
      });
      setRouteInfo(res);
    } catch (err: any) {
      console.error("Failed to calculate route:", err);
      setGpsError(err.message || "Failed to calculate route");
    } finally {
      setCalculatingRoute(false);
    }
  };

  const handleRegionSearch = (results: Forest[], query: string) => {
    setFilteredForests(results);
    setSelectedForest(null); // Clear selected forest to show filtered cluster zoom
    setSelectedZoo(null);
    setSearchTitle(`Filtered matches for "${query}" (${results.length})`);
  };

  const handleClearSearch = () => {
    setFilteredForests(forests);
    setSelectedForest(null);
    setSelectedZoo(null);
    setSearchTitle(null);
    setRouteInfo(null);
  };

  const filteredWildlife = wildlife.filter(w => w.type === activeTab);

  return (
    <div className="relative w-full h-[calc(100vh-5rem)] mt-20 overflow-hidden bg-background">
      {/* 1. Fullscreen Map Layer */}
      <div className="absolute inset-0 z-0">
        <MapView
          forests={filteredForests}
          selectedForest={selectedForest}
          onForestSelect={handleForestSelect}
          zoos={zoos}
          onZooSelect={handleZooSelect}
          routePath={routeInfo ? routeInfo.path : null}
          initialCenter={initialCenter}
        />
      </div>

      {/* 2. Floating Search Bar Header */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 w-[90%] max-w-xl px-4 pointer-events-none">
        <div className="pointer-events-auto flex flex-col items-center gap-2">
          <Search
            onForestSelect={handleForestSelect}
            onRegionSearch={handleRegionSearch}
            onClearSearch={handleClearSearch}
          />
          {searchTitle && (
            <div className="px-4 py-1.5 rounded-full bg-surface-container-high/90 backdrop-blur-md border border-outline-variant/45 text-xs font-semibold text-primary shadow-md font-label-sm">
              {searchTitle}
            </div>
          )}
        </div>
      </div>

      {/* 3. Floating Sidebar Panel (Framer Motion) */}
      <AnimatePresence>
        {selectedForest && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 180 }}
            className="absolute right-0 top-0 h-full w-full md:w-[420px] glass-panel bg-surface-container-high/95 z-35 flex flex-col pt-6 shadow-2xl select-none border-l border-outline-variant/60"
          >
            {/* Header info */}
            <div className="p-6 border-b border-outline-variant/45 relative">
              <button
                onClick={() => setSelectedForest(null)}
                className="absolute top-6 right-6 p-2 rounded-lg text-on-surface-variant hover:text-primary bg-surface-container/60 hover:bg-surface-container-highest border border-outline-variant/45 transition-all cursor-pointer shadow"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-1 font-label-sm">
                <Trees className="w-4 h-4 animate-pulse" />
                Forest Profile
              </div>
              <h2 className="font-headline-md text-2xl font-bold text-on-background leading-tight pr-10">
                {selectedForest.name}
              </h2>
              <p className="text-xs text-on-surface-variant font-medium mt-1 font-label-sm">
                {selectedForest.state}, {selectedForest.country}
              </p>

              {/* Quick Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/35">
                  <Ruler className="w-4 h-4 text-primary" />
                  <div>
                    <span className="block text-[8px] text-on-surface-variant uppercase tracking-widest font-label-sm">Total Area</span>
                    <span className="text-xs font-bold text-on-surface">{selectedForest.area || "Unknown"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/35">
                  <ThermometerSun className="w-4 h-4 text-tertiary" />
                  <div>
                    <span className="block text-[8px] text-on-surface-variant uppercase tracking-widest font-label-sm">Climate</span>
                    <span className="text-xs font-bold text-on-surface">{selectedForest.climate || "Unknown"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable Information Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* Description */}
              <div>
                <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 font-label-sm">Description</h4>
                <p className="text-on-surface-variant text-xs leading-relaxed font-body-md">
                  {selectedForest.description}
                </p>
              </div>

              {/* Route Planner Widget */}
              <div className="border-t border-outline-variant/45 pt-4">
                <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3 font-label-sm flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5 text-primary" />
                  Route Planner
                </h4>
                <div className="space-y-3 bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/30">
                  <div>
                    <label className="block text-[10px] text-on-surface-variant uppercase font-bold mb-1 font-label-sm">Select Reference Start Location</label>
                    <select
                      value={refLocation}
                      onChange={(e) => setRefLocation(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant/40 rounded px-2 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary/80 font-body-md"
                    >
                      <option value="gps">📍 Current GPS Location</option>
                      {Object.entries(REFERENCE_CITIES).map(([key, val]) => (
                        <option key={key} value={key}>{val.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => calculateRouteInfo(selectedForest.latitude, selectedForest.longitude)}
                    disabled={calculatingRoute}
                    className="w-full py-2 bg-primary hover:brightness-105 disabled:opacity-55 text-on-primary text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer font-label-sm shadow-md"
                  >
                    <Compass className="w-4 h-4 animate-spin-slow" />
                    {calculatingRoute ? "Plotting Path..." : "Calculate Distance & Route"}
                  </button>

                  {gpsError && (
                    <p className="text-[11px] text-error bg-error-container/20 p-2 rounded border border-error/30 font-medium">
                      {gpsError}
                    </p>
                  )}

                  {routeInfo && (
                    <div className="border-t border-outline-variant/30 pt-3 mt-1 space-y-2 text-xs text-on-surface-variant animate-fade-in">
                      <div className="flex justify-between">
                        <span>Distance:</span>
                        <strong className="text-primary">{routeInfo.distanceKm} km</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Mode of Transit:</span>
                        <strong className="capitalize">{routeInfo.mode}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Estimated Duration:</span>
                        <strong>{routeInfo.duration}</strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Forest Insights */}
              <div className="border-t border-outline-variant/45 pt-6 space-y-4">
                <h3 className="text-sm font-bold text-on-surface flex items-center gap-2 font-headline-md">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                  AI Forest Insights
                </h3>

                {loadingAiOverview ? (
                  <div className="space-y-3 animate-pulse bg-surface-container-low/40 p-4 rounded-xl border border-outline-variant/25">
                    <div className="h-4 bg-surface-container rounded w-3/4"></div>
                    <div className="h-3 bg-surface-container rounded"></div>
                    <div className="h-3 bg-surface-container rounded w-5/6"></div>
                    <div className="h-10 bg-surface-container rounded mt-4"></div>
                  </div>
                ) : aiOverview ? (
                  <div className="space-y-4 bg-surface-container-low/50 p-4 rounded-xl border border-outline-variant/35 text-xs text-on-surface-variant font-body-md leading-relaxed">
                    <div>
                      <span className="block font-bold text-on-surface text-[10px] uppercase tracking-wider mb-1 font-label-sm">Climate & Ecosystem</span>
                      <p>{aiOverview.climate} • {aiOverview.ecosystem}</p>
                    </div>
                    <div>
                      <span className="block font-bold text-on-surface text-[10px] uppercase tracking-wider mb-1 font-label-sm">Flora & Fauna</span>
                      <p><strong>Flora:</strong> {aiOverview.flora}</p>
                      <p className="mt-1"><strong>Fauna:</strong> {aiOverview.fauna}</p>
                    </div>
                    <div>
                      <span className="block font-bold text-on-surface text-[10px] uppercase tracking-wider mb-1 font-label-sm">Biodiversity & Endangered Species</span>
                      <p className="text-error font-medium">{aiOverview.endangeredSpecies}</p>
                      <p className="mt-1">{aiOverview.biodiversityImportance}</p>
                    </div>
                    <div>
                      <span className="block font-bold text-on-surface text-[10px] uppercase tracking-wider mb-1 font-label-sm">Best Visiting Season</span>
                      <p>{aiOverview.bestVisitingSeason}</p>
                    </div>
                    <div>
                      <span className="block font-bold text-on-surface text-[10px] uppercase tracking-wider mb-1 font-label-sm">Conservation efforts</span>
                      <p>{aiOverview.conservationEfforts}</p>
                    </div>
                    {aiOverview.interestingFacts && aiOverview.interestingFacts.length > 0 && (
                      <div>
                        <span className="block font-bold text-on-surface text-[10px] uppercase tracking-wider mb-1.5 font-label-sm">Key Facts</span>
                        <ul className="list-disc pl-4 space-y-1">
                          {aiOverview.interestingFacts.map((f: string, i: number) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] italic text-on-surface-variant">Could not load AI insights.</p>
                )}
              </div>

              {/* Wildlife Catalog Title */}
              <div className="border-t border-outline-variant/45 pt-6">
                <h3 className="text-sm font-bold text-on-surface flex items-center gap-2 mb-3 font-headline-md">
                  <Sparkles className="w-4 h-4 text-secondary animate-pulse" />
                  Species Taxonomy Catalog
                </h3>

                {/* Categories Tab Selectors */}
                <div className="flex gap-1.5 p-1 bg-surface-container border border-outline-variant/45 rounded-lg mb-4">
                  {(['animal', 'bird', 'reptile'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded capitalize transition-all cursor-pointer font-label-sm ${activeTab === tab
                          ? 'bg-primary text-on-primary shadow-md'
                          : 'text-on-surface-variant hover:text-primary'
                        }`}
                    >
                      {tab}s
                    </button>
                  ))}
                </div>

                {/* Wildlife List Output */}
                {loadingWildlife ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs text-on-surface-variant font-medium">Scanning Wildlife...</span>
                  </div>
                ) : filteredWildlife.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {filteredWildlife.map((animal) => (
                      <div
                        key={animal.id}
                        onClick={() => {
                          const newParams = new URLSearchParams(searchParams);
                          newParams.set('speciesId', animal.id.toString());
                          setSearchParams(newParams);
                        }}
                        className="glass-card rounded-lg overflow-hidden border border-outline-variant/30 hover:border-primary/45 transition-all hover:-translate-y-0.5 cursor-pointer shadow-lg flex flex-col group"
                      >
                        <div className="h-28 overflow-hidden relative">
                          <img
                            src={animal.imageUrl}
                            alt={animal.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-surface-container-low/90 border border-outline-variant/30 text-[9px] font-bold text-on-surface-variant">
                            {animal.conservationStatus}
                          </div>
                        </div>
                        <div className="p-3 text-left">
                          <h4 className="font-bold text-xs text-on-surface leading-tight line-clamp-1 font-body-lg">{animal.name}</h4>
                          <p className="text-[10px] text-on-surface-variant italic mt-0.5 line-clamp-1 font-body-md">{animal.scientificName}</p>
                          <div className="flex items-center text-[10px] text-primary font-semibold mt-2 group-hover:translate-x-1 transition-transform font-label-sm">
                            Details <ChevronRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-lg bg-surface-container border border-outline-variant/40 text-center text-xs text-on-surface-variant flex flex-col items-center gap-2">
                    <Info className="w-5 h-5 text-outline" />
                    <span>No {activeTab}s registered under this forest.</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {selectedZoo && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 180 }}
            className="absolute right-0 top-0 h-full w-full md:w-[420px] glass-panel bg-surface-container-high/95 z-35 flex flex-col pt-6 shadow-2xl select-none border-l border-outline-variant/60"
          >
            {/* Header info */}
            <div className="p-6 border-b border-outline-variant/45 relative text-left">
              <button
                onClick={() => setSelectedZoo(null)}
                className="absolute top-6 right-6 p-2 rounded-lg text-on-surface-variant hover:text-primary bg-surface-container/60 hover:bg-surface-container-highest border border-outline-variant/45 transition-all cursor-pointer shadow"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 text-[#e65f2b] text-xs font-bold uppercase tracking-wider mb-1 font-label-sm">
                <MapPin className="w-4 h-4 animate-pulse" />
                Zoo / Conservation Center
              </div>
              <h2 className="font-headline-md text-2xl font-bold text-on-background leading-tight pr-10">
                {selectedZoo.name}
              </h2>
              <p className="text-xs text-on-surface-variant font-medium mt-1 font-label-sm">
                {selectedZoo.country}
              </p>
            </div>

            {/* Scrollable Information Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
              {/* Notable Species */}
              <div>
                <h4 className="text-xs font-bold text-[#f7b28c] uppercase tracking-widest mb-2 font-label-sm">Notable Species Exhibits</h4>
                <p className="text-on-surface text-sm leading-relaxed font-body-md bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/30">
                  {selectedZoo.notable_species}
                </p>
              </div>

              {/* Route Planner Widget */}
              <div className="border-t border-outline-variant/45 pt-4">
                <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3 font-label-sm flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5 text-primary" />
                  Route Planner
                </h4>
                <div className="space-y-3 bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/30">
                  <div>
                    <label className="block text-[10px] text-on-surface-variant uppercase font-bold mb-1 font-label-sm">Select Reference Start Location</label>
                    <select
                      value={refLocation}
                      onChange={(e) => setRefLocation(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant/40 rounded px-2 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary/80 font-body-md"
                    >
                      <option value="gps">📍 Current GPS Location</option>
                      {Object.entries(REFERENCE_CITIES).map(([key, val]) => (
                        <option key={key} value={key}>{val.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => calculateRouteInfo(selectedZoo.latitude, selectedZoo.longitude)}
                    disabled={calculatingRoute}
                    className="w-full py-2 bg-primary hover:brightness-105 disabled:opacity-55 text-on-primary text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer font-label-sm shadow-md"
                  >
                    <Compass className="w-4 h-4 animate-spin-slow" />
                    {calculatingRoute ? "Plotting Path..." : "Calculate Distance & Route"}
                  </button>

                  {gpsError && (
                    <p className="text-[11px] text-error bg-error-container/20 p-2 rounded border border-error/30 font-medium">
                      {gpsError}
                    </p>
                  )}

                  {routeInfo && (
                    <div className="border-t border-outline-variant/30 pt-3 mt-1 space-y-2 text-xs text-on-surface-variant animate-fade-in">
                      <div className="flex justify-between">
                        <span>Distance:</span>
                        <strong className="text-primary">{routeInfo.distanceKm} km</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Mode of Transit:</span>
                        <strong className="capitalize">{routeInfo.mode}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Estimated Duration:</span>
                        <strong>{routeInfo.duration}</strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Wildlife Details Overlay Slide Panel */}
      <AnimatePresence>
        {selectedWildlifeId !== null && (
          <WildlifeDetails
            wildlifeId={selectedWildlifeId}
            onClose={() => {
              const newParams = new URLSearchParams(searchParams);
              newParams.delete('speciesId');
              setSearchParams(newParams);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MapExplorer;
