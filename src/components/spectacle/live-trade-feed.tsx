'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiveTradeFeedProps {
  portfolio: any;
}

export function LiveTradeFeed({ portfolio }: LiveTradeFeedProps) {
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (portfolio?.trades) {
      // Get the 5 most recent trades
      const recent = portfolio.trades
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);
      setRecentTrades(recent);
    }
  }, [portfolio]);

  if (!recentTrades.length) return null;

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: isVisible ? 0 : 100 }}
      className="fixed bottom-0 left-0 right-0 z-40"
    >
      <div className="bg-black/80 backdrop-blur-xl border-t border-white/20 p-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-white">Live Trade Feed</span>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            </div>
            <button
              onClick={() => setIsVisible(!isVisible)}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              {isVisible ? 'Hide' : 'Show'}
            </button>
          </div>
          
          <div className="flex space-x-4 overflow-x-auto scrollbar-hide">
            <AnimatePresence>
              {recentTrades.map((trade, index) => (
                <motion.div
                  key={trade.id}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    "flex-shrink-0 bg-white/10 rounded-lg p-3 min-w-[200px]",
                    trade.action === 'BUY' 
                      ? "border-l-4 border-green-400" 
                      : "border-l-4 border-red-400"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      "text-xs font-bold px-2 py-1 rounded",
                      trade.action === 'BUY'
                        ? "bg-green-400/20 text-green-400"
                        : "bg-red-400/20 text-red-400"
                    )}>
                      {trade.action}
                    </span>
                    {trade.action === 'BUY' ? (
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-white font-semibold">
                      {trade.quantity} {trade.symbol}
                    </p>
                    <p className="text-sm text-gray-300">
                      @ ${trade.price.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {trade.triggerReason}
                    </p>
                    {trade.pnl !== undefined && (
                      <p className={cn(
                        "text-xs font-medium",
                        trade.pnl >= 0 ? "text-green-400" : "text-red-400"
                      )}>
                        P&L: {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)} 
                        ({trade.pnlPercent?.toFixed(1)}%)
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center mt-2 text-xs text-gray-400">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(trade.timestamp).toLocaleTimeString()}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}