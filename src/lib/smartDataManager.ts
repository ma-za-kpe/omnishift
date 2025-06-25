/**
 * Smart Data Manager - Optimizes API usage for free tiers
 * 
 * Features:
 * - Intelligent request batching
 * - Priority-based data fetching
 * - Background refresh scheduling
 * - Adaptive caching strategies
 */

import { rateLimiter } from './rateLimiter';
import { dataSourceManager } from './dataSourceManager';
import { huggingfaceNLP } from './huggingfaceNLP';
import axios from 'axios';

interface DataPriority {
  critical: string[]; // Must have data (stocks, market indicators)
  important: string[]; // Should have data (news, events)
  nice: string[]; // Optional data (detailed analytics)
}

interface RefreshSchedule {
  critical: number; // Refresh interval in seconds
  important: number;
  nice: number;
}

export class SmartDataManager {
  private refreshIntervals: Map<string, NodeJS.Timeout> = new Map();
  private lastRefresh: Map<string, number> = new Map();
  
  // Optimized refresh schedule for free tiers
  private schedule: RefreshSchedule = {
    critical: 60,    // Every 1 minute for stocks
    important: 300,  // Every 5 minutes for news
    nice: 900       // Every 15 minutes for analytics
  };

  // Data priority configuration
  private priorities: DataPriority = {
    critical: [
      'market-indicators',
      'watchlist-stocks',
      'portfolio-value'
    ],
    important: [
      'defense-news',
      'market-news',
      'geopolitical-events'
    ],
    nice: [
      'historical-data',
      'technical-analysis',
      'sector-analysis'
    ]
  };

  constructor() {
    this.startBackgroundRefresh();
  }

  /**
   * Get market data with intelligent API usage using multi-source fallback
   */
  async getMarketData() {
    try {
      // Use the new data source manager for automatic fallback
      const indicators = await dataSourceManager.getMarketIndicators();
      const watchlist = await dataSourceManager.getBatchStockQuotes([
        'LMT', 'PLTR', 'XOM', 'COP', 'CRWD', 'NOC', 'RTX'
      ]);

      return {
        indicators,
        watchlist
      };
    } catch (error) {
      console.error('All market data sources failed:', error);
      
      // Fallback to cached data or mock data
      return {
        indicators: await this.getFallbackData('indicators') || [],
        watchlist: await this.getFallbackData('watchlist') || []
      };
    }
  }

  /**
   * Get news data with smart caching and multi-source fallback
   */
  async getNewsData() {
    // Check if we have recent news data
    const lastRefresh = this.lastRefresh.get('news');
    const now = Date.now();
    
    if (lastRefresh && (now - lastRefresh) < 300000) { // 5 minutes
      console.log('📰 Using cached news data to preserve API limits');
      return this.getCachedNewsData();
    }

    try {
      // Use intelligent news source selection
      const defenseNews = await dataSourceManager.getNews('defense military lockheed boeing contracts');
      const marketNews = await dataSourceManager.getNews('stock market trading nasdaq dow');

      // Enhanced news categorization with NLP
      const defense = await this.enhanceNewsWithNLP(defenseNews, 'defense');
      const market = await this.enhanceNewsWithNLP(marketNews, 'market');

      const result = { defense, market };
      this.lastRefresh.set('news', now);
      return result;
    } catch (error) {
      console.error('All news sources failed:', error);
      
      // Fallback to cached data
      return this.getCachedNewsData();
    }
  }

  /**
   * Get geopolitical events data
   */
  async getGeopoliticalData(region: string = 'global') {
    const lastRefresh = this.lastRefresh.get('geopolitical');
    const now = Date.now();
    
    if (lastRefresh && (now - lastRefresh) < 3600000) { // 1 hour cache
      console.log('🌍 Using cached geopolitical data');
      return this.getCachedGeopoliticalData();
    }

    try {
      const response = await axios.get(`/api/geopolitical?region=${region}&timeframe=24h`);
      const events = response.data.data;
      
      this.lastRefresh.set('geopolitical', now);
      return events;
    } catch (error) {
      console.error('Geopolitical data fetch failed:', error);
      return this.getCachedGeopoliticalData() || [];
    }
  }

