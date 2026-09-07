import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rect'
}) => {
  const shapes = {
    text: 'h-3 w-3/4 rounded',
    rect: 'h-24 w-full rounded-lg',
    circle: 'h-10 w-10 rounded-full'
  };

  return (
    <div className={`animate-pulse bg-surface-container-highest/60 ${shapes[variant]} ${className}`} />
  );
};

export default Skeleton;
