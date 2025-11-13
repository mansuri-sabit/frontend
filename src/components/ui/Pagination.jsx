// src/components/ui/Pagination.jsx
import React from 'react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  showPrevNext = true,
  showFirstLast = true,
  maxVisiblePages = 5,
  size = 'md',
  className,
}) => {
  const getVisiblePages = () => {
    const pages = [];
    const half = Math.floor(maxVisiblePages / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxVisiblePages - 1);

    if (end - start < maxVisiblePages - 1) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange?.(page);
    }
  };

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  if (totalPages <= 1) return null;

  const visiblePages = getVisiblePages();

  return (
    <nav className={cn('flex items-center justify-center space-x-1', className)}>
      {/* First page */}
      {showFirstLast && currentPage > 1 && (
        <>
          <Button
            variant="ghost"
            size={size}
            onClick={() => handlePageChange(1)}
            className={sizes[size]}
          >
            First
          </Button>
          {visiblePages[0] > 2 && (
            <span className="px-2 text-gray-500">...</span>
          )}
        </>
      )}

      {/* Previous page */}
      {showPrevNext && (
        <Button
          variant="ghost"
          size={size}
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={cn(sizes[size], 'flex items-center')}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </Button>
      )}

      {/* Page numbers */}
      {visiblePages.map((page) => (
        <Button
          key={page}
          variant={page === currentPage ? 'primary' : 'ghost'}
          size={size}
          onClick={() => handlePageChange(page)}
          className={cn(
            sizes[size],
            'min-w-[2.5rem]',
            page === currentPage && 'pointer-events-none'
          )}
        >
          {page}
        </Button>
      ))}

      {/* Next page */}
      {showPrevNext && (
        <Button
          variant="ghost"
          size={size}
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={cn(sizes[size], 'flex items-center')}
        >
          Next
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      )}

      {/* Last page */}
      {showFirstLast && currentPage < totalPages && (
        <>
          {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
            <span className="px-2 text-gray-500">...</span>
          )}
          <Button
            variant="ghost"
            size={size}
            onClick={() => handlePageChange(totalPages)}
            className={sizes[size]}
          >
            Last
          </Button>
        </>
      )}
    </nav>
  );
};

// Simple pagination with just prev/next
const SimplePagination = ({
  currentPage,
  totalPages,
  onPageChange,
  showPageInfo = true,
  className,
}) => (
  <div className={cn('flex items-center justify-between', className)}>
    <Button
      variant="outline"
      onClick={() => onPageChange(currentPage - 1)}
      disabled={currentPage === 1}
    >
      Previous
    </Button>
    
    {showPageInfo && (
      <span className="text-sm text-gray-700 dark:text-gray-300">
        Page {currentPage} of {totalPages}
      </span>
    )}
    
    <Button
      variant="outline"
      onClick={() => onPageChange(currentPage + 1)}
      disabled={currentPage === totalPages}
    >
      Next
    </Button>
  </div>
);

Pagination.displayName = 'Pagination';
SimplePagination.displayName = 'SimplePagination';

export { Pagination, SimplePagination };
