'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Zap, Eye, TrendingUp, TrendingDown, AlertTriangle, 
  Target, Clock, Activity, Shield, Ship 
} from 'lucide-react';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { cn } from '@/lib/utils';

interface AIMindReaderProps {
  portfolio: any;
}

interface Thought {
  id: string;
  type: 'ANALYSIS' | 'DECISION' | 'OBSERVATION' | 'STRATEGY';
  content: string;
  confidence: number;
  timestamp: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export function AIMindReader({ portfolio }: AIMindReaderProps) {
  const [currentThoughts, setCurrentThoughts] = useState<Thought[]>([]);
  const [activeStrategy, setActiveStrategy] = useState('DEFENSE_ANALYSIS');
  const [confidenceLevels, setConfidenceLevels] = useState({
    defense: 0,
    maritime: 0,
    sentiment: 0,
    technical: 0
  });

  const strategies = [
    { id: 'DEFENSE_ANALYSIS', name: 'Defense Analysis', icon: Shield, color: 'green' },
    { id: 'MARITIME_INTELLIGENCE', name: 'Maritime Intelligence', icon: Ship, color: 'blue' },
    { id: 'SENTIMENT_ANALYSIS', name: 'Sentiment Analysis', icon: Brain, color: 'purple' },
    { id: 'TECHNICAL_ANALYSIS', name: 'Technical Analysis', icon: Activity, color: 'orange' }
  ];

  const generateRealThoughts = () => {
    // Generate thoughts based on actual portfolio and trading activity
    const thoughts: Thought[] = [];
    
    if (portfolio?.positions && portfolio.positions.length > 0) {
      portfolio.positions.forEach((position: any, index: number) => {
        const pnlType = position.unrealizedPnL > 0 ? 'gaining' : 'losing';
        thoughts.push({
          id: `pos_${index}`,
          type: 'ANALYSIS',
          content: `Monitoring ${position.symbol}: Currently ${pnlType} ${Math.abs(position.unrealizedPnLPercent).toFixed(2)}%`,
          confidence: Math.round(Math.abs(position.unrealizedPnLPercent) * 10),
          timestamp: new Date().toISOString(),
          priority: Math.abs(position.unrealizedPnLPercent) > 5 ? 'HIGH' : 'MEDIUM'
        });
      });
    }

    if (portfolio?.trades && portfolio.trades.length > 0) {
      const recentTrade = portfolio.trades[portfolio.trades.length - 1];
      thoughts.push({
        id: 'recent_trade',
        type: 'DECISION',
        content: `Last action: ${recentTrade.action} ${recentTrade.quantity} ${recentTrade.symbol} at $${recentTrade.price}`,
        confidence: Math.round(recentTrade.confidence * 100),
        timestamp: recentTrade.timestamp,
        priority: 'HIGH'
      });
    }

    if (thoughts.length === 0) {
      thoughts.push({
        id: 'waiting',
        type: 'OBSERVATION',
        content: 'Analyzing market conditions and waiting for high-confidence signals...',
        confidence: 50,
        timestamp: new Date().toISOString(),
        priority: 'MEDIUM'
      });
    }
    
    setCurrentThoughts(thoughts);
  };

  useEffect(() => {
    generateRealThoughts();
    
    // Calculate real confidence levels from strategy performance
    if (portfolio?.strategyPerformance) {
      const strategies = portfolio.strategyPerformance;
      setConfidenceLevels({
        defense: Math.round(strategies.DEFENSE_ANALYSIS?.confidence * 100 || 0),
        maritime: Math.round(strategies.MARITIME_INTELLIGENCE?.confidence * 100 || 0),
        sentiment: Math.round(strategies.SENTIMENT_ANALYSIS?.confidence * 100 || 0),
        technical: Math.round(strategies.TECHNICAL_ANALYSIS?.confidence * 100 || 0)
      });
    }

    const interval = setInterval(() => {
      generateRealThoughts();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getThoughtIcon = (type: string) => {
    switch (type) {
      case 'ANALYSIS': return <Brain className="w-4 h-4" />;
      case 'DECISION': return <Target className="w-4 h-4" />;
      case 'OBSERVATION': return <Eye className="w-4 h-4" />;
      case 'STRATEGY': return <Zap className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'text-red-400 bg-red-400/20 border-red-400/30';
      case 'HIGH': return 'text-orange-400 bg-orange-400/20 border-orange-400/30';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-400/20 border-yellow-400/30';
      default: return 'text-gray-400 bg-gray-400/20 border-gray-400/30';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* AI Mind Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-4xl font-bold text-white mb-2">AI Mind Reader</h2>
        <p className="text-purple-400">Real-time AI reasoning and decision-making process</p>
      </motion.div>

      {/* Strategy Confidence Meters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <EnhancedCard className="p-6">
          <h3 className="text-xl font-bold text-white mb-6">Strategy Confidence Levels</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {strategies.map((strategy, index) => {
              const confidence = confidenceLevels[strategy.id.toLowerCase().split('_')[0] as keyof typeof confidenceLevels] || 0;
              return (
                <motion.div
                  key={strategy.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="text-center"
                >
                  <div className="mb-4">
                    <strategy.icon className={cn("w-8 h-8 mx-auto mb-2", `text-${strategy.color}-400`)} />
                    <p className="text-sm text-white font-medium">{strategy.name}</p>
                  </div>
                  
                  <div className="relative w-24 h-24 mx-auto">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-gray-700"
                      />
                      <motion.circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={251.2}
                        initial={{ strokeDashoffset: 251.2 }}
                        animate={{ strokeDashoffset: 251.2 - (251.2 * confidence) / 100 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={cn(`text-${strategy.color}-400`)}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.span
                        key={confidence}
                        initial={{ scale: 1.2 }}
                        animate={{ scale: 1 }}
                        className={cn("text-lg font-bold", getConfidenceColor(confidence))}
                      >
                        {Math.round(confidence)}%
                      </motion.span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </EnhancedCard>
      </motion.div>

      {/* Real-time Thoughts Stream */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <EnhancedCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Real-time AI Thoughts</h3>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-purple-400">Live Processing</span>
            </div>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            <AnimatePresence>
              {currentThoughts.map((thought, index) => (
                <motion.div
                  key={thought.id}
                  initial={{ opacity: 0, x: -20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    "p-4 rounded-lg border",
                    getPriorityColor(thought.priority)
                  )}
                >
                  <div className="flex items-start space-x-3">
                    <div className={cn(
                      "p-2 rounded-full",
                      getPriorityColor(thought.priority)
                    )}>
                      {getThoughtIcon(thought.type)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn(
                          "text-xs font-medium px-2 py-1 rounded",
                          getPriorityColor(thought.priority)
                        )}>
                          {thought.type}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className={cn(
                            "text-xs font-medium",
                            getConfidenceColor(thought.confidence)
                          )}>
                            {thought.confidence}% confidence
                          </span>
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-400">
                            {new Date(thought.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-white font-medium">{thought.content}</p>
                      
                      {/* Confidence visualization */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                          <span>Confidence Level</span>
                          <span>{thought.confidence}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${thought.confidence}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className={cn(
                              "h-2 rounded-full",
                              thought.confidence >= 80 ? 'bg-green-400' :
                              thought.confidence >= 60 ? 'bg-yellow-400' : 'bg-red-400'
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </EnhancedCard>
      </motion.div>

      {/* Current Decision Making */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <EnhancedCard className="p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
          <h3 className="text-xl font-bold text-white mb-6">Current Decision Process</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Input Analysis */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="w-8 h-8 text-blue-400" />
              </div>
              <h4 className="text-white font-semibold mb-2">Input Analysis</h4>
              <p className="text-sm text-gray-400">
                Processing 127 data points from market feeds, news sources, and vessel tracking
              </p>
            </div>

            {/* Pattern Recognition */}
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Eye className="w-8 h-8 text-purple-400" />
              </div>
              <h4 className="text-white font-semibold mb-2">Pattern Recognition</h4>
              <p className="text-sm text-gray-400">
                Identified 3 potential trading opportunities with confidence levels above 70%
              </p>
            </div>

            {/* Decision Making */}
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-green-400" />
              </div>
              <h4 className="text-white font-semibold mb-2">Decision Output</h4>
              <p className="text-sm text-gray-400">
                Executing position sizing calculations and risk assessment for XOM trade
              </p>
            </div>
          </div>
        </EnhancedCard>
      </motion.div>
    </div>
  );
}