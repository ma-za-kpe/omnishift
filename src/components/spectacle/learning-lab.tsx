'use client';

import { motion } from 'framer-motion';
import { Lightbulb, TrendingUp, Brain, Target } from 'lucide-react';
import { EnhancedCard } from '@/components/ui/enhanced-card';

interface LearningLabProps {
  portfolio: any;
}

export function LearningLab({ portfolio }: LearningLabProps) {
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <h2 className="text-4xl font-bold text-white mb-2">Learning Lab</h2>
        <p className="text-yellow-400">AI adaptation and evolution tracking</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <EnhancedCard className="p-6">
          <Lightbulb className="w-8 h-8 text-yellow-400 mb-4" />
          <h3 className="text-xl font-bold text-white mb-4">Recent Adaptations</h3>
          <div className="space-y-3">
            <p className="text-gray-300">• Reduced confidence threshold from 65% to 60%</p>
            <p className="text-gray-300">• Increased position sizing for defense sector</p>
            <p className="text-gray-300">• Added maritime intelligence weight factor</p>
          </div>
        </EnhancedCard>

        <EnhancedCard className="p-6">
          <Brain className="w-8 h-8 text-purple-400 mb-4" />
          <h3 className="text-xl font-bold text-white mb-4">Learning Metrics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">247</p>
              <p className="text-sm text-gray-400">Total Trades Learned</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">15</p>
              <p className="text-sm text-gray-400">Adaptations Made</p>
            </div>
          </div>
        </EnhancedCard>
      </div>
    </div>
  );
}