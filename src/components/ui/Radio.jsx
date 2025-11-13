// src/components/ui/Radio.jsx
import React from 'react';
import { cn } from '../../lib/utils';

const Radio = React.forwardRef(({
  className,
  checked = false,
  onChange,
  disabled = false,
  label,
  description,
  error,
  size = 'md',
  ...props
}, ref) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const radioElement = (
    <input
      ref={ref}
      type="radio"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className={cn(
        'border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50',
        'dark:border-gray-600 dark:bg-gray-800 dark:focus:ring-primary-600 dark:focus:ring-opacity-50',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        {
          'border-red-300 focus:border-red-300 focus:ring-red-200': error,
        },
        sizes[size],
        className
      )}
      {...props}
    />
  );

  if (label || description) {
    return (
      <div className="flex items-start">
        <div className="flex items-center h-5">
          {radioElement}
        </div>
        <div className="ml-3 text-sm">
          {label && (
            <label
              htmlFor={props.id}
              className={cn(
                'font-medium',
                disabled
                  ? 'text-gray-400 dark:text-gray-500'
                  : 'text-gray-700 dark:text-gray-300',
                error && 'text-red-600 dark:text-red-400'
              )}
            >
              {label}
            </label>
          )}
          {description && (
            <p className={cn(
              disabled
                ? 'text-gray-400 dark:text-gray-500'
                : 'text-gray-500 dark:text-gray-400'
            )}>
              {description}
            </p>
          )}
        </div>
      </div>
    );
  }

  return radioElement;
});

// Radio Group component
const RadioGroup = ({
  options = [],
  value,
  onChange,
  name,
  label,
  error,
  disabled = false,
  direction = 'vertical',
  className,
}) => {
  const handleChange = (optionValue) => {
    onChange?.(optionValue);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      
      <div className={cn(
        direction === 'horizontal' ? 'flex flex-wrap gap-6' : 'space-y-2'
      )}>
        {options.map((option) => (
          <Radio
            key={option.value}
            id={`radio-${name}-${option.value}`}
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => handleChange(option.value)}
            disabled={disabled || option.disabled}
            label={option.label}
            description={option.description}
            error={error}
          />
        ))}
      </div>
      
      {error && (
        <p className="text-red-600 dark:text-red-400 text-sm mt-2">
          {error}
        </p>
      )}
    </div>
  );
};

Radio.displayName = 'Radio';
RadioGroup.displayName = 'RadioGroup';

export { Radio, RadioGroup };