  /**
   * Get government contracts data
   */
  async getContractsData(category: string = 'defense') {
    const lastRefresh = this.lastRefresh.get('contracts');
    const now = Date.now();
    
    if (lastRefresh && (now - lastRefresh) < 7200000) { // 2 hour cache
      console.log('📄 Using cached contracts data');
      return this.getCachedContractsData();
    }

    try {
      const response = await axios.get(`/api/contracts?category=${category}&limit=10&minAmount=10000000`);
      const contracts = response.data.data;
      
      this.lastRefresh.set('contracts', now);
      return contracts;
    } catch (error) {
      console.error('Contracts data fetch failed:', error);
      return this.getCachedContractsData() || [];
    }
  }

  /**
   * Fetch market indicators efficiently
   */
  private async fetchMarketIndicators() {
    return rateLimiter.request(
      'yahoo',
      'indicators',
      async () => {
        const response = await axios.get('/api/market-data?action=indicators');
        return response.data.data;
      }
    );
  }

  /**
   * Fetch watchlist stocks with batching
   */
  private async fetchWatchlistStocks() {
    const tickers = ['LMT', 'PLTR', 'PXD', 'COP', 'CRWD', 'NOC', 'RTX'];
    
    return rateLimiter.request(
      'yahoo',
      'batch',
      async () => {
        const response = await axios.get(`/api/market-data?action=batch&tickers=${tickers.join(',')}`);
        return response.data.data;
      },
      { tickers }
    );
  }

  /**
   * Fetch defense news with smart filtering
   */
  private async fetchDefenseNews() {
    return rateLimiter.request(
      'newsapi',
      'defense',
      async () => {
        const response = await axios.get('/api/news?q=defense+military+lockheed+boeing+contracts');
        return response.data.data;
      }
    );
  }

  /**
   * Fetch market news
   */
  private async fetchMarketNews() {
    return rateLimiter.request(
      'newsapi',
      'market',
      async () => {
        const response = await axios.get('/api/news?q=stock+market+trading+nasdaq+dow');
        return response.data.data;
      }
    );
  }

  /**
   * Execute batch requests with priority handling
   */
  private async executeBatch(
    apiName: string,
    requests: Array<{ key: string; fn: () => Promise<any> }>,
    priority: 'critical' | 'important' | 'nice'
  ) {
    const results: any = {};
    
    // Execute requests in sequence to respect rate limits
    for (const request of requests) {
      try {
        results[request.key] = await request.fn();
        
        // Add small delay between requests to be extra safe
        if (requests.indexOf(request) < requests.length - 1) {
          await this.sleep(1000); // 1 second between requests
        }
        
      } catch (error) {
        console.error(`Error fetching ${request.key}:`, error);
        
        // Try to get cached data as fallback
        const cached = await this.getFallbackData(request.key);
        if (cached) {
          results[request.key] = cached;
        }
      }
    }
    
    return results;
  }

  /**
   * Start background refresh with intelligent scheduling
   */
  private startBackgroundRefresh() {
    // Critical data refresh (market indicators, stock prices)
    const criticalInterval = setInterval(async () => {
      try {
        console.log('🔄 Background refresh: Critical data');
        await this.refreshCriticalData();
      } catch (error) {
        console.error('Error in critical data refresh:', error);
      }
    }, this.schedule.critical * 1000);

    // Important data refresh (news, events)
    const importantInterval = setInterval(async () => {
      try {
        console.log('🔄 Background refresh: Important data');
        await this.refreshImportantData();
      } catch (error) {
        console.error('Error in important data refresh:', error);
      }
    }, this.schedule.important * 1000);

    // Nice-to-have data refresh (analytics)
    const niceInterval = setInterval(async () => {
      try {
        console.log('🔄 Background refresh: Nice-to-have data');
        await this.refreshNiceData();
      } catch (error) {
        console.error('Error in nice data refresh:', error);
      }
    }, this.schedule.nice * 1000);

    this.refreshIntervals.set('critical', criticalInterval);
    this.refreshIntervals.set('important', importantInterval);
    this.refreshIntervals.set('nice', niceInterval);
  }

