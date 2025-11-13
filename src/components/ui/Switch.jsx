// src/components/ui/Switch.jsx
import React from 'react';
import { cn } from '../../lib/utils';

const Switch = React.forwardRef(({
  className,
  checked = false,
  onChange,
  disabled = false,
  size = 'md',
  label,
  description,
  ...props
}, ref) => {
  const sizes = {
    sm: {
      switch: 'w-8 h-4',
      thumb: 'w-3 h-3',
      translate: 'translate-x-4',
    },
    md: {
      switch: 'w-11 h-6',
      thumb: 'w-5 h-5',
      translate: 'translate-x-5',
    },
    lg: {
      switch: 'w-14 h-8',
      thumb: 'w-7 h-7',
      translate: 'translate-x-6',
    },
  };

  const sizeConfig = sizes[size];

  const handleChange = (event) => {
    if (onChange) {
      onChange(event.target.checked);
    }
  };

  const switchElement = (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && handleChange({ target: { checked: !checked } })}
      className={cn(
          'relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-primary focus:ring-offset-2',
        sizeConfig.switch,
        checked
          ? 'bg-gray-900 dark:bg-primary'
          : 'bg-gray-200 dark:bg-gray-700',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      {...props}
    >
      <span
        className={cn(
          'pointer-events-none inline-block rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out',
          sizeConfig.thumb,
          checked ? sizeConfig.translate : 'translate-x-0'
        )}
      />
    </button>
  );

  if (label || description) {
    return (
      <div className="flex items-start">
        <div className="flex items-center h-5">
          {switchElement}
        </div>
        {(label || description) && (
          <div className="ml-3 text-sm">
            {label && (
              <label className="font-medium text-foreground">
                {label}
              </label>
            )}
            {description && (
              <p className="text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return switchElement;
});

Switch.displayName = 'Switch';

export { Switch };
