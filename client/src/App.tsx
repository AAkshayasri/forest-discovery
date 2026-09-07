import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { FavoritesProvider } from './context/FavoritesContext';
import Navbar from './components/layout/Navbar';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import MapExplorer from './pages/MapExplorer';
import AIChatPage from './pages/AIChatPage';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import ErrorPage from './pages/ErrorPage';
import SpeciesIdentifier from './pages/SpeciesIdentifier';
import Sightings from './pages/Sightings';
import FloatingChat from './components/layout/FloatingChat';
import { Loader2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';

// Route protection for authenticated users
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 font-body-md select-none">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider font-label-sm">Syncing explorer coordinates...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

// Route protection for administrative users
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 font-body-md select-none">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider font-label-sm">Authenticating admin...</span>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const MainLayout: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Show floating chat on authenticated routes except login (/auth), profile (/profile) and settings (/settings)
  const showFloatingChat =
    user &&
    location.pathname !== '/auth' &&
    location.pathname !== '/profile' &&
    location.pathname !== '/settings' &&
    location.pathname !== '/'; // hide on landing page

  return (
    <div className="w-full min-h-screen flex flex-col bg-background text-on-background relative">
      <Navbar />
      <main className="flex-1 w-full relative">
        <Routes>
          {/* Default landing page */}
          <Route path="/" element={<Landing />} />

          {/* Map Explorer route */}
          <Route path="/map" element={<MapExplorer />} />

          {/* Preserve old landing page */}
          <Route path="/landing" element={<Landing />} />

          {/* Login / Register portal */}
          <Route path="/auth" element={<Auth />} />

          {/* Protected unified dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected AI Chatbot portal */}
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <AIChatPage />
              </ProtectedRoute>
            }
          />

          {/* Protected Species Identifier Page */}
          <Route
            path="/identify"
            element={
              <ProtectedRoute>
                <SpeciesIdentifier />
              </ProtectedRoute>
            }
          />

          {/* Sightings Page */}
          <Route
            path="/sightings"
            element={
              <ProtectedRoute>
                <Sightings />
              </ProtectedRoute>
            }
          />

          {/* Protected User Profile page */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Protected Settings page */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />

          {/* Protected Admin Control Console */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            }
          />

          {/* Default Catch-all redirect to ErrorPage */}
          <Route path="*" element={<ErrorPage />} />
        </Routes>
      </main>
      {showFloatingChat && <FloatingChat />}
    </div>
  );
};

export const AppContent: React.FC = () => {
  return (
    <Router>
      <MainLayout />
    </Router>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <FavoritesProvider>
          <AppContent />
        </FavoritesProvider>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
