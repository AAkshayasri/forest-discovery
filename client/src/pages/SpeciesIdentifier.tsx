import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, Sparkles, Image as ImageIcon, CheckCircle, 
  AlertCircle, Loader2, Heart, Calendar, Target, 
  MapPin, Compass, BookOpen, RefreshCw, Camera
} from 'lucide-react';

interface IdentifiedSpecies {
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
  confidenceScore: number;
  ecologicalRole?: string;
  similarSpecies?: string[];
  safetyInfo?: string;
}

const PRESETS = [
  {
    name: 'Bengal Tiger',
    imageUrl: 'https://images.unsplash.com/photo-1602491453631-e2a5ad90a131?q=80&w=800&auto=format&fit=crop',
    mimeType: 'image/jpeg'
  },
  {
    name: 'Jaguar',
    imageUrl: 'https://images.unsplash.com/photo-1575550959106-5a7defe28b56?q=80&w=800&auto=format&fit=crop',
    mimeType: 'image/jpeg'
  },
  {
    name: 'Asiatic Lion',
    imageUrl: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?q=80&w=800&auto=format&fit=crop',
    mimeType: 'image/jpeg'
  },
  {
    name: 'Indian Elephant',
    imageUrl: 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?q=80&w=800&auto=format&fit=crop',
    mimeType: 'image/jpeg'
  }
];

export const SpeciesIdentifier: React.FC = () => {
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedMimeType, setSelectedMimeType] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IdentifiedSpecies | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  // Read local file as Base64 string with automatic canvas downscaling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError("Please upload an image file (PNG, JPG, etc.)");
      return;
    }

    setError(null);
    setSelectedMimeType('image/jpeg');

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
        setSelectedImage(compressedDataUrl);
        setResult(null);
      };
    };
    reader.readAsDataURL(file);
  };

  // Direct workflow: Pass identified species into Sighting submission form
  const handleLogAsSighting = () => {
    if (!result) return;
    if (result.imageUrl || selectedImage) {
      sessionStorage.setItem('wildatlas_prefill_image', result.imageUrl || selectedImage || '');
    }
    navigate(`/sightings?species=${encodeURIComponent(result.name)}&sci=${encodeURIComponent(result.scientificName || '')}`);
  };

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Preset Selector
  const handlePresetSelect = async (preset: typeof PRESETS[0]) => {
    setError(null);
    setResult(null);
    setLoading(true);
    
    try {
      // Send the preset URL directly to backend. 
      // To simulate file upload, we convert image URL to base64
      const response = await fetch(preset.imageUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        setSelectedImage(base64data);
        setSelectedMimeType(preset.mimeType);
        setLoading(false);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error(err);
      setError("Failed to load preset image.");
      setLoading(false);
    }
  };

  // Perform Identification
  const identifyImage = async () => {
    if (!selectedImage) return;

    setLoading(true);
    setError(null);
    
    // Extract raw base64 string from data URI
    const base64Content = selectedImage.split(',')[1] || selectedImage;

    try {
      const data = await api.identifySpecies(base64Content, selectedMimeType || 'image/jpeg');
      
      // Inject current preview image in case mock did not return a valid URL
      if (!data.imageUrl) {
        data.imageUrl = selectedImage;
      }
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to identify species in the image.");
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setSelectedImage(null);
    setSelectedMimeType('');
    setResult(null);
    setError(null);
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('endangered')) return 'bg-error-container/20 text-error border-error/30';
    if (s.includes('vulnerable') || s.includes('threatened')) return 'bg-tertiary-container/30 text-tertiary border-tertiary/20';
    return 'bg-secondary-container/20 text-secondary border-secondary/20';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pt-24 pb-12 px-4 md:px-8 select-none font-body-md">
      
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-[#1b4332] blur-[150px]" />
      </div>

      <div className="max-w-6xl mx-auto w-full relative z-10 space-y-8 flex-1 flex flex-col">
        
        {/* Title */}
        <div className="text-left">
          <h2 className="font-headline-lg text-3xl font-bold text-on-background flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
            AI Species Identifier
          </h2>
          <p className="font-body-md text-on-surface-variant mt-2 max-w-xl leading-relaxed">
            Upload an image of an animal, bird, or reptile. The intelligence engine will analyze its visual features, classify the species, and display its ecological properties.
          </p>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 items-stretch">
          
          {/* Upload / Selector Section */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="glass-panel bg-surface-container-high/95 border border-outline-variant/60 rounded-xl p-6 flex flex-col justify-between flex-1">
              
              <div className="space-y-6">
                <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1.5 border-b border-outline-variant/45 pb-2 font-label-sm">
                  <Upload className="w-4 h-4 text-primary" />
                  Media Upload
                </h3>

                {/* Drag and Drop Container */}
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-6 transition-all relative flex flex-col items-center justify-center min-h-[220px] cursor-pointer ${
                    isDragActive 
                      ? 'border-primary bg-primary-container/10' 
                      : selectedImage 
                        ? 'border-primary/40 bg-primary-container/5' 
                        : 'border-outline-variant/40 hover:border-primary/45 bg-surface-container-low'
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />

                  {selectedImage ? (
                    <div className="relative w-full h-[180px] rounded-lg overflow-hidden shadow-lg border border-outline-variant/40">
                      <img 
                        src={selectedImage} 
                        alt="Selected Preview" 
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImage(null);
                        }}
                        className="absolute top-2 right-2 bg-surface-container-lowest/80 hover:bg-surface-container border border-outline-variant/40 text-on-surface rounded-full p-1.5 transition-colors cursor-pointer z-20"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-surface-container border border-outline-variant/40 flex items-center justify-center mx-auto text-on-surface-variant">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-on-surface font-label-sm">Drag & Drop Image Here</span>
                        <span className="block text-[10px] text-on-surface-variant mt-1 font-body-md">or click to browse local files</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Preset Options */}
                <div className="space-y-3">
                  <span className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-left font-label-sm">
                    Demo Mode Presets
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    {PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => handlePresetSelect(p)}
                        className="flex items-center gap-2.5 p-2 rounded-lg bg-surface-container border border-outline-variant/40 hover:border-primary/45 text-left transition-all cursor-pointer group font-label-sm"
                      >
                        <img 
                          src={p.imageUrl} 
                          alt={p.name} 
                          className="w-8 h-8 rounded object-cover border border-outline-variant/40" 
                        />
                        <span className="text-[11px] font-semibold text-on-surface-variant group-hover:text-primary transition-colors truncate">
                          {p.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 pt-4 border-t border-outline-variant/45 space-y-3">
                {selectedImage && !result && (
                  <button
                    onClick={identifyImage}
                    disabled={loading}
                    className="w-full py-3 bg-primary text-on-primary rounded-full text-xs font-bold transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 font-label-md hover:brightness-105"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing visual pixels...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Identify Species
                      </>
                    )}
                  </button>
                )}
                
                {result && (
                  <button
                    onClick={resetAll}
                    className="w-full py-3 bg-surface-container hover:bg-surface-container-highest border border-outline-variant/45 text-on-surface-variant hover:text-primary rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 font-label-md"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Identify Another Image
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* Results section */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="glass-panel bg-surface-container-high/95 border border-outline-variant/60 rounded-xl p-6 md:p-8 flex-1 flex flex-col min-h-[400px]">
              
              <AnimatePresence mode="wait">
                
                {/* Loader State */}
                {loading && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center gap-3.5"
                  >
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <div className="text-center space-y-1">
                      <span className="block text-xs font-bold text-on-surface uppercase tracking-widest font-label-sm">Consulting Neural Net...</span>
                      <span className="block text-[10px] text-on-surface-variant font-body-md">Extracting morphology features and classification keys</span>
                    </div>
                  </motion.div>
                )}

                {/* Error State */}
                {error && !loading && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-10"
                  >
                    <AlertCircle className="w-10 h-10 text-error" />
                    <div className="max-w-xs">
                      <h4 className="font-bold text-xs text-on-surface font-label-sm">Identification Failed</h4>
                      <p className="text-[10px] text-on-surface-variant mt-1 leading-normal font-body-md">
                        {error}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Empty State */}
                {!selectedImage && !loading && !error && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center gap-3 text-on-surface-variant text-center py-10"
                  >
                    <Compass className="w-10 h-10 text-outline animate-pulse" />
                    <div className="max-w-xs">
                      <h4 className="font-bold text-xs text-on-surface font-label-sm">Awaiting Visual Input</h4>
                      <p className="text-[10px] text-on-surface-variant mt-1 leading-normal font-body-md">
                        Select a preset sample or drag in a local file. The analysis results will load here automatically.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Image selected, awaiting analysis */}
                {selectedImage && !result && !loading && !error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-10"
                  >
                    <CheckCircle className="w-10 h-10 text-secondary animate-bounce" />
                    <div className="max-w-xs">
                      <h4 className="font-bold text-xs text-on-surface font-label-sm">Image Loaded Successfully</h4>
                      <p className="text-[10px] text-on-surface-variant mt-1 leading-normal font-body-md">
                        Click the **"Identify Species"** button to start processing the image.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Successful Result Display */}
                {result && !loading && !error && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col text-left space-y-6"
                  >
                    {/* Header Banner */}
                    <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between">
                      <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                        <img 
                          src={result.imageUrl} 
                          alt={result.name} 
                          className="w-24 h-24 rounded-lg object-cover border border-outline-variant/40 shadow-md shrink-0" 
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap font-label-sm">
                            <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-bold ${getStatusColor(result.conservationStatus)}`}>
                              {result.conservationStatus}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-surface-container-low border border-outline-variant/40 text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">
                              {result.type}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-secondary-container/20 border border-secondary/20 text-[9px] font-bold text-secondary">
                              Confidence: {Math.round(result.confidenceScore * 100)}%
                            </span>
                          </div>
                          <h3 className="font-display-lg text-2xl font-bold text-on-background">{result.name}</h3>
                          <p className="text-xs font-mono text-primary italic font-semibold">{result.scientificName}</p>
                        </div>
                      </div>

                      <button
                        onClick={handleLogAsSighting}
                        className="px-4 py-2.5 bg-primary text-on-primary rounded-full text-xs font-bold hover:brightness-105 transition-all shadow-md cursor-pointer flex items-center gap-2 shrink-0 self-start sm:self-center"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Log as Sighting
                      </button>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                      <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/35 flex flex-col justify-between">
                        <Heart className="w-3.5 h-3.5 text-primary mb-2" />
                        <div>
                          <span className="block text-[8px] text-on-surface-variant uppercase tracking-widest font-label-sm">Dietary</span>
                          <span className="text-[11px] sm:text-xs font-bold text-on-surface block leading-tight break-words">{result.diet}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/35 flex flex-col justify-between">
                        <Calendar className="w-3.5 h-3.5 text-secondary mb-2" />
                        <div>
                          <span className="block text-[8px] text-on-surface-variant uppercase tracking-widest font-label-sm">Lifespan</span>
                          <span className="text-[11px] sm:text-xs font-bold text-on-surface block leading-tight break-words">{result.lifespan}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/35 flex flex-col justify-between">
                        <Target className="w-3.5 h-3.5 text-tertiary mb-2" />
                        <div>
                          <span className="block text-[8px] text-on-surface-variant uppercase tracking-widest font-label-sm">Habitat</span>
                          <span className="text-[11px] sm:text-xs font-bold text-on-surface block leading-tight break-words">{result.habitat}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/35 flex flex-col justify-between">
                        <MapPin className="w-3.5 h-3.5 text-primary mb-2" />
                        <div>
                          <span className="block text-[8px] text-on-surface-variant uppercase tracking-widest font-label-sm">Region</span>
                          <span className="text-[11px] sm:text-xs font-bold text-on-surface block leading-tight break-words">{result.distribution}</span>
                        </div>
                      </div>
                    </div>

                    {/* Behavior Section */}
                    <div className="space-y-1.5 border-t border-outline-variant/45 pt-4">
                      <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1.5 font-label-sm">
                        <Compass className="w-3.5 h-3.5 text-primary" />
                        Behavior & Special Traits
                      </h4>
                      <p className="text-on-surface-variant text-xs leading-relaxed font-body-md">
                        {result.behaviour}
                      </p>
                    </div>

                    {/* Facts */}
                    {result.interestingFacts && result.interestingFacts.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1.5 font-label-sm">
                          <BookOpen className="w-3.5 h-3.5 text-secondary" />
                          Species Fact Sheets
                        </h4>
                        <ul className="space-y-2">
                          {result.interestingFacts.map((fact, idx) => (
                            <li 
                              key={idx} 
                              className="text-on-surface-variant text-xs leading-relaxed flex items-start gap-2 bg-[#1c1b1b]/80 p-3 rounded-lg border border-outline-variant/40"
                            >
                              <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                              <span className="font-body-md">{fact}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Ecological Role */}
                    {result.ecologicalRole && (
                      <div className="space-y-1.5 border-t border-outline-variant/45 pt-4">
                        <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1.5 font-label-sm">
                          <Target className="w-3.5 h-3.5 text-tertiary" />
                          Ecological Role
                        </h4>
                        <p className="text-on-surface-variant text-xs leading-relaxed font-body-md">
                          {result.ecologicalRole}
                        </p>
                      </div>
                    )}

                    {/* Similar Species */}
                    {result.similarSpecies && result.similarSpecies.length > 0 && (
                      <div className="space-y-2 border-t border-outline-variant/45 pt-4">
                        <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1.5 font-label-sm">
                          <Compass className="w-3.5 h-3.5 text-primary" />
                          Similar Species
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {result.similarSpecies.map((spec, sIdx) => (
                            <span key={sIdx} className="px-2.5 py-1 rounded bg-surface-container border border-outline-variant/40 text-[10px] font-medium text-on-surface">
                              {spec}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Safety Info */}
                    {result.safetyInfo && (
                      <div className="p-3.5 rounded-lg bg-error-container/10 border border-error/25 text-left flex items-start gap-2.5 mt-2">
                        <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-[8px] text-error uppercase tracking-widest font-bold font-label-sm">Safety Advisory</span>
                          <p className="text-[10px] font-medium text-on-error-container/90 mt-0.5 leading-normal font-body-md">{result.safetyInfo}</p>
                        </div>
                      </div>
                    )}

                  </motion.div>
                )}

              </AnimatePresence>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default SpeciesIdentifier;
