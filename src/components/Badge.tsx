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
  const sizeStyles = {
    sm: 'h-5 px-1.5 text-[10.5px] gap-1',
    md: 'h-6 px-2 text-[11.5px] gap-1.5'
  };

  const variantStyles = {
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    error: 'bg-danger-soft text-danger',
    info: 'bg-muted text-secondary-foreground',
    indigo: 'bg-primary-soft text-primary',
    purple: 'bg-primary-soft text-primary'
  };

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-[5px] whitespace-nowrap ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      <span className="w-[5px] h-[5px] rounded-full bg-current shrink-0"></span>
      {children}
    </span>
  );
};
