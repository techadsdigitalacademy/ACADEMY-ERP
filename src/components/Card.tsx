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
    glass: 'glass-card border border-white/5 shadow-xl shadow-slate-950/40',
    solid: 'bg-slate-900 border border-slate-800 shadow-xl shadow-slate-950/30',
    interactive: 'glass-card border border-white/5 hover:border-white/10 hover:bg-slate-800/50 hover:shadow-2xl hover:shadow-indigo-500/5 cursor-pointer hover:-translate-y-1 transform active:scale-98'
  };

  const glowStyles = {
    none: '',
    indigo: 'after:absolute after:top-0 after:left-1/4 after:w-1/2 after:h-px after:bg-gradient-to-r after:from-transparent after:via-indigo-500/40 after:to-transparent',
    purple: 'after:absolute after:top-0 after:left-1/4 after:w-1/2 after:h-px after:bg-gradient-to-r after:from-transparent after:via-purple-500/40 after:to-transparent',
    emerald: 'after:absolute after:top-0 after:left-1/4 after:w-1/2 after:h-px after:bg-gradient-to-r after:from-transparent after:via-emerald-500/40 after:to-transparent'
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
