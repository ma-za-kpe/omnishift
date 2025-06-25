'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface EnhancedCardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  glassmorphism?: boolean;
  gradient?: boolean;
  onClick?: () => void;
}

export function EnhancedCard({ 
  children, 
  className, 
  hoverable = true, 
  glassmorphism = false,
  gradient = false,
  onClick 
}: EnhancedCardProps) {
  const baseClasses = cn(
    'rounded-xl border transition-all duration-300',
    glassmorphism ? 
      'bg-white/10 dark:bg-black/10 backdrop-blur-sm border-white/20 dark:border-gray-800/50' :
      'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800',
    gradient && 'bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800',
    hoverable && 'hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-400/10',
    onClick && 'cursor-pointer',
    className
  );

  if (hoverable) {
    return (
      <motion.div
        whileHover={{ 
          y: -2,
          scale: 1.02,
          transition: { duration: 0.2 }
        }}
        whileTap={onClick ? { scale: 0.98 } : {}}
        className={baseClasses}
        onClick={onClick}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={baseClasses} onClick={onClick}>
      {children}
    </div>
  );
}