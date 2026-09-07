import React from 'react';
import { Compass, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';

export const ErrorPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center pt-24 px-6 text-center select-none font-body-md">
      
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary-container/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md space-y-6 relative z-10">
        <div className="w-20 h-20 rounded-full bg-primary-container/30 border border-primary/20 flex items-center justify-center mx-auto text-primary animate-bounce">
          <Compass className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="font-display-lg text-4xl font-bold text-on-background">404 - Dossier Lost</h1>
          <p className="text-on-surface-variant text-xs font-medium max-w-sm mx-auto leading-relaxed">
            The coordinates you requested do not point to any registered forest reserve or species file in the global atlas.
          </p>
        </div>

        <div className="flex justify-center gap-3 pt-2">
          <Link to="/">
            <Button variant="ghost" className="gap-2 font-label-sm">
              <Home className="w-4 h-4" />
              Return Home
            </Button>
          </Link>
          <Link to="/map">
            <Button variant="primary" className="gap-2 font-label-sm">
              Open Explorer Map
            </Button>
          </Link>
        </div>
      </div>

    </div>
  );
};

export default ErrorPage;
