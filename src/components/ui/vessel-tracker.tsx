'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Ship, Anchor, AlertTriangle, Activity } from 'lucide-react';
import { EnhancedCard } from './enhanced-card';
import { cn } from '@/lib/utils';

interface VesselTraffic {
  region: string;
  totalVessels: number;
  congestionLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  commercialVessels: number;
  militaryVessels: number;
  cargoVessels: number;
  tankerVessels: number;
  timestamp: string;
}

interface MaritimeEvent {
  id: string;
  type: 'CONGESTION' | 'MILITARY_MOVEMENT' | 'BLOCKADE' | 'INCIDENT' | 'ROUTE_CHANGE';
  region: string;
  description: string;
  impactScore: number;
  timestamp: string;
  vesselsAffected: number;
  economicImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export function VesselTracker() {
  const [trafficData, setTrafficData] = useState<VesselTraffic[]>([]);
  const [events, setEvents] = useState<MaritimeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState('strait_of_hormuz');

  const strategicRegions = [
    { id: 'strait_of_hormuz', name: 'Strait of Hormuz', importance: 'CRITICAL' },
    { id: 'suez_canal', name: 'Suez Canal', importance: 'HIGH' },
    { id: 'gibraltar', name: 'Gibraltar', importance: 'MEDIUM' },
    { id: 'malacca', name: 'Malacca Strait', importance: 'HIGH' }
  ];

  useEffect(() => {
    loadVesselData();
    const interval = setInterval(loadVesselData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadVesselData = async () => {
    try {
      // Load traffic data for all strategic regions
      const trafficPromises = strategicRegions.map(async (region) => {
        const response = await fetch(`/api/vessels?action=traffic&region=${region.id}`);
        const data = await response.json();
        return data.success ? data.data : null;
      });

      const trafficResults = await Promise.all(trafficPromises);
      const validTraffic = trafficResults.filter(Boolean);
      setTrafficData(validTraffic);

      // Load maritime events
      const eventsResponse = await fetch('/api/vessels?action=events');
      const eventsData = await eventsResponse.json();
      if (eventsData.success) {
        setEvents(eventsData.data);
      }

    } catch (error) {
      console.error('Failed to load vessel data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCongestionColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'text-red-600 dark:text-red-400';
      case 'HIGH': return 'text-orange-600 dark:text-orange-400';
      case 'MEDIUM': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-green-600 dark:text-green-400';
    }
  };

  const getCongestionBg = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-100 dark:bg-red-900/30';
      case 'HIGH': return 'bg-orange-100 dark:bg-orange-900/30';
      case 'MEDIUM': return 'bg-yellow-100 dark:bg-yellow-900/30';
      default: return 'bg-green-100 dark:bg-green-900/30';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'CONGESTION': return <Ship className="w-4 h-4" />;
      case 'MILITARY_MOVEMENT': return <AlertTriangle className="w-4 h-4" />;
      case 'BLOCKADE': return <Anchor className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <EnhancedCard className="p-6">
        <div className="flex items-center justify-center h-48">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"
          />
        </div>
      </EnhancedCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Maritime Intelligence
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Vessel tracking & shipping route analysis
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            OpenSeaMap
          </span>
        </div>
      </div>

      {/* Strategic Regions Overview */}
      <EnhancedCard glassmorphism className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Strategic Waterways
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trafficData.map((traffic, index) => (
            <motion.div
              key={traffic.region}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                'p-4 rounded-lg border-2 transition-all cursor-pointer',
                selectedRegion === traffic.region
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              )}
              onClick={() => setSelectedRegion(traffic.region)}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {strategicRegions.find(r => r.id === traffic.region)?.name || traffic.region}
                </h4>
                <span className={cn(
                  'px-2 py-1 rounded-full text-xs font-medium',
                  getCongestionBg(traffic.congestionLevel),
                  getCongestionColor(traffic.congestionLevel)
                )}>
                  {traffic.congestionLevel}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center space-x-2">
                  <Ship className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600 dark:text-gray-400">Total:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {traffic.totalVessels}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span className="text-gray-600 dark:text-gray-400">Military:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {traffic.militaryVessels}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span className="text-gray-600 dark:text-gray-400">Cargo:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {traffic.cargoVessels}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Anchor className="w-4 h-4 text-green-500" />
                  <span className="text-gray-600 dark:text-gray-400">Tankers:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {traffic.tankerVessels}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </EnhancedCard>

      {/* Maritime Events */}
      {events.length > 0 && (
        <EnhancedCard glassmorphism className="overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Maritime Events & Alerts
            </h3>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {events.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 border-b border-gray-100 dark:border-gray-800 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className={cn(
                      'p-2 rounded-full',
                      event.economicImpact === 'CRITICAL' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                      event.economicImpact === 'HIGH' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                      event.economicImpact === 'MEDIUM' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' :
                      'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    )}>
                      {getEventIcon(event.type)}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {event.description}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {strategicRegions.find(r => r.id === event.region)?.name || event.region} • {event.vesselsAffected} vessels affected
                      </p>
                      <div className="flex items-center mt-2 space-x-3">
                        <span className={cn(
                          'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                          event.economicImpact === 'CRITICAL' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                          event.economicImpact === 'HIGH' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' :
                          event.economicImpact === 'MEDIUM' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                          'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                        )}>
                          {event.economicImpact} Impact
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Score: {(event.impactScore * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </EnhancedCard>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <EnhancedCard glassmorphism className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Ship className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Vessels</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {trafficData.reduce((sum, t) => sum + t.totalVessels, 0)}
              </p>
            </div>
          </div>
        </EnhancedCard>

        <EnhancedCard glassmorphism className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Events</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {events.length}
              </p>
            </div>
          </div>
        </EnhancedCard>

        <EnhancedCard glassmorphism className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <Activity className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">High Risk Zones</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {trafficData.filter(t => t.congestionLevel === 'HIGH' || t.congestionLevel === 'CRITICAL').length}
              </p>
            </div>
          </div>
        </EnhancedCard>
      </div>
    </div>
  );
}