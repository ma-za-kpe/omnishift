import axios from 'axios';
import { rateLimiter } from './rateLimiter';

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  urlToImage?: string;
  category: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  impactScore: number;
}

export class NewsService {
  private baseUrl = '/api/news';

  // Optimized single request for all critical news
  async getAllCriticalNews(): Promise<NewsArticle[]> {
    return rateLimiter.request(
      'newsapi',
      'critical-news',
      async () => {
        // Smart batching: Get all defense/market news in one request
        const query = 'defense OR military OR lockheed OR boeing OR raytheon OR contracts OR market OR stocks OR trading';
        const response = await axios.get(`${this.baseUrl}?q=${encodeURIComponent(query)}`);
        
        if (response.data.success) {
          return response.data.data;
        }
        
        throw new Error('Critical news request failed');
      }
    );
  }

  async getDefenseNews(): Promise<NewsArticle[]> {
    return rateLimiter.request(
      'newsapi',
      'defense-news',
      async () => {
        const response = await axios.get(`${this.baseUrl}?q=defense+military+lockheed+boeing+raytheon+contracts`);
        
        if (response.data.success) {
          return response.data.data;
        }
        
        throw new Error('Defense news request failed');
      }
    );
  }

  async getEnergyNews(): Promise<NewsArticle[]> {
    return rateLimiter.request(
      'newsapi',
      'energy-news',
      async () => {
        const response = await axios.get(`${this.baseUrl}?q=oil+energy+gas+pipeline+opec+petroleum`);
        
        if (response.data.success) {
          return response.data.data;
        }
        
        throw new Error('Energy news request failed');
      }
    );
  }

  async getTechnologyNews(): Promise<NewsArticle[]> {
    return rateLimiter.request(
      'newsapi',
      'tech-news',
      async () => {
        const response = await axios.get(`${this.baseUrl}?q=tech+ai+cybersecurity+palantir+software+cloud`);
        
        if (response.data.success) {
          return response.data.data;
        }
        
        throw new Error('Technology news request failed');
      }
    );
  }

  async getMarketNews(): Promise<NewsArticle[]> {
    return rateLimiter.request(
      'newsapi',
      'market-news',
      async () => {
        const response = await axios.get(`${this.baseUrl}?q=stock+market+trading+investment+wall+street`);
        
        if (response.data.success) {
          return response.data.data;
        }
        
        throw new Error('Market news request failed');
      }
    );
  }

  // Optimized version - uses less API calls
  async getAllNews(): Promise<NewsArticle[]> {
    // Check if we should use the optimized single request
    const stats = rateLimiter.getUsageStats('newsapi');
    
    if (stats.usage.lastDay > 20) { // If we're running low on daily quota
      console.log('📰 Using optimized single news request to preserve API quota');
      return this.getAllCriticalNews();
    }

    // If we have plenty of quota, get detailed categorized news
    try {
      // Use sequential requests to respect rate limits
      const defense = await this.getDefenseNews();
      
      // Small delay between requests
      await this.sleep(2000);
      
      const market = await this.getMarketNews();

      // Combine and sort by impact score
      const allNews = [...defense, ...market];
      return allNews
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
        .slice(0, 20); // Return top 20 most recent
        
    } catch (error) {
      console.error('Error fetching all news:', error);
      
      // Fallback to cached data
      return this.getAllCriticalNews();
    }
  }

  // Get current API usage statistics
  getApiStats() {
    return rateLimiter.getUsageStats('newsapi');
  }

  // Check if we can make a request without hitting limits
  canMakeRequest(): boolean {
    return rateLimiter.getUsageStats('newsapi').canMakeRequest;
  }

  // Get priority news (most efficient)
  async getPriorityNews(): Promise<NewsArticle[]> {
    const stats = this.getApiStats();
    
    if (!stats.canMakeRequest) {
      console.log('📰 NewsAPI rate limited - returning cached data only');
      return [];
    }

    return this.getAllCriticalNews();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const newsService = new NewsService();