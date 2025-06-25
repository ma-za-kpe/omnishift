'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataSourceTooltipProps {
  title: string;
  description: string;
  dataSource: 'REAL_MARKET_DATA' | 'VALIDATED_MULTI_SOURCE' | 'AI_CALCULATION' | 'LIVE_API';
  sources?: string[];
  confidence?: number;
  lastUpdated?: string;
  isValidated?: boolean;
  className?: string;
}

export function DataSourceTooltip({
  title,
  description,
  dataSource,
  sources = [],
  confidence,
  lastUpdated,
  isValidated = true,
  className
}: DataSourceTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const getDataSourceInfo = () => {
    switch (dataSource) {
      case 'REAL_MARKET_DATA':
        return {
          label: 'Real Market Data',
          icon: CheckCircle,
          color: 'text-green-400',
          bgColor: 'bg-green-400/20 border-green-400/30'
        };
      case 'VALIDATED_MULTI_SOURCE':
        return {
          label: 'Cross-Validated',
          icon: CheckCircle,
          color: 'text-blue-400',
          bgColor: 'bg-blue-400/20 border-blue-400/30'
        };
      case 'AI_CALCULATION':
        return {
          label: 'AI Computed',
          icon: AlertCircle,
          color: 'text-purple-400',
          bgColor: 'bg-purple-400/20 border-purple-400/30'
        };
      case 'LIVE_API':
        return {
          label: 'Live API',
          icon: CheckCircle,
          color: 'text-cyan-400',
          bgColor: 'bg-cyan-400/20 border-cyan-400/30'
        };
      default:
        return {
          label: 'Unknown',
          icon: XCircle,
          color: 'text-red-400',
          bgColor: 'bg-red-400/20 border-red-400/30'
        };
    }
  };

  const sourceInfo = getDataSourceInfo();
  const IconComponent = sourceInfo.icon;

  return (
    <div className={cn("relative inline-block", className)}>
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="p-1 text-gray-400 hover:text-white transition-colors"
      >
        <Info className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 z-50"
          >
            <div className={cn(
              "p-4 rounded-lg border backdrop-blur-lg",
              sourceInfo.bgColor
            )}>
              {/* Header */}
              <div className="flex items-center space-x-2 mb-3">
                <IconComponent className={cn("w-5 h-5", sourceInfo.color)} />
                <div>
                  <h3 className="text-white font-semibold text-sm">{title}</h3>
                  <p className={cn("text-xs font-medium", sourceInfo.color)}>
                    {sourceInfo.label}
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-300 text-sm mb-3">{description}</p>

              {/* Data Sources */}
              {sources.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-400 mb-1">Data Sources:</p>
                  <div className="flex flex-wrap gap-1">
                    {sources.map((source) => (
                      <span
                        key={source}
                        className="px-2 py-1 bg-white/10 rounded text-xs text-gray-300"
                      >
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Validation Info */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {confidence !== undefined && (
                  <div>
                    <p className="text-gray-400">Confidence</p>
                    <p className={cn(
                      "font-medium",
                      confidence >= 90 ? 'text-green-400' :
                      confidence >= 70 ? 'text-yellow-400' : 'text-red-400'
                    )}>
                      {confidence.toFixed(1)}%
                    </p>
                  </div>
                )}
                
                {lastUpdated && (
                  <div>
                    <p className="text-gray-400">Last Updated</p>
                    <p className="text-gray-300 font-medium">
                      {new Date(lastUpdated).toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Validation Status */}
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="flex items-center space-x-2">
                  {isValidated ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className={cn(
                    "text-xs font-medium",
                    isValidated ? 'text-green-400' : 'text-red-400'
                  )}>
                    {isValidated ? 'Data Validated' : 'Validation Failed'}
                  </span>
                </div>
              </div>

              {/* Arrow pointer */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                <div className={cn(
                  "w-3 h-3 rotate-45 border-r border-b",
                  sourceInfo.bgColor
                )}></div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}