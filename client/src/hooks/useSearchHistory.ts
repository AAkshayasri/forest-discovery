import { useState, useEffect } from 'react';

export const useSearchHistory = (key = 'wildatlas_searches') => {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }
  }, [key]);

  const addSearch = (query: string) => {
    if (!query.trim()) return;
    setHistory((prev) => {
      const filtered = prev.filter((item) => item !== query);
      const updated = [query, ...filtered].slice(0, 5); // Keep top 5 searches
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(key);
  };

  return { history, addSearch, clearHistory };
};

export default useSearchHistory;
