import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer';
  
  const variants = {
    primary: 'bg-primary text-on-primary hover:brightness-105 shadow-md shadow-primary/10',
    secondary: 'bg-primary-container text-on-primary-container hover:brightness-105 border border-primary/25',
    ghost: 'bg-transparent border border-outline-variant/50 text-on-surface-variant hover:text-primary hover:border-primary/45',
    danger: 'bg-error-container text-error hover:brightness-105 border border-error/20',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs font-label-sm',
    md: 'px-5 py-2.5 text-xs font-label-md',
    lg: 'px-6 py-3 text-sm font-label-md',
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
