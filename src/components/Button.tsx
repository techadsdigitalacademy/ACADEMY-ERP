import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 active:duration-75';
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-base'
  };

  const variantStyles = {
    primary: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 border border-indigo-400/20',
    secondary: 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 hover:-translate-y-0.5',
    success: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5',
    danger: 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/20 hover:shadow-rose-500/40 hover:-translate-y-0.5',
    glass: 'glass-panel text-slate-200 hover:bg-white/10 hover:text-white border border-white/10 hover:-translate-y-0.5'
  };

  return (
    <button
      className={`
        ${baseStyles} 
        ${sizeStyles[size]} 
        ${variantStyles[variant]} 
        ${fullWidth ? 'w-full' : ''} 
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : icon ? (
        <span className="mr-2 transform group-hover:scale-110 transition-transform duration-300">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};
export default Button;