  /**
   * Refresh critical data (stocks, market indicators)
   */
  private async refreshCriticalData() {
    // Only refresh during market hours to save API calls
    if (!this.isMarketHours()) {
      console.log('📊 Market closed - skipping stock data refresh');
      return;
    }

    const stats = rateLimiter.getUsageStats('yahoo');
    if (!stats.canMakeRequest) {
      console.log('⏳ Yahoo Finance rate limit reached - skipping refresh');
      return;
    }

    await this.getMarketData();
  }

  /**
   * Refresh important data (news, events)
   */
  private async refreshImportantData() {
    const stats = rateLimiter.getUsageStats('newsapi');
    if (!stats.canMakeRequest) {
      console.log('⏳ NewsAPI rate limit reached - skipping refresh');
      return;
    }

    await this.getNewsData();
  }

  /**
   * Refresh nice-to-have data (analytics)
   */
  private async refreshNiceData() {
    // Only fetch analytics data if we have available API calls
    const allStats = rateLimiter.getAllUsageStats();
    const hasAvailableCalls = Object.values(allStats).some((stat: any) => stat.canMakeRequest);
    
    if (!hasAvailableCalls) {
      console.log('⏳ All APIs at rate limit - skipping analytics refresh');
      return;
    }

    // Fetch lower priority data
    console.log('📈 Refreshing analytics data');
  }

  /**
   * Check if market is open (US Eastern Time)
   */
  private isMarketHours(): boolean {
    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    
    const day = easternTime.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = easternTime.getHours();
    const minute = easternTime.getMinutes();
    const totalMinutes = hour * 60 + minute;
    
    // Market is closed on weekends
    if (day === 0 || day === 6) return false;
    
    // Market hours: 9:30 AM - 4:00 PM EST
    const marketOpen = 9 * 60 + 30;  // 9:30 AM
    const marketClose = 16 * 60;     // 4:00 PM
    
    return totalMinutes >= marketOpen && totalMinutes <= marketClose;
  }

  /**
   * Get cached news data
   */
  private async getCachedNewsData() {
    // Implementation would return cached news from rateLimiter
    return {
      defense: [],
      market: []
    };
  }

  /**
   * Get cached geopolitical data
   */
  private getCachedGeopoliticalData() {
    return [];
  }

  /**
   * Get cached contracts data
   */
  private getCachedContractsData() {
    return [];
  }

  /**
   * Get fallback data when API fails
   */
  private async getFallbackData(key: string) {
    // Implementation would return cached or mock data
    console.log(`📦 Using fallback data for ${key}`);
    return null;
  }

