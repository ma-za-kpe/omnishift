/**
 * Recommendation Engine - Generates Real-Time Trading Recommendations
 * Integrates Strategy Matrix with Live Market Data
 */

import { strategyEngine, TriggeredRecommendation } from './strategyMatrix';
import { smartDataManager } from './smartDataManager';
import { marketDataService } from './marketData';
import { huggingfaceNLP } from './huggingfaceNLP';

export interface EnrichedRecommendation extends TriggeredRecommendation {
  currentPrice: number;
  targetPrice: number;
  potentialGain: number;
  potentialGainPercent: number;
  riskAdjustedReturn: number;
  alertLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  marketCap?: number;
  volume?: number;
  dayChange?: number;
  dayChangePercent?: number;
  nlpSentiment?: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  nlpConfidence?: number;
  nlpImpactScore?: number;
}

export interface RecommendationAlert {
  id: string;
  type: 'BUY' | 'SELL' | 'ALERT';
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  title: string;
  message: string;
  recommendation: EnrichedRecommendation;
  timestamp: string;
  isRead: boolean;
}

export interface PortfolioAllocation {
  symbol: string;
  recommendedWeight: number;
  currentWeight: number;
  action: 'INCREASE' | 'DECREASE' | 'MAINTAIN';
  targetShares: number;
  estimatedCost: number;
}

/**
 * Recommendation Engine Service
 */
export class RecommendationEngineService {
  private activeRecommendations: EnrichedRecommendation[] = [];
  private recommendationHistory: EnrichedRecommendation[] = [];
  private alertQueue: RecommendationAlert[] = [];

  /**
   * Generate fresh recommendations based on current market conditions
   */
  async generateRecommendations(): Promise<EnrichedRecommendation[]> {
    try {
      console.log('🎯 Generating fresh trading recommendations...');

      // Get latest market data
      const [marketData, newsData, geopoliticalData] = await Promise.all([
        smartDataManager.getMarketData(),
        smartDataManager.getNewsData(), 
        this.getGeopoliticalData()
      ]);

      // Generate base recommendations from strategy matrix
      const baseRecommendations = await strategyEngine.generateRecommendations(
        [...(newsData.defense || []), ...(newsData.market || [])],
        geopoliticalData,
        marketData
      );

      console.log(`📊 Generated ${baseRecommendations.length} base recommendations`);

      // Enrich recommendations with live market data
      const enrichedRecommendations = await this.enrichRecommendations(baseRecommendations);

      // Filter and rank recommendations
      const filteredRecommendations = this.filterAndRankRecommendations(enrichedRecommendations);

      // Update active recommendations
      this.activeRecommendations = filteredRecommendations;
      this.recommendationHistory.push(...filteredRecommendations);

      // Generate alerts for high-confidence recommendations
      this.generateAlerts(filteredRecommendations);

      console.log(`✅ Final recommendations: ${filteredRecommendations.length}`);
      return filteredRecommendations;

    } catch (error) {
      console.error('❌ Failed to generate recommendations:', error);
      return [];
    }
  }

  /**
   * Enrich recommendations with live market data
   */
  private async enrichRecommendations(
    recommendations: TriggeredRecommendation[]
  ): Promise<EnrichedRecommendation[]> {
    const enriched: EnrichedRecommendation[] = [];

    for (const rec of recommendations) {
      try {
        // Get live stock data
        const stockData = await marketDataService.getStockQuote(rec.symbol);
        
        if (stockData) {
          const currentPrice = stockData.currentPrice;
          const targetPrice = this.calculateTargetPrice(currentPrice, rec.expectedReturn, rec.action);
          const potentialGain = rec.action === 'BUY' ? 
            targetPrice - currentPrice : 
            currentPrice - targetPrice;
          const potentialGainPercent = (potentialGain / currentPrice) * 100;
          
          // Enhanced NLP analysis for the recommendation
          const nlpAnalysis = await this.performNLPAnalysis(rec);
          
          const riskAdjustedReturn = this.calculateRiskAdjustedReturn(
            potentialGainPercent, 
            rec.riskLevel, 
            rec.confidence,
            nlpAnalysis.nlpConfidence
          );

          enriched.push({
            ...rec,
            currentPrice,
            targetPrice,
            potentialGain,
            potentialGainPercent,
            riskAdjustedReturn,
            alertLevel: this.determineAlertLevel(rec.confidence, potentialGainPercent, rec.riskLevel),
            marketCap: stockData.marketCap,
            volume: stockData.volume,
            dayChange: stockData.dayChange,
            dayChangePercent: stockData.dayChangePercent,
            ...nlpAnalysis
          });
        }
      } catch (error) {
        console.error(`Failed to enrich recommendation for ${rec.symbol}:`, error);
      }
    }

    return enriched;
  }

  /**
   * Calculate target price based on expected return
   */
  private calculateTargetPrice(currentPrice: number, expectedReturn: number, action: string): number {
    const multiplier = action === 'BUY' ? (1 + expectedReturn / 100) : (1 - expectedReturn / 100);
    return Number((currentPrice * multiplier).toFixed(2));
  }

  /**
   * Calculate risk-adjusted return with NLP enhancement
   */
  private calculateRiskAdjustedReturn(
    expectedReturn: number, 
    riskLevel: string, 
    confidence: number,
    nlpConfidence?: number
  ): number {
    const riskMultiplier = {
      'LOW': 0.9,
      'MEDIUM': 0.7,
      'HIGH': 0.5
    }[riskLevel] || 0.7;

    // Boost confidence with NLP analysis
    const enhancedConfidence = nlpConfidence ? 
      (confidence * 0.7 + nlpConfidence * 0.3) : confidence;

    return Number((expectedReturn * enhancedConfidence * riskMultiplier).toFixed(2));
  }

  /**
   * Perform NLP analysis on recommendation context
   */
  private async performNLPAnalysis(rec: TriggeredRecommendation): Promise<{
    nlpSentiment?: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    nlpConfidence?: number;
    nlpImpactScore?: number;
  }> {
    try {
      // Build context text for NLP analysis
      const contextText = `${rec.triggerEvent} affects ${rec.symbol} stock. ${rec.reasoning}`;
      
      // Perform parallel NLP analysis
      const [sentimentResult, impactScore] = await Promise.all([
        huggingfaceNLP.analyzeSentiment(contextText),
        huggingfaceNLP.analyzeImpactScore(contextText)
      ]);

      return {
        nlpSentiment: sentimentResult.label,
        nlpConfidence: sentimentResult.score,
        nlpImpactScore: impactScore
      };
    } catch (error) {
      console.error('NLP analysis failed for recommendation:', error);
      return {}; // Return empty object on failure
    }
  }

  /**
   * Determine alert level based on recommendation strength
   */
  private determineAlertLevel(
    confidence: number, 
    expectedReturn: number, 
    riskLevel: string
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
    const score = confidence * Math.abs(expectedReturn) * (riskLevel === 'LOW' ? 1.2 : riskLevel === 'HIGH' ? 0.8 : 1);
    
    if (score > 15) return 'URGENT';
    if (score > 10) return 'HIGH';
    if (score > 5) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Filter and rank recommendations by quality
   */
  private filterAndRankRecommendations(
    recommendations: EnrichedRecommendation[]
  ): EnrichedRecommendation[] {
    return recommendations
      .filter(rec => {
        // Filter out low-quality recommendations
        return rec.confidence >= 0.4 && 
               Math.abs(rec.potentialGainPercent) >= 3 && // At least 3% potential gain
               rec.currentPrice > 0;
      })
      .sort((a, b) => {
        // Sort by risk-adjusted return
        return b.riskAdjustedReturn - a.riskAdjustedReturn;
      })
      .slice(0, 15); // Top 15 recommendations
  }

  /**
   * Generate alerts for high-confidence recommendations
   */
  private generateAlerts(recommendations: EnrichedRecommendation[]): void {
    recommendations
      .filter(rec => rec.alertLevel === 'HIGH' || rec.alertLevel === 'URGENT')
      .forEach(rec => {
        const alert: RecommendationAlert = {
          id: `alert_${Date.now()}_${rec.symbol}`,
          type: rec.action as 'BUY' | 'SELL',
          urgency: rec.alertLevel,
          title: `${rec.action} Signal: ${rec.symbol}`,
          message: `${rec.action} ${rec.symbol} at $${rec.currentPrice} | Target: $${rec.targetPrice} | Expected Return: ${rec.potentialGainPercent.toFixed(1)}%`,
          recommendation: rec,
          timestamp: new Date().toISOString(),
          isRead: false
        };

        this.alertQueue.push(alert);
      });

    // Keep only last 50 alerts
    this.alertQueue = this.alertQueue.slice(-50);
  }

  /**
   * Get geopolitical data for analysis
   */
  private async getGeopoliticalData(): Promise<any[]> {
    try {
      const regions = ['middle_east', 'europe', 'asia', 'americas'];
      const allEvents = [];

      for (const region of regions) {
        try {
          const events = await smartDataManager.getGeopoliticalData(region);
          allEvents.push(...events);
        } catch (error) {
          console.log(`Failed to get geopolitical data for ${region}`);
        }
      }

      return allEvents;
    } catch (error) {
      console.error('Failed to get geopolitical data:', error);
      return [];
    }
  }

  /**
   * Calculate portfolio allocation recommendations
   */
  async calculatePortfolioAllocation(
    currentPortfolio: any[], 
    availableCash: number
  ): Promise<PortfolioAllocation[]> {
    const recommendations = await this.getActiveRecommendations();
    const allocations: PortfolioAllocation[] = [];
    
    // Group recommendations by symbol
    const symbolRecommendations = new Map<string, EnrichedRecommendation[]>();
    recommendations.forEach(rec => {
      const existing = symbolRecommendations.get(rec.symbol) || [];
      existing.push(rec);
      symbolRecommendations.set(rec.symbol, existing);
    });

    // Calculate recommended allocations
    symbolRecommendations.forEach((recs, symbol) => {
      const bestRec = recs.sort((a, b) => b.riskAdjustedReturn - a.riskAdjustedReturn)[0];
      const currentHolding = currentPortfolio.find(h => h.symbol === symbol);
      const currentWeight = currentHolding ? 
        (currentHolding.shares * bestRec.currentPrice) / (availableCash + this.calculatePortfolioValue(currentPortfolio)) * 100 : 0;

      // Calculate recommended weight (simplified allocation model)
      const recommendedWeight = Math.min(
        bestRec.riskAdjustedReturn / 2, // Weight based on risk-adjusted return
        bestRec.riskLevel === 'LOW' ? 15 : bestRec.riskLevel === 'MEDIUM' ? 10 : 5 // Max weight by risk level
      );

      const targetShares = Math.floor((availableCash * recommendedWeight / 100) / bestRec.currentPrice);
      const estimatedCost = targetShares * bestRec.currentPrice;

      if (targetShares > 0) {
        allocations.push({
          symbol,
          recommendedWeight,
          currentWeight,
          action: recommendedWeight > currentWeight ? 'INCREASE' : 
                 recommendedWeight < currentWeight ? 'DECREASE' : 'MAINTAIN',
          targetShares,
          estimatedCost
        });
      }
    });

    return allocations.sort((a, b) => b.recommendedWeight - a.recommendedWeight);
  }

  /**
   * Calculate total portfolio value
   */
  private calculatePortfolioValue(portfolio: any[]): number {
    return portfolio.reduce((total, holding) => {
      return total + (holding.shares * holding.currentPrice);
    }, 0);
  }

  /**
   * Get active recommendations
   */
  async getActiveRecommendations(): Promise<EnrichedRecommendation[]> {
    // Filter out expired recommendations
    const now = new Date();
    this.activeRecommendations = this.activeRecommendations.filter(rec => 
      new Date(rec.expiresAt) > now
    );

    return this.activeRecommendations;
  }

  /**
   * Get pending alerts
   */
  getPendingAlerts(): RecommendationAlert[] {
    return this.alertQueue.filter(alert => !alert.isRead);
  }

  /**
   * Mark alert as read
   */
  markAlertAsRead(alertId: string): void {
    const alert = this.alertQueue.find(a => a.id === alertId);
    if (alert) {
      alert.isRead = true;
    }
  }

  /**
   * Get recommendation history
   */
  getRecommendationHistory(): EnrichedRecommendation[] {
    return this.recommendationHistory.slice(-100); // Last 100 recommendations
  }

  /**
   * Get recommendations for specific symbol
   */
  getRecommendationsForSymbol(symbol: string): EnrichedRecommendation[] {
    return this.activeRecommendations.filter(rec => rec.symbol === symbol);
  }

  /**
   * Force refresh recommendations
   */
  async refreshRecommendations(): Promise<EnrichedRecommendation[]> {
    console.log('🔄 Force refreshing recommendations...');
    return this.generateRecommendations();
  }
}

// Export singleton instance
export const recommendationEngine = new RecommendationEngineService();