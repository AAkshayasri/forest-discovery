import React from 'react';
import { Leaf } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No records found',
  message = 'Try modifying your queries or check back later.',
  icon = <Leaf className="w-10 h-10 text-outline" />
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 rounded-lg bg-surface-container border border-outline-variant/40 max-w-md mx-auto space-y-3 font-body-md">
      <div className="p-3 bg-surface-container-high border border-outline-variant/35 rounded-full animate-bounce">
        {icon}
      </div>
      <div>
        <h4 className="font-headline-md text-sm font-bold text-on-surface">
          {title}
        </h4>
        <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
          {message}
        </p>
      </div>
    </div>
  );
};

export default EmptyState;
