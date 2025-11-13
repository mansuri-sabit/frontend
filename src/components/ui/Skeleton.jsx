// src/components/ui/Skeleton.jsx
import React from 'react';
import { cn } from '../../lib/utils';

const Skeleton = ({
  className,
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
  ...props
}) => {
  const variants = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  const animations = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  const style = {
    ...(width && { width }),
    ...(height && { height }),
  };

  return (
    <div
      className={cn(
        'bg-gray-200 dark:bg-gray-700',
        variants[variant],
        animations[animation],
        className
      )}
      style={style}
      {...props}
    />
  );
};

// Predefined skeleton components
const SkeletonText = ({ lines = 1, className, ...props }) => (
  <div className={cn('space-y-2', className)} {...props}>
    {Array.from({ length: lines }, (_, i) => (
      <Skeleton
        key={i}
        variant="text"
        className={i === lines - 1 ? 'w-3/4' : 'w-full'}
      />
    ))}
  </div>
);

const SkeletonAvatar = ({ size = 'md', className, ...props }) => {
  const sizes = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <Skeleton
      variant="circular"
      className={cn(sizes[size], className)}
      {...props}
    />
  );
};

const SkeletonCard = ({ className, ...props }) => (
  <div className={cn('p-6 space-y-4', className)} {...props}>
    <div className="flex items-center space-x-4">
      <SkeletonAvatar />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
    <SkeletonText lines={3} />
    <div className="flex space-x-2">
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-8 w-20" />
    </div>
  </div>
);

const SkeletonTable = ({ rows = 5, columns = 4, className, ...props }) => (
  <div className={cn('space-y-3', className)} {...props}>
    {/* Header */}
    <div className="flex space-x-4">
      {Array.from({ length: columns }, (_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="flex space-x-4">
        {Array.from({ length: columns }, (_, j) => (
          <Skeleton key={j} className="h-6 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

Skeleton.displayName = 'Skeleton';
SkeletonText.displayName = 'SkeletonText';
SkeletonAvatar.displayName = 'SkeletonAvatar';
SkeletonCard.displayName = 'SkeletonCard';
SkeletonTable.displayName = 'SkeletonTable';

export { Skeleton, SkeletonText, SkeletonAvatar, SkeletonCard, SkeletonTable };
