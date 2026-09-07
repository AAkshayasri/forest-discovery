import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  id,
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1.5 w-full text-left">
      {label && (
        <label htmlFor={id} className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider font-label-sm">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full px-3 py-2.5 text-xs rounded-lg text-on-surface bg-surface-container border transition-all duration-200 outline-none glass-input font-body-md ${
          error 
            ? 'border-error/50 focus:border-error/80 focus:ring-1 focus:ring-error/20' 
            : 'border-outline-variant/40 focus:border-primary/80 focus:ring-1 focus:ring-primary/20'
        } ${className}`}
        {...props}
      />
      {error && (
        <span className="text-[10px] text-error font-medium mt-0.5 font-label-sm">
          {error}
        </span>
      )}
    </div>
  );
};

export default Input;
