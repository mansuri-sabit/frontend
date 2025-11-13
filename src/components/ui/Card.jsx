// src/components/ui/Card.jsx
import React from 'react';
import { cn } from '../../lib/utils';

const Card = React.forwardRef(({
  className,
  padding = true,
  shadow = true,
  hover = false,
  children,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'bg-card text-card-foreground rounded-lg border border-border',
        {
          'p-6': padding,
          'shadow-sm': shadow,
          'hover:shadow-md transition-shadow duration-200': hover,
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

const CardHeader = ({ className, children, ...props }) => (
  <div
    className={cn('px-6 py-4 border-b border-border', className)}
    {...props}
  >
    {children}
  </div>
);

const CardContent = ({ className, children, ...props }) => (
  <div className={cn('p-6', className)} {...props}>
    {children}
  </div>
);

const CardFooter = ({ className, children, ...props }) => (
  <div
    className={cn('px-6 py-4 border-t border-border bg-muted/50 rounded-b-lg', className)}
    {...props}
  >
    {children}
  </div>
);

const CardTitle = ({ className, children, ...props }) => (
  <h3 className={cn('text-lg font-semibold text-card-foreground', className)} {...props}>
    {children}
  </h3>
);

const CardDescription = ({ className, children, ...props }) => (
  <p className={cn('text-sm text-muted-foreground mt-1', className)} {...props}>
    {children}
  </p>
);

Card.displayName = 'Card';
CardHeader.displayName = 'CardHeader';
CardContent.displayName = 'CardContent';
CardFooter.displayName = 'CardFooter';
CardTitle.displayName = 'CardTitle';
CardDescription.displayName = 'CardDescription';

export { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription };
