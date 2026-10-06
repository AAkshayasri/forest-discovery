import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import { motion } from 'framer-motion';
import { 
  Shield, 
  ArrowRight, 
  Loader2, 
  AlertTriangle, 
  Mail, 
  KeyRound 
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { 
  normalizeEmail, 
  isValidEmailFormat, 
  isDisposableDomain, 
  checkPasswordStrength 
} from '../utils/emailValidator';
import { api } from '../services/api';
import confetti from 'canvas-confetti';

export const Auth: React.FC = () => {
  const { user, login, register, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  
  // Tab state: 'login' | 'register' | 'forgot'
  const initialTab = searchParams.get('tab') === 'register' ? 'register' : 'login';
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>(initialTab);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  
  // Validation and UI states
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Password strength computation for registration
  const passwordStrength = checkPasswordStrength(password);
  const isDisposable = email ? isDisposableDomain(email) : false;

  // Redirect if already logged in and verified
  useEffect(() => {
    if (user && user.emailVerified) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } else if (user && !user.emailVerified) {
      navigate('/verify-email', { replace: true });
    }
  }, [user, navigate, location]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = normalizeEmail(email);
    if (!isValidEmailFormat(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }

    setLoading(true);
    try {
      const result = await login(cleanEmail, password);
      
      if (!result.emailVerified) {
        showToast('Please verify your email to access WildAtlas.', 'warning');
        navigate('/verify-email');
        return;
      }

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 }
      });
      showToast('Successfully signed in!', 'success');
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please check your credentials.");
      showToast(err.message || 'Authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    const cleanEmail = normalizeEmail(email);

    if (!cleanName) {
      setError("Full Name is required for registration.");
      return;
    }
    if (!isValidEmailFormat(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (isDisposableDomain(cleanEmail)) {
      setError("Disposable and temporary email domains are not permitted. Please use a permanent email address.");
      return;
    }
    if (!passwordStrength.isValid) {
      setError("Password must contain at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter your password confirmation.");
      return;
    }

    setLoading(true);

    try {
      // Pre-check MX domain validity via server
      try {
        const domainCheck = await api.validateEmailDomain(cleanEmail);
        if (!domainCheck.isValid) {
          setError(domainCheck.message || "Email domain is invalid or cannot receive mail.");
          setLoading(false);
          return;
        }
      } catch (checkErr) {
        // Non-blocking in offline dev
      }

      await register(cleanName, cleanEmail, password);

      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.7 }
      });
      showToast('Account created! A verification link has been sent to your email.', 'success');
      navigate('/verify-email');
    } catch (err: any) {
      setError(err.message || "Registration failed. Please check your details.");
      showToast(err.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanEmail = normalizeEmail(email);

    if (!isValidEmailFormat(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(cleanEmail);
      setForgotSuccess(true);
      showToast('Password reset link sent! Check your inbox.', 'info');
    } catch (err: any) {
      // Reveal generic message to prevent account enumeration
      setForgotSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-container-margin py-section-gap relative overflow-hidden font-body-md select-none text-left">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary-container/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-secondary-container/10 blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-6">
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-background">
            {activeTab === 'login' ? "Welcome Back" : activeTab === 'register' ? "Begin Exploration" : "Reset Password"}
          </h1>
          <p className="font-body-md text-on-surface-variant mt-2 text-xs sm:text-sm leading-relaxed">
            {activeTab === 'login' 
              ? "Sign in to access satellite maps and real-time field guides" 
              : activeTab === 'register' 
              ? "Create a verified account to index biodiversity and explore forests" 
              : "Enter your registered email to receive a password reset link"}
          </p>
        </div>

        {/* Card Panel */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 shadow-2xl relative bg-surface-container/75 border border-outline-variant/65">
          
          {/* Tab Selector (when not in forgot password mode) */}
          {activeTab !== 'forgot' && (
            <div className="flex border-b border-outline-variant/45 mb-6 pb-2">
              <button
                type="button"
                onClick={() => { setActiveTab('login'); setError(null); }}
                className={`flex-1 text-center py-2 font-bold font-label-md text-xs transition-all relative cursor-pointer ${
                  activeTab === 'login' ? 'text-primary' : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                Log In
                {activeTab === 'login' && (
                  <motion.div 
                    layoutId="activeTab" 
                    className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" 
                  />
                )}
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('register'); setError(null); }}
                className={`flex-1 text-center py-2 font-bold font-label-md text-xs transition-all relative cursor-pointer ${
                  activeTab === 'register' ? 'text-primary' : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                Register
                {activeTab === 'register' && (
                  <motion.div 
                    layoutId="activeTab" 
                    className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" 
                  />
                )}
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-error-container/20 border border-error/30 text-error text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* 1. LOGIN FORM */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="explorer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <div className="space-y-1">
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => { setActiveTab('forgot'); setError(null); setForgotSuccess(false); }}
                    className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="w-full justify-center py-3 rounded-xl font-bold uppercase tracking-wider font-label-md text-xs mt-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                {loading ? "Signing In..." : "Login"}
              </Button>

              <div className="text-center pt-3 border-t border-outline-variant/30 text-xs text-on-surface-variant">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setActiveTab('register'); setError(null); }}
                  className="text-primary font-bold hover:underline cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </form>
          )}

          {/* 2. REGISTRATION FORM */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <Input
                label="Full Name"
                type="text"
                placeholder="Dr. Jane Goodall"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />

              <div>
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="jane@organization.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
                {isDisposable && (
                  <p className="text-[10px] text-error font-medium mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Temporary/disposable email domains are blocked.
                  </p>
                )}
              </div>

              <Input
                label="Password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />

              {/* Live Password Requirement Indicator */}
              {password.length > 0 && (
                <div className="p-2.5 rounded-lg bg-surface-container-high/90 border border-outline-variant/35 text-[10px] space-y-1.5">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-on-surface-variant">Requirement:</span>
                    <span className={passwordStrength.hasMinLength ? 'text-primary' : 'text-warning'}>
                      {passwordStrength.hasMinLength ? '✓ Valid (8+ characters)' : `${password.length}/8 characters`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] text-on-surface-variant">
                    <span className={passwordStrength.hasMinLength ? 'text-primary font-bold' : 'text-on-surface-variant/60'}>
                      {passwordStrength.hasMinLength ? '✓' : '•'} Minimum 8 characters (letters, numbers, or symbols)
                    </span>
                  </div>
                </div>
              )}

              <Input
                label="Confirm Password"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />

              <Button
                type="submit"
                variant="primary"
                disabled={loading || isDisposable}
                className="w-full justify-center py-3 rounded-xl font-bold uppercase tracking-wider font-label-md text-xs mt-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
                {loading ? "Creating Account..." : "Create Account"}
              </Button>

              <div className="text-center pt-3 border-t border-outline-variant/30 text-xs text-on-surface-variant">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setActiveTab('login'); setError(null); }}
                  className="text-primary font-bold hover:underline cursor-pointer"
                >
                  Login
                </button>
              </div>
            </form>
          )}

          {/* 3. FORGOT PASSWORD FORM */}
          {activeTab === 'forgot' && (
            <div className="space-y-4">
              {forgotSuccess ? (
                <div className="p-4 rounded-xl bg-primary-container/20 border border-primary/30 text-primary text-xs space-y-2 text-center">
                  <Mail className="w-8 h-8 mx-auto" />
                  <h4 className="font-bold text-sm">Reset Link Dispatched</h4>
                  <p className="text-on-surface-variant leading-relaxed">
                    If an account is associated with <span className="font-bold text-on-surface font-mono">{email}</span>, a secure password reset link has been dispatched to your inbox.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => { setActiveTab('login'); setForgotSuccess(false); }}
                    className="w-full justify-center rounded-xl mt-3"
                  >
                    Return to Sign In
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <Input
                    label="Registered Email Address"
                    type="email"
                    placeholder="explorer@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loading}
                    className="w-full justify-center py-3 rounded-xl font-bold uppercase tracking-wider font-label-md text-xs"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <KeyRound className="w-4 h-4 mr-2" />}
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Button>
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => { setActiveTab('login'); setError(null); }}
                      className="text-xs text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                    >
                      &larr; Back to Sign In
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
