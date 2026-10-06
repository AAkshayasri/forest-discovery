import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useToast } from '../hooks/useToast';
import { 
  ScanEye, MapPin, Upload, Send, 
  Search, X, Maximize2, Loader2, Sparkles, Navigation
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export const Sightings: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [commonName, setCommonName] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [notes, setNotes] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  const [sightings, setSightings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Filtering & Search states
  const [activeFilter, setActiveFilter] = useState<'all' | 'verified' | 'pending' | 'flagged'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Lightbox modal state
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  // Mini Map reference
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const { showToast } = useToast();

  // Read pre-filled query parameters from Vision Identifier
  useEffect(() => {
    const prefillSpecies = searchParams.get('species');
    const prefillSci = searchParams.get('sci');
    if (prefillSpecies) setCommonName(prefillSpecies);
    if (prefillSci) setScientificName(prefillSci);

    const storedImage = sessionStorage.getItem('wildatlas_prefill_image');
    if (storedImage) {
      setImageBase64(storedImage);
      sessionStorage.removeItem('wildatlas_prefill_image');
    }
  }, [searchParams]);

  const fetchSightings = async () => {
    setLoading(true);
    try {
      const data = await api.getUserSightings();
      setSightings(data);
    } catch (err) {
      console.error("Failed to load user sightings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSightings();
  }, []);

  // Initialize interactive Mini Leaflet Map for pin drop
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = 20.5937;
    const initialLng = 78.9629;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 4,
      zoomControl: false
    });

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; Esri, OpenStreetMap contributors'
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const customIcon = L.divIcon({
      className: 'custom-pin-marker',
      html: `<div style="background-color: #22c55e; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(34,197,94,0.8);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setLatitude(lat.toFixed(5));
      setLongitude(lng.toFixed(5));

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { icon: customIcon }).addTo(map);
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync marker when lat/lng inputs change manually
  const updateMapMarker = (latNum: number, lngNum: number) => {
    if (!mapInstanceRef.current || isNaN(latNum) || isNaN(lngNum)) return;
    mapInstanceRef.current.setView([latNum, lngNum], 8, { animate: true });
    
    const customIcon = L.divIcon({
      className: 'custom-pin-marker',
      html: `<div style="background-color: #22c55e; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(34,197,94,0.8);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    if (markerRef.current) {
      markerRef.current.setLatLng([latNum, lngNum]);
    } else {
      markerRef.current = L.marker([latNum, lngNum], { icon: customIcon }).addTo(mapInstanceRef.current);
    }
  };

  // Client-side image compression using Canvas
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      img.src = readerEvent.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setImageBase64(compressedDataUrl);
        showToast("Photo optimized & attached.", "success");
      };
    };
    reader.readAsDataURL(file);
  };

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const latStr = pos.coords.latitude.toFixed(5);
          const lngStr = pos.coords.longitude.toFixed(5);
          setLatitude(latStr);
          setLongitude(lngStr);
          updateMapMarker(pos.coords.latitude, pos.coords.longitude);
          showToast("Location coordinates pinned.", "success");
        },
        () => {
          showToast("Unable to fetch location. Click directly on the mini-map to drop pin.", "warning");
        }
      );
    } else {
      showToast("Geolocation is not supported by your browser.", "error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commonName || !latitude || !longitude) {
      showToast("Please fill in common name and location coordinates.", "warning");
      return;
    }

    setSubmitting(true);
    try {
      await api.submitSighting({
        commonName,
        scientificName,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        imageBase64,
        notes
      });

      showToast("Wildlife sighting submitted successfully for review.", "success");

      // Reset form
      setCommonName('');
      setScientificName('');
      setLatitude('');
      setLongitude('');
      setNotes('');
      setImageBase64(null);
      if (markerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      
      // Refresh list
      fetchSightings();
    } catch (err) {
      showToast("Failed to log sighting.", "error");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered sightings
  const filteredSightings = sightings.filter(s => {
    const matchesFilter = activeFilter === 'all' || s.status.toLowerCase() === activeFilter;
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery = !query || 
      s.commonName?.toLowerCase().includes(query) || 
      s.scientificName?.toLowerCase().includes(query) ||
      s.notes?.toLowerCase().includes(query);
    return matchesFilter && matchesQuery;
  });

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 md:px-8 select-none font-body-md relative text-left">
      {/* Glow highlight */}
      <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
        <div className="absolute top-[10%] right-[10%] w-[350px] h-[350px] rounded-full bg-secondary blur-[140px]" />
      </div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        {/* Header Title */}
        <div className="border-b border-outline-variant/45 pb-6">
          <h1 className="font-display-lg text-3xl font-bold text-on-background flex items-center gap-2">
            <ScanEye className="w-8 h-8 text-primary" />
            Wildlife Sightings Journal
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            Log your field wildlife sightings with interactive GPS pin-drops, photos, and live moderation tracking.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Submission Form Column */}
          <Card className="lg:col-span-5 bg-surface-container-high/90 p-6 border border-outline-variant/40 rounded-xl space-y-4 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between border-b border-outline-variant/35 pb-2">
                <h3 className="font-headline-md text-base font-bold text-on-surface flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary" /> Log New Sighting
                </h3>
                <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider font-label-sm">
                  Citizen Science
                </span>
              </div>

              {/* Common Name */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-sm">Species Common Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bengal Tiger, Great Hornbill"
                  value={commonName}
                  onChange={(e) => setCommonName(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary/80 font-body-md"
                />
              </div>

              {/* Scientific Name */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-sm">Scientific Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Panthera tigris"
                  value={scientificName}
                  onChange={(e) => setScientificName(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary/80 font-body-md"
                />
              </div>

              {/* Location Coordinates & Mini Map Pin Drop */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-sm">
                    Interactive GPS Pin Drop *
                  </label>
                  <button
                    type="button"
                    onClick={handleLocateMe}
                    className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline cursor-pointer font-label-sm"
                  >
                    <Navigation className="w-3 h-3" /> Auto-GPS
                  </button>
                </div>

                {/* Interactive Mini Map Container */}
                <div className="w-full h-36 rounded-lg overflow-hidden border border-outline-variant/40 relative">
                  <div ref={mapContainerRef} className="w-full h-full z-0" />
                  <div className="absolute top-2 left-2 z-10 pointer-events-none bg-surface-container/90 px-2 py-0.5 rounded text-[9px] text-on-surface-variant font-mono border border-outline-variant/30">
                    Click map to pin
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.00001"
                    required
                    placeholder="Latitude (e.g. 11.562)"
                    value={latitude}
                    onChange={(e) => {
                      setLatitude(e.target.value);
                      const latNum = parseFloat(e.target.value);
                      const lngNum = parseFloat(longitude);
                      if (!isNaN(latNum) && !isNaN(lngNum)) updateMapMarker(latNum, lngNum);
                    }}
                    className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-xs text-on-surface font-mono"
                  />
                  <input
                    type="number"
                    step="0.00001"
                    required
                    placeholder="Longitude (e.g. 76.534)"
                    value={longitude}
                    onChange={(e) => {
                      setLongitude(e.target.value);
                      const latNum = parseFloat(latitude);
                      const lngNum = parseFloat(e.target.value);
                      if (!isNaN(latNum) && !isNaN(lngNum)) updateMapMarker(latNum, lngNum);
                    }}
                    className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-xs text-on-surface font-mono"
                  />
                </div>
              </div>

              {/* Photo Upload with Canvas Optimization */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-sm">Field Photo Evidence</label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-outline-variant hover:border-primary/60 transition-colors bg-surface-container text-xs text-on-surface-variant">
                    <Upload className="w-4 h-4 text-primary" />
                    <span className="truncate">{imageBase64 ? 'Change Photo' : 'Upload Field Photo'}</span>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                  {imageBase64 && (
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-outline-variant/40 shrink-0 relative group">
                      <img src={imageBase64} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImageBase64(null)}
                        className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-error"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Field Notes */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider font-label-sm">Field Notes / Behavior</label>
                <textarea
                  rows={2}
                  placeholder="Observed near riverbank canopy at dusk..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary/80 font-body-md"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
                className="w-full justify-center rounded-lg font-label-sm font-bold uppercase tracking-wider py-2.5"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Send className="w-4 h-4 mr-1.5" />}
                Submit Observation
              </Button>
            </form>
          </Card>

          {/* Sightings List Column */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Filter Bar & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-high/90 p-3 rounded-xl border border-outline-variant/40 shadow-lg">
              
              {/* Filter Tabs */}
              <div className="flex gap-1 overflow-x-auto">
                {(['all', 'verified', 'pending', 'flagged'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveFilter(tab)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer font-label-sm whitespace-nowrap ${
                      activeFilter === tab
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-primary bg-surface-container'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                <input
                  type="text"
                  placeholder="Filter species / notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant/30 rounded-lg pl-8 pr-3 py-1.5 text-xs text-on-surface placeholder:text-outline/60 focus:outline-none focus:border-primary font-body-md"
                />
              </div>
            </div>

            {/* Sighting Cards */}
            {loading ? (
              <div className="p-12 text-center text-xs text-on-surface-variant flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary" /> Loading sightings records...
              </div>
            ) : filteredSightings.length > 0 ? (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {filteredSightings.map((sighting) => (
                  <div 
                    key={sighting.id} 
                    className="glass-panel bg-surface-container-high/90 p-4 rounded-xl border border-outline-variant/40 flex flex-col sm:flex-row gap-4 hover:border-primary/40 transition-colors shadow-md"
                  >
                    {sighting.imageBase64 && (
                      <div 
                        onClick={() => setLightboxImage({ url: sighting.imageBase64, title: sighting.commonName })}
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden border border-outline-variant/30 shrink-0 relative group cursor-pointer"
                      >
                        <img 
                          src={sighting.imageBase64} 
                          alt={sighting.commonName} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Maximize2 className="w-4 h-4" />
                        </div>
                      </div>
                    )}

                    <div className="flex-1 space-y-1.5 text-left">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-sm text-on-surface">{sighting.commonName}</h4>
                          {sighting.scientificName && (
                            <span className="text-[11px] text-on-surface-variant italic font-mono block">
                              {sighting.scientificName}
                            </span>
                          )}
                        </div>
                        <Badge type={sighting.status === 'verified' ? 'success' : sighting.status === 'flagged' ? 'error' : 'warning'}>
                          {sighting.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-[10px] text-on-surface-variant font-mono">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-primary" /> {Number(sighting.latitude).toFixed(3)}°, {Number(sighting.longitude).toFixed(3)}°
                        </span>
                        <span>•</span>
                        <span>{sighting.timestamp ? new Date(sighting.timestamp).toLocaleDateString() : 'N/A'}</span>
                      </div>

                      {sighting.notes && (
                        <p className="text-xs text-on-surface-variant/90 leading-relaxed italic bg-surface-container/50 p-2 rounded-lg border border-outline-variant/20">
                          "{sighting.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 rounded-xl bg-surface-container/60 border border-outline-variant/30 text-center text-xs text-on-surface-variant space-y-2">
                <p className="font-semibold">No sightings match current criteria.</p>
                <p className="text-[11px] text-outline">Submit a new observation using the form on the left!</p>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="relative max-w-3xl max-h-[85vh] bg-surface-container-high rounded-xl overflow-hidden border border-outline-variant/50 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b border-outline-variant/30 bg-surface-container">
              <span className="font-bold text-xs text-on-surface">{lightboxImage.title}</span>
              <button onClick={() => setLightboxImage(null)} className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center max-h-[75vh] overflow-hidden">
              <img src={lightboxImage.url} alt={lightboxImage.title} className="max-w-full max-h-[70vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Sightings;
