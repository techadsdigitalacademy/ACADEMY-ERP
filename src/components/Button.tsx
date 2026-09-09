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
  const baseStyles =
    'inline-flex items-center justify-center gap-2 font-medium rounded-md border transition-colors duration-150 ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ' +
    'disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeStyles = {
    sm: 'h-7 px-2.5 text-xs',
    md: 'h-8 px-3 text-[13px]',
    lg: 'h-9 px-4 text-sm'
  };

  const variantStyles = {
    primary: 'bg-primary border-primary text-primary-foreground font-semibold hover:brightness-110',
    secondary: 'bg-card border-border text-foreground hover:bg-muted',
    glass: 'bg-card border-border text-foreground hover:bg-muted',
    success: 'bg-success border-success text-white font-semibold hover:brightness-110',
    danger: 'bg-danger border-danger text-white font-semibold hover:brightness-110'
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
        <svg className="animate-spin h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};
export default Button;
