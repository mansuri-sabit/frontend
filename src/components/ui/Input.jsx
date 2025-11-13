// src/components/ui/Input.jsx
import React from 'react';
import { cn } from '../../lib/utils';

const Input = React.forwardRef(({
  className,
  type = 'text',
  label,
  error,
  help,
  leftIcon,
  rightIcon,
  as = 'input',
  ...props
}, ref) => {
  const Component = as;
  
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={props.id || props.name} className="block text-sm font-medium text-foreground mb-2">
          {label}
          {props.required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="text-muted-foreground">{leftIcon}</div>
          </div>
        )}
        
        <Component
          ref={ref}
          type={type}
          className={cn(
            'block w-full rounded-md border-input bg-background shadow-sm',
            'h-10 px-3 py-2 text-foreground placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            'disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed',
            'text-sm',
            {
              'pl-10': leftIcon,
              'pr-10': rightIcon,
              'border-destructive focus-visible:ring-destructive': error,
            },
            className
          )}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {rightIcon}
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
      
      {help && !error && (
        <p className="mt-2 text-sm text-muted-foreground">
          {help}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export { Input };
