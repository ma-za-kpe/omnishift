'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, TrendingUp, TrendingDown, Zap, Target, Brain, 
  Activity, DollarSign, AlertTriangle, Trophy, Clock,
  Eye, Shield, Ship, BarChart3, Lightbulb, Users
} from 'lucide-react';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { TensionGauge } from '@/components/ui/tension-gauge';
import { VesselTracker } from '@/components/ui/vessel-tracker';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { aiVirtualTrader } from '@/lib/aiVirtualTrader';
import { cn } from '@/lib/utils';

// New Components for the Spectacle
import { MissionControl } from '@/components/spectacle/mission-control';
import { AIMindReader } from '@/components/spectacle/ai-mind-reader';
import { StrategyArena } from '@/components/spectacle/strategy-arena';
import { RiskTheater } from '@/components/spectacle/risk-theater';
import { LearningLab } from '@/components/spectacle/learning-lab';
import { MarketIntelligence } from '@/components/spectacle/market-intelligence';
import { PerformanceStadium } from '@/components/spectacle/performance-stadium';
import { LiveTradeFeed } from '@/components/spectacle/live-trade-feed';
import { SpectatorStats } from '@/components/spectacle/spectator-stats';

export default function AITradingSpectacle() {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('mission-control');
  const spectatorCount = 0; // Real spectator count would come from analytics
  const [tradingStatus, setTradingStatus] = useState('ACTIVE');

  useEffect(() => {
    loadAITraderData();
    
    // Auto-refresh AI data every 30 seconds
    const dataInterval = setInterval(loadAITraderData, 30000);

    return () => {
      clearInterval(dataInterval);
    };
  }, []);

  const loadAITraderData = async () => {
    try {
      setLoading(true);
      const portfolioData = aiVirtualTrader.getPortfolio();
      setPortfolio(portfolioData);
      setTradingStatus(portfolioData.tradingActive ? 'ACTIVE' : 'PAUSED');
    } catch (error) {
      console.error('Failed to load AI trader data:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeTradingCycle = async () => {
    try {
      setLoading(true);
      console.log('🚀 Manually triggering AI trading cycle...');
      const result = await aiVirtualTrader.executeTradingCycle();
      console.log('✅ Trading cycle completed:', result);
      
      // Reload data to show updates
      await loadAITraderData();
      
      // Show notification
      console.log(`🎯 Executed ${result.tradesExecuted} trades, Portfolio: $${result.portfolioValue.toLocaleString()}`);
    } catch (error) {
      console.error('❌ Failed to execute trading cycle:', error);
    } finally {
      setLoading(false);
    }
  };

  const spectacleSections = [
    { id: 'mission-control', label: 'Mission Control', icon: Bot, color: 'from-blue-600 to-cyan-600' },
    { id: 'ai-mind', label: 'AI Mind', icon: Brain, color: 'from-purple-600 to-pink-600' },
    { id: 'strategy-arena', label: 'Strategy Arena', icon: Target, color: 'from-orange-600 to-red-600' },
    { id: 'risk-theater', label: 'Risk Theater', icon: Shield, color: 'from-green-600 to-teal-600' },
    { id: 'learning-lab', label: 'Learning Lab', icon: Lightbulb, color: 'from-yellow-600 to-orange-600' },
    { id: 'market-intel', label: 'Market Intel', icon: Activity, color: 'from-indigo-600 to-purple-600' },
    { id: 'performance', label: 'Performance', icon: Trophy, color: 'from-pink-600 to-rose-600' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-6"
          />
          <h2 className="text-2xl font-bold text-white mb-2">Initializing AI Trader</h2>
          <p className="text-cyan-400">Connecting to market intelligence...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header with Live Status */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="bg-black/20 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Brand & Status */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl">
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">AI Virtual Trader</h1>
                  <p className="text-cyan-400 text-sm">Live Trading Spectacle</p>
                </div>
              </div>
              
              {/* Trading Status Indicator */}
              <div className="flex items-center space-x-2">
                <div className={cn(
                  "w-3 h-3 rounded-full animate-pulse",
                  tradingStatus === 'ACTIVE' ? 'bg-green-400' : 'bg-red-400'
                )}>
                </div>
                <span className={cn(
                  "text-sm font-medium",
                  tradingStatus === 'ACTIVE' ? 'text-green-400' : 'text-red-400'
                )}>
                  {tradingStatus}
                </span>
              </div>
            </div>

            {/* Center: Portfolio Value */}
            <div className="text-center">
              <p className="text-sm text-gray-400">Portfolio Value</p>
              <p className="text-3xl font-bold text-white">
                ${portfolio?.totalValue?.toLocaleString() || '100,000'}
              </p>
              <p className={cn(
                "text-sm font-medium",
                (portfolio?.totalReturnPercent || 0) >= 0 ? 'text-green-400' : 'text-red-400'
              )}>
                {(portfolio?.totalReturnPercent || 0) >= 0 ? '+' : ''}
                {(portfolio?.totalReturnPercent || 0).toFixed(2)}% 
                (${(portfolio?.totalReturn || 0).toLocaleString()})
              </p>
            </div>

            {/* Right: Force Trading, Spectator Count & Theme */}
            <div className="flex items-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={executeTradingCycle}
                disabled={loading}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
              >
                <Zap className="w-4 h-4" />
                <span>{loading ? 'Trading...' : 'Force Trade'}</span>
              </motion.button>
              <SpectatorStats count={spectatorCount} />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </motion.header>

      {/* Navigation Tabs */}
      <div className="container mx-auto px-6 py-4">
        <div className="flex flex-wrap gap-3">
          {spectacleSections.map((section, index) => (
            <motion.button
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-200",
                activeSection === section.id
                  ? `bg-gradient-to-r ${section.color} text-white shadow-lg`
                  : "bg-white/10 text-gray-300 hover:bg-white/20"
              )}
            >
              <section.icon className="w-4 h-4" />
              <span>{section.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeSection === 'mission-control' && <MissionControl portfolio={portfolio} />}
            {activeSection === 'ai-mind' && <AIMindReader portfolio={portfolio} />}
            {activeSection === 'strategy-arena' && <StrategyArena portfolio={portfolio} />}
            {activeSection === 'risk-theater' && <RiskTheater portfolio={portfolio} />}
            {activeSection === 'learning-lab' && <LearningLab portfolio={portfolio} />}
            {activeSection === 'market-intel' && <MarketIntelligence />}
            {activeSection === 'performance' && <PerformanceStadium portfolio={portfolio} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Live Trade Feed - Always Visible */}
      <LiveTradeFeed portfolio={portfolio} />
    </div>
  );
}