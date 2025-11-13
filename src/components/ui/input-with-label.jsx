// src/components/ui/input-with-label.jsx - Enhanced Input with label and icons
import React from 'react';
import { Input } from './input';
import { Label } from './label';
import { cn } from '../../lib/utils';
import { Eye, EyeOff, User as UserIcon } from 'lucide-react';
import { Button } from './button';

export const InputWithLabel = React.forwardRef(({
  label,
  error,
  help,
  leftIcon,
  rightIcon,
  showPasswordToggle,
  onTogglePassword,
  showPassword,
  required,
  className,
  ...props
}, ref) => {
  return (
    <div className={cn('w-full space-y-2', className)}>
      {label && (
        <Label htmlFor={props.id || props.name} className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
            {leftIcon}
          </div>
        )}
        
        <Input
          ref={ref}
          className={cn(
            {
              'pl-10': leftIcon,
              'pr-10': rightIcon || showPasswordToggle,
              'border-destructive focus-visible:ring-destructive': error,
            }
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${props.id || props.name}-error` : undefined}
          {...props}
        />
        
        {(rightIcon || showPasswordToggle) && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {showPasswordToggle ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={onTogglePassword}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            ) : (
              rightIcon
            )}
          </div>
        )}
      </div>
      
      {error && (
        <p id={`${props.id || props.name}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
      
      {help && !error && (
        <p className="text-sm text-muted-foreground">
          {help}
        </p>
      )}
    </div>
  );
});

InputWithLabel.displayName = 'InputWithLabel';

export { InputWithLabel };

