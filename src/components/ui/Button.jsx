// src/components/ui/Button.jsx
import React from 'react';
import { cn } from '../../lib/utils';

const Button = React.forwardRef(({
  className,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  children,
  ...props
}, ref) => {
  const variants = {
    primary: 'bg-primary text-primary-foreground hover:opacity-90 focus:ring-ring',
    secondary: 'bg-secondary text-secondary-foreground hover:opacity-90 focus:ring-ring',
    outline: 'border border-border text-foreground bg-background hover:bg-accent hover:text-accent-foreground focus:ring-ring',
    ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground focus:ring-ring',
    danger: 'bg-destructive text-destructive-foreground hover:opacity-90 focus:ring-ring',
    success: 'bg-primary text-primary-foreground hover:opacity-90 focus:ring-ring',
  };

  const sizes = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg',
  };

  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-md border border-transparent',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'transition-colors duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
        </svg>
      )}
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export { Button };
