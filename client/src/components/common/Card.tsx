import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverEffect = true,
  className = '',
  ...props
}) => {
  const baseStyles = 'glass-card bg-surface-container-high/95 border border-outline-variant/30 rounded-xl p-5 shadow-lg';
  const hoverStyles = hoverEffect ? 'hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-300' : '';

  return (
    <div
      className={`${baseStyles} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
