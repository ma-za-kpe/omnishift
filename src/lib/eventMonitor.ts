import axios from 'axios';
import { MarketEvent, EventCategory, Sector } from '@/types';
import { collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { aiAnalysisService } from './aiAnalysis';
import { huggingfaceNLP } from './huggingfaceNLP';

export class EventMonitorService {
  private newsApiKey: string;
  private gdeltBaseUrl = 'https://api.gdeltproject.org/api/v2/doc/doc';

  constructor() {
    this.newsApiKey = process.env.NEXT_PUBLIC_NEWS_API_KEY || '';
  }

  async fetchNewsEvents(): Promise<MarketEvent[]> {
    const events: MarketEvent[] = [];

    try {
      // Fetch from NewsAPI
      const newsResponse = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: 'stock market OR economy OR federal reserve OR earnings OR IPO',
          sortBy: 'publishedAt',
          language: 'en',
          apiKey: this.newsApiKey
        }
      });

      const articles = newsResponse.data.articles.slice(0, 20);
      
      for (const article of articles) {
        const event = await this.parseNewsArticle(article);
        if (event) {
          events.push(event);
        }
      }
    } catch (error) {
      console.error('Error fetching news events:', error);
    }

    return events;
  }

  private async parseNewsArticle(article: {
    title: string;
    description: string;
    source: { name: string };
    publishedAt: string;
  }): Promise<MarketEvent | null> {
    try {
      const fullText = article.title + ' ' + (article.description || '');
      
      // Use HuggingFace NLP for enhanced analysis
      const [sentimentResult, impactScore, entities] = await Promise.all([
        huggingfaceNLP.analyzeSentiment(fullText),
        huggingfaceNLP.analyzeImpactScore(fullText),
        huggingfaceNLP.extractFinancialEntities(fullText)
      ]);

      // Classify into financial categories
      const categories = ['defense', 'energy', 'technology', 'finance', 'healthcare', 'consumer', 'materials'];
      const classificationResults = await huggingfaceNLP.classifyCustom(fullText, categories);
      
      const keywords = this.extractKeywords(fullText);
      const category = this.categorizeEventWithNLP(classificationResults, keywords);
      const sectors = this.identifySectorsWithNLP(classificationResults, entities);
      
      // Map HuggingFace sentiment to our format
      const sentiment = sentimentResult.label.toLowerCase() as 'positive' | 'negative' | 'neutral';

      return {
        id: `news_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: article.title,
        source: article.source.name,
        timestamp: new Date(article.publishedAt),
        impactScore,
        category,
        relatedSectors: sectors,
        sentiment,
        keywords: keywords.slice(0, 5)
      };
    } catch (error) {
      console.error('Error parsing article with NLP:', error);
      // Fallback to simple analysis
      const keywords = this.extractKeywords(article.title + ' ' + (article.description || ''));
      const category = this.categorizeEvent(keywords);
      const sectors = this.identifySectors(keywords);
      const sentiment = this.analyzeSentiment(article.title + ' ' + (article.description || ''));
      const impactScore = this.calculateImpactScore(keywords, category);

      return {
        id: `news_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: article.title,
        source: article.source.name,
        timestamp: new Date(article.publishedAt),
        impactScore,
        category,
        relatedSectors: sectors,
        sentiment,
        keywords: keywords.slice(0, 5)
      };
    }
  }

  private extractKeywords(text: string): string[] {
    const commonWords = new Set(['the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'some', 'few', 'more', 'most', 'other', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once']);
    
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word));

    const wordFreq: Record<string, number> = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word)
      .slice(0, 10);
  }

  private categorizeEvent(keywords: string[]): EventCategory {
    const categoryKeywords: Record<EventCategory, string[]> = {
      'economic_policy': ['federal', 'reserve', 'inflation', 'rates', 'policy', 'monetary'],
      'market_movement': ['rally', 'crash', 'surge', 'plunge', 'volatility', 'correction'],
      'corporate_news': ['earnings', 'revenue', 'profit', 'acquisition', 'merger', 'ipo'],
      'regulatory': ['regulation', 'compliance', 'sec', 'investigation', 'lawsuit'],
      'technology': ['ai', 'artificial', 'software', 'chip', 'semiconductor', 'cloud'],
      'energy': ['oil', 'gas', 'energy', 'renewable', 'solar', 'wind'],
      'geopolitical': ['war', 'conflict', 'sanctions', 'trade', 'tariff', 'crisis']
    };

    let bestMatch: EventCategory = 'market_movement';
    let maxMatches = 0;

    for (const [category, catKeywords] of Object.entries(categoryKeywords)) {
      const matches = keywords.filter(kw => 
        catKeywords.some(ck => kw.includes(ck) || ck.includes(kw))
      ).length;
      
      if (matches > maxMatches) {
        maxMatches = matches;
        bestMatch = category as EventCategory;
      }
    }

    return bestMatch;
  }

  private identifySectors(keywords: string[]): Sector[] {
    const sectorKeywords: Record<Sector, string[]> = {
      'technology': ['tech', 'software', 'hardware', 'semiconductor', 'cloud', 'ai'],
      'defense': ['defense', 'military', 'aerospace', 'weapons'],
      'energy': ['oil', 'gas', 'energy', 'petroleum', 'renewable'],
      'financials': ['bank', 'finance', 'insurance', 'investment'],
      'healthcare': ['health', 'pharma', 'drug', 'medical', 'biotech'],
      'industrials': ['industrial', 'manufacturing', 'construction'],
      'consumer': ['retail', 'consumer', 'shopping', 'ecommerce'],
      'materials': ['materials', 'mining', 'chemical', 'steel'],
      'utilities': ['utility', 'electric', 'water', 'power'],
      'real_estate': ['real', 'estate', 'property', 'reit']
    };

    const sectors: Sector[] = [];
    
    for (const [sector, sectorKws] of Object.entries(sectorKeywords)) {
      if (keywords.some(kw => sectorKws.some(sk => kw.includes(sk) || sk.includes(kw)))) {
        sectors.push(sector as Sector);
      }
    }

    return sectors.length > 0 ? sectors : ['technology']; // Default to technology
  }

  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['surge', 'gain', 'rise', 'jump', 'soar', 'rally', 'boost', 'improve', 'growth', 'profit', 'beat', 'exceed', 'strong', 'bullish'];
    const negativeWords = ['fall', 'drop', 'decline', 'plunge', 'crash', 'loss', 'miss', 'weak', 'concern', 'fear', 'risk', 'bearish', 'recession', 'crisis'];

    const lowerText = text.toLowerCase();
    const positiveScore = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeScore = negativeWords.filter(word => lowerText.includes(word)).length;

    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }

  private calculateImpactScore(keywords: string[], category: EventCategory): number {
    const highImpactWords = ['crash', 'surge', 'plunge', 'crisis', 'war', 'federal', 'earnings'];
    const impactCount = keywords.filter(kw => 
      highImpactWords.some(hiw => kw.includes(hiw))
    ).length;

    const categoryWeights: Record<EventCategory, number> = {
      'economic_policy': 0.8,
      'market_movement': 0.9,
      'corporate_news': 0.6,
      'regulatory': 0.7,
      'technology': 0.6,
      'energy': 0.7,
      'geopolitical': 0.9
    };

    const baseScore = Math.min(0.3 + (impactCount * 0.2), 0.9);
    const categoryWeight = categoryWeights[category] || 0.5;
    
    return Math.min(baseScore * categoryWeight, 1.0);
  }

  /**
   * Enhanced event categorization using NLP classification results
   */
  private categorizeEventWithNLP(
    classificationResults: Array<{ label: string; score: number }>,
    keywords: string[]
  ): EventCategory {
    // Get the highest scoring classification
    const topClassification = classificationResults.reduce((max, curr) => 
      curr.score > max.score ? curr : max
    );

    // Map NLP classifications to our event categories
    const nlpToCategory: Record<string, EventCategory> = {
      'defense': 'geopolitical',
      'energy': 'energy',
      'technology': 'technology',
      'finance': 'corporate_news',
      'healthcare': 'corporate_news',
      'consumer': 'corporate_news',
      'materials': 'corporate_news'
    };

    // Use NLP result if confidence is high enough
    if (topClassification.score > 0.6) {
      const mappedCategory = nlpToCategory[topClassification.label];
      if (mappedCategory) {
        return mappedCategory;
      }
    }

    // Fallback to keyword-based categorization
    return this.categorizeEvent(keywords);
  }

  /**
   * Enhanced sector identification using NLP and entity extraction
   */
  private identifySectorsWithNLP(
    classificationResults: Array<{ label: string; score: number }>,
    entities: { companies: string[]; tickers: string[] }
  ): Sector[] {
    const sectors: Set<Sector> = new Set();

    // Map NLP classifications to sectors
    const nlpToSector: Record<string, Sector> = {
      'defense': 'defense',
      'energy': 'energy',
      'technology': 'technology',
      'finance': 'financials',
      'healthcare': 'healthcare',
      'consumer': 'consumer',
      'materials': 'materials'
    };

    // Add sectors based on high-confidence NLP classifications
    classificationResults.forEach(result => {
      if (result.score > 0.5 && nlpToSector[result.label]) {
        sectors.add(nlpToSector[result.label]);
      }
    });

    // Add sectors based on detected tickers
    const tickerToSector: Record<string, Sector> = {
      'LMT': 'defense', 'NOC': 'defense', 'RTX': 'defense', 'BA': 'defense',
      'XOM': 'energy', 'CVX': 'energy', 'COP': 'energy', 'PXD': 'energy',
      'AAPL': 'technology', 'MSFT': 'technology', 'GOOGL': 'technology', 'NVDA': 'technology',
      'JPM': 'financials', 'BAC': 'financials', 'WFC': 'financials',
      'JNJ': 'healthcare', 'PFE': 'healthcare', 'UNH': 'healthcare'
    };

    entities.tickers.forEach(ticker => {
      if (tickerToSector[ticker]) {
        sectors.add(tickerToSector[ticker]);
      }
    });

    return Array.from(sectors).slice(0, 3); // Limit to top 3 sectors
  }

  async saveEvent(event: MarketEvent): Promise<void> {
    try {
      await addDoc(collection(db, 'events'), {
        ...event,
        timestamp: event.timestamp
      });
    } catch (error) {
      console.error('Error saving event:', error);
    }
  }

  async getRecentEvents(limit: number = 50): Promise<MarketEvent[]> {
    try {
      const q = query(
        collection(db, 'events'),
        orderBy('timestamp', 'desc'),
        limit(limit)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        timestamp: doc.data().timestamp.toDate()
      } as MarketEvent));
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  }

  async getHighImpactEvents(): Promise<MarketEvent[]> {
    try {
      const q = query(
        collection(db, 'events'),
        where('impactScore', '>=', 0.7),
        orderBy('impactScore', 'desc'),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        timestamp: doc.data().timestamp.toDate()
      } as MarketEvent));
    } catch (error) {
      console.error('Error fetching high impact events:', error);
      return [];
    }
  }
}

export const eventMonitorService = new EventMonitorService();