'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Bot, DollarSign, Activity, Play, Pause, RotateCcw, Target } from 'lucide-react';
import { EnhancedCard } from './enhanced-card';
import { aiVirtualTrader } from '@/lib/aiVirtualTrader';
import { cn } from '@/lib/utils';

interface ChartDataPoint {
  date: string;
  aiPortfolio: number;
  marketIndex: number; // SPY benchmark
  timestamp: number;
}

export function VirtualTradingCharts() {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [tradingActive, setTradingActive] = useState(true);
  const [lastTradingCycle, setLastTradingCycle] = useState<any>(null);

  useEffect(() => {
    loadVirtualTradingData();
    
    // Start trading cycle every 2 minutes when active
    const interval = setInterval(() => {
      if (tradingActive) {
        executeTradingCycle();
      }
    }, 120000); // 2 minutes

    // Initial trading cycle
    if (tradingActive) {
      setTimeout(() => executeTradingCycle(), 5000); // Start after 5 seconds
    }

    return () => clearInterval(interval);
  }, [tradingActive]);

  const loadVirtualTradingData = async () => {
    try {
      setLoading(true);
      
      // Get current portfolio state
      const portfolioData = aiVirtualTrader.getPortfolio();
      setPortfolio(portfolioData);
      
      // Get recent trades
      const trades = aiVirtualTrader.getRecentTrades(10);
      setRecentTrades(trades);
      
      // Generate chart data
      generateChartData(portfolioData);
      
    } catch (error) {
      console.error('Failed to load virtual trading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeTradingCycle = async () => {
    try {
      console.log('🤖 Executing AI trading cycle...');
      const result = await aiVirtualTrader.executeTradingCycle();
      setLastTradingCycle(result);
      
      // Refresh data after trading
      setTimeout(() => loadVirtualTradingData(), 2000);
      
    } catch (error) {
      console.error('Trading cycle error:', error);
    }
  };

  const generateChartData = (portfolioData: any) => {
    const data: ChartDataPoint[] = [];
    const history = portfolioData.performanceHistory || [];
    
    // Generate benchmark data (simulate SPY performance)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      const dateStr = date.toISOString().split('T')[0];
      
      // Find corresponding portfolio data
      const portfolioPoint = history.find((h: any) => h.date.startsWith(dateStr));
      const portfolioValue = portfolioPoint ? portfolioPoint.value : 100000;
      
      // Simulate market benchmark (SPY-like performance with some volatility)
      const daysSinceStart = i;
      const marketTrend = 1 + (daysSinceStart * 0.001); // Slight upward trend
      const volatility = 1 + (Math.sin(daysSinceStart / 5) * 0.02); // ±2% volatility
      const marketValue = 100000 * marketTrend * volatility;
      
      data.push({
        date: dateStr,
        aiPortfolio: portfolioValue,
        marketIndex: marketValue,
        timestamp: date.getTime()
      });
    }
    
    setChartData(data);
  };

  const toggleTrading = async () => {
    const newState = !tradingActive;
    setTradingActive(newState);
    await aiVirtualTrader.setTradingActive(newState);
  };

  const resetPortfolio = async () => {
    try {
      await aiVirtualTrader.resetPortfolio();
      await loadVirtualTradingData();
    } catch (error) {
      console.error('Failed to reset portfolio:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <EnhancedCard className="p-6">
        <div className="flex items-center justify-center h-96">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"
          />
        </div>
      </EnhancedCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              AI Virtual Trader
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Simulated trading with $100K fake money
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTrading}
            className={cn(
              'px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors',
              tradingActive 
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
            )}
          >
            {tradingActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{tradingActive ? 'Pause Trading' : 'Start Trading'}</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={resetPortfolio}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium flex items-center space-x-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </motion.button>
        </div>
      </div>

      {/* Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <EnhancedCard glassmorphism className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Portfolio Value</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {portfolio ? formatCurrency(portfolio.totalValue) : '$100,000'}
              </p>
            </div>
          </div>
        </EnhancedCard>

        <EnhancedCard glassmorphism className="p-4">
          <div className="flex items-center space-x-3">
            <div className={cn(
              'p-2 rounded-lg',
              portfolio && portfolio.totalReturn >= 0 
                ? 'bg-green-100 dark:bg-green-900/30' 
                : 'bg-red-100 dark:bg-red-900/30'
            )}>
              {portfolio && portfolio.totalReturn >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Return</p>
              <p className={cn(
                'text-xl font-bold',
                portfolio && portfolio.totalReturn >= 0 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              )}>
                {portfolio ? formatPercent(portfolio.totalReturnPercent) : '0.00%'}
              </p>
            </div>
          </div>
        </EnhancedCard>

        <EnhancedCard glassmorphism className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Positions</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {portfolio ? portfolio.positions.length : 0}
              </p>
            </div>
          </div>
        </EnhancedCard>

        <EnhancedCard glassmorphism className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Target className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Trades</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {portfolio ? portfolio.trades.length : 0}
              </p>
            </div>
          </div>
        </EnhancedCard>
      </div>

      {/* Performance Chart */}
      <EnhancedCard glassmorphism className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            AI vs Market Performance
          </h3>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full"></div>
              <span className="text-gray-600 dark:text-gray-400">AI Portfolio</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span className="text-gray-600 dark:text-gray-400">Market Benchmark</span>
            </div>
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === 'aiPortfolio' ? 'AI Portfolio' : 'Market Benchmark'
                ]}
                labelFormatter={(date) => new Date(date).toLocaleDateString()}
              />
              <Line
                type="monotone"
                dataKey="aiPortfolio"
                stroke="url(#aiGradient)"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="marketIndex"
                stroke="#9ca3af"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 4 }}
              />
              <defs>
                <linearGradient id="aiGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#9333ea" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
              </defs>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </EnhancedCard>

      {/* Recent AI Trades */}
      {recentTrades.length > 0 && (
        <EnhancedCard glassmorphism className="overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent AI Trades
              </h3>
              {lastTradingCycle && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Last cycle: {lastTradingCycle.tradesExecuted} trades executed
                </div>
              )}
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {recentTrades.map((trade, index) => (
              <motion.div
                key={trade.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 border-b border-gray-100 dark:border-gray-800 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={cn(
                      'px-2 py-1 rounded-full text-xs font-medium',
                      trade.action === 'BUY' 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                    )}>
                      {trade.action}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {trade.quantity} {trade.symbol} @ ${trade.price.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {trade.triggerReason}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(trade.timestamp).toLocaleString()}
                    </p>
                    {trade.pnl !== undefined && (
                      <p className={cn(
                        'text-sm font-medium',
                        trade.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      )}>
                        {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)} ({trade.pnlPercent?.toFixed(1)}%)
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </EnhancedCard>
      )}

      {/* Trading Status */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          'px-4 py-3 rounded-lg border text-center',
          tradingActive 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
            : 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-300'
        )}
      >
        <div className="flex items-center justify-center space-x-2">
          <div className={cn(
            'w-2 h-2 rounded-full',
            tradingActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
          )}></div>
          <span className="text-sm font-medium">
            {tradingActive ? 'AI Trading Active - Next cycle in ~2 minutes' : 'AI Trading Paused - Click "Start Trading" to resume'}
          </span>
        </div>
      </motion.div>
    </div>
  );
}