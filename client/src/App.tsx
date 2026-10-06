import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { FavoritesProvider } from './context/FavoritesContext';
import Navbar from './components/layout/Navbar';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import VerifyEmail from './pages/VerifyEmail';
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
import { ProtectedRoute, AdminRoute } from './components/auth/ProtectedRoute';

const MainLayout: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Show floating chat on authenticated routes except login (/auth), verify (/verify-email), profile (/profile) and settings (/settings)
  const showFloatingChat =
    user &&
    user.emailVerified &&
    location.pathname !== '/auth' &&
    location.pathname !== '/verify-email' &&
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

          {/* Map & Forest Explorer route */}
          <Route path="/map" element={<MapExplorer />} />

          {/* Login / Register portal */}
          <Route path="/auth" element={<Auth />} />

          {/* Dedicated Email Verification Gate */}
          <Route path="/verify-email" element={<VerifyEmail />} />

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
