import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  type?: 'primary' | 'secondary' | 'tertiary' | 'error' | 'success' | 'warning' | 'info';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  type = 'primary'
}) => {
  const styles = {
    primary: 'bg-primary-container/30 text-primary border-primary/20',
    secondary: 'bg-secondary-container/20 text-secondary border-secondary/20',
    tertiary: 'bg-tertiary-container/30 text-tertiary border-tertiary/20',
    error: 'bg-error-container/20 text-error border-error/20',
    success: 'bg-secondary-container/30 text-secondary border-secondary/30',
    warning: 'bg-tertiary-container/40 text-tertiary border-tertiary/30',
    info: 'bg-surface-container-low border border-outline-variant/45 text-on-surface-variant'
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider font-label-sm ${styles[type]}`}>
      {children}
    </span>
  );
};

export default Badge;
