import React, { createContext, useState, useEffect } from 'react';

interface FavoriteSpecies {
  id: number;
  name: string;
  scientificName: string;
  imageUrl: string;
  conservationStatus: string;
}

interface FavoritesContextProps {
  favorites: FavoriteSpecies[];
  addFavorite: (species: FavoriteSpecies) => void;
  removeFavorite: (id: number) => void;
  isFavorite: (id: number) => boolean;
}

export const FavoritesContext = createContext<FavoritesContextProps | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<FavoriteSpecies[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('wildatlas_favorites');
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const addFavorite = (species: FavoriteSpecies) => {
    setFavorites((prev) => {
      if (prev.some((s) => s.id === species.id)) return prev;
      const updated = [...prev, species];
      localStorage.setItem('wildatlas_favorites', JSON.stringify(updated));
      return updated;
    });
  };

  const removeFavorite = (id: number) => {
    setFavorites((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      localStorage.setItem('wildatlas_favorites', JSON.stringify(updated));
      return updated;
    });
  };

  const isFavorite = (id: number) => {
    return favorites.some((s) => s.id === id);
  };

  return (
    <FavoritesContext.Provider value={{ favorites, addFavorite, removeFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
};
