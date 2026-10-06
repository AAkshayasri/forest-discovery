import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import { motion } from 'framer-motion';
import { Mail, RefreshCw, CheckCircle2, AlertCircle, ArrowLeft, LogOut } from 'lucide-react';
import { Button } from '../components/common/Button';
import confetti from 'canvas-confetti';

export const VerifyEmail: React.FC = () => {
  const { user, firebaseUser, checkVerificationStatus, resendVerificationEmail, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If the user is already verified or no user logged in, navigate accordingly
  useEffect(() => {
    if (user?.emailVerified || firebaseUser?.emailVerified) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [user, firebaseUser, navigate, location]);

  // Cooldown timer ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleCheckVerification = async () => {
    setErrorMsg(null);
    setChecking(true);

    try {
      const isVerified = await checkVerificationStatus();
      if (isVerified) {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.7 }
        });
        showToast('Email verified successfully! Welcome to WildAtlas.', 'success');
        const from = (location.state as any)?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      } else {
        setErrorMsg('We have not detected your verification yet. Please open your email inbox, click the link, and try again.');
        showToast('Email not yet verified. Please click the link in your email.', 'warning');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification check failed. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setErrorMsg(null);
    setResending(true);

    try {
      await resendVerificationEmail();
      setCooldown(60);
      showToast('A fresh verification link has been sent to your email!', 'success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resend verification email.');
      showToast(err.message || 'Resend failed', 'error');
    } finally {
      setResending(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/auth');
  };

  const currentEmail = user?.email || firebaseUser?.email || 'your email';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-container-margin py-section-gap relative overflow-hidden font-body-md select-none text-left">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-primary-container/15 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 rounded-full bg-secondary-container/10 blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg z-10"
      >
        <div className="glass-panel rounded-2xl p-8 sm:p-10 shadow-2xl relative bg-surface-container/75 border border-outline-variant/65 space-y-6">
          
          {/* Icon Header */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-primary-container/30 border border-primary/35 flex items-center justify-center text-primary shadow-lg shadow-primary/10">
              <Mail className="w-8 h-8 animate-bounce" />
            </div>
            <h1 className="font-headline-lg text-2xl sm:text-3xl font-bold text-on-background">
              Verify Your Email Address
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant max-w-sm leading-relaxed">
              We sent a verification link to <span className="font-bold text-primary font-mono">{currentEmail}</span>.
            </p>
          </div>

          {/* Instructions Box */}
          <div className="p-4 rounded-xl bg-surface-container-high/80 border border-outline-variant/45 text-xs text-on-surface-variant space-y-2">
            <div className="flex items-start gap-2 text-on-surface font-semibold">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>Step 1: Open the email from Firebase / WildAtlas in your inbox.</span>
            </div>
            <div className="flex items-start gap-2 text-on-surface font-semibold">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>Step 2: Click the verification link to confirm your address.</span>
            </div>
            <div className="flex items-start gap-2 text-on-surface font-semibold">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>Step 3: Click "I've Verified My Email" below to continue.</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-error-container/20 border border-error/30 text-error text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <Button
              variant="primary"
              onClick={handleCheckVerification}
              disabled={checking}
              className="w-full justify-center py-3 rounded-xl font-bold uppercase tracking-wider font-label-md text-xs shadow-lg shadow-primary/20"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
              {checking ? 'Checking Status...' : "I've Verified My Email"}
            </Button>

            <div className="flex items-center justify-between gap-3 pt-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleResend}
                disabled={resending || cooldown > 0}
                className="flex-1 justify-center rounded-xl text-xs font-semibold"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? 'Sending...' : 'Resend Email'}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="justify-center rounded-xl text-xs text-on-surface-variant hover:text-error"
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                Sign Out
              </Button>
            </div>
          </div>

          <div className="text-center pt-2">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1 text-[11px] text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" /> Back to Home
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
