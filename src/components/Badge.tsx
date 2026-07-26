import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'info' | 'error' | 'indigo' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'info',
  size = 'sm',
  className = ''
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full transition-all duration-200';
  
  const sizeStyles = {
    sm: 'px-2.5 py-0.5 text-xs border',
    md: 'px-3 py-1 text-sm border'
  };

  const variantStyles = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_12px_-3px_rgba(16,185,129,0.2)]',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_12px_-3px_rgba(245,158,11,0.2)]',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_12px_-3px_rgba(59,130,246,0.2)]',
    error: 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_12px_-3px_rgba(244,63,94,0.2)]',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-[0_0_12px_-3px_rgba(99,102,241,0.2)]',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_12px_-3px_rgba(168,85,247,0.2)]'
  };

  return (
    <span className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse"></span>
      {children}
    </span>
  );
};
