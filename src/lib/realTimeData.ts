/**
 * Real-Time Data Integration for OmniShift
 * 
 * This file demonstrates how to integrate various live data sources
 * for real-time market intelligence and geopolitical monitoring.
 */

import { marketDataService } from './marketData';
import { newsService } from './newsService';

export interface RealTimeDataConfig {
  enableWebSockets: boolean;
  updateInterval: number; // in milliseconds
  dataSources: {
    stocks: boolean;
    news: boolean;
    geopolitical: boolean;
    defense: boolean;
  };
}

export class RealTimeDataManager {
  private config: RealTimeDataConfig;
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private wsConnections: Map<string, WebSocket> = new Map();

  constructor(config: RealTimeDataConfig) {
    this.config = config;
  }

  // Start real-time data feeds
  start() {
    console.log('🚀 Starting real-time data feeds...');

    if (this.config.dataSources.stocks) {
      this.startStockDataFeed();
    }

    if (this.config.dataSources.news) {
      this.startNewsFeed();
    }

    if (this.config.dataSources.geopolitical) {
      this.startGeopoliticalFeed();
    }

    if (this.config.dataSources.defense) {
      this.startDefenseFeed();
    }
  }

  // Stop all feeds
  stop() {
    console.log('🛑 Stopping real-time data feeds...');
    
    // Clear intervals
    this.intervals.forEach((interval, key) => {
      clearInterval(interval);
      console.log(`Stopped ${key} interval`);
    });
    this.intervals.clear();

    // Close WebSocket connections
    this.wsConnections.forEach((ws, key) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
        console.log(`Closed ${key} WebSocket`);
      }
    });
    this.wsConnections.clear();
  }

  // Stock data feed (polling-based)
  private startStockDataFeed() {
    const updateStocks = async () => {
      try {
        const watchlist = ['LMT', 'PLTR', 'PXD', 'COP', 'CRWD', 'NOC', 'RTX'];
        const quotes = await marketDataService.getBatchQuotes(watchlist);
        
        // Emit stock update event
        this.emit('stockUpdate', quotes);
        
        console.log(`📈 Updated ${quotes.length} stock quotes`);
      } catch (error) {
        console.error('Error updating stocks:', error);
      }
    };

    // Initial fetch
    updateStocks();

    // Set up interval
    const interval = setInterval(updateStocks, this.config.updateInterval);
    this.intervals.set('stocks', interval);
  }

  // News feed
  private startNewsFeed() {
    const updateNews = async () => {
      try {
        const news = await newsService.getAllNews();
        
        // Emit news update event
        this.emit('newsUpdate', news);
        
        console.log(`📰 Updated ${news.length} news articles`);
      } catch (error) {
        console.error('Error updating news:', error);
      }
    };

    // Initial fetch
    updateNews();

    // Set up interval (less frequent for news)
    const interval = setInterval(updateNews, this.config.updateInterval * 5);
    this.intervals.set('news', interval);
  }

  // Geopolitical event monitoring
  private startGeopoliticalFeed() {
    if (this.config.enableWebSockets) {
      this.startGDELTWebSocket();
    } else {
      this.startGDELTPolling();
    }
  }

  // GDELT WebSocket connection (when available)
  private startGDELTWebSocket() {
    try {
      // Note: GDELT doesn't have official WebSocket, this is for demonstration
      const ws = new WebSocket('wss://api.gdeltproject.org/api/v2/doc/doc');
      
      ws.onopen = () => {
        console.log('🌍 Connected to GDELT WebSocket');
        // Subscribe to relevant events
        ws.send(JSON.stringify({
          query: 'conflict military defense',
          format: 'json',
          mode: 'realtime'
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.processGeopoliticalEvent(data);
        } catch (error) {
          console.error('Error parsing GDELT data:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('GDELT WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('GDELT WebSocket closed, attempting reconnect...');
        setTimeout(() => this.startGDELTWebSocket(), 5000);
      };

      this.wsConnections.set('gdelt', ws);
    } catch (error) {
      console.error('Failed to start GDELT WebSocket:', error);
      this.startGDELTPolling(); // Fallback to polling
    }
  }

  // GDELT polling fallback
  private startGDELTPolling() {
    const updateGeopolitical = async () => {
      try {
        // Mock geopolitical events for now
        const events = this.generateMockGeopoliticalEvents();
        this.emit('geopoliticalUpdate', events);
        
        console.log(`🌍 Updated ${events.length} geopolitical events`);
      } catch (error) {
        console.error('Error updating geopolitical data:', error);
      }
    };

    updateGeopolitical();
    const interval = setInterval(updateGeopolitical, this.config.updateInterval * 10);
    this.intervals.set('geopolitical', interval);
  }

  // Defense industry monitoring
  private startDefenseFeed() {
    const updateDefense = async () => {
      try {
        const defenseNews = await newsService.getDefenseNews();
        const contractData = await this.fetchUSASpendingContracts();
        
        this.emit('defenseUpdate', { news: defenseNews, contracts: contractData });
        
        console.log(`🛡️ Updated defense industry data`);
      } catch (error) {
        console.error('Error updating defense data:', error);
      }
    };

    updateDefense();
    const interval = setInterval(updateDefense, this.config.updateInterval * 15);
    this.intervals.set('defense', interval);
  }

  // Fetch real government contract data
  private async fetchUSASpendingContracts() {
    try {
      // USASpending.gov API integration
      const response = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filters: {
            keywords: ['defense', 'military', 'security'],
            award_type_codes: ['A', 'B', 'C', 'D'], // Contract types
            time_period: [
              {
                start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                end_date: new Date().toISOString().split('T')[0]
              }
            ]
          },
          limit: 10
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.results || [];
      }
    } catch (error) {
      console.error('Error fetching contract data:', error);
    }
    
    return [];
  }

  // Process geopolitical events
  private processGeopoliticalEvent(data: any) {
    // Calculate tension impact
    const tensionScore = this.calculateTensionScore(data);
    
    this.emit('tensionUpdate', {
      region: data.location || 'Unknown',
      event: data.title || 'Geopolitical Event',
      score: tensionScore,
      timestamp: new Date()
    });
  }

  // Calculate tension score from event data
  private calculateTensionScore(event: any): number {
    const keywords = (event.title + ' ' + event.description).toLowerCase();
    let score = 0.1; // Base score

    // High tension keywords
    if (keywords.includes('conflict') || keywords.includes('war')) score += 0.4;
    if (keywords.includes('military') || keywords.includes('defense')) score += 0.3;
    if (keywords.includes('crisis') || keywords.includes('emergency')) score += 0.3;
    if (keywords.includes('sanctions') || keywords.includes('embargo')) score += 0.2;

    return Math.min(score, 1.0);
  }

  // TODO: Replace with real geopolitical data from GDELT Project API
  private generateMockGeopoliticalEvents() {
    console.warn('Mock geopolitical events - replace with real GDELT data');
    return [];
  }

  // Event emitter functionality
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} callback:`, error);
      }
    });
  }
}

// Default configuration
export const defaultConfig: RealTimeDataConfig = {
  enableWebSockets: false, // Set to true when WebSocket sources are available
  updateInterval: 30000, // 30 seconds
  dataSources: {
    stocks: true,
    news: true,
    geopolitical: true,
    defense: true
  }
};

// Export singleton instance
export const realTimeDataManager = new RealTimeDataManager(defaultConfig);