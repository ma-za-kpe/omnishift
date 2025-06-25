'use client';

import { useState, useEffect, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ChartOptions
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { motion } from 'framer-motion';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface RealTimeChartProps {
  symbol: string;
  period?: string;
  interval?: string;
  height?: number;
  className?: string;
}

interface MarketDataPoint {
  timestamp: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function RealTimeChart({ 
  symbol, 
  period = '1d', 
  interval = '5m', 
  height = 400,
  className = '' 
}: RealTimeChartProps) {
  const [data, setData] = useState<MarketDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [priceChangePercent, setPriceChangePercent] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchRealData();
    
    // Update every 30 seconds for real-time data
    if (interval === '5m' || interval === '1m') {
      intervalRef.current = setInterval(fetchRealData, 30000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [symbol, period, interval]);

  const fetchRealData = async () => {
    try {
      console.log(`📊 Fetching REAL market data for ${symbol}`);
      setError(null);
      
      const response = await fetch(`/api/historical-data?symbol=${symbol}&period=${period}&interval=${interval}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch real market data');
      }
      
      console.log(`✅ Received ${result.count} real data points for ${symbol}`);
      setData(result.data);
      
      // Calculate price change
      if (result.data.length > 1) {
        const current = result.data[result.data.length - 1].close;
        const previous = result.data[0].close;
        const change = current - previous;
        const changePercent = (change / previous) * 100;
        
        setLastPrice(current);
        setPriceChange(change);
        setPriceChangePercent(changePercent);
      }
      
    } catch (error) {
      console.error('❌ Real-time chart data fetch failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to load real market data');
    } finally {
      setLoading(false);
    }
  };

  const chartData = {
    labels: data.map(point => new Date(point.timestamp)),
    datasets: [
      {
        label: symbol,
        data: data.map(point => point.close),
        borderColor: priceChange >= 0 ? '#10B981' : '#EF4444',
        backgroundColor: priceChange >= 0 
          ? 'rgba(16, 185, 129, 0.1)' 
          : 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointBackgroundColor: priceChange >= 0 ? '#10B981' : '#EF4444'
      }
    ]
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index'
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: priceChange >= 0 ? '#10B981' : '#EF4444',
        borderWidth: 1,
        callbacks: {
          title: (context) => {
            const date = new Date(context[0].parsed.x);
            return date.toLocaleString();
          },
          label: (context) => {
            return `${symbol}: $${context.parsed.y.toFixed(2)}`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        display: true,
        grid: {
          color: 'rgba(75, 85, 99, 0.2)',
          drawBorder: false
        },
        ticks: {
          color: 'rgba(156, 163, 175, 0.8)',
          font: {
            size: 11
          }
        }
      },
      y: {
        display: true,
        position: 'right',
        grid: {
          color: 'rgba(75, 85, 99, 0.2)',
          drawBorder: false
        },
        ticks: {
          color: 'rgba(156, 163, 175, 0.8)',
          font: {
            size: 11
          },
          callback: function(value) {
            return '$' + Number(value).toFixed(2);
          }
        }
      }
    },
    elements: {
      point: {
        hoverRadius: 6
      }
    }
  };

  if (loading) {
    return (
      <div className={`${className} flex items-center justify-center`} style={{ height }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full"
        />
        <span className="ml-3 text-gray-400">Loading real market data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-red-500/10 border border-red-500/20 rounded-lg`} style={{ height }}>
        <div className="text-center">
          <p className="text-red-400 font-medium">Failed to load real market data</p>
          <p className="text-red-300 text-sm mt-1">{error}</p>
          <button
            onClick={fetchRealData}
            className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Price Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <h3 className="text-2xl font-bold text-white">{symbol}</h3>
          {lastPrice && (
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-mono text-white">
                ${lastPrice.toFixed(2)}
              </span>
              <span className={`text-lg font-medium ${
                priceChange >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)} ({priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>
        <div className="text-sm text-gray-400">
          Real-time data • {data.length} points
        </div>
      </div>

      {/* Chart */}
      <div style={{ height }} className="relative">
        <Line data={chartData} options={options} />
      </div>

      {/* Data Source Info */}
      <div className="mt-2 text-xs text-gray-500 text-center">
        Real market data from Yahoo Finance • Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}