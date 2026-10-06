import React, { useState } from 'react';

// Curated high-resolution fallback photography by animal category
const CATEGORY_FALLBACKS: Record<string, string> = {
  mammal: 'https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?auto=format&fit=crop&w=800&q=80',
  bird: 'https://images.unsplash.com/photo-1522926193341-e9ffd686c60f?auto=format&fit=crop&w=800&q=80',
  reptile: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=800&q=80',
  amphibian: 'https://images.unsplash.com/photo-1579380656108-62d187232230?auto=format&fit=crop&w=800&q=80',
  fish: 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?auto=format&fit=crop&w=800&q=80',
  invertebrate: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=800&q=80',
  plant: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80',
  default: 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=800&q=80'
};

export interface SpeciesImageProps {
  src?: string | null;
  alt: string;
  speciesGroup?: string;
  className?: string;
  containerClassName?: string;
  badge?: string;
}

export const SpeciesImage: React.FC<SpeciesImageProps> = ({
  src,
  alt,
  speciesGroup,
  className = 'w-full h-full object-cover',
  containerClassName = 'w-full h-full relative overflow-hidden',
  badge
}) => {
  const normalizedGroup = (speciesGroup || 'default').toLowerCase();
  const fallbackSrc = CATEGORY_FALLBACKS[normalizedGroup] || CATEGORY_FALLBACKS.default;

  const initialSrc = src && src.trim() !== '' ? src : fallbackSrc;
  const [imgSrc, setImgSrc] = useState<string>(initialSrc);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Sync if prop changes
  React.useEffect(() => {
    if (src && src.trim() !== '') {
      setImgSrc(src);
      setHasError(false);
    } else {
      setImgSrc(fallbackSrc);
    }
  }, [src, fallbackSrc]);

  const handleError = () => {
    if (!hasError && imgSrc !== fallbackSrc) {
      setHasError(true);
      setImgSrc(fallbackSrc);
    }
  };

  return (
    <div className={containerClassName}>
      {/* Loading Skeleton */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-surface-container-high animate-pulse flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* Main Image */}
      <img
        src={imgSrc}
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={handleError}
        className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Optional Badge */}
      {badge && (
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-surface-container-low/90 backdrop-blur-md border border-outline-variant/30 text-[9px] font-bold text-on-surface-variant shadow">
          {badge}
        </div>
      )}
    </div>
  );
};
