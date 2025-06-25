'use client';

import { motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationStatusProps {
  overallValid: boolean;
  avgConfidence: number;
  sourcesUsed: string[];
  lastUpdated: string;
  className?: string;
}

export function ValidationStatus({
  overallValid,
  avgConfidence,
  sourcesUsed,
  lastUpdated,
  className
}: ValidationStatusProps) {
  const getStatusIcon = () => {
    if (overallValid && avgConfidence >= 80) return CheckCircle;
    if (overallValid && avgConfidence >= 60) return AlertCircle;
    return XCircle;
  };

  const getStatusColor = () => {
    if (overallValid && avgConfidence >= 80) return 'text-green-400';
    if (overallValid && avgConfidence >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const StatusIcon = getStatusIcon();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "bg-white/5 backdrop-blur-sm rounded-lg p-3 border",
        overallValid ? "border-green-500/30" : "border-red-500/30",
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <StatusIcon className={cn("w-4 h-4", getStatusColor())} />
          <span className={cn("text-sm font-medium", getStatusColor())}>
            {overallValid ? 'Data Validated' : 'Validation Issues'}
          </span>
        </div>
        <span className={cn("text-xs font-medium", getStatusColor())}>
          {avgConfidence.toFixed(1)}%
        </span>
      </div>
      
      <div className="text-xs text-gray-400 space-y-1">
        <div className="flex items-center space-x-2">
          <span>Sources:</span>
          <div className="flex flex-wrap gap-1">
            {sourcesUsed.map((source) => (
              <span
                key={source}
                className="px-1 py-0.5 bg-white/10 rounded text-xs"
              >
                {source}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Clock className="w-3 h-3" />
          <span>Updated: {new Date(lastUpdated).toLocaleTimeString()}</span>
        </div>
      </div>
    </motion.div>
  );
}