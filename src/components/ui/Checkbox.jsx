// src/components/ui/Checkbox.jsx
import React from 'react';
import { cn } from '../../lib/utils';

const Checkbox = React.forwardRef(({
  className,
  checked = false,
  onChange,
  disabled = false,
  indeterminate = false,
  label,
  description,
  error,
  size = 'md',
  ...props
}, ref) => {
  const checkboxRef = React.useRef(null);

  React.useImperativeHandle(ref, () => checkboxRef.current);

  React.useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const checkboxElement = (
    <input
      ref={checkboxRef}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className={cn(
        'rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50',
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
          {checkboxElement}
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
          {error && (
            <p className="text-red-600 dark:text-red-400 text-xs mt-1">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  return checkboxElement;
});

// Checkbox Group component
const CheckboxGroup = ({
  options = [],
  value = [],
  onChange,
  label,
  error,
  disabled = false,
  direction = 'vertical',
  className,
}) => {
  const handleChange = (optionValue, checked) => {
    const newValue = checked
      ? [...value, optionValue]
      : value.filter(v => v !== optionValue);
    onChange?.(newValue);
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
          <Checkbox
            key={option.value}
            id={`checkbox-${option.value}`}
            checked={value.includes(option.value)}
            onChange={(e) => handleChange(option.value, e.target.checked)}
            disabled={disabled || option.disabled}
            label={option.label}
            description={option.description}
          />
        ))}
      </div>
      
      {error && (
        <p className="text-red-600 dark:text-red-400 text-sm">
          {error}
        </p>
      )}
    </div>
  );
};

Checkbox.displayName = 'Checkbox';
CheckboxGroup.displayName = 'CheckboxGroup';

export { Checkbox, CheckboxGroup };
