'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Ship, Brain, Activity, Trophy, Target, TrendingUp, TrendingDown } from 'lucide-react';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { cn } from '@/lib/utils';

interface StrategyArenaProps {
  portfolio: any;
}

interface StrategyBattle {
  id: string;
  name: string;
  icon: any;
  winRate: number;
  totalTrades: number;
  avgReturn: number;
  currentStreak: number;
  isWinning: boolean;
  color: string;
}

// Helper functions for strategy analysis
const getStrategyIcon = (strategyName: string) => {
  const name = strategyName.toLowerCase();
  if (name.includes('defense') || name.includes('military')) return Shield;
  if (name.includes('maritime') || name.includes('vessel')) return Ship;
  if (name.includes('sentiment') || name.includes('ai')) return Brain;
  if (name.includes('technical') || name.includes('analysis')) return Activity;
  return Target;
};

const getStrategyColor = (strategyName: string) => {
  const name = strategyName.toLowerCase();
  if (name.includes('defense')) return 'green';
  if (name.includes('maritime')) return 'blue';
  if (name.includes('sentiment')) return 'purple';
  if (name.includes('technical')) return 'orange';
  return 'gray';
};

const calculateCurrentStreak = (performance: any) => {
  // This would need actual trade sequence data to calculate properly
  // For now, return 0 until we have real trade data
  return 0;
};

export function StrategyArena({ portfolio }: StrategyArenaProps) {
  const [strategies, setStrategies] = useState<StrategyBattle[]>([]);
  const [champion, setChampion] = useState<StrategyBattle | null>(null);

  useEffect(() => {
    // Calculate real strategy performance from portfolio data
    if (portfolio?.strategyPerformance) {
      const strategyData: StrategyBattle[] = Object.entries(portfolio.strategyPerformance).map(([name, perf]: [string, any]) => ({
        id: name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        name: name.replace(/_/g, ' '),
        icon: getStrategyIcon(name),
        winRate: Math.round(perf.winRate || 0),
        totalTrades: perf.totalTrades || 0,
        avgReturn: perf.avgReturn || 0,
        currentStreak: calculateCurrentStreak(perf),
        isWinning: (perf.avgReturn || 0) > 0,
        color: getStrategyColor(name)
      }));

      setStrategies(strategyData);
      if (strategyData.length > 0) {
        setChampion(strategyData.reduce((best, current) => 
          current.winRate > best.winRate ? current : best
        ));
      }
    }
  }, [portfolio]);

  return (
    <div className="space-y-6">
      {/* Arena Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-4xl font-bold text-white mb-2">Strategy Arena</h2>
        <p className="text-orange-400">Watch AI strategies compete for trading supremacy</p>
      </motion.div>

      {/* Current Champion */}
      {champion && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <EnhancedCard className="p-6 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
            <div className="text-center">
              <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Current Champion</h3>
              <div className="flex items-center justify-center space-x-3 mb-4">
                <champion.icon className={`w-8 h-8 text-${champion.color}-400`} />
                <span className="text-xl font-bold text-white">{champion.name}</span>
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-400">Win Rate</p>
                  <p className="text-2xl font-bold text-yellow-400">{champion.winRate}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Avg Return</p>
                  <p className="text-2xl font-bold text-yellow-400">{champion.avgReturn}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Win Streak</p>
                  <p className="text-2xl font-bold text-yellow-400">{champion.currentStreak}</p>
                </div>
              </div>
            </div>
          </EnhancedCard>
        </motion.div>
      )}

      {/* Strategy Battle Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {strategies.map((strategy, index) => (
          <motion.div
            key={strategy.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
          >
            <EnhancedCard className={cn(
              "p-6 transition-all duration-300 hover:scale-105",
              strategy.id === champion?.id 
                ? "bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30"
                : `bg-gradient-to-br from-${strategy.color}-500/20 to-${strategy.color}-600/20 border-${strategy.color}-500/30`
            )}>
              {/* Strategy Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <strategy.icon className={cn("w-8 h-8", `text-${strategy.color}-400`)} />
                  <div>
                    <h3 className="text-lg font-bold text-white">{strategy.name}</h3>
                    <p className="text-sm text-gray-400">{strategy.totalTrades} trades</p>
                  </div>
                </div>
                {strategy.id === champion?.id && (
                  <Trophy className="w-6 h-6 text-yellow-400" />
                )}
              </div>

              {/* Performance Metrics */}
              <div className="space-y-4">
                {/* Win Rate Progress */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Win Rate</span>
                    <span className="text-white font-medium">{strategy.winRate}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${strategy.winRate}%` }}
                      transition={{ duration: 1, delay: 0.3 + index * 0.1 }}
                      className={cn(
                        "h-3 rounded-full",
                        strategy.winRate >= 70 ? 'bg-green-400' :
                        strategy.winRate >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                      )}
                    />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-white/5 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Avg Return</p>
                    <p className={cn(
                      "text-lg font-bold",
                      strategy.avgReturn >= 0 ? 'text-green-400' : 'text-red-400'
                    )}>
                      {strategy.avgReturn >= 0 ? '+' : ''}{strategy.avgReturn}%
                    </p>
                  </div>
                  <div className="text-center p-3 bg-white/5 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Current Streak</p>
                    <div className="flex items-center justify-center space-x-1">
                      {strategy.currentStreak > 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      )}
                      <span className={cn(
                        "text-lg font-bold",
                        strategy.currentStreak > 0 ? 'text-green-400' : 'text-red-400'
                      )}>
                        {Math.abs(strategy.currentStreak)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Battle Status */}
                <div className={cn(
                  "text-center py-2 px-4 rounded-lg font-medium",
                  strategy.isWinning 
                    ? "bg-green-400/20 text-green-400" 
                    : "bg-red-400/20 text-red-400"
                )}>
                  {strategy.isWinning ? "🔥 On Fire" : "❄️ Cooling Down"}
                </div>
              </div>
            </EnhancedCard>
          </motion.div>
        ))}
      </div>

      {/* Strategy Matchups */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <EnhancedCard className="p-6">
          <h3 className="text-xl font-bold text-white mb-6">Recent Strategy Battles</h3>
          <div className="space-y-4">
            {[
              { winner: 'Sentiment Analysis', loser: 'Technical Analysis', winBy: '2.3%', trade: 'LMT Buy' },
              { winner: 'Defense Analysis', loser: 'Maritime Intelligence', winBy: '1.8%', trade: 'NOC Sell' },
              { winner: 'Maritime Intelligence', loser: 'Defense Analysis', winBy: '4.1%', trade: 'XOM Buy' }
            ].map((battle, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                className="flex items-center justify-between p-4 bg-white/5 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-400">{battle.winner}</p>
                    <p className="text-xs text-gray-400">vs</p>
                    <p className="text-sm font-medium text-red-400">{battle.loser}</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-white font-medium">{battle.trade}</p>
                  <p className="text-xs text-gray-400">Trade Signal</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-400">+{battle.winBy}</p>
                  <p className="text-xs text-gray-400">Advantage</p>
                </div>
              </motion.div>
            ))}
          </div>
        </EnhancedCard>
      </motion.div>
    </div>
  );
}