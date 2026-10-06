import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard requiring both authentication and verified email status.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 font-body-md select-none">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider font-label-sm">
          Authenticating explorer session...
        </span>
      </div>
    );
  }

  // Not signed in -> redirect to login
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Signed in but email is unverified -> redirect to verify email screen
  if (!user.emailVerified) {
    return <Navigate to="/verify-email" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

/**
 * Route guard requiring administrator privileges.
 */
export const AdminRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 font-body-md select-none">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider font-label-sm">
          Checking administrative authorization...
        </span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!user.emailVerified) {
    return <Navigate to="/verify-email" state={{ from: location }} replace />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
