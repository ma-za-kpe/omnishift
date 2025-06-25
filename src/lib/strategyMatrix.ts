/**
 * Strategy Impact Matrix - Core Trading Logic
 * Maps geopolitical events, vessel tracking, and market conditions to specific stock recommendations
 */

import { openSeaMapService } from './openSeaMap';

export interface EventImpact {
  eventType: string;
  keywords: string[];
  recommendedStocks: StockRecommendation[];
  sector: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  timeframe: string;
  confidenceThreshold: number;
}

export interface StockRecommendation {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  weight: number; // Portfolio allocation %
  targetPrice?: number;
  expectedReturn: number;
  stopLoss?: number;
  reasoning: string;
}

export interface TriggeredRecommendation {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  currentPrice: number;
  targetPrice: number;
  expectedReturn: number;
  confidence: number;
  triggerEvent: string;
  eventScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  timeframe: string;
  reasoning: string;
  timestamp: string;
  expiresAt: string;
}

/**
 * Core Strategy Matrix - Maps Events to Stock Opportunities
 */
export const STRATEGY_MATRIX: EventImpact[] = [
  // DEFENSE & MILITARY EVENTS
  {
    eventType: 'DEFENSE_CONTRACT_AWARD',
    keywords: ['defense contract', 'military contract', 'pentagon award', 'billion contract', 'defense spending'],
    sector: 'defense',
    riskLevel: 'MEDIUM',
    timeframe: '30-90 days',
    confidenceThreshold: 0.7,
    recommendedStocks: [
      {
        symbol: 'LMT',
        action: 'BUY',
        weight: 35,
        expectedReturn: 12,
        reasoning: 'Lockheed Martin benefits from major defense contracts, especially missile/aerospace systems'
      },
      {
        symbol: 'NOC',
        action: 'BUY', 
        weight: 25,
        expectedReturn: 10,
        reasoning: 'Northrop Grumman strong in defense technology and cyber warfare contracts'
      },
      {
        symbol: 'RTX',
        action: 'BUY',
        weight: 20,
        expectedReturn: 8,
        reasoning: 'Raytheon Technologies benefits from weapons systems and defense electronics'
      },
      {
        symbol: 'PLTR',
        action: 'BUY',
        weight: 20,
        expectedReturn: 15,
        reasoning: 'Palantir provides AI/data analytics for defense and intelligence agencies'
      }
    ]
  },

  // GEOPOLITICAL TENSION EVENTS
  {
    eventType: 'MIDDLE_EAST_TENSION',
    keywords: ['middle east crisis', 'israel iran', 'oil threat', 'strait hormuz', 'saudi tension'],
    sector: 'energy',
    riskLevel: 'HIGH',
    timeframe: '7-30 days',
    confidenceThreshold: 0.6,
    recommendedStocks: [
      {
        symbol: 'XOM',
        action: 'BUY',
        weight: 30,
        expectedReturn: 15,
        reasoning: 'ExxonMobil benefits from oil price spikes during Middle East tensions and geopolitical instability'
      },
      {
        symbol: 'COP',
        action: 'BUY',
        weight: 25,
        expectedReturn: 15,
        reasoning: 'ConocoPhillips has strong oil production capabilities to benefit from supply disruptions'
      },
      {
        symbol: 'XOM',
        action: 'BUY',
        weight: 20,
        expectedReturn: 12,
        reasoning: 'ExxonMobil benefits from higher oil prices during geopolitical crises'
      },
      {
        symbol: 'USO',
        action: 'BUY',
        weight: 25,
        expectedReturn: 25,
        reasoning: 'Oil ETF directly benefits from crude price increases during supply fears'
      }
    ]
  },

  // TECHNOLOGY & CYBERSECURITY EVENTS  
  {
    eventType: 'CYBER_ATTACK_INCIDENT',
    keywords: ['cyber attack', 'ransomware', 'data breach', 'cybersecurity threat', 'hacking incident'],
    sector: 'technology',
    riskLevel: 'MEDIUM',
    timeframe: '14-60 days',
    confidenceThreshold: 0.65,
    recommendedStocks: [
      {
        symbol: 'CRWD',
        action: 'BUY',
        weight: 40,
        expectedReturn: 20,
        reasoning: 'CrowdStrike is a leading cybersecurity platform that benefits from increased security spending'
      },
      {
        symbol: 'PLTR',
        action: 'BUY',
        weight: 30,
        expectedReturn: 18,
        reasoning: 'Palantir provides security analytics and threat detection for government and enterprise'
      },
      {
        symbol: 'FTNT',
        action: 'BUY',
        weight: 30,
        expectedReturn: 15,
        reasoning: 'Fortinet provides network security solutions that see increased demand after attacks'
      }
    ]
  },

  // CHIP ACT & SEMICONDUCTOR EVENTS
  {
    eventType: 'SEMICONDUCTOR_POLICY',
    keywords: ['chips act', 'semiconductor funding', 'chip manufacturing', 'taiwan tension', 'chip shortage'],
    sector: 'technology',
    riskLevel: 'MEDIUM',
    timeframe: '60-180 days',
    confidenceThreshold: 0.7,
    recommendedStocks: [
      {
        symbol: 'MU',
        action: 'BUY',
        weight: 25,
        expectedReturn: 22,
        reasoning: 'Micron Technology benefits from memory chip demand and domestic manufacturing incentives'
      },
      {
        symbol: 'NVDA',
        action: 'BUY',
        weight: 25,
        expectedReturn: 20,
        reasoning: 'NVIDIA benefits from AI chip demand and semiconductor manufacturing initiatives'
      },
      {
        symbol: 'AMD',
        action: 'BUY',
        weight: 25,
        expectedReturn: 18,
        reasoning: 'AMD benefits from CPU/GPU demand and domestic chip production initiatives'
      },
      {
        symbol: 'INTC',
        action: 'BUY',
        weight: 25,
        expectedReturn: 15,
        reasoning: 'Intel benefits directly from CHIPS Act funding for domestic manufacturing'
      }
    ]
  },

  // ENERGY INFRASTRUCTURE EVENTS
  {
    eventType: 'ENERGY_INFRASTRUCTURE_DISRUPTION',
    keywords: ['pipeline disruption', 'refinery incident', 'energy crisis', 'power grid', 'lng export'],
    sector: 'energy',
    riskLevel: 'HIGH',
    timeframe: '7-45 days',
    confidenceThreshold: 0.6,
    recommendedStocks: [
      {
        symbol: 'ENB',
        action: 'BUY',
        weight: 30,
        expectedReturn: 12,
        reasoning: 'Enbridge operates critical pipeline infrastructure and benefits from supply constraints'
      },
      {
        symbol: 'KMI',
        action: 'BUY',
        weight: 25,
        expectedReturn: 10,
        reasoning: 'Kinder Morgan pipeline network benefits from energy infrastructure bottlenecks'
      },
      {
        symbol: 'LNG',
        action: 'BUY',
        weight: 25,
        expectedReturn: 15,
        reasoning: 'Cheniere Energy benefits from increased LNG export demand during energy crises'
      },
      {
        symbol: 'XLE',
        action: 'BUY',
        weight: 20,
        expectedReturn: 13,
        reasoning: 'Energy sector ETF provides broad exposure to energy infrastructure beneficiaries'
      }
    ]
  },

  // MARKET VOLATILITY EVENTS
  {
    eventType: 'MARKET_VOLATILITY_SPIKE',
    keywords: ['vix spike', 'market crash', 'volatility surge', 'fear index', 'market uncertainty'],
    sector: 'financials',
    riskLevel: 'HIGH',
    timeframe: '3-21 days',
    confidenceThreshold: 0.8,
    recommendedStocks: [
      {
        symbol: 'VXX',
        action: 'BUY',
        weight: 40,
        expectedReturn: 30,
        reasoning: 'VIX ETF benefits directly from volatility spikes and market fear'
      },
      {
        symbol: 'UVXY',
        action: 'BUY',
        weight: 30,
        expectedReturn: 50,
        reasoning: 'Leveraged VIX ETF provides amplified exposure to volatility increases'
      },
      {
        symbol: 'GLD',
        action: 'BUY',
        weight: 30,
        expectedReturn: 8,
        reasoning: 'Gold ETF serves as safe haven during market turbulence and uncertainty'
      }
    ]
  },

  // TRADE WAR & SANCTIONS EVENTS
  {
    eventType: 'TRADE_WAR_ESCALATION',
    keywords: ['trade war', 'tariffs', 'sanctions', 'trade dispute', 'export restrictions'],
    sector: 'industrials',
    riskLevel: 'HIGH',
    timeframe: '30-120 days',
    confidenceThreshold: 0.65,
    recommendedStocks: [
      {
        symbol: 'CAT',
        action: 'SELL',
        weight: -25,
        expectedReturn: -10,
        reasoning: 'Caterpillar vulnerable to trade disruptions affecting global industrial demand'
      },
      {
        symbol: 'DE',
        action: 'SELL',
        weight: -20,
        expectedReturn: -8,
        reasoning: 'Deere & Company affected by agricultural trade tensions and tariff impacts'
      },
      {
        symbol: 'DXY',
        action: 'BUY',
        weight: 30,
        expectedReturn: 5,
        reasoning: 'Dollar index typically strengthens during trade tensions as safe haven currency'
      },
      {
        symbol: 'GLD',
        action: 'BUY',
        weight: 20,
        expectedReturn: 12,
        reasoning: 'Gold benefits from trade uncertainty and potential currency devaluation'
      }
    ]
  },

  // VESSEL TRACKING & SHIPPING EVENTS
  {
    eventType: 'SHIPPING_CONGESTION',
    keywords: ['shipping congestion', 'vessel traffic', 'port delays', 'supply chain disruption', 'canal blockage'],
    sector: 'energy',
    riskLevel: 'MEDIUM',
    timeframe: '3-14 days',
    confidenceThreshold: 0.7,
    recommendedStocks: [
      {
        symbol: 'XOM',
        action: 'BUY',
        weight: 30,
        expectedReturn: 12,
        reasoning: 'Oil prices rise due to shipping delays affecting global energy supply chains'
      },
      {
        symbol: 'COP',
        action: 'BUY',
        weight: 25,
        expectedReturn: 10,
        reasoning: 'ConocoPhillips benefits from oil price increases during shipping disruptions'
      },
      {
        symbol: 'STNG',
        action: 'BUY',
        weight: 20,
        expectedReturn: 15,
        reasoning: 'Scorpio Tankers benefits from increased oil tanker demand during congestion'
      },
      {
        symbol: 'FRO',
        action: 'BUY',
        weight: 25,
        expectedReturn: 18,
        reasoning: 'Frontline tanker rates increase during shipping bottlenecks and route diversions'
      }
    ]
  },

  {
    eventType: 'SUEZ_CANAL_DISRUPTION',
    keywords: ['suez canal', 'canal blocked', 'shipping route', 'mediterranean', 'red sea'],
    sector: 'energy',
    riskLevel: 'HIGH',
    timeframe: '1-7 days',
    confidenceThreshold: 0.8,
    recommendedStocks: [
      {
        symbol: 'XOM',
        action: 'BUY',
        weight: 35,
        expectedReturn: 20,
        reasoning: 'Suez Canal disruption creates immediate oil supply shock affecting global markets'
      },
      {
        symbol: 'CVX',
        action: 'BUY',
        weight: 30,
        expectedReturn: 18,
        reasoning: 'Chevron benefits from oil price spikes during major shipping route disruptions'
      },
      {
        symbol: 'TNK',
        action: 'BUY',
        weight: 20,
        expectedReturn: 25,
        reasoning: 'Teekay tankers see massive rate increases during Suez Canal blockages'
      },
      {
        symbol: 'EURN',
        action: 'BUY',
        weight: 15,
        expectedReturn: 22,
        reasoning: 'Euronav tanker demand spikes as ships reroute around Africa'
      }
    ]
  },

  {
    eventType: 'STRAIT_OF_HORMUZ_TENSION',
    keywords: ['strait of hormuz', 'persian gulf', 'iran threat', 'naval blockade', 'oil chokepoint'],
    sector: 'energy',
    riskLevel: 'CRITICAL',
    timeframe: '1-5 days',
    confidenceThreshold: 0.9,
    recommendedStocks: [
      {
        symbol: 'XOM',
        action: 'BUY',
        weight: 40,
        expectedReturn: 25,
        reasoning: 'Strait of Hormuz handles 20% of global oil - any threat causes major price spikes'
      },
      {
        symbol: 'CVX',
        action: 'BUY',
        weight: 30,
        expectedReturn: 22,
        reasoning: 'Chevron major beneficiary of oil price increases from Hormuz tensions'
      },
      {
        symbol: 'LMT',
        action: 'BUY',
        weight: 20,
        expectedReturn: 15,
        reasoning: 'Lockheed Martin defense systems in demand for Persian Gulf security'
      },
      {
        symbol: 'NOC',
        action: 'BUY',
        weight: 10,
        expectedReturn: 12,
        reasoning: 'Northrop Grumman naval systems benefit from increased maritime security needs'
      }
    ]
  }
];

