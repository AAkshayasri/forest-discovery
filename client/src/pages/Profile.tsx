import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Calendar, Award, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export const Profile: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-24 font-body-md">
        <span className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">Loading explorer dossier...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 flex items-center justify-center select-none font-body-md">
      
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-primary-container/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md glass-panel bg-surface-container-high/95 rounded-xl p-8 border-outline-variant/65 shadow-2xl relative"
      >
        <div className="flex flex-col items-center text-center space-y-4">
          
          {/* Avatar representation */}
          <div className="w-20 h-20 rounded-lg bg-primary-container border border-primary/25 shadow-xl flex items-center justify-center text-primary text-3xl font-extrabold shadow-black/30 uppercase font-headline-lg">
            {user.name.charAt(0)}
          </div>

          <div>
            <h2 className="font-display-lg text-2xl font-bold text-on-background">{user.name}</h2>
            <div className="flex items-center justify-center gap-1.5 mt-1 text-on-surface-variant text-xs font-mono">
              <span>{user.email}</span>
            </div>
          </div>

          {/* Badge Display */}
          <div className="flex flex-wrap items-center justify-center gap-2 font-label-sm">
            <span className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
              user.role === 'admin' 
                ? 'bg-tertiary-container/30 text-tertiary border-tertiary/20' 
                : 'bg-primary-container/30 text-primary border-primary/20'
            }`}>
              {user.role} Explorer
            </span>
            <span className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
              user.emailVerified
                ? 'bg-primary-container/25 text-primary border-primary/30'
                : 'bg-warning-container/25 text-warning border-warning/30'
            }`}>
              {user.emailVerified ? '✓ Email Verified' : '⚠ Email Unverified'}
            </span>
          </div>

          <div className="w-full border-t border-outline-variant/45 my-4" />

          {/* Stats / Parameters */}
          <div className="w-full space-y-4 text-left">
            <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 font-label-sm">Explorer Dossier</h3>
            
            {/* Dossier Item 1 */}
            <div className="flex items-center gap-3 p-3 bg-surface-container border border-outline-variant/40 rounded-lg">
              <Award className="w-5 h-5 text-primary" />
              <div>
                <span className="block text-[9px] text-on-surface-variant uppercase tracking-widest font-bold font-label-sm">Explorer Ranking</span>
                <span className="text-xs font-bold text-on-surface">
                  {user.role === 'admin' ? "Master Cartographer" : "Junior Botanist"}
                </span>
              </div>
            </div>

            {/* Dossier Item 2 */}
            <div className="flex items-center gap-3 p-3 bg-surface-container border border-outline-variant/40 rounded-lg">
              <Shield className="w-5 h-5 text-secondary" />
              <div>
                <span className="block text-[9px] text-on-surface-variant uppercase tracking-widest font-bold font-label-sm">Access Permissions</span>
                <span className="text-xs font-bold text-on-surface">
                  {user.role === 'admin' ? "Full Atlas Write Privileges" : "Standard Map Read Privileges"}
                </span>
              </div>
            </div>

            {/* Dossier Item 3 */}
            <div className="flex items-center gap-3 p-3 bg-surface-container border border-outline-variant/40 rounded-lg">
              <Calendar className="w-5 h-5 text-tertiary" />
              <div>
                <span className="block text-[9px] text-on-surface-variant uppercase tracking-widest font-bold font-label-sm">Session Created</span>
                <span className="text-xs font-bold text-on-surface">
                  {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {/* Sparkly Quote */}
          <div className="w-full p-4 bg-primary-container/20 border border-primary/20 text-primary rounded-lg flex gap-3 text-left">
            <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-[10px] text-on-surface-variant leading-normal italic font-body-md">
              "In all things of nature there is something of the marvelous." — Aristotle. Keep exploring the maps to index new protected zones.
            </p>
          </div>

        </div>
      </motion.div>
    </div>
  );
};

export default Profile;