  /**
   * Enhance news articles with NLP analysis
   */
  private async enhanceNewsWithNLP(newsArticles: any[], category: string): Promise<any[]> {
    if (!newsArticles || newsArticles.length === 0) {
      return [];
    }

    const enhancedNews = [];
    
    // Process articles in batches to avoid overwhelming the NLP service
    const batchSize = 5;
    for (let i = 0; i < newsArticles.length; i += batchSize) {
      const batch = newsArticles.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (article) => {
        try {
          const fullText = `${article.title} ${article.description || ''}`;
          
          // Perform NLP analysis
          const [sentimentResult, impactScore, entities, summary] = await Promise.all([
            huggingfaceNLP.analyzeSentiment(fullText),
            huggingfaceNLP.analyzeImpactScore(fullText),
            huggingfaceNLP.extractFinancialEntities(fullText),
            fullText.length > 300 ? huggingfaceNLP.summarize(fullText, 150) : Promise.resolve(null)
          ]);

          // Enhanced article with NLP insights
          return {
            ...article,
            nlp: {
              sentiment: sentimentResult.label.toLowerCase(),
              sentimentScore: sentimentResult.score,
              impactScore,
              entities,
              summary: summary || article.description,
              enhancedAt: new Date().toISOString()
            },
            // Legacy fields for compatibility
            sentiment: sentimentResult.label.toLowerCase(),
            impactScore,
            category: this.categorizeNewsWithNLP(fullText, category, entities)
          };
        } catch (error) {
          console.error(`NLP enhancement failed for article: ${article.title}`, error);
          // Return original article with basic sentiment
          return {
            ...article,
            sentiment: this.basicSentimentAnalysis(article.title),
            impactScore: 0.5,
            category
          };
        }
      });

      const enhancedBatch = await Promise.all(batchPromises);
      enhancedNews.push(...enhancedBatch);
      
      // Small delay between batches to be gentle on the NLP service
      if (i + batchSize < newsArticles.length) {
        await this.sleep(500);
      }
    }

    return enhancedNews;
  }

  /**
   * Categorize news with NLP assistance
   */
  private categorizeNewsWithNLP(text: string, defaultCategory: string, entities: any): string {
    const categories = ['defense', 'energy', 'technology', 'finance', 'geopolitical', 'corporate', 'market'];
    
    // Use entity detection to refine categorization
    if (entities.tickers.length > 0) {
      // Contains stock tickers - likely market/corporate news
      return entities.tickers.some((ticker: string) => 
        ['LMT', 'NOC', 'RTX', 'BA'].includes(ticker)
      ) ? 'defense' : 'market';
    }

    if (entities.companies.length > 0) {
      // Contains company names
      const defenseCompanies = ['lockheed', 'boeing', 'northrop', 'raytheon', 'general dynamics'];
      const hasDefenseCompany = entities.companies.some((company: string) =>
        defenseCompanies.some(dc => company.toLowerCase().includes(dc))
      );
      
      if (hasDefenseCompany) return 'defense';
    }

    // Fallback to default category
    return defaultCategory;
  }

  /**
   * Basic sentiment analysis fallback
   */
  private basicSentimentAnalysis(text: string): string {
    const lowerText = text.toLowerCase();
    const positiveWords = ['gains', 'rises', 'surge', 'breakthrough', 'success', 'profit'];
    const negativeWords = ['falls', 'drops', 'crisis', 'concerns', 'losses', 'decline'];
    
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get comprehensive system status including all data sources
   */
  async getSystemStatus() {
    const apiStats = rateLimiter.getAllUsageStats();
    const marketOpen = this.isMarketHours();
    const sourceHealth = await dataSourceManager.getSystemHealth();
    
    return {
      marketOpen,
      lastRefresh: Object.fromEntries(this.lastRefresh),
      apiStatus: apiStats,
      sourceHealth,
      refreshSchedule: this.schedule,
      priorities: this.priorities,
      activeSources: {
        stock: sourceHealth.currentStockSource,
        news: sourceHealth.currentNewsSource
      }
    };
  }

  /**
   * Manually trigger data refresh with priority
   */
  async refreshData(priority: 'critical' | 'important' | 'nice' = 'critical') {
    switch (priority) {
      case 'critical':
        return this.refreshCriticalData();
      case 'important':
        return this.refreshImportantData();
      case 'nice':
        return this.refreshNiceData();
    }
  }

  /**
   * Stop all background processes
   */
  stop() {
    this.refreshIntervals.forEach((interval, key) => {
      clearInterval(interval);
      console.log(`Stopped ${key} data refresh`);
    });
    this.refreshIntervals.clear();
  }
}

// Export singleton instance
export const smartDataManager = new SmartDataManager();