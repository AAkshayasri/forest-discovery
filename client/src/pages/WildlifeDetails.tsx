import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import { useFavorites } from '../hooks/useFavorites';
import { useToast } from '../hooks/useToast';
import ReactMarkdown from 'react-markdown';
import {
  X, Heart,
  MapPin, Compass, AlertCircle, Sparkles, BookOpen,
  Shield, Activity, Dna
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { validateAndFormatField } from '../utils/clientValidator';

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
  
  // Taxonomic classification
  kingdom?: string;
  phylum?: string;
  class?: string;
  order?: string;
  family?: string;
  genus?: string;
  species?: string;

  // Additional details
  description?: string;
  countries?: string;
  averageHeight?: string;
  averageWeight?: string;
  speed?: string;
  reproduction?: string;
  populationTrend?: string;
  majorThreats?: string;
  conservationEfforts?: string;
  forestsFound?: string;
}

interface WildlifeDetailsProps {
  wildlifeId: number;
  onClose: () => void;
}

export const WildlifeDetails: React.FC<WildlifeDetailsProps> = ({ wildlifeId, onClose }) => {
  const [animal, setAnimal] = useState<Wildlife | null>(null);
  const [loading, setLoading] = useState(true);
  const [forestName, setForestName] = useState<string>('Information not available');
  
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const { showToast } = useToast();

  const val = (value: any, fieldName: string) => {
    return validateAndFormatField(value, animal?.name, fieldName);
  };

  const [aiSummary, setAiSummary] = useState<any | null>(null);
  const [loadingAiSummary, setLoadingAiSummary] = useState(false);
  const [showAiSummary, setShowAiSummary] = useState(false);

  const fetchAiSummary = async () => {
    if (aiSummary || loadingAiSummary) {
      setShowAiSummary(!showAiSummary);
      return;
    }
    setLoadingAiSummary(true);
    setShowAiSummary(true);
    try {
      if (animal) {
        const data = await api.getSpeciesSummary(animal.name);
        setAiSummary(data);
      }
    } catch (error) {
      console.error("Failed to load AI species summary:", error);
    } finally {
      setLoadingAiSummary(false);
    }
  };

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const data = await api.getWildlifeById(wildlifeId);
        setAnimal(data);
        if (data.forestId) {
          try {
            const forestData = await api.getForestById(data.forestId);
            if (forestData) {
              setForestName(forestData.name);
            }
          } catch (forestErr) {
            console.error("Failed to load forest details:", forestErr);
            setForestName('Information not available');
          }
        }
      } catch (error) {
        console.error("Failed to load animal details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [wildlifeId]);

  const handleFavoriteToggle = () => {
    if (!animal) return;
    if (isFavorite(animal.id)) {
      removeFavorite(animal.id);
      showToast(`${animal.name} removed from favorites`, 'info');
    } else {
      addFavorite({
        id: animal.id,
        name: animal.name,
        scientificName: animal.scientificName,
        imageUrl: animal.imageUrl,
        conservationStatus: animal.conservationStatus
      });
      showToast(`${animal.name} added to favorites!`, 'success');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/85 backdrop-blur-sm animate-in fade-in duration-200 select-none">

      {/* Outer Click Closer */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-2xl max-h-[85vh] rounded-xl glass-panel bg-surface-container-high/95 shadow-2xl overflow-hidden flex flex-col border border-outline-variant/60 z-10"
      >

        {/* Action Controls */}
        <div className="absolute top-6 right-6 z-20 flex gap-2">
          {animal && (
            <button
              onClick={handleFavoriteToggle}
              className={`p-2 rounded-full border transition-all cursor-pointer shadow-lg ${
                isFavorite(animal.id)
                  ? 'bg-primary-container text-primary border-primary/45'
                  : 'bg-surface-container/80 text-on-surface-variant hover:text-primary border-outline-variant/45'
              }`}
              title={isFavorite(animal.id) ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart className={`w-4 h-4 ${isFavorite(animal.id) ? 'fill-primary' : ''}`} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-full text-on-surface-variant hover:text-primary bg-surface-container/80 hover:bg-surface-container-highest border border-outline-variant/45 transition-all cursor-pointer shadow-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 gap-3 min-h-[300px]">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider font-label-sm">Consulting Bio-Database...</span>
          </div>
        ) : animal ? (
          <div className="flex-1 overflow-y-auto flex flex-col">

            {/* Header Banner Image */}
            <div className="h-64 sm:h-72 w-full relative shrink-0">
              <img
                src={animal.imageUrl}
                alt={animal.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

              {/* Floating Conservation Badge */}
              <div className="absolute bottom-6 left-6 flex items-center gap-2">
                <Badge type={animal.conservationStatus.toLowerCase().includes('endangered') ? 'error' : 'warning'}>
                  {animal.conservationStatus}
                </Badge>
                <span className="px-3 py-1 rounded-full bg-surface-container-low/80 backdrop-blur-md border border-outline-variant/45 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest font-label-sm">
                  {animal.type}
                </span>
              </div>
            </div>

            {/* Core Info */}
            <div className="p-6 sm:p-8 space-y-6 text-left">
              <div>
                <h3 className="font-display-lg text-headline-lg font-bold text-on-background leading-tight">
                  {animal.name}
                 </h3>
                <p className="font-headline-md text-sm font-semibold text-primary italic mt-1 font-mono">
                  {val(animal.scientificName, 'scientificName')}
                </p>
              </div>

              {/* Description Section */}
              <div className="border-t border-outline-variant/25 pt-4">
                <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1.5 mb-2 font-label-sm">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  Description
                </h4>
                <p className="text-on-surface-variant text-xs leading-relaxed font-body-md">
                  {val(animal.description, 'description')}
                </p>
              </div>

              {/* Taxonomic Classification */}
              <div className="border-t border-outline-variant/25 pt-4">
                <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1.5 mb-3 font-label-sm">
                  <Dna className="w-3.5 h-3.5 text-secondary" />
                  Taxonomic Classification
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-surface-container-low border border-outline-variant/25">
                    <span className="block text-[8px] text-on-surface-variant uppercase font-semibold">Kingdom</span>
                    <span className="font-bold text-on-surface">{val(animal.kingdom, 'kingdom')}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-container-low border border-outline-variant/25">
                    <span className="block text-[8px] text-on-surface-variant uppercase font-semibold">Phylum</span>
                    <span className="font-bold text-on-surface">{val(animal.phylum, 'phylum')}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-container-low border border-outline-variant/25">
                    <span className="block text-[8px] text-on-surface-variant uppercase font-semibold">Class</span>
                    <span className="font-bold text-on-surface">{val(animal.class, 'class')}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-container-low border border-outline-variant/25">
                    <span className="block text-[8px] text-on-surface-variant uppercase font-semibold">Order</span>
                    <span className="font-bold text-on-surface">{val(animal.order, 'order')}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-container-low border border-outline-variant/25">
                    <span className="block text-[8px] text-on-surface-variant uppercase font-semibold">Family</span>
                    <span className="font-bold text-on-surface">{val(animal.family, 'family')}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-container-low border border-outline-variant/25">
                    <span className="block text-[8px] text-on-surface-variant uppercase font-semibold">Genus</span>
                    <span className="font-bold text-on-surface">{val(animal.genus, 'genus')}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-container-low border border-outline-variant/25">
                    <span className="block text-[8px] text-on-surface-variant uppercase font-semibold">Species</span>
                    <span className="font-bold text-on-surface">{val(animal.species, 'species')}</span>
                  </div>
                </div>
              </div>

              {/* Physical & Behavioral Profile */}
              <div className="border-t border-outline-variant/25 pt-4">
                <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1.5 mb-3 font-label-sm">
                  <Activity className="w-3.5 h-3.5 text-tertiary" />
                  Physical & Behavioral Profile
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/35 flex flex-col justify-between">
                    <span className="block text-[8px] text-on-surface-variant uppercase tracking-widest font-label-sm">Diet</span>
                    <span className="text-xs font-bold text-on-surface mt-1">{val(animal.diet, 'diet')}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/35 flex flex-col justify-between">
                    <span className="block text-[8px] text-on-surface-variant uppercase tracking-widest font-label-sm">Lifespan</span>
                    <span className="text-xs font-bold text-on-surface mt-1">{val(animal.lifespan, 'lifespan')}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/35 flex flex-col justify-between">
                    <span className="block text-[8px] text-on-surface-variant uppercase tracking-widest font-label-sm">Average Height</span>
                    <span className="text-xs font-bold text-on-surface mt-1">{val(animal.averageHeight, 'averageHeight')}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/35 flex flex-col justify-between">
                    <span className="block text-[8px] text-on-surface-variant uppercase tracking-widest font-label-sm">Average Weight</span>
                    <span className="text-xs font-bold text-on-surface mt-1">{val(animal.averageWeight, 'averageWeight')}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/35 flex flex-col justify-between">
                    <span className="block text-[8px] text-on-surface-variant uppercase tracking-widest font-label-sm">Speed</span>
                    <span className="text-xs font-bold text-on-surface mt-1">{val(animal.speed, 'speed')}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/35 flex flex-col justify-between">
                    <span className="block text-[8px] text-on-surface-variant uppercase tracking-widest font-label-sm">Population Trend</span>
                    <span className="text-xs font-bold text-on-surface mt-1">{val(animal.populationTrend, 'populationTrend')}</span>
                  </div>
                </div>
              </div>

              {/* Behavior & Reproduction */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-outline-variant/25 pt-4">
                <div>
                  <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1.5 mb-2 font-label-sm">
                    <Compass className="w-3.5 h-3.5 text-primary" />
                    Behavior
                  </h4>
                  <p className="text-on-surface-variant text-xs leading-relaxed font-body-md">
                    {val(animal.behaviour, 'behaviour')}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1.5 mb-2 font-label-sm">
                    <Sparkles className="w-3.5 h-3.5 text-secondary" />
                    Reproduction
                  </h4>
                  <p className="text-on-surface-variant text-xs leading-relaxed font-body-md">
                    {val(animal.reproduction, 'reproduction')}
                  </p>
                </div>
              </div>

              {/* Habitat & Distribution */}
              <div className="border-t border-outline-variant/25 pt-4 space-y-4">
                <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1.5 mb-1 font-label-sm">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  Habitat & Distribution
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2">
                    <div>
                      <span className="block text-[8px] text-on-surface-variant uppercase tracking-widest font-label-sm">Habitat Type</span>
                      <p className="text-on-surface font-semibold">{val(animal.habitat, 'habitat')}</p>
                    </div>
                    <div>
                      <span className="block text-[8px] text-on-surface-variant uppercase tracking-widest font-label-sm">Geographic Distribution</span>
                      <p className="text-on-surface font-semibold">{val(animal.distribution, 'distribution')}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="block text-[8px] text-on-surface-variant uppercase tracking-widest font-label-sm">Forests Found In</span>
                      <p className="text-on-surface font-semibold">{val(animal.forestsFound, 'forestsFound') === 'Information unavailable' ? forestName : val(animal.forestsFound, 'forestsFound')}</p>
                    </div>
                    <div>
                      <span className="block text-[8px] text-on-surface-variant uppercase tracking-widest font-label-sm">Countries</span>
                      <p className="text-on-surface font-semibold">{val(animal.countries, 'countries')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conservation & Threats */}
              <div className="border-t border-outline-variant/25 pt-4 space-y-4">
                <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1.5 mb-1 font-label-sm">
                  <Shield className="w-3.5 h-3.5 text-error" />
                  Conservation & Threats
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="block text-[8px] text-on-surface-variant uppercase tracking-widest font-label-sm">Major Threats</span>
                    <p className="text-on-surface-variant leading-relaxed mt-1 font-body-md">{val(animal.majorThreats, 'majorThreats')}</p>
                  </div>
                  <div>
                    <span className="block text-[8px] text-on-surface-variant uppercase tracking-widest font-label-sm">Conservation Efforts</span>
                    <p className="text-on-surface-variant leading-relaxed mt-1 font-body-md">{val(animal.conservationEfforts, 'conservationEfforts')}</p>
                  </div>
                </div>
              </div>

              {/* AI Species Summary Toggle */}
              <div className="border-t border-outline-variant/45 pt-6">
                <button
                  onClick={fetchAiSummary}
                  className="w-full flex items-center justify-between p-3.5 rounded-lg bg-primary-container/20 border border-primary/25 hover:border-primary/45 transition-all text-left group"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary animate-pulse group-hover:scale-110 transition-transform" />
                    <div>
                      <span className="block text-xs font-bold text-primary font-label-md">Explore AI Species Deep Dive</span>
                      <span className="block text-[9px] text-on-surface-variant mt-0.5 font-body-md">Get live insights on predators, threats, ecological role, and reproduction.</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-primary">{showAiSummary ? 'Hide' : 'Expand'}</span>
                </button>

                {showAiSummary && (
                  <div className="mt-3 p-5 rounded-lg bg-surface-container-low border border-outline-variant/40 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 text-xs text-on-surface-variant font-body-md leading-relaxed">
                    {loadingAiSummary ? (
                      <div className="flex flex-col items-center justify-center py-6 gap-2">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-[10px] text-on-surface-variant font-medium">Generating summary...</span>
                      </div>
                    ) : aiSummary && aiSummary.markdown ? (
                      <div className="prose prose-invert max-w-none text-xs text-on-surface-variant font-body-md leading-relaxed space-y-4 text-left">
                        <ReactMarkdown>{aiSummary.markdown}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-[10px] italic text-on-surface-variant text-center py-4">Information unavailable at this time.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Fact Sheets / Fun Facts */}
              <div className="border-t border-outline-variant/45 pt-6 space-y-3">
                <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1.5 font-label-sm">
                  <Sparkles className="w-3.5 h-3.5 text-secondary animate-pulse" />
                  Fun Facts
                </h4>
                {animal.interestingFacts && animal.interestingFacts.length > 0 ? (
                  <ul className="space-y-2.5">
                    {animal.interestingFacts.map((fact, idx) => (
                      <li
                        key={idx}
                        className="text-on-surface-variant text-xs leading-relaxed flex items-start gap-2 bg-[#1c1b1b]/80 p-3 rounded-lg border border-outline-variant/40"
                      >
                        <BookOpen className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span className="font-body-md">{fact}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-on-surface-variant italic">Information not available</p>
                )}
              </div>

            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-on-surface-variant text-xs flex flex-col items-center gap-2">
            <AlertCircle className="w-6 h-6 text-error" />
            <span>Biologue entry not found or database record corrupt.</span>
          </div>
        )}

      </motion.div>
    </div>
  );
};

export default WildlifeDetails;
