// src/components/ui/Spinner.jsx
import React from 'react';
import { cn } from '../../lib/utils';

const Spinner = ({
  size = 'md',
  color = 'primary',
  className,
  ...props
}) => {
  const sizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10',
  };

  const colors = {
    primary: 'text-primary-600',
    white: 'text-white',
    gray: 'text-gray-600',
    black: 'text-black',
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-current border-t-transparent',
        sizes[size],
        colors[color],
        className
      )}
      {...props}
    />
  );
};

export { Spinner };
