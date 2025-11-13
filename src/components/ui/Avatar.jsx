// src/components/ui/Avatar.jsx
import React, { useMemo, useState } from 'react';
import { cn } from '../../lib/utils';

const Avatar = ({
  src,
  alt,
  name,
  size = 'md',
  className,
  fallbackClassName,
  ...props
}) => {
  const [imageError, setImageError] = useState(false);
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-20 h-20 text-2xl',
  };

  const getInitials = (name) => {
    if (!name) return '?';
    
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const getBackgroundColor = (name) => {
    if (!name) return 'bg-gray-500';
    
    const colors = [
      'bg-red-500',
      'bg-yellow-500',
      'bg-green-500',
      'bg-blue-500',
      'bg-indigo-500',
      'bg-purple-500',
      'bg-pink-500',
    ];
    
    const charCode = name.charCodeAt(0) + name.charCodeAt(name.length - 1);
    return colors[charCode % colors.length];
  };

  // Helper function to get absolute avatar URL with cache-busting
  // Use a simple hash of the src as cache-busting to ensure consistency
  // This ensures the same URL always gets the same cache-busting value,
  // but different URLs get different values
  const avatarSrc = useMemo(() => {
    if (!src) return null;
    
    // Generate a consistent hash from the src for cache-busting
    // This ensures the same src always gets the same cache param
    const cacheParam = src.split('/').pop()?.split('?')[0] || Date.now();
    
    // If already an absolute URL (starts with http:// or https://), use as is
    if (src.startsWith('http://') || src.startsWith('https://')) {
      // Add cache-busting parameter if not already present
      const separator = src.includes('?') ? '&' : '?';
      return `${src}${separator}_t=${cacheParam}`;
    }
    
    // If relative URL (starts with /), convert to absolute URL
    if (src.startsWith('/')) {
      // Get backend URL from environment or use default
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
      // Remove trailing slash from backend URL if present
      const baseUrl = backendUrl.replace(/\/$/, '');
      // Add cache-busting parameter to force refresh when avatar changes
      // Use timestamp to ensure fresh fetch on every mount (key prop will remount)
      return `${baseUrl}${src}?_t=${Date.now()}`;
    }
    
    // Fallback: return as is with cache-busting
    return src.includes('?') ? `${src}&_t=${Date.now()}` : `${src}?_t=${Date.now()}`;
  }, [src]); // Only recalculate when src changes

  // Reset error state when src changes
  React.useEffect(() => {
    setImageError(false);
  }, [src]);

  if (avatarSrc && !imageError) {
    return (
      <img
        src={avatarSrc}
        alt={alt || name}
        className={cn(
          'rounded-full object-cover',
          sizes[size],
          className
        )}
        onError={() => {
          // Fallback to initials if image fails to load
          setImageError(true);
        }}
        {...props}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center text-white font-medium',
        sizes[size],
        getBackgroundColor(name),
        fallbackClassName,
        className
      )}
      {...props}
    >
      {getInitials(name)}
    </div>
  );
};

export { Avatar };
