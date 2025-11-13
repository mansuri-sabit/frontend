// src/components/ui/Dropdown.jsx
import React, { useState, useRef } from 'react';
import { cn } from '../../lib/utils';
import { useClickOutside } from '../../hooks/useClickOutside';

const Dropdown = ({
  trigger,
  items = [],
  placement = 'bottom-start',
  className,
  menuClassName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useClickOutside(() => setIsOpen(false), isOpen);

  const placements = {
    'bottom-start': 'top-full left-0 mt-1',
    'bottom-end': 'top-full right-0 mt-1',
    'top-start': 'bottom-full left-0 mb-1',
    'top-end': 'bottom-full right-0 mb-1',
  };

  const handleItemClick = (item) => {
    if (item.onClick) {
      item.onClick();
    }
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={cn('relative inline-block', className)}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 min-w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none',
            placements[placement],
            menuClassName
          )}
        >
          <div className="py-1">
            {items.map((item, index) => {
              if (item.type === 'divider') {
                return (
                  <div
                    key={index}
                    className="border-t border-gray-100 dark:border-gray-700 my-1"
                  />
                );
              }
              
              return (
                <button
                  key={index}
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    'w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center',
                    item.className
                  )}
                >
                  {item.icon && (
                    <span className="mr-3 flex-shrink-0">
                      {item.icon}
                    </span>
                  )}
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export { Dropdown };
