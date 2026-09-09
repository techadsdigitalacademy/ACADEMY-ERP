import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'glass' | 'solid' | 'interactive';
  glowColor?: 'indigo' | 'purple' | 'emerald' | 'none';
  onClick?: () => void;
  style?: React.CSSProperties;
}

/**
 * Flat surface with a hairline border. `variant` and `glowColor` are kept so
 * unconverted screens keep compiling; the glass/solid distinction and the glow
 * accents no longer render differently.
 */
export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'glass',
  onClick,
  style
}) => {
  const isInteractive = variant === 'interactive' || !!onClick;

  return (
    <div
      className={`
        relative overflow-hidden rounded-lg bg-card border border-border
        shadow-[var(--shadow-card)] transition-colors duration-150
        ${isInteractive ? 'cursor-pointer hover:bg-muted-2 hover:border-border-strong' : ''}
        ${className}
      `}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  );
};

export default Card;
