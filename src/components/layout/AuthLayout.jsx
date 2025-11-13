// src/components/layout/AuthLayout.jsx - Refactored with Shadcn/UI and Framer Motion
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Main content */}
      <main 
        id="main-content" 
        className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative z-10"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md space-y-8"
        >
          {children}
        </motion.div>
      </main>

      {/* Animated background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.2, scale: 1 }}
          transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px]
                      bg-gradient-to-r from-primary-200 via-purple-200 to-blue-200
                      dark:from-primary-900/30 dark:via-purple-900/30 dark:to-blue-900/30
                      rounded-full blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.1, scale: 1 }}
          transition={{ duration: 3, repeat: Infinity, repeatType: 'reverse', delay: 0.5 }}
          className="absolute bottom-0 right-1/4 translate-x-1/2 translate-y-1/2 w-[600px] h-[600px]
                      bg-gradient-to-r from-blue-200 via-green-200 to-teal-200
                      dark:from-blue-900/20 dark:via-green-900/20 dark:to-teal-900/20
                      rounded-full blur-3xl"
        />
      </div>

      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 
                 bg-primary text-primary-foreground p-2 z-50 rounded-br-md
                 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        Skip to main content
      </a>
    </div>
  );
};

export default AuthLayout;