/**
 * Strategy Matrix Engine - Analyzes events and generates recommendations
 */
export class StrategyMatrixEngine {
  
  /**
   * Analyze current events and generate stock recommendations
   */
  async generateRecommendations(
    newsArticles: any[],
    geopoliticalEvents: any[],
    marketData: any
  ): Promise<TriggeredRecommendation[]> {
    const recommendations: TriggeredRecommendation[] = [];
    const processedEvents = new Set<string>();

    // Analyze news articles for strategy triggers
    newsArticles.forEach(article => {
      const triggers = this.findStrategyTriggers(article);
      triggers.forEach(trigger => {
        const key = `${trigger.eventType}-${trigger.symbol}`;
        if (!processedEvents.has(key)) {
          recommendations.push(trigger);
          processedEvents.add(key);
        }
      });
    });

    // Analyze geopolitical events
    geopoliticalEvents.forEach(event => {
      const triggers = this.findGeopoliticalTriggers(event);
      triggers.forEach(trigger => {
        const key = `${trigger.triggerEvent}-${trigger.symbol}`;
        if (!processedEvents.has(key)) {
          recommendations.push(trigger);
          processedEvents.add(key);
        }
      });
    });

    // NEW: Analyze vessel tracking and maritime events
    try {
      const maritimeEvents = await openSeaMapService.detectMaritimeEvents();
      maritimeEvents.forEach(event => {
        const triggers = this.findMaritimeTriggers(event);
        triggers.forEach(trigger => {
          const key = `${trigger.triggerEvent}-${trigger.symbol}`;
          if (!processedEvents.has(key)) {
            recommendations.push(trigger);
            processedEvents.add(key);
          }
        });
      });
    } catch (error) {
      console.error('Failed to analyze maritime events:', error);
    }

    // Analyze market volatility
    if (marketData && marketData.indicators) {
      const volatilityTriggers = this.findVolatilityTriggers(marketData.indicators);
      volatilityTriggers.forEach(trigger => {
        const key = `volatility-${trigger.symbol}`;
        if (!processedEvents.has(key)) {
          recommendations.push(trigger);
          processedEvents.add(key);
        }
      });
    }

    // Sort by confidence and expected return
    return recommendations
      .sort((a, b) => (b.confidence * b.expectedReturn) - (a.confidence * a.expectedReturn))
      .slice(0, 10); // Return top 10 recommendations
  }

  /**
   * Find strategy triggers from news articles
   */
  private findStrategyTriggers(article: any): TriggeredRecommendation[] {
    const recommendations: TriggeredRecommendation[] = [];
    const content = `${article.title || ''} ${article.description || ''}`.toLowerCase();
    
    STRATEGY_MATRIX.forEach(strategy => {
      const matchScore = this.calculateKeywordMatch(content, strategy.keywords);
      
      if (matchScore >= strategy.confidenceThreshold) {
        strategy.recommendedStocks.forEach(stock => {
          recommendations.push(this.createRecommendation(
            stock,
            strategy,
            article,
            matchScore,
            'NEWS_ANALYSIS'
          ));
        });
      }
    });

    return recommendations;
  }

  /**
   * Find geopolitical event triggers
   */
  private findGeopoliticalTriggers(event: any): TriggeredRecommendation[] {
    const recommendations: TriggeredRecommendation[] = [];
    const eventText = `${event.title || ''} ${event.description || ''}`.toLowerCase();
    
    // Map geopolitical regions to strategy types
    const regionStrategyMap: Record<string, string> = {
      'middle east': 'MIDDLE_EAST_TENSION',
      'cyber': 'CYBER_ATTACK_INCIDENT',
      'defense': 'DEFENSE_CONTRACT_AWARD'
    };

    const eventType = regionStrategyMap[event.eventType] || 
                     regionStrategyMap[event.region?.toLowerCase()] ||
                     'GEOPOLITICAL_TENSION';

    const strategy = STRATEGY_MATRIX.find(s => s.eventType === eventType);
    
    if (strategy && event.impactScore >= strategy.confidenceThreshold) {
      strategy.recommendedStocks.forEach(stock => {
        recommendations.push(this.createRecommendation(
          stock,
          strategy,
          event,
          event.impactScore,
          'GEOPOLITICAL_ANALYSIS'
        ));
      });
    }

    return recommendations;
  }

  /**
   * Find market volatility triggers
   */
  private findVolatilityTriggers(indicators: any[]): TriggeredRecommendation[] {
    const recommendations: TriggeredRecommendation[] = [];
    
    const vixIndicator = indicators.find(i => i.name === 'VIX');
    if (vixIndicator && vixIndicator.value > 25) { // VIX > 25 indicates high volatility
      const strategy = STRATEGY_MATRIX.find(s => s.eventType === 'MARKET_VOLATILITY_SPIKE');
      
      if (strategy) {
        const volatilityScore = Math.min(vixIndicator.value / 50, 1); // Normalize to 0-1
        
        strategy.recommendedStocks.forEach(stock => {
          recommendations.push(this.createRecommendation(
            stock,
            strategy,
            { title: `VIX Volatility Spike: ${vixIndicator.value}`, type: 'MARKET_INDICATOR' },
            volatilityScore,
            'VOLATILITY_ANALYSIS'
          ));
        });
      }
    }

    return recommendations;
  }

  /**
   * Find maritime event triggers from vessel tracking data
   */
  private findMaritimeTriggers(event: any): TriggeredRecommendation[] {
    const recommendations: TriggeredRecommendation[] = [];
    
    // Map maritime event types to strategy types
    const maritimeStrategyMap: Record<string, string> = {
      'CONGESTION': 'SHIPPING_CONGESTION',
      'MILITARY_MOVEMENT': 'STRAIT_OF_HORMUZ_TENSION',
      'BLOCKADE': 'SUEZ_CANAL_DISRUPTION',
      'INCIDENT': 'SHIPPING_CONGESTION',
      'ROUTE_CHANGE': 'SHIPPING_CONGESTION'
    };

    // Determine strategy type based on event type and region
    let strategyType = maritimeStrategyMap[event.type];
    
    // Specific region-based overrides
    if (event.region === 'suez_canal') {
      strategyType = 'SUEZ_CANAL_DISRUPTION';
    } else if (event.region === 'strait_of_hormuz') {
      strategyType = 'STRAIT_OF_HORMUZ_TENSION';
    }

    const strategy = STRATEGY_MATRIX.find(s => s.eventType === strategyType);
    
    if (strategy && event.impactScore >= strategy.confidenceThreshold) {
      strategy.recommendedStocks.forEach(stock => {
        recommendations.push(this.createRecommendation(
          stock,
          strategy,
          {
            title: `Maritime Event: ${event.description}`,
            region: event.region,
            vesselsAffected: event.vesselsAffected,
            economicImpact: event.economicImpact
          },
          event.impactScore,
          'MARITIME_ANALYSIS'
        ));
      });
    }

    return recommendations;
  }

  /**
   * Calculate keyword match score
   */
  private calculateKeywordMatch(content: string, keywords: string[]): number {
    let matchCount = 0;
    keywords.forEach(keyword => {
      if (content.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    });
    return matchCount / keywords.length;
  }

  /**
   * Create a triggered recommendation
   */
  private createRecommendation(
    stock: StockRecommendation,
    strategy: EventImpact,
    triggerEvent: any,
    confidence: number,
    analysisType: string
  ): TriggeredRecommendation {
    const now = new Date();
    const expirationHours = this.getExpirationHours(strategy.timeframe);
    const expiresAt = new Date(now.getTime() + expirationHours * 60 * 60 * 1000);

    return {
      id: `rec_${Date.now()}_${stock.symbol}`,
      symbol: stock.symbol,
      action: stock.action,
      currentPrice: 0, // Will be populated with real price
      targetPrice: stock.targetPrice || 0,
      expectedReturn: stock.expectedReturn,
      confidence: Math.round(confidence * 100) / 100,
      triggerEvent: triggerEvent.title || triggerEvent.eventType || 'Unknown Event',
      eventScore: triggerEvent.impactScore || confidence,
      riskLevel: strategy.riskLevel,
      timeframe: strategy.timeframe,
      reasoning: `${analysisType}: ${stock.reasoning}`,
      timestamp: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };
  }

  /**
   * Convert timeframe string to hours
   */
  private getExpirationHours(timeframe: string): number {
    if (timeframe.includes('day')) {
      const days = parseInt(timeframe.match(/\d+/)?.[0] || '30');
      return days * 24;
    }
    return 24 * 30; // Default 30 days
  }

  /**
   * Get strategy for specific event type
   */
  getStrategyForEvent(eventType: string): EventImpact | undefined {
    return STRATEGY_MATRIX.find(strategy => strategy.eventType === eventType);
  }

  /**
   * Get all supported event types
   */
  getSupportedEventTypes(): string[] {
    return STRATEGY_MATRIX.map(strategy => strategy.eventType);
  }
}

// Export singleton instance
export const strategyEngine = new StrategyMatrixEngine();