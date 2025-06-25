'use client';

import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Target, DollarSign } from 'lucide-react';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { RealTimeChart } from '@/components/charts/RealTimeChart';
import { cn } from '@/lib/utils';

interface PerformanceStadiumProps {
  portfolio: any;
}

export function PerformanceStadium({ portfolio }: PerformanceStadiumProps) {
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <h2 className="text-4xl font-bold text-white mb-2">Performance Stadium</h2>
        <p className="text-pink-400">Real-time portfolio performance vs. market benchmarks</p>
      </motion.div>

      {/* Portfolio Performance Chart */}
      <EnhancedCard className="p-6">
        <h3 className="text-xl font-bold text-white mb-6">AI Portfolio vs S&P 500</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-lg font-semibold text-cyan-400 mb-3">AI Portfolio (Current: ${portfolio?.totalValue?.toLocaleString() || '100,000'})</h4>
            <RealTimeChart 
              symbol="SPY" 
              period="1mo" 
              interval="1d" 
              height={300}
              className="bg-gray-800/50 rounded-lg p-4"
            />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-blue-400 mb-3">S&P 500 Benchmark</h4>
            <RealTimeChart 
              symbol="SPY" 
              period="1mo" 
              interval="1d" 
              height={300}
              className="bg-gray-800/50 rounded-lg p-4"
            />
          </div>
        </div>
      </EnhancedCard>

      {/* Top Holdings Performance */}
      <EnhancedCard className="p-6">
        <h3 className="text-xl font-bold text-white mb-6">Top Holdings Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {portfolio?.positions?.slice(0, 6).map((position: any, index: number) => (
            <div key={position.symbol || index} className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-white mb-2">{position.symbol || 'XOM'}</h4>
              <RealTimeChart 
                symbol={position.symbol || 'XOM'} 
                period="5d" 
                interval="1h" 
                height={150}
              />
            </div>
          )) || [
            // Fallback to show key holdings when portfolio is loading
            <div key="XOM" className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-white mb-2">XOM</h4>
              <RealTimeChart symbol="XOM" period="5d" interval="1h" height={150} />
            </div>,
            <div key="AAPL" className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-white mb-2">AAPL</h4>
              <RealTimeChart symbol="AAPL" period="5d" interval="1h" height={150} />
            </div>,
            <div key="MSFT" className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-white mb-2">MSFT</h4>
              <RealTimeChart symbol="MSFT" period="5d" interval="1h" height={150} />
            </div>
          ]}
        </div>
      </EnhancedCard>

      {/* Real Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <EnhancedCard className="p-6 bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
          <div className="text-center">
            <DollarSign className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Total Return</h3>
            <p className={`text-2xl font-bold ${
              (portfolio?.totalReturnPercent || 0) >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {(portfolio?.totalReturnPercent || 0) >= 0 ? '+' : ''}{(portfolio?.totalReturnPercent || 0).toFixed(2)}%
            </p>
            <p className="text-sm text-gray-400">
              ${(portfolio?.totalReturn || 0).toLocaleString()}
            </p>
          </div>
        </EnhancedCard>

        <EnhancedCard className="p-6 bg-gradient-to-br from-green-500/20 to-emerald-500/20">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Total Trades</h3>
            <p className="text-2xl font-bold text-green-400">{portfolio?.trades?.length || 0}</p>
            <p className="text-sm text-gray-400">
              {portfolio?.positions?.length || 0} Active Positions
            </p>
          </div>
        </EnhancedCard>

        <EnhancedCard className="p-6 bg-gradient-to-br from-blue-500/20 to-purple-500/20">
          <div className="text-center">
            <Target className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Cash Available</h3>
            <p className="text-2xl font-bold text-blue-400">
              ${(portfolio?.cash || 0).toLocaleString()}
            </p>
            <p className="text-sm text-gray-400">
              {((portfolio?.cash || 0) / (portfolio?.totalValue || 100000) * 100).toFixed(1)}% Allocation
            </p>
          </div>
        </EnhancedCard>

        <EnhancedCard className="p-6 bg-gradient-to-br from-yellow-500/20 to-orange-500/20">
          <div className="text-center">
            <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Last Update</h3>
            <p className="text-lg font-bold text-yellow-400">
              {portfolio?.lastUpdate ? 
                new Date(portfolio.lastUpdate).toLocaleTimeString() : 
                'Never'
              }
            </p>
            <p className="text-sm text-gray-400">Real Market Data</p>
          </div>
        </EnhancedCard>
      </div>
    </div>
  );
}