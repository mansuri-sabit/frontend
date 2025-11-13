// src/components/ui/Table.jsx
import React from 'react';
import { cn } from '../../lib/utils';

const Table = React.forwardRef(({
  className,
  ...props
}, ref) => (
  <table
    ref={ref}
    className={cn('min-w-full divide-y divide-border', className)}
    {...props}
  />
));

const TableHeader = React.forwardRef(({
  className,
  ...props
}, ref) => (
  <thead
    ref={ref}
    className={cn('bg-muted/50', className)}
    {...props}
  />
));

const TableBody = React.forwardRef(({
  className,
  ...props
}, ref) => (
  <tbody
    ref={ref}
    className={cn('bg-background divide-y divide-border', className)}
    {...props}
  />
));

const TableRow = React.forwardRef(({
  className,
  ...props
}, ref) => (
  <tr
    ref={ref}
    className={cn('hover:bg-muted/50 transition-colors', className)}
    {...props}
  />
));

const TableHead = React.forwardRef(({
  className,
  ...props
}, ref) => (
  <th
    ref={ref}
    className={cn(
      'px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider',
      className
    )}
    {...props}
  />
));

const TableCell = React.forwardRef(({
  className,
  ...props
}, ref) => (
  <td
    ref={ref}
    className={cn(
      'px-6 py-4 whitespace-nowrap text-sm text-foreground',
      className
    )}
    {...props}
  />
));

Table.displayName = 'Table';
TableHeader.displayName = 'TableHeader';
TableBody.displayName = 'TableBody';
TableRow.displayName = 'TableRow';
TableHead.displayName = 'TableHead';
TableCell.displayName = 'TableCell';

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
