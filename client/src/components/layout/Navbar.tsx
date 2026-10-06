import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { 
  MessageSquare, LogOut, Scan, User, 
  Settings as SettingsIcon, LayoutDashboard, ScanEye, Shield, Trees, Database, Zap
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, isDemo } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      showToast('Logged out successfully', 'info');
      navigate('/');
    } catch (error) {
      showToast('Logout failed', 'error');
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Top Navbar for Desktop */}
      <nav className="fixed top-0 left-0 w-full h-20 z-50 flex justify-between items-center px-container-margin bg-background/85 backdrop-blur-xl border-b border-outline-variant/30 select-none">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="font-headline-md text-headline-md font-bold text-primary transition-colors group-hover:brightness-110">
            Wildlife Explorer
          </span>
          {isDemo && (
            <span className="hidden sm:inline px-2 py-0.5 rounded bg-surface-container border border-outline-variant/35 text-[8px] uppercase tracking-widest text-on-surface-variant font-bold font-label-sm">
              Demo Mode
            </span>
          )}
        </Link>

        {user ? (
          <div className="hidden md:flex items-center gap-7 font-label-md">
            <Link
              to="/dashboard"
              className={`flex items-center gap-1.5 transition-colors ${
                isActive('/dashboard') ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Home
            </Link>
            <Link
              to="/map"
              className={`flex items-center gap-1.5 transition-colors ${
                isActive('/map') ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <Trees className="w-4 h-4" />
              Forest Explorer
            </Link>
            <Link
              to="/identify"
              className={`flex items-center gap-1.5 transition-colors ${
                isActive('/identify') ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <Scan className="w-4 h-4" />
              Identification
            </Link>
            <Link
              to="/chat"
              className={`flex items-center gap-1.5 transition-colors ${
                isActive('/chat') ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              AI Guide
            </Link>
            <Link
              to="/sightings"
              className={`flex items-center gap-1.5 transition-colors ${
                isActive('/sightings') ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <ScanEye className="w-4 h-4" />
              Sightings
            </Link>
            <Link
              to="/credits"
              className={`flex items-center gap-1.5 transition-colors ${
                isActive('/credits') ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <Database className="w-4 h-4" />
              Credits
            </Link>
            <Link
              to="/benchmarks"
              className={`flex items-center gap-1.5 transition-colors ${
                isActive('/benchmarks') ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <Zap className="w-4 h-4" />
              Benchmarks
            </Link>
            {user.role === 'admin' && (
              <Link
                to="/admin"
                className={`flex items-center gap-1.5 transition-colors ${
                  isActive('/admin') ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                <Shield className="w-4 h-4" />
                Admin Panel
              </Link>
            )}
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-6 font-label-md">
            <Link
              to="/map"
              className={`flex items-center gap-1.5 transition-colors ${
                isActive('/map') ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <Trees className="w-4 h-4" />
              Forest Explorer
            </Link>
            <Link
              to="/credits"
              className={`flex items-center gap-1.5 transition-colors ${
                isActive('/credits') ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <Database className="w-4 h-4" />
              Data & Credits
            </Link>
            <Link
              to="/benchmarks"
              className={`flex items-center gap-1.5 transition-colors ${
                isActive('/benchmarks') ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <Zap className="w-4 h-4" />
              Benchmarks
            </Link>
          </div>
        )}

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-bold text-on-surface leading-tight truncate max-w-[140px]">
                  {user.name}
                </span>
                <span className={`text-[9px] font-mono font-bold leading-tight ${user.emailVerified ? 'text-primary' : 'text-warning'}`}>
                  {user.emailVerified ? '✓ Verified' : '⚠ Unverified'}
                </span>
              </span>
              <Link
                to="/profile"
                className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all ${
                  isActive('/profile') 
                    ? 'bg-primary-container/30 text-primary border-primary/45 shadow' 
                    : 'bg-surface-container/60 text-on-surface-variant border-outline-variant/45 hover:text-primary hover:bg-surface-container'
                }`}
                title="Profile"
              >
                <User className="w-4 h-4" />
              </Link>
              <Link
                to="/settings"
                className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all ${
                  isActive('/settings') 
                    ? 'bg-primary-container/30 text-primary border-primary/45 shadow' 
                    : 'bg-surface-container/60 text-on-surface-variant border-outline-variant/45 hover:text-primary hover:bg-surface-container'
                }`}
                title="Settings"
              >
                <SettingsIcon className="w-4 h-4" />
              </Link>
              <button
                onClick={handleLogout}
                className="w-9 h-9 rounded-lg flex items-center justify-center bg-surface-container/60 hover:bg-error-container/20 border border-outline-variant/45 text-on-surface-variant hover:text-error transition-all cursor-pointer"
                title="Logout session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="px-5 py-2 text-xs font-bold font-label-md rounded-full bg-primary text-on-primary hover:brightness-105 transition-all shadow-md active:scale-95"
            >
              Sign In
            </Link>
          )}
        </div>
      </nav>

      {/* Bottom Nav Bar for Mobile Viewports */}
      {user && (
        <nav className="fixed bottom-0 left-0 w-full z-40 md:hidden flex justify-around items-center px-3 py-3 bg-surface-container/95 backdrop-blur-xl border-t border-outline-variant/35 rounded-t-xl shadow-lg select-none">
          <Link
            to="/dashboard"
            className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all active:scale-90 ${
              isActive('/dashboard') ? 'text-primary' : 'text-on-surface-variant'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[9px] font-bold mt-1 font-label-sm">Home</span>
          </Link>
          <Link
            to="/map"
            className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all active:scale-90 ${
              isActive('/map') ? 'text-primary' : 'text-on-surface-variant'
            }`}
          >
            <Trees className="w-5 h-5" />
            <span className="text-[9px] font-bold mt-1 font-label-sm">Forests</span>
          </Link>
          <Link
            to="/identify"
            className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all active:scale-90 ${
              isActive('/identify') ? 'text-primary' : 'text-on-surface-variant'
            }`}
          >
            <Scan className="w-5 h-5" />
            <span className="text-[9px] font-bold mt-1 font-label-sm">Identify</span>
          </Link>
          <Link
            to="/chat"
            className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all active:scale-90 ${
              isActive('/chat') ? 'text-primary' : 'text-on-surface-variant'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[9px] font-bold mt-1 font-label-sm">AI</span>
          </Link>
          <Link
            to="/sightings"
            className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all active:scale-90 ${
              isActive('/sightings') ? 'text-primary' : 'text-on-surface-variant'
            }`}
          >
            <ScanEye className="w-5 h-5" />
            <span className="text-[9px] font-bold mt-1 font-label-sm">Sightings</span>
          </Link>
          {user.role === 'admin' && (
            <Link
              to="/admin"
              className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all active:scale-90 ${
                isActive('/admin') ? 'text-primary' : 'text-on-surface-variant'
              }`}
            >
              <Shield className="w-5 h-5" />
              <span className="text-[9px] font-bold mt-1 font-label-sm">Admin</span>
            </Link>
          )}
        </nav>
      )}
    </>
  );
};

export default Navbar;

