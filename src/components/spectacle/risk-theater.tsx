'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, Target, TrendingDown, DollarSign, Activity, Zap } from 'lucide-react';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { cn } from '@/lib/utils';
import { aiVirtualTrader } from '@/lib/aiVirtualTrader';

interface RiskTheaterProps {
  portfolio: any;
}

export function RiskTheater({ portfolio }: RiskTheaterProps) {
  const [riskStatus, setRiskStatus] = useState<any>(null);
  const [backtestResults, setBacktestResults] = useState<any>(null);
  const [isRunningBacktest, setIsRunningBacktest] = useState(false);

  useEffect(() => {
    loadRiskData();
    const interval = setInterval(loadRiskData, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadRiskData = async () => {
    try {
      const risk = aiVirtualTrader.getRiskStatus();
      setRiskStatus(risk);
    } catch (error) {
      console.error('Failed to load risk data:', error);
    }
  };

  const runBacktest = async () => {
    setIsRunningBacktest(true);
    try {
      const results = await aiVirtualTrader.runBacktest();
      setBacktestResults(results);
    } catch (error) {
      console.error('Backtest failed:', error);
    } finally {
      setIsRunningBacktest(false);
    }
  };

  const getRiskLevelColor = (score: number) => {
    if (score < 20) return 'text-green-400';
    if (score < 50) return 'text-yellow-400';
    if (score < 80) return 'text-orange-400';
    return 'text-red-400';
  };

  const getRiskLevelText = (score: number) => {
    if (score < 20) return 'LOW';
    if (score < 50) return 'MODERATE';
    if (score < 80) return 'HIGH';
    return 'CRITICAL';
  };

  const riskLevel = riskStatus ? getRiskLevelText(riskStatus.riskScore) : 'LOADING';
  const riskScore = riskStatus?.riskScore || 0;
  const currentDrawdown = riskStatus?.currentDrawdown || 0;
  const dailyPnL = riskStatus?.dailyPnL || 0;
  const tradingAllowed = riskStatus?.tradingAllowed ?? true;
  const alertCount = riskStatus?.alerts?.length || 0;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <h2 className="text-4xl font-bold text-white mb-2">Risk Theater</h2>
        <p className="text-green-400">Production-grade risk management in action</p>
        <div className="mt-4 flex justify-center space-x-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            tradingAllowed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {tradingAllowed ? '🟢 TRADING ACTIVE' : '🔴 TRADING HALTED'}
          </div>
          {alertCount > 0 && (
            <div className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-500/20 text-yellow-400">
              ⚠️ {alertCount} ALERTS
            </div>
          )}
        </div>
      </motion.div>

      {/* Risk Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <EnhancedCard className="p-6 bg-gradient-to-br from-red-500/20 to-orange-500/20">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Risk Score</h3>
            <p className={`text-3xl font-bold ${getRiskLevelColor(riskScore)}`}>
              {riskScore.toFixed(0)}/100
            </p>
            <p className={`text-sm mt-1 ${getRiskLevelColor(riskScore)}`}>
              {riskLevel}
            </p>
          </div>
        </EnhancedCard>

        <EnhancedCard className="p-6 bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
          <div className="text-center">
            <TrendingDown className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Current Drawdown</h3>
            <p className="text-3xl font-bold text-blue-400">
              {currentDrawdown.toFixed(2)}%
            </p>
          </div>
        </EnhancedCard>

        <EnhancedCard className="p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20">
          <div className="text-center">
            <DollarSign className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Daily P&L</h3>
            <p className={`text-3xl font-bold ${
              dailyPnL >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {dailyPnL >= 0 ? '+' : ''}{dailyPnL.toFixed(2)}%
            </p>
          </div>
        </EnhancedCard>

        <EnhancedCard className="p-6 bg-gradient-to-br from-green-500/20 to-teal-500/20">
          <div className="text-center">
            <Shield className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Circuit Breakers</h3>
            <p className="text-3xl font-bold text-green-400">
              {tradingAllowed ? 'ACTIVE' : 'TRIGGERED'}
            </p>
          </div>
        </EnhancedCard>
      </div>

      {/* Backtest Section */}
      <EnhancedCard className="p-6 bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">Strategy Backtesting</h3>
            <p className="text-gray-400">Test AI strategy against historical data</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={runBacktest}
            disabled={isRunningBacktest}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            {isRunningBacktest ? (
              <><Activity className="w-4 h-4 mr-2 animate-spin" />Running...</>
            ) : (
              <><Zap className="w-4 h-4 mr-2" />Run Backtest</>
            )}
          </motion.button>
        </div>

        {backtestResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="text-lg font-bold text-white mb-2">Total Return</h4>
              <p className={`text-2xl font-bold ${
                backtestResults.metrics?.totalReturnPercent >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {backtestResults.metrics?.totalReturnPercent?.toFixed(2) || 'N/A'}%
              </p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="text-lg font-bold text-white mb-2">Sharpe Ratio</h4>
              <p className="text-2xl font-bold text-cyan-400">
                {backtestResults.metrics?.sharpeRatio?.toFixed(2) || 'N/A'}
              </p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="text-lg font-bold text-white mb-2">Total Trades</h4>
              <p className="text-2xl font-bold text-yellow-400">
                {backtestResults.trades?.length || 0}
              </p>
            </div>
          </motion.div>
        )}
      </EnhancedCard>

      {/* Risk Alerts */}
      {riskStatus?.alerts && riskStatus.alerts.length > 0 && (
        <EnhancedCard className="p-6 bg-gradient-to-br from-yellow-500/20 to-red-500/20">
          <h3 className="text-2xl font-bold text-white mb-4 flex items-center">
            <AlertTriangle className="w-6 h-6 mr-2 text-yellow-400" />
            Risk Alerts
          </h3>
          <div className="space-y-3">
            {riskStatus.alerts.map((alert: any, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/10 rounded-lg p-4 border-l-4 border-yellow-400"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-yellow-400 font-medium">{alert.type}</p>
                    <p className="text-white text-sm">{alert.message}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-sm">{alert.severity}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </EnhancedCard>
      )}
    </div>
  );
}