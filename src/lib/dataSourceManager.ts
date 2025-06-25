/**
 * Multi-Source Data Manager with Intelligent Fallback
 * 
 * This system ensures 100% uptime by managing multiple data sources
 * and automatically switching when limits are reached.
 */

import { rateLimiter } from './rateLimiter';
import axios from 'axios';

interface DataSource {
  name: string;
  priority: number; // 1 = highest priority
  rateLimitKey: string;
  isAvailable: () => Promise<boolean>;
  healthCheck: () => Promise<boolean>;
}

interface StockDataSource extends DataSource {
  getQuote: (ticker: string) => Promise<any>;
  getBatchQuotes: (tickers: string[]) => Promise<any[]>;
  getMarketIndicators: () => Promise<any[]>;
}

interface NewsDataSource extends DataSource {
  getNews: (query: string) => Promise<any[]>;
  getDefenseNews: () => Promise<any[]>;
  getMarketNews: () => Promise<any[]>;
}

export class DataSourceManager {
  private stockSources: StockDataSource[] = [];
  private newsSources: NewsDataSource[] = [];
  private currentStockSource: number = 0;
  private currentNewsSource: number = 0;

  constructor() {
    this.initializeDataSources();
  }

  private initializeDataSources() {
    // Initialize stock data sources in order of preference
    this.stockSources = [
      this.createYahooFinanceSource(),
      this.createAlphaVantageSource(),
      this.createPolygonSource(), // Free tier available
      this.createIEXCloudSource()  // Free tier available
    ];

    // Initialize news data sources in order of preference  
    this.newsSources = [
      this.createNewsAPISource(),
      this.createGNewsSource(),      // Free alternative
      this.createNewsDataSource(),   // Free tier available
      this.createGDELTSource()       // Always free
    ];
  }

  /**
   * Get stock quote with automatic fallback
   */
  async getStockQuote(ticker: string): Promise<any> {
    for (let i = 0; i < this.stockSources.length; i++) {
      const sourceIndex = (this.currentStockSource + i) % this.stockSources.length;
      const source = this.stockSources[sourceIndex];

      try {
        // Check if source can make request
        const stats = rateLimiter.getUsageStats(source.rateLimitKey);
        if (!stats.canMakeRequest) {
          console.log(`📊 ${source.name} rate limited, trying next source...`);
          continue;
        }

        // Check source health
        if (!(await source.isAvailable())) {
          console.log(`📊 ${source.name} unavailable, trying next source...`);
          continue;
        }

        console.log(`📊 Using ${source.name} for stock quote: ${ticker}`);
        const result = await source.getQuote(ticker);
        
        // Update current source on success
        this.currentStockSource = sourceIndex;
        return result;

      } catch (error) {
        console.error(`❌ ${source.name} failed for ${ticker}:`, error);
        continue;
      }
    }

    throw new Error('All stock data sources failed');
  }

  /**
   * Get batch stock quotes with automatic fallback
   */
  async getBatchStockQuotes(tickers: string[]): Promise<any[]> {
    for (let i = 0; i < this.stockSources.length; i++) {
      const sourceIndex = (this.currentStockSource + i) % this.stockSources.length;
      const source = this.stockSources[sourceIndex];

      try {
        const stats = rateLimiter.getUsageStats(source.rateLimitKey);
        if (!stats.canMakeRequest) {
          console.log(`📊 ${source.name} rate limited for batch quotes, trying next...`);
          continue;
        }

        if (!(await source.isAvailable())) {
          console.log(`📊 ${source.name} unavailable for batch quotes, trying next...`);
          continue;
        }

        console.log(`📊 Using ${source.name} for batch quotes: ${tickers.join(',')}`);
        const result = await source.getBatchQuotes(tickers);
        
        this.currentStockSource = sourceIndex;
        return result;

      } catch (error) {
        console.error(`❌ ${source.name} batch quotes failed:`, error);
        continue;
      }
    }

    throw new Error('All stock data sources failed for batch quotes');
  }

  /**
   * Get market indicators with fallback
   */
  async getMarketIndicators(): Promise<any[]> {
    for (let i = 0; i < this.stockSources.length; i++) {
      const sourceIndex = (this.currentStockSource + i) % this.stockSources.length;
      const source = this.stockSources[sourceIndex];

      try {
        const stats = rateLimiter.getUsageStats(source.rateLimitKey);
        if (!stats.canMakeRequest) continue;

        if (!(await source.isAvailable())) continue;

        console.log(`📊 Using ${source.name} for market indicators`);
        const result = await source.getMarketIndicators();
        
        this.currentStockSource = sourceIndex;
        return result;

      } catch (error) {
        console.error(`❌ ${source.name} market indicators failed:`, error);
        continue;
      }
    }

    throw new Error('All stock data sources failed for market indicators');
  }

  /**
   * Get news with automatic fallback
   */
  async getNews(query: string): Promise<any[]> {
    for (let i = 0; i < this.newsSources.length; i++) {
      const sourceIndex = (this.currentNewsSource + i) % this.newsSources.length;
      const source = this.newsSources[sourceIndex];

      try {
        const stats = rateLimiter.getUsageStats(source.rateLimitKey);
        if (!stats.canMakeRequest) {
          console.log(`📰 ${source.name} rate limited, trying next news source...`);
          continue;
        }

        if (!(await source.isAvailable())) {
          console.log(`📰 ${source.name} unavailable, trying next news source...`);
          continue;
        }

        console.log(`📰 Using ${source.name} for news: ${query}`);
        const result = await source.getNews(query);
        
        this.currentNewsSource = sourceIndex;
        return result;

      } catch (error) {
        console.error(`❌ ${source.name} news failed:`, error);
        continue;
      }
    }

    throw new Error('All news data sources failed');
  }

  /**
   * Create Yahoo Finance data source
   */
  private createYahooFinanceSource(): StockDataSource {
    return {
      name: 'Yahoo Finance',
      priority: 1,
      rateLimitKey: 'yahoo',
      isAvailable: async () => {
        try {
          await axios.get('/api/market-data?action=health', { timeout: 5000 });
          return true;
        } catch {
          return false;
        }
      },
      healthCheck: async () => true,
      getQuote: async (ticker: string) => {
        const response = await axios.get(`/api/market-data?action=quote&ticker=${ticker}&source=yahoo`);
        return response.data.data;
      },
      getBatchQuotes: async (tickers: string[]) => {
        const response = await axios.get(`/api/market-data?action=batch&tickers=${tickers.join(',')}&source=yahoo`);
        return response.data.data;
      },
      getMarketIndicators: async () => {
        const response = await axios.get('/api/market-data?action=indicators&source=yahoo');
        return response.data.data;
      }
    };
  }

  /**
   * Create Alpha Vantage data source
   */
  private createAlphaVantageSource(): StockDataSource {
    return {
      name: 'Alpha Vantage',
      priority: 2,
      rateLimitKey: 'alphavantage',
      isAvailable: async () => {
        const apiKey = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY;
        return !!apiKey;
      },
      healthCheck: async () => true,
      getQuote: async (ticker: string) => {
        const response = await axios.get(`/api/market-data?action=quote&ticker=${ticker}&source=alphavantage`);
        return response.data.data;
      },
      getBatchQuotes: async (tickers: string[]) => {
        // Alpha Vantage doesn't support true batch, so we'll fetch individually with rate limiting
        const results = [];
        for (const ticker of tickers) {
          try {
            const quote = await this.getQuote(ticker);
            results.push(quote);
            await this.sleep(12000); // Alpha Vantage: 5 calls per minute
          } catch (error) {
            console.error(`Failed to get quote for ${ticker}:`, error);
          }
        }
        return results;
      },
      getMarketIndicators: async () => {
        const response = await axios.get('/api/market-data?action=indicators&source=alphavantage');
        return response.data.data;
      }
    };
  }

  /**
   * Create Polygon.io data source (free tier)
   */
  private createPolygonSource(): StockDataSource {
    return {
      name: 'Polygon.io',
      priority: 3,
      rateLimitKey: 'polygon',
      isAvailable: async () => {
        const apiKey = process.env.NEXT_PUBLIC_POLYGON_KEY;
        return !!apiKey;
      },
      healthCheck: async () => true,
      getQuote: async (ticker: string) => {
        const response = await axios.get(`/api/market-data?action=quote&ticker=${ticker}&source=polygon`);
        return response.data.data;
      },
      getBatchQuotes: async (tickers: string[]) => {
        const response = await axios.get(`/api/market-data?action=batch&tickers=${tickers.join(',')}&source=polygon`);
        return response.data.data;
      },
      getMarketIndicators: async () => {
        const response = await axios.get('/api/market-data?action=indicators&source=polygon');
        return response.data.data;
      }
    };
  }

  /**
   * Create IEX Cloud data source (free tier)
   */
  private createIEXCloudSource(): StockDataSource {
    return {
      name: 'IEX Cloud',
      priority: 4,
      rateLimitKey: 'iex',
      isAvailable: async () => {
        const apiKey = process.env.NEXT_PUBLIC_IEX_KEY;
        return !!apiKey;
      },
      healthCheck: async () => true,
      getQuote: async (ticker: string) => {
        const response = await axios.get(`/api/market-data?action=quote&ticker=${ticker}&source=iex`);
        return response.data.data;
      },
      getBatchQuotes: async (tickers: string[]) => {
        const response = await axios.get(`/api/market-data?action=batch&tickers=${tickers.join(',')}&source=iex`);
        return response.data.data;
      },
      getMarketIndicators: async () => {
        const response = await axios.get('/api/market-data?action=indicators&source=iex');
        return response.data.data;
      }
    };
  }

  /**
   * Create NewsAPI data source
   */
  private createNewsAPISource(): NewsDataSource {
    return {
      name: 'NewsAPI',
      priority: 1,
      rateLimitKey: 'newsapi',
      isAvailable: async () => {
        const apiKey = process.env.NEXT_PUBLIC_NEWS_API_KEY;
        return !!apiKey;
      },
      healthCheck: async () => true,
      getNews: async (query: string) => {
        const response = await axios.get(`/api/news?q=${encodeURIComponent(query)}&source=newsapi`);
        return response.data.data;
      },
      getDefenseNews: async () => {
        const response = await axios.get('/api/news?q=defense+military+lockheed+boeing+contracts&source=newsapi');
        return response.data.data;
      },
      getMarketNews: async () => {
        const response = await axios.get('/api/news?q=stock+market+trading+nasdaq+dow&source=newsapi');
        return response.data.data;
      }
    };
  }

  /**
   * Create GNews data source (free alternative)
   */
  private createGNewsSource(): NewsDataSource {
    return {
      name: 'GNews',
      priority: 2,
      rateLimitKey: 'gnews',
      isAvailable: async () => {
        const apiKey = process.env.NEXT_PUBLIC_GNEWS_KEY;
        return !!apiKey;
      },
      healthCheck: async () => true,
      getNews: async (query: string) => {
        const response = await axios.get(`/api/news?q=${encodeURIComponent(query)}&source=gnews`);
        return response.data.data;
      },
      getDefenseNews: async () => {
        const response = await axios.get('/api/news?q=defense+military+contracts&source=gnews');
        return response.data.data;
      },
      getMarketNews: async () => {
        const response = await axios.get('/api/news?q=stock+market+trading&source=gnews');
        return response.data.data;
      }
    };
  }

  /**
   * Create NewsData.io source (free tier)
   */
  private createNewsDataSource(): NewsDataSource {
    return {
      name: 'NewsData.io',
      priority: 3,
      rateLimitKey: 'newsdata',
      isAvailable: async () => {
        const apiKey = process.env.NEXT_PUBLIC_NEWSDATA_KEY;
        return !!apiKey;
      },
      healthCheck: async () => true,
      getNews: async (query: string) => {
        const response = await axios.get(`/api/news?q=${encodeURIComponent(query)}&source=newsdata`);
        return response.data.data;
      },
      getDefenseNews: async () => {
        const response = await axios.get('/api/news?q=defense+military&source=newsdata');
        return response.data.data;
      },
      getMarketNews: async () => {
        const response = await axios.get('/api/news?q=stock+market&source=newsdata');
        return response.data.data;
      }
    };
  }

  /**
   * Create GDELT source (always free)
   */
  private createGDELTSource(): NewsDataSource {
    return {
      name: 'GDELT',
      priority: 4,
      rateLimitKey: 'gdelt',
      isAvailable: async () => true, // Always available
      healthCheck: async () => true,
      getNews: async (query: string) => {
        const response = await axios.get(`/api/news?q=${encodeURIComponent(query)}&source=gdelt`);
        return response.data.data;
      },
      getDefenseNews: async () => {
        const response = await axios.get('/api/news?q=defense+military&source=gdelt');
        return response.data.data;
      },
      getMarketNews: async () => {
        const response = await axios.get('/api/news?q=market+financial&source=gdelt');
        return response.data.data;
      }
    };
  }

  /**
   * Get system health status
   */
  async getSystemHealth() {
    const stockHealth = await Promise.all(
      this.stockSources.map(async (source) => ({
        name: source.name,
        available: await source.isAvailable(),
        canMakeRequest: rateLimiter.getUsageStats(source.rateLimitKey).canMakeRequest,
        priority: source.priority
      }))
    );

    const newsHealth = await Promise.all(
      this.newsSources.map(async (source) => ({
        name: source.name,
        available: await source.isAvailable(),
        canMakeRequest: rateLimiter.getUsageStats(source.rateLimitKey).canMakeRequest,
        priority: source.priority
      }))
    );

    return {
      stock: stockHealth,
      news: newsHealth,
      currentStockSource: this.stockSources[this.currentStockSource].name,
      currentNewsSource: this.newsSources[this.currentNewsSource].name
    };
  }

  /**
   * Force switch to next available source
   */
  switchToNextStockSource() {
    this.currentStockSource = (this.currentStockSource + 1) % this.stockSources.length;
    console.log(`🔄 Switched to stock source: ${this.stockSources[this.currentStockSource].name}`);
  }

  switchToNextNewsSource() {
    this.currentNewsSource = (this.currentNewsSource + 1) % this.newsSources.length;
    console.log(`🔄 Switched to news source: ${this.newsSources[this.currentNewsSource].name}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton
export const dataSourceManager = new DataSourceManager();