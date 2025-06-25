'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Plus, Minus, Eye } from 'lucide-react';
import { Stock } from '@/types';
import { cn } from '@/lib/utils';

interface EnhancedStockCardProps {
  stock: Stock;
  showQuickActions?: boolean;
  compact?: boolean;
}

export function EnhancedStockCard({ stock, showQuickActions = true, compact = false }: EnhancedStockCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tensionScore, setTensionScore] = useState(50); // Default tension score
  const [sparklineData, setSparklineData] = useState<Array<{x: number; y: number}>>([]);

  const isPositive = stock.dayChangePercent >= 0;

  useEffect(() => {
    // Calculate tension based on stock volatility instead of random
    const volatilityTension = Math.abs(stock.dayChangePercent) * 10; // Higher change = higher tension
    setTensionScore(Math.min(volatilityTension, 100));
    
    // Generate realistic sparkline based on actual price movement
    const basePrice = stock.currentPrice;
    setSparklineData(Array.from({ length: 24 }, (_, i) => ({
      x: i,
      y: basePrice + (stock.dayChange / 24) * i + (Math.random() - 0.5) * (Math.abs(stock.dayChange) * 0.1)
    })));
  }, [stock.currentPrice, stock.dayChange, stock.dayChangePercent]);
  
  const getTensionColor = (score: number) => {
    if (score < 30) return 'border-green-500';
    if (score < 70) return 'border-yellow-500';
    return 'border-red-500';
  };

  const handleQuickAction = async (action: string) => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => setIsLoading(false), 1000);
  };


  if (isLoading) {
    return (
      <div className={cn(
        'rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6',
        compact ? 'p-4' : 'p-6'
      )}>
        <div className="animate-pulse space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-16"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-20"></div>
          </div>
          <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-24"></div>
          <div className="h-16 bg-gray-300 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      layout
      whileHover={{ 
        y: -4,
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={cn(
        'group relative rounded-xl border-l-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 transition-all duration-300 overflow-hidden',
        getTensionColor(tensionScore),
        'hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-400/10',
        compact ? 'p-4' : 'p-6'
      )}
    >
      {/* Gradient overlay on hover */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 0.05 : 0 }}
        className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 pointer-events-none"
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                {stock.ticker}
              </h3>
              <p className={cn(
                'text-sm text-gray-600 dark:text-gray-400',
                compact && 'hidden'
              )}>
                {stock.name}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <motion.div
              animate={{ scale: isPositive ? [1, 1.1, 1] : 1 }}
              transition={{ duration: 0.5 }}
              className={cn(
                'flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium',
                isPositive 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              )}
            >
              {isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{Math.abs(stock.dayChangePercent).toFixed(2)}%</span>
            </motion.div>
          </div>
        </div>

        {/* Price */}
        <div className="mb-4">
          <div className="flex items-baseline space-x-2">
            <motion.span
              key={stock.currentPrice}
              initial={{ scale: 1.1, color: isPositive ? '#10b981' : '#ef4444' }}
              animate={{ scale: 1, color: 'inherit' }}
              transition={{ duration: 0.3 }}
              className="text-2xl font-bold text-gray-900 dark:text-white"
            >
              ${stock.currentPrice.toFixed(2)}
            </motion.span>
            <span className={cn(
              'flex items-center text-sm font-medium',
              isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            )}>
              {isPositive ? (
                <ArrowUpRight className="w-4 h-4 mr-1" />
              ) : (
                <ArrowDownRight className="w-4 h-4 mr-1" />
              )}
              ${Math.abs(stock.dayChange).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Mini Sparkline Chart */}
        {!compact && (
          <div className="mb-4 h-16">
            <svg className="w-full h-full" viewBox="0 0 240 64">
              <defs>
                <linearGradient id={`gradient-${stock.ticker}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity="0" />
                </linearGradient>
              </defs>
              
              {/* Area */}
              <path
                d={`M 0 32 ${sparklineData.map((point, i) => 
                  `L ${i * 10} ${32 + (point.y - stock.currentPrice) * 0.5}`
                ).join(' ')} L 240 32 Z`}
                fill={`url(#gradient-${stock.ticker})`}
              />
              
              {/* Line */}
              <path
                d={`M 0 32 ${sparklineData.map((point, i) => 
                  `L ${i * 10} ${32 + (point.y - stock.currentPrice) * 0.5}`
                ).join(' ')}`}
                stroke={isPositive ? '#10b981' : '#ef4444'}
                strokeWidth="2"
                fill="none"
                className="drop-shadow-sm"
              />
            </svg>
          </div>
        )}

        {/* Stats */}
        {!compact && (
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Volume</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {(stock.volume / 1000000).toFixed(1)}M
              </p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Tension</span>
              <p className={cn(
                'font-medium',
                tensionScore < 30 ? 'text-green-600 dark:text-green-400' :
                tensionScore < 70 ? 'text-yellow-600 dark:text-yellow-400' :
                'text-red-600 dark:text-red-400'
              )}>
                {tensionScore.toFixed(0)}%
              </p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <AnimatePresence>
          {showQuickActions && isHovered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700"
            >
              <div className="flex space-x-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleQuickAction('buy')}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Buy</span>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleQuickAction('sell')}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  <Minus className="w-3 h-3" />
                  <span>Sell</span>
                </motion.button>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleQuickAction('watch')}
                className="flex items-center space-x-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors"
              >
                <Eye className="w-3 h-3" />
                <span>Watch</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}