import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'glass' | 'solid' | 'interactive';
  glowColor?: 'indigo' | 'purple' | 'emerald' | 'none';
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'glass',
  glowColor = 'none',
  onClick
}) => {
  const isInteractive = variant === 'interactive' || !!onClick;

  const baseStyles = 'rounded-2xl transition-all duration-300 relative overflow-hidden';
  
  const variantStyles = {
    glass: 'glass-card border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/60 shadow-lg shadow-slate-200/50 dark:shadow-slate-950/40',
    solid: 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/60 dark:shadow-slate-950/30',
    interactive: 'glass-card border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:shadow-xl hover:shadow-indigo-500/10 cursor-pointer hover:-translate-y-0.5 transform active:scale-98'
  };

  const glowStyles = {
    none: '',
    indigo: 'glow-indigo',
    purple: 'glow-purple',
    emerald: 'glow-emerald'
  };

  return (
    <div
      className={`
        ${baseStyles} 
        ${isInteractive ? variantStyles.interactive : variantStyles[variant]} 
        ${glowStyles[glowColor]} 
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;
