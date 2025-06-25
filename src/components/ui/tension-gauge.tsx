'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Globe, Shield, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { smartDataManager } from '@/lib/smartDataManager';

interface TensionEvent {
  id: string;
  region: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  time: string;
  impact: string[];
}

interface TensionGaugeProps {
  className?: string;
}

export function TensionGauge({ className }: TensionGaugeProps) {
  const [mounted, setMounted] = useState(false);
  const [globalTension, setGlobalTension] = useState(0);
  const [previousTension, setPreviousTension] = useState(0);
  const [regions, setRegions] = useState([
    { name: 'Middle East', tension: 0, change: 0 },
    { name: 'Eastern Europe', tension: 0, change: 0 },
    { name: 'Asia Pacific', tension: 0, change: 0 },
    { name: 'North America', tension: 0, change: 0 },
  ]);
  const [recentEvents, setRecentEvents] = useState<TensionEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    loadGeopoliticalData();
  }, []);

  // Load real geopolitical data
  const loadGeopoliticalData = async () => {
    try {
      setLoading(true);

      // Get geopolitical events from multiple regions
      const regions = ['middle_east', 'europe', 'asia', 'americas'];
      const regionData = await Promise.all(
        regions.map(async (region) => {
          try {
            const events = await smartDataManager.getGeopoliticalData(region);
            return { region, events };
          } catch (error) {
            console.error(`Failed to load data for ${region}:`, error);
            return { region, events: [] };
          }
        })
      );

      // Calculate tension levels based on real events
      const calculatedRegions = regionData.map(({ region, events }) => {
        const avgTension = events.length > 0 
          ? events.reduce((sum: number, event: any) => sum + (event.impactScore * 100), 0) / events.length
          : 20; // Base tension level when no events
        
        return {
          name: formatRegionName(region),
          tension: Math.round(avgTension),
          change: 0 // No change simulation - will be calculated from historical data
        };
      });

      setRegions(calculatedRegions);

      // Calculate global tension as weighted average
      const globalAvg = calculatedRegions.reduce((sum, r) => sum + r.tension, 0) / calculatedRegions.length;
      setPreviousTension(globalTension);
      setGlobalTension(Math.round(globalAvg));

      // Convert geopolitical events to tension events
      const allEvents = regionData.flatMap(({ region, events }) => 
        events.slice(0, 2).map((event: any) => ({
          id: event.id,
          region: formatRegionName(region),
          severity: event.tensionLevel,
          title: event.title,
          time: getRelativeTime(event.timestamp),
          impact: [event.eventType, 'Defense']
        }))
      );

      setRecentEvents(allEvents.slice(0, 6)); // Show latest 6 events
      setLoading(false);

    } catch (error) {
      console.error('Failed to load geopolitical data:', error);
      setLoading(false);
      
      // Keep previous data if available, otherwise use minimal base levels
      if (globalTension === 0) {
        setGlobalTension(25); // Minimal baseline tension
      }
      if (regions.length === 0 || regions.every(r => r.tension === 0)) {
        setRegions([
          { name: 'Middle East', tension: 30, change: 0 },
          { name: 'Europe', tension: 25, change: 0 },
          { name: 'Asia Pacific', tension: 20, change: 0 },
          { name: 'Americas', tension: 15, change: 0 },
        ]);
      }
    }
  };

  // Real-time updates every 5 minutes
  useEffect(() => {
    if (!mounted) return;
    
    const interval = setInterval(() => {
      loadGeopoliticalData();
    }, 300000); // Update every 5 minutes

    return () => clearInterval(interval);
  }, [mounted]);

  const formatRegionName = (region: string) => {
    const names: Record<string, string> = {
      'middle_east': 'Middle East',
      'europe': 'Europe',
      'asia': 'Asia Pacific',
      'americas': 'Americas'
    };
    return names[region] || region;
  };

  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const eventTime = new Date(timestamp);
    const diffMinutes = Math.floor((now.getTime() - eventTime.getTime()) / (1000 * 60));
    
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`;
    return `${Math.floor(diffMinutes / 1440)} days ago`;
  };

  const getTensionColor = (tension: number) => {
    if (tension < 30) return 'text-green-500';
    if (tension < 50) return 'text-yellow-500';
    if (tension < 75) return 'text-orange-500';
    return 'text-red-500';
  };

  const getTensionBg = (tension: number) => {
    if (tension < 30) return 'from-green-500';
    if (tension < 50) return 'from-yellow-500';
    if (tension < 75) return 'from-orange-500';
    return 'from-red-500';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Zap className="w-4 h-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'medium':
        return <Shield className="w-4 h-4 text-yellow-500" />;
      default:
        return <Globe className="w-4 h-4 text-blue-500" />;
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-700';
      case 'high':
        return 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700';
      default:
        return 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700';
    }
  };

  return (
    <div className={cn('bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6', className)}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Global Tension Monitor
        </h3>
        <div className="flex items-center space-x-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            loading ? "bg-yellow-500 animate-pulse" : "bg-green-500 animate-pulse"
          )}></div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {loading ? 'Loading...' : 'News Intel'}
          </span>
        </div>
      </div>

      {/* Main Gauge */}
      <div className="flex items-center justify-center mb-8">
        <div className="relative w-48 h-48">
          <svg
            className="w-full h-full transform -rotate-90"
            viewBox="0 0 100 100"
          >
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-gray-200 dark:text-gray-700"
            />
            
            {/* Tension arc */}
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - globalTension / 100)}`}
              className={cn(
                'transition-colors duration-500',
                getTensionColor(globalTension)
              )}
              initial={{ strokeDashoffset: `${2 * Math.PI * 45}` }}
              animate={{ strokeDashoffset: `${2 * Math.PI * 45 * (1 - globalTension / 100)}` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </svg>
          
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              key={globalTension}
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className={cn(
                'text-3xl font-bold',
                getTensionColor(globalTension)
              )}
            >
              {Math.round(globalTension)}
            </motion.span>
            <span className="text-sm text-gray-500 dark:text-gray-400">Global Tension</span>
            
            {/* Change indicator */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={cn(
                'mt-1 flex items-center text-xs font-medium',
                globalTension > previousTension ? 'text-red-500' : 'text-green-500'
              )}
            >
              <span>
                {globalTension > previousTension ? '↑' : '↓'} 
                {Math.abs(globalTension - previousTension).toFixed(1)}
              </span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Regional Breakdown */}
      <div className="space-y-4 mb-6">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white">Regional Breakdown</h4>
        <div className="grid grid-cols-2 gap-3">
          {regions.map((region, index) => (
            <motion.div
              key={region.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {region.name}
                </p>
                <div className="flex items-center space-x-2">
                  <span className={cn('text-lg font-bold', getTensionColor(region.tension))}>
                    {region.tension}
                  </span>
                  <span className={cn(
                    'text-xs font-medium',
                    region.change > 0 ? 'text-red-500' : 'text-green-500'
                  )}>
                    {region.change > 0 ? '+' : ''}{region.change}
                  </span>
                </div>
              </div>
              <div className="w-12 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className={cn('h-full bg-gradient-to-r to-transparent', getTensionBg(region.tension))}
                  initial={{ width: 0 }}
                  animate={{ width: `${region.tension}%` }}
                  transition={{ duration: 1, delay: index * 0.1 }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent Events */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white">Recent Events</h4>
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full"
              />
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                Loading geopolitical events...
              </span>
            </div>
          ) : recentEvents.length > 0 ? (
            recentEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                'flex items-start space-x-3 p-3 rounded-lg border',
                getSeverityBg(event.severity)
              )}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getSeverityIcon(event.severity)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {event.title}
                  </p>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {event.time}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {event.region}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {event.impact.map((sector) => (
                    <span
                      key={sector}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    >
                      {sector}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              No recent geopolitical events
            </div>
          )}
        </div>
      </div>
    </div>
  );
}