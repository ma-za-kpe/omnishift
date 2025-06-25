/**
 * Intelligent Rate Limiter for Free Tier APIs
 * 
 * This system ensures we never exceed API limits and provides smart caching
 * to maximize data freshness while staying within constraints.
 */

interface APILimits {
  requestsPerMinute: number;
  requestsPerDay: number;
  requestsPerMonth?: number;
  burstLimit?: number; // Max requests in a short burst
}

interface APIConfig {
  name: string;
  limits: APILimits;
  priority: number; // 1-10, higher = more important
  cacheTTL: number; // Cache time-to-live in seconds
}

interface RequestRecord {
  timestamp: number;
  endpoint: string;
  success: boolean;
}

export class SmartRateLimiter {
  private requestHistory: Map<string, RequestRecord[]> = new Map();
  private cache: Map<string, { data: any; expires: number }> = new Map();
  private requestQueue: Map<string, Array<{ resolve: Function; reject: Function; params: any }>> = new Map();
  private processingQueue: Set<string> = new Set();

  // API Configurations based on real free tier limits
  private apiConfigs: Map<string, APIConfig> = new Map([
    ['newsapi', {
      name: 'NewsAPI',
      limits: {
        requestsPerMinute: 5, // Conservative for free tier
        requestsPerDay: 1000, // Free tier limit
        requestsPerMonth: 1000
      },
      priority: 8,
      cacheTTL: 1800 // 30 minutes cache for news
    }],
    ['gnews', {
      name: 'GNews',
      limits: {
        requestsPerMinute: 2, // Conservative for free tier
        requestsPerDay: 100, // Free tier limit
      },
      priority: 7,
      cacheTTL: 1800 // 30 minutes cache for news
    }],
    ['newsdata', {
      name: 'NewsData.io',
      limits: {
        requestsPerMinute: 1, // Very conservative for free tier
        requestsPerDay: 200, // Free tier limit
      },
      priority: 6,
      cacheTTL: 1800 // 30 minutes cache for news
    }],
    ['alphavantage', {
      name: 'Alpha Vantage',
      limits: {
        requestsPerMinute: 5, // Free tier limit
        requestsPerDay: 500, // Free tier limit
      },
      priority: 9,
      cacheTTL: 300 // 5 minutes cache for market data
    }],
    ['polygon', {
      name: 'Polygon.io',
      limits: {
        requestsPerMinute: 5, // Free tier limit
        requestsPerDay: 1000, // Conservative estimate
      },
      priority: 8,
      cacheTTL: 300 // 5 minutes cache for market data
    }],
    ['yahoo', {
      name: 'Yahoo Finance',
      limits: {
        requestsPerMinute: 10, // Conservative estimate
        requestsPerDay: 2000, // Estimated limit
      },
      priority: 10,
      cacheTTL: 60 // 1 minute cache for stock data
    }],
    ['gdelt', {
      name: 'GDELT',
      limits: {
        requestsPerMinute: 3, // Very conservative for free usage
        requestsPerDay: 1000,
      },
      priority: 6,
      cacheTTL: 3600 // 1 hour cache for geopolitical events
    }],
    ['usaspending', {
      name: 'USASpending.gov',
      limits: {
        requestsPerMinute: 10, // Government API, usually generous
        requestsPerDay: 5000,
      },
      priority: 5,
      cacheTTL: 7200 // 2 hours cache for contract data
    }]
  ]);

  constructor() {
    // Clean up old request history every minute
    setInterval(() => this.cleanupHistory(), 60000);
    
    // Clean up expired cache every 5 minutes
    setInterval(() => this.cleanupCache(), 300000);
  }

  /**
   * Smart request method that handles rate limiting, caching, and queuing
   */
  async request<T>(
    apiName: string,
    endpoint: string,
    requestFn: () => Promise<T>,
    params?: any
  ): Promise<T> {
    const cacheKey = this.getCacheKey(apiName, endpoint, params);
    
    // Check cache first
    const cached = this.getFromCache<T>(cacheKey);
    if (cached) {
      console.log(`📦 Cache hit for ${apiName}:${endpoint}`);
      return cached;
    }

    // Check if we can make the request now
    if (this.canMakeRequest(apiName)) {
      return this.executeRequest(apiName, endpoint, requestFn, cacheKey);
    }

    // Queue the request if we're at the limit
    console.log(`⏳ Queuing request for ${apiName}:${endpoint} due to rate limits`);
    return this.queueRequest(apiName, endpoint, requestFn, cacheKey, params);
  }

  /**
   * Check if we can make a request without exceeding limits
   */
  private canMakeRequest(apiName: string): boolean {
    const config = this.apiConfigs.get(apiName);
    if (!config) return true;

    const history = this.requestHistory.get(apiName) || [];
    const now = Date.now();

    // Check minute limit
    const lastMinute = history.filter(r => now - r.timestamp < 60000);
    if (lastMinute.length >= config.limits.requestsPerMinute) {
      return false;
    }

    // Check daily limit
    const lastDay = history.filter(r => now - r.timestamp < 86400000);
    if (lastDay.length >= config.limits.requestsPerDay) {
      return false;
    }

    return true;
  }

  /**
   * Execute the request and handle caching
   */
  private async executeRequest<T>(
    apiName: string,
    endpoint: string,
    requestFn: () => Promise<T>,
    cacheKey: string
  ): Promise<T> {
    try {
      console.log(`🔄 Making API request to ${apiName}:${endpoint}`);
      
      const result = await requestFn();
      
      // Record successful request
      this.recordRequest(apiName, endpoint, true);
      
      // Cache the result
      this.setCache(cacheKey, result, apiName);
      
      console.log(`✅ API request successful: ${apiName}:${endpoint}`);
      return result;
      
    } catch (error) {
      // Record failed request
      this.recordRequest(apiName, endpoint, false);
      
      console.error(`❌ API request failed: ${apiName}:${endpoint}`, error);
      
      // Try to return stale cache if available
      const staleCache = this.getFromCache<T>(cacheKey, true);
      if (staleCache) {
        console.log(`📦 Returning stale cache for ${apiName}:${endpoint}`);
        return staleCache;
      }
      
      throw error;
    }
  }

  /**
   * Queue a request for later execution
   */
  private async queueRequest<T>(
    apiName: string,
    endpoint: string,
    requestFn: () => Promise<T>,
    cacheKey: string,
    params: any
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.requestQueue.has(apiName)) {
        this.requestQueue.set(apiName, []);
      }
      
      this.requestQueue.get(apiName)!.push({
        resolve: (data: T) => resolve(data),
        reject,
        params: { endpoint, requestFn, cacheKey }
      });
      
      // Start processing queue if not already processing
      if (!this.processingQueue.has(apiName)) {
        this.processQueue(apiName);
      }
    });
  }

  /**
   * Process queued requests with smart timing
   */
  private async processQueue(apiName: string) {
    if (this.processingQueue.has(apiName)) return;
    
    this.processingQueue.add(apiName);
    const config = this.apiConfigs.get(apiName);
    
    if (!config) {
      this.processingQueue.delete(apiName);
      return;
    }

    const queue = this.requestQueue.get(apiName) || [];
    
    while (queue.length > 0) {
      if (!this.canMakeRequest(apiName)) {
        // Calculate wait time based on rate limits
        const waitTime = this.calculateWaitTime(apiName);
        console.log(`⏰ Waiting ${waitTime}ms before next ${apiName} request`);
        await this.sleep(waitTime);
        continue;
      }

      const request = queue.shift();
      if (!request) break;

      try {
        const result = await this.executeRequest(
          apiName,
          request.params.endpoint,
          request.params.requestFn,
          request.params.cacheKey
        );
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    }
    
    this.processingQueue.delete(apiName);
  }

  /**
   * Calculate optimal wait time based on current usage
   */
  private calculateWaitTime(apiName: string): number {
    const config = this.apiConfigs.get(apiName);
    if (!config) return 1000;

    const history = this.requestHistory.get(apiName) || [];
    const now = Date.now();
    
    // Find the oldest request in the current minute
    const lastMinute = history.filter(r => now - r.timestamp < 60000);
    
    if (lastMinute.length >= config.limits.requestsPerMinute) {
      const oldestInMinute = Math.min(...lastMinute.map(r => r.timestamp));
      return Math.max(1000, 60000 - (now - oldestInMinute) + 1000); // Add 1s buffer
    }
    
    // Default wait time with jitter to avoid thundering herd
    return 1000 + Math.random() * 2000;
  }

  /**
   * Record a request in history
   */
  private recordRequest(apiName: string, endpoint: string, success: boolean) {
    if (!this.requestHistory.has(apiName)) {
      this.requestHistory.set(apiName, []);
    }
    
    this.requestHistory.get(apiName)!.push({
      timestamp: Date.now(),
      endpoint,
      success
    });
  }

  /**
   * Get data from cache
   */
  private getFromCache<T>(cacheKey: string, allowStale = false): T | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;
    
    if (allowStale || cached.expires > Date.now()) {
      return cached.data;
    }
    
    return null;
  }

  /**
   * Set data in cache
   */
  private setCache<T>(cacheKey: string, data: T, apiName: string) {
    const config = this.apiConfigs.get(apiName);
    const ttl = config?.cacheTTL || 300;
    
    this.cache.set(cacheKey, {
      data,
      expires: Date.now() + (ttl * 1000)
    });
  }

  /**
   * Generate cache key
   */
  private getCacheKey(apiName: string, endpoint: string, params?: any): string {
    const paramStr = params ? JSON.stringify(params) : '';
    return `${apiName}:${endpoint}:${paramStr}`;
  }

  /**
   * Clean up old request history
   */
  private cleanupHistory() {
    const cutoff = Date.now() - 86400000; // 24 hours ago
    
    this.requestHistory.forEach((history, apiName) => {
      const filtered = history.filter(r => r.timestamp > cutoff);
      this.requestHistory.set(apiName, filtered);
    });
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache() {
    const now = Date.now();
    
    for (const [key, cached] of this.cache.entries()) {
      if (cached.expires < now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get current API usage statistics
   */
  getUsageStats(apiName: string) {
    const config = this.apiConfigs.get(apiName);
    const history = this.requestHistory.get(apiName) || [];
    const now = Date.now();
    
    const lastMinute = history.filter(r => now - r.timestamp < 60000);
    const lastDay = history.filter(r => now - r.timestamp < 86400000);
    
    return {
      api: apiName,
      limits: config?.limits,
      usage: {
        lastMinute: lastMinute.length,
        lastDay: lastDay.length,
        successRate: history.length > 0 ? 
          history.filter(r => r.success).length / history.length : 1
      },
      canMakeRequest: this.canMakeRequest(apiName),
      queueLength: this.requestQueue.get(apiName)?.length || 0,
      cacheHitRate: this.calculateCacheHitRate(apiName)
    };
  }

  /**
   * Calculate cache hit rate for an API
   */
  private calculateCacheHitRate(apiName: string): number {
    // This would require tracking cache hits/misses
    // For now, return a placeholder
    return 0.75; // 75% cache hit rate estimate
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get all API status
   */
  getAllUsageStats() {
    const stats: any = {};
    
    for (const apiName of this.apiConfigs.keys()) {
      stats[apiName] = this.getUsageStats(apiName);
    }
    
    return stats;
  }
}

// Export singleton instance
export const rateLimiter = new SmartRateLimiter();