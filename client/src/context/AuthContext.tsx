import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setLogoutCallback } from '../services/api';

interface UserProfile {
  uid: string;
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'user';
  avatar?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isDemo: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (name: string, avatar: string | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync profile from backend database
  const syncProfile = async () => {
    try {
      const profile = await api.getProfile();
      setUser(profile);
    } catch (error) {
      console.error("Failed to sync user profile from server:", error);
      setUser(null);
      localStorage.removeItem('wildatlas_token');
      localStorage.removeItem('wildatlas_refresh_token');
    }
  };

  useEffect(() => {
    // Set callback to clear UI state if the API client logs out
    setLogoutCallback(() => {
      setUser(null);
    });

    const initAuth = async () => {
      setLoading(true);
      const token = localStorage.getItem('wildatlas_token');
      const refreshToken = localStorage.getItem('wildatlas_refresh_token');
      if (token || refreshToken) {
        await syncProfile();
      } else {
        setUser(null);
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await api.login({ email, password });
      localStorage.setItem('wildatlas_token', response.accessToken);
      localStorage.setItem('wildatlas_refresh_token', response.refreshToken);
      setUser(response.user);
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, role = 'user') => {
    setLoading(true);
    try {
      // Frontend validation identical to backend (TOKEN-002)
      if (!password || password.trim() === '') {
        throw new Error("Password cannot be empty.");
      }
      if (password.length > 72) {
        throw new Error("Password exceeds storage limits (72 characters maximum).");
      }

      await api.register({ name, email, password, role });
      
      // Auto login after registration
      const loginResponse = await api.login({ email, password });
      localStorage.setItem('wildatlas_token', loginResponse.accessToken);
      localStorage.setItem('wildatlas_refresh_token', loginResponse.refreshToken);
      setUser(loginResponse.user);
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.logoutApi().catch((e) => console.warn("Logout API warning:", e));
    } catch (error) {
      console.warn("Logout request failed:", error);
    } finally {
      localStorage.removeItem('wildatlas_token');
      localStorage.removeItem('wildatlas_refresh_token');
      setUser(null);
      setLoading(false);
    }
  };

  const updateProfile = async (name: string, avatar: string | null) => {
    try {
      const updatedUser = await api.updateProfile({ name, avatar });
      setUser(updatedUser);
    } catch (error) {
      console.error("Failed to update profile:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isDemo: false, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
