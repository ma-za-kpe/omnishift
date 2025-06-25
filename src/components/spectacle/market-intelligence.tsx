'use client';

import { motion } from 'framer-motion';
import { Activity, Ship, AlertTriangle } from 'lucide-react';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { VesselTracker } from '@/components/ui/vessel-tracker';
import { TensionGauge } from '@/components/ui/tension-gauge';

export function MarketIntelligence() {
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <h2 className="text-4xl font-bold text-white mb-2">Market Intelligence</h2>
        <p className="text-indigo-400">Live event correlation and market analysis</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TensionGauge />
        <EnhancedCard className="p-6">
          <Activity className="w-8 h-8 text-indigo-400 mb-4" />
          <h3 className="text-xl font-bold text-white mb-4">Market Events</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              <p className="text-gray-300">Suez Canal congestion detected</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <p className="text-gray-300">Defense budget increase rumors</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <p className="text-gray-300">Oil inventory decrease</p>
            </div>
          </div>
        </EnhancedCard>
      </div>

      <VesselTracker />
    </div>
  );
}