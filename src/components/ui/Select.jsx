// src/components/ui/Select.jsx
import React, { useState, useRef } from 'react';
import { cn } from '../../lib/utils';
import { useClickOutside } from '../../hooks/useClickOutside';

const Select = React.forwardRef(({
  options = [],
  value,
  onChange,
  placeholder = 'Select an option...',
  disabled = false,
  error,
  label,
  multiple = false,
  searchable = false,
  clearable = false,
  className,
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const selectRef = useClickOutside(() => setIsOpen(false), isOpen);
  const searchInputRef = useRef(null);

  const filteredOptions = searchable
    ? options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  const selectedOptions = multiple
    ? options.filter(option => value?.includes(option.value))
    : options.find(option => option.value === value);

  const handleSelect = (option) => {
    if (multiple) {
      const newValue = value?.includes(option.value)
        ? value.filter(v => v !== option.value)
        : [...(value || []), option.value];
      onChange?.(newValue);
    } else {
      onChange?.(option.value);
      setIsOpen(false);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.(multiple ? [] : '');
  };

  const getDisplayValue = () => {
    if (multiple) {
      if (!value || value.length === 0) return placeholder;
      if (value.length === 1) {
        const option = options.find(opt => opt.value === value[0]);
        return option?.label || value[0];
      }
      return `${value.length} selected`;
    }
    
    if (!value) return placeholder;
    const option = options.find(opt => opt.value === value);
    return option?.label || value;
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        setIsOpen(!isOpen);
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) setIsOpen(true);
        break;
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}
      
      <div ref={selectRef} className="relative">
        <button
          ref={ref}
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn(
            'relative w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm',
            {
              'border-red-300 focus:border-red-500 focus:ring-red-500': error,
              'opacity-50 cursor-not-allowed': disabled,
            },
            className
          )}
          {...props}
        >
          <span className={cn(
            'block truncate',
            (!value || (multiple && (!value || value.length === 0))) && 'text-gray-500'
          )}>
            {getDisplayValue()}
          </span>
          
          <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            {clearable && value && (multiple ? value.length > 0 : true) && (
              <button
                type="button"
                onClick={handleClear}
                className="pointer-events-auto p-1 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <svg
              className={cn(
                'w-5 h-5 text-gray-400 transition-transform duration-200',
                isOpen && 'transform rotate-180'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
            {searchable && (
              <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            )}
            
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-gray-500 text-center">
                No options found
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = multiple
                  ? value?.includes(option.value)
                  : value === option.value;
                
                return (
                  <div
                    key={option.value}
                    onClick={() => handleSelect(option)}
                    className={cn(
                      'cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100 dark:hover:bg-gray-700',
                      isSelected && 'bg-primary-100 dark:bg-primary-900 text-primary-900 dark:text-primary-100'
                    )}
                  >
                    <span className={cn(
                      'block truncate',
                      isSelected ? 'font-medium' : 'font-normal'
                    )}>
                      {option.label}
                    </span>
                    
                    {isSelected && (
                      <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-primary-600">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export { Select };
