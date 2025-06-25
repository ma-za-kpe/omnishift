'use client';

import { motion } from 'framer-motion';
import { Users, Eye } from 'lucide-react';

interface SpectatorStatsProps {
  count: number;
}

export function SpectatorStats({ count }: SpectatorStatsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2"
    >
      <Eye className="w-4 h-4 text-cyan-400" />
      <div className="text-center">
        <p className="text-xs text-gray-400">Live Spectators</p>
        <motion.p
          key={count}
          initial={{ scale: 1.2, color: '#00ffff' }}
          animate={{ scale: 1, color: '#ffffff' }}
          transition={{ duration: 0.3 }}
          className="text-sm font-bold text-white"
        >
          {count.toLocaleString()}
        </motion.p>
      </div>
    </motion.div>
  );
}