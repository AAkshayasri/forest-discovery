import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ArrowRight, Loader2, Info } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import confetti from 'canvas-confetti';

export const Auth: React.FC = () => {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  
  // Set tab based on search param ?tab=register or ?tab=login
  const [isLogin, setIsLogin] = useState(searchParams.get('tab') !== 'register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgotMsg, setShowForgotMsg] = useState(false);

  useEffect(() => {
    // If user is already logged in, redirect to map
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.8 }
        });
        showToast('Successfully signed in!', 'success');
        navigate('/dashboard');
      } else {
        if (!name) {
          setError("Name is required for registration.");
          setLoading(false);
          return;
        }
        await register(name, email, password, role);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.8 }
        });
        showToast('Successfully registered account!', 'success');
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please check your credentials.");
      showToast(err.message || 'Authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (!email) {
      setError("Please fill in your email address to reset your password.");
      return;
    }
    setError(null);
    setShowForgotMsg(true);
    showToast('Reset password link simulated!', 'info');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-container-margin py-section-gap relative overflow-hidden font-body-md select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary-container/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-secondary-container/10 blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-8">
          <h2 className="font-headline-lg text-headline-lg font-bold text-on-background">
            {isLogin ? "Welcome Back" : "Begin Exploration"}
          </h2>
          <p className="font-body-md text-on-surface-variant mt-2 leading-relaxed">
            {isLogin ? "Sign in to access satellite maps and wildlife databases" : "Create a free account to track boundaries and chat with AI"}
          </p>
        </div>

        {/* Card Panel */}
        <div className="glass-panel rounded-xl p-8 shadow-2xl relative bg-surface-container/60 border border-outline-variant/65">
          
          {/* Tab Selector */}
          <div className="flex border-b border-outline-variant/45 mb-6 pb-2">
            <button
              onClick={() => { setIsLogin(true); setError(null); }}
              className={`flex-1 text-center py-2 font-bold font-label-md transition-all relative cursor-pointer ${
                isLogin ? 'text-primary' : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              Log In
              {isLogin && (
                <motion.div 
                  layoutId="activeTab" 
                  className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" 
                />
              )}
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(null); }}
              className={`flex-1 text-center py-2 font-bold font-label-md transition-all relative cursor-pointer ${
                !isLogin ? 'text-primary' : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              Register
              {!isLogin && (
                <motion.div 
                  layoutId="activeTab" 
                  className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" 
                />
              )}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  {/* Full Name */}
                  <Input
                    label="Full Name"
                    id="name"
                    type="text"
                    required={!isLogin}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full Name"
                  />

                  {/* Dev/Demo Role Selector */}
                  <div className="flex items-center gap-3 p-3 bg-surface-container border border-outline-variant/30 rounded-lg">
                    <Shield className="w-4 h-4 text-primary" />
                    <div className="flex-1 flex justify-around">
                      <label className="flex items-center gap-1.5 text-xs text-on-surface-variant cursor-pointer select-none font-label-sm">
                        <input
                          type="radio"
                          name="role"
                          checked={role === 'user'}
                          onChange={() => setRole('user')}
                          className="accent-primary"
                        />
                        Explorer Role
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-on-surface-variant cursor-pointer select-none font-label-sm">
                        <input
                          type="radio"
                          name="role"
                          checked={role === 'admin'}
                          onChange={() => setRole('admin')}
                          className="accent-primary"
                        />
                        Admin Role
                      </label>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email Address */}
            <Input
              label="Email Address"
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
            />

            {/* Password */}
            <Input
              label="Password"
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />

            {/* Forgot Password Link */}
            {isLogin && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-primary hover:brightness-110 font-bold font-label-sm transition-colors cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-error-container/20 border border-error/20 text-error text-xs rounded-lg flex items-start gap-2 text-left font-label-sm">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Password Reset Message */}
            {showForgotMsg && (
              <div className="p-3 bg-primary-container/20 border border-primary/20 text-primary text-xs rounded-lg flex items-start gap-2 text-left animate-pulse font-label-sm">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Password reset link simulated. Check your local authentication triggers or logs.</span>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              fullWidth
              className="rounded-full py-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  {isLogin ? "Sign In" : "Register Account"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Dev Demo tip info box */}
          {isLogin && (
            <div className="mt-6 p-4 rounded-lg bg-[#1c1b1b] border border-outline-variant/45 flex gap-3 text-left font-body-md">
              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[11px] font-bold text-primary uppercase tracking-wider font-label-sm">Demo / Testing Tip</h4>
                <p className="text-[11px] text-on-surface-variant mt-1 leading-normal">
                  Log in with <strong className="text-on-surface select-all">admin@wildatlas.com</strong> (any password) to test the Admin Panel with full privileges immediately.
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
