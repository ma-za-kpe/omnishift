/**
 * RiskManager - Portfolio-level risk management and control system
 * Prevents catastrophic losses through dynamic position sizing and circuit breakers
 */

import {
  Portfolio,
  Position,
  RiskLimits,
  RiskMetrics,
  RiskAlert,
  Signal,
  Trade
} from '@/core/domain/types';
import { EventEmitter } from 'events';

export interface RiskCheckResult {
  allowed: boolean;
  violations: RiskViolation[];
  adjustedSize?: number;
  warnings: string[];
}

export interface RiskViolation {
  type: string;
  currentValue: number;
  limit: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  action: 'WARNING' | 'REDUCE_POSITION' | 'HALT_TRADING';
}

export class RiskManager extends EventEmitter {
  private limits: RiskLimits;
  private portfolio: Portfolio;
  private dailyStartEquity: number = 0;
  private maxEquityToday: number = 0;
  private tradingHalted: boolean = false;
  private riskAlerts: RiskAlert[] = [];
  private correlationMatrix: Map<string, Map<string, number>> = new Map();

  constructor(limits: RiskLimits, initialCapital: number) {
    super();
    this.limits = limits;
    this.portfolio = this.initializePortfolio(initialCapital);
    this.dailyStartEquity = initialCapital;
    this.maxEquityToday = initialCapital;
  }

  /**
   * Pre-trade risk check - validates if a trade should be allowed
   */
  async preTradeRiskCheck(
    signal: Signal,
    proposedSize: number,
    currentPrice: number
  ): Promise<RiskCheckResult> {
    const result: RiskCheckResult = {
      allowed: true,
      violations: [],
      warnings: []
    };

    // Check if trading is halted
    if (this.tradingHalted) {
      result.allowed = false;
      result.violations.push({
        type: 'TRADING_HALTED',
        currentValue: 0,
        limit: 0,
        severity: 'CRITICAL',
        action: 'HALT_TRADING'
      });
      return result;
    }

    // Run all risk checks
    const checks = [
      this.checkDailyLossLimit(),
      this.checkMaxDrawdown(),
      this.checkPositionSizeLimit(signal.symbol, proposedSize, currentPrice),
      this.checkSectorExposure(signal.symbol),
      this.checkCorrelationLimit(signal.symbol),
      this.checkLeverageLimit()
    ];

    for (const check of checks) {
      if (check.violation) {
        result.violations.push(check.violation);
        if (check.violation.severity === 'CRITICAL') {
          result.allowed = false;
        }
      }
      if (check.warning) {
        result.warnings.push(check.warning);
      }
    }

    // Calculate risk-adjusted position size
    if (result.allowed) {
      result.adjustedSize = this.calculateRiskAdjustedSize(
        signal,
        proposedSize,
        currentPrice
      );
    }

    // Emit risk assessment event
    this.emit('riskAssessment', {
      signal,
      result,
      timestamp: new Date()
    });

    return result;
  }

  /**
   * Check daily loss limit
   */
  private checkDailyLossLimit(): { violation?: RiskViolation; warning?: string } {
    const currentEquity = this.portfolio.totalValue;
    const dailyLoss = (this.dailyStartEquity - currentEquity) / this.dailyStartEquity;

    if (dailyLoss >= this.limits.maxDailyLoss) {
      this.haltTrading('Daily loss limit exceeded');
      return {
        violation: {
          type: 'DAILY_LOSS_LIMIT',
          currentValue: dailyLoss * 100,
          limit: this.limits.maxDailyLoss * 100,
          severity: 'CRITICAL',
          action: 'HALT_TRADING'
        }
      };
    }

    if (dailyLoss >= this.limits.maxDailyLoss * 0.8) {
      return {
        warning: `Approaching daily loss limit: ${(dailyLoss * 100).toFixed(2)}% loss`
      };
    }

    return {};
  }

  /**
   * Check maximum drawdown
   */
  private checkMaxDrawdown(): { violation?: RiskViolation; warning?: string } {
    const currentEquity = this.portfolio.totalValue;
    const drawdown = (this.maxEquityToday - currentEquity) / this.maxEquityToday;

    if (drawdown >= this.limits.maxDrawdown) {
      this.haltTrading('Maximum drawdown exceeded');
      return {
        violation: {
          type: 'MAX_DRAWDOWN',
          currentValue: drawdown * 100,
          limit: this.limits.maxDrawdown * 100,
          severity: 'CRITICAL',
          action: 'HALT_TRADING'
        }
      };
    }

    if (drawdown >= this.limits.maxDrawdown * 0.8) {
      return {
        warning: `Approaching max drawdown: ${(drawdown * 100).toFixed(2)}%`
      };
    }

    return {};
  }

  /**
   * Check position size limit
   */
  private checkPositionSizeLimit(
    symbol: string,
    proposedSize: number,
    currentPrice: number
  ): { violation?: RiskViolation; warning?: string } {
    const proposedValue = proposedSize * currentPrice;
    const portfolioValue = this.portfolio.totalValue;
    const positionPercent = proposedValue / portfolioValue;

    // Check if adding to existing position
    const existingPosition = this.portfolio.positions.get(symbol);
    if (existingPosition) {
      const totalValue = existingPosition.marketValue + proposedValue;
      const totalPercent = totalValue / portfolioValue;

      if (totalPercent > this.limits.maxPositionSize) {
        return {
          violation: {
            type: 'POSITION_SIZE_LIMIT',
            currentValue: totalPercent * 100,
            limit: this.limits.maxPositionSize * 100,
            severity: 'HIGH',
            action: 'REDUCE_POSITION'
          }
        };
      }
    } else if (positionPercent > this.limits.maxPositionSize) {
      return {
        violation: {
          type: 'POSITION_SIZE_LIMIT',
          currentValue: positionPercent * 100,
          limit: this.limits.maxPositionSize * 100,
          severity: 'HIGH',
          action: 'REDUCE_POSITION'
        }
      };
    }

    return {};
  }

  /**
   * Check sector exposure limits
   */
  private checkSectorExposure(symbol: string): { violation?: RiskViolation; warning?: string } {
    // Get sector for symbol (simplified - in real system would use proper sector mapping)
    const sector = this.getSymbolSector(symbol);
    const sectorExposure = this.calculateSectorExposure(sector);

    if (sectorExposure > this.limits.maxSectorExposure) {
      return {
        violation: {
          type: 'SECTOR_CONCENTRATION',
          currentValue: sectorExposure * 100,
          limit: this.limits.maxSectorExposure * 100,
          severity: 'MEDIUM',
          action: 'REDUCE_POSITION'
        }
      };
    }

    if (sectorExposure > this.limits.maxSectorExposure * 0.8) {
      return {
        warning: `High sector concentration in ${sector}: ${(sectorExposure * 100).toFixed(2)}%`
      };
    }

    return {};
  }

  /**
   * Check correlation limits
   */
  private checkCorrelationLimit(symbol: string): { violation?: RiskViolation; warning?: string } {
    const correlations = this.calculatePortfolioCorrelation(symbol);
    const maxCorrelation = Math.max(...correlations.values());

    if (maxCorrelation > this.limits.maxCorrelation) {
      return {
        violation: {
          type: 'HIGH_CORRELATION',
          currentValue: maxCorrelation,
          limit: this.limits.maxCorrelation,
          severity: 'MEDIUM',
          action: 'WARNING'
        }
      };
    }

    return {};
  }

  /**
   * Check leverage limits
   */
  private checkLeverageLimit(): { violation?: RiskViolation; warning?: string } {
    const leverage = this.calculateCurrentLeverage();

    if (leverage > this.limits.maxLeverage) {
      return {
        violation: {
          type: 'LEVERAGE_LIMIT',
          currentValue: leverage,
          limit: this.limits.maxLeverage,
          severity: 'HIGH',
          action: 'REDUCE_POSITION'
        }
      };
    }

    return {};
  }

  /**
   * Calculate risk-adjusted position size using multiple methods
   */
  calculateRiskAdjustedSize(
    signal: Signal,
    proposedSize: number,
    currentPrice: number
  ): number {
    // Start with proposed size
    let adjustedSize = proposedSize;

    // Apply Kelly Criterion
    const kellySize = this.calculateKellySize(signal, currentPrice);
    adjustedSize = Math.min(adjustedSize, kellySize);

    // Apply volatility-based sizing
    const volSize = this.calculateVolatilitySize(signal.symbol, currentPrice);
    adjustedSize = Math.min(adjustedSize, volSize);

    // Apply correlation adjustment
    const correlationAdjustment = this.calculateCorrelationAdjustment(signal.symbol);
    adjustedSize = Math.floor(adjustedSize * correlationAdjustment);

    // Ensure minimum position size
    const minSize = Math.floor(100 / currentPrice); // Minimum $100 position
    adjustedSize = Math.max(adjustedSize, minSize);

    return adjustedSize;
  }

  /**
   * Kelly Criterion for optimal position sizing
   */
  private calculateKellySize(signal: Signal, currentPrice: number): number {
    // Get historical performance for this strategy
    const strategyStats = this.getStrategyStatistics(signal.strategy);
    
    if (!strategyStats || strategyStats.trades < 10) {
      // Not enough data, use conservative sizing
      return Math.floor((this.portfolio.totalValue * 0.02) / currentPrice);
    }

    const winRate = strategyStats.winRate;
    const avgWin = strategyStats.avgWinPercent / 100;
    const avgLoss = Math.abs(strategyStats.avgLossPercent / 100);

    // Kelly formula: f = (p * b - q) / b
    // where f = fraction to bet, p = win probability, q = loss probability, b = win/loss ratio
    const b = avgWin / avgLoss;
    const q = 1 - winRate;
    const kelly = (winRate * b - q) / b;

    // Apply Kelly fraction with safety factor (25% of Kelly)
    const kellyFraction = Math.max(0, Math.min(0.25, kelly * 0.25));
    const kellyValue = this.portfolio.totalValue * kellyFraction;

    return Math.floor(kellyValue / currentPrice);
  }

  /**
   * Volatility-based position sizing
   */
  private calculateVolatilitySize(symbol: string, currentPrice: number): number {
    // Get volatility data (ATR or standard deviation)
    const volatility = this.getSymbolVolatility(symbol);
    const portfolioValue = this.portfolio.totalValue;

    // Target 1% portfolio risk per position
    const targetRisk = portfolioValue * 0.01;
    
    // Position size = Risk Amount / (ATR * ATR Multiplier)
    const atrMultiplier = 2; // Stop at 2x ATR
    const positionValue = targetRisk / (volatility * atrMultiplier);

    return Math.floor(positionValue / currentPrice);
  }

  /**
   * Calculate correlation adjustment factor
   */
  private calculateCorrelationAdjustment(symbol: string): number {
    const correlations = this.calculatePortfolioCorrelation(symbol);
    const avgCorrelation = correlations.size > 0 ?
      Array.from(correlations.values()).reduce((sum, corr) => sum + corr, 0) / correlations.size : 0;

    // Reduce position size based on correlation
    // High correlation (0.8) = 50% reduction
    // No correlation (0) = No reduction
    return 1 - (avgCorrelation * 0.625);
  }

  /**
   * Update portfolio and risk metrics after trade execution
   */
  async onTradeExecuted(trade: Trade): Promise<void> {
    // Update portfolio state
    this.updatePortfolioAfterTrade(trade);

    // Update risk metrics
    this.updateRiskMetrics();

    // Check if we need to update daily equity high
    if (this.portfolio.totalValue > this.maxEquityToday) {
      this.maxEquityToday = this.portfolio.totalValue;
    }

    // Emit risk update event
    this.emit('riskUpdate', {
      portfolio: this.portfolio,
      riskMetrics: this.portfolio.riskMetrics,
      alerts: this.riskAlerts
    });
  }

  /**
   * Reset daily risk limits (call at start of trading day)
   */
  resetDailyLimits(): void {
    this.dailyStartEquity = this.portfolio.totalValue;
    this.maxEquityToday = this.portfolio.totalValue;
    this.tradingHalted = false;
    
    // Clear old alerts
    const cutoffTime = new Date();
    cutoffTime.setDate(cutoffTime.getDate() - 1);
    this.riskAlerts = this.riskAlerts.filter(alert => alert.timestamp > cutoffTime);

    console.log(`📊 Daily risk limits reset. Starting equity: $${this.dailyStartEquity.toLocaleString()}`);
  }

  /**
   * Halt trading due to risk violation
   */
  private haltTrading(reason: string): void {
    this.tradingHalted = true;
    
    const alert: RiskAlert = {
      id: `alert_${Date.now()}`,
      timestamp: new Date(),
      severity: 'CRITICAL',
      type: 'DRAWDOWN',
      message: `Trading halted: ${reason}`,
      currentValue: this.portfolio.totalValue,
      limit: this.limits.maxDrawdown,
      action: 'HALT_TRADING'
    };

    this.riskAlerts.push(alert);
    this.emit('tradingHalted', alert);

    console.error(`🚨 TRADING HALTED: ${reason}`);
  }

  /**
   * Calculate current portfolio risk metrics
   */
  private updateRiskMetrics(): void {
    const metrics: RiskMetrics = {
      dailyVaR: this.calculateDailyVaR(),
      beta: this.calculatePortfolioBeta(),
      correlation: this.calculateAverageCorrelation(),
      currentDrawdown: this.calculateCurrentDrawdown(),
      sectorExposure: this.calculateAllSectorExposures(),
      concentrationRisk: this.calculateConcentrationRisk()
    };

    this.portfolio.riskMetrics = metrics;
  }

  /**
   * Calculate Value at Risk (95% confidence)
   */
  private calculateDailyVaR(): number {
    // Simplified VaR calculation - in production would use historical simulation
    const portfolioValue = this.portfolio.totalValue;
    const portfolioVolatility = this.calculatePortfolioVolatility();
    const confidenceLevel = 1.645; // 95% confidence
    
    return portfolioValue * portfolioVolatility * confidenceLevel;
  }

  /**
   * Calculate portfolio beta vs market
   */
  private calculatePortfolioBeta(): number {
    // Simplified - would need market return data
    const weights = this.getPositionWeights();
    let portfolioBeta = 0;

    for (const [symbol, weight] of weights) {
      const symbolBeta = this.getSymbolBeta(symbol);
      portfolioBeta += weight * symbolBeta;
    }

    return portfolioBeta;
  }

  /**
   * Calculate average correlation across portfolio
   */
  private calculateAverageCorrelation(): number {
    const correlations: number[] = [];
    const positions = Array.from(this.portfolio.positions.keys());

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const correlation = this.getCorrelation(positions[i], positions[j]);
        correlations.push(correlation);
      }
    }

    return correlations.length > 0 ?
      correlations.reduce((sum, corr) => sum + corr, 0) / correlations.length : 0;
  }

  /**
   * Calculate current drawdown from peak
   */
  private calculateCurrentDrawdown(): number {
    const currentValue = this.portfolio.totalValue;
    const drawdown = (this.maxEquityToday - currentValue) / this.maxEquityToday;
    return Math.max(0, drawdown);
  }

  /**
   * Calculate concentration risk (Herfindahl Index)
   */
  private calculateConcentrationRisk(): number {
    const weights = this.getPositionWeights();
    let hhi = 0;

    for (const [_, weight] of weights) {
      hhi += Math.pow(weight, 2);
    }

    return hhi;
  }

  // Helper methods

  private initializePortfolio(capital: number): Portfolio {
    return {
      cash: capital,
      totalValue: capital,
      positions: new Map(),
      trades: [],
      metrics: {} as any,
      riskMetrics: {} as any
    };
  }

  private updatePortfolioAfterTrade(trade: Trade): void {
    // This would be called by the trading engine
    // Simplified implementation for demonstration
    if (trade.side === 'BUY') {
      const cost = trade.quantity * trade.entryPrice + trade.commission;
      this.portfolio.cash -= cost;
    } else {
      const proceeds = trade.quantity * (trade.exitPrice || trade.entryPrice) - trade.commission;
      this.portfolio.cash += proceeds;
    }
  }

  private getPositionWeights(): Map<string, number> {
    const weights = new Map<string, number>();
    const totalValue = this.portfolio.totalValue;

    for (const [symbol, position] of this.portfolio.positions) {
      weights.set(symbol, position.marketValue / totalValue);
    }

    return weights;
  }

  private calculatePortfolioVolatility(): number {
    // Simplified - would use historical returns
    return 0.02; // 2% daily volatility
  }

  private calculatePortfolioCorrelation(newSymbol: string): Map<string, number> {
    const correlations = new Map<string, number>();

    for (const [symbol, _] of this.portfolio.positions) {
      if (symbol !== newSymbol) {
        const correlation = this.getCorrelation(symbol, newSymbol);
        correlations.set(symbol, correlation);
      }
    }

    return correlations;
  }

  private calculateSectorExposure(sector: string): number {
    let sectorValue = 0;

    for (const [symbol, position] of this.portfolio.positions) {
      if (this.getSymbolSector(symbol) === sector) {
        sectorValue += position.marketValue;
      }
    }

    return sectorValue / this.portfolio.totalValue;
  }

  private calculateAllSectorExposures(): Map<string, number> {
    const exposures = new Map<string, number>();
    const sectors = new Set<string>();

    // Get all sectors
    for (const [symbol, _] of this.portfolio.positions) {
      sectors.add(this.getSymbolSector(symbol));
    }

    // Calculate exposure for each sector
    for (const sector of sectors) {
      exposures.set(sector, this.calculateSectorExposure(sector));
    }

    return exposures;
  }

  private calculateCurrentLeverage(): number {
    // Total exposure / equity
    let totalExposure = 0;
    
    for (const [_, position] of this.portfolio.positions) {
      totalExposure += position.marketValue;
    }

    return totalExposure / this.portfolio.totalValue;
  }

  // Mock methods - would be replaced with real data sources

  private getSymbolSector(symbol: string): string {
    const sectorMap: Record<string, string> = {
      'AAPL': 'Technology',
      'MSFT': 'Technology',
      'GOOGL': 'Technology',
      'LMT': 'Defense',
      'NOC': 'Defense',
      'RTX': 'Defense',
      'XOM': 'Energy',
      'COP': 'Energy',
      'CVX': 'Energy'
    };
    
    return sectorMap[symbol] || 'Other';
  }

  private getSymbolVolatility(symbol: string): number {
    // Would calculate from historical data
    return 0.02; // 2% daily volatility
  }

  private getSymbolBeta(symbol: string): number {
    // Would get from market data
    return 1.0;
  }

  private getCorrelation(symbol1: string, symbol2: string): number {
    // Would calculate from historical returns
    const sameSector = this.getSymbolSector(symbol1) === this.getSymbolSector(symbol2);
    return sameSector ? 0.7 : 0.3;
  }

  private getStrategyStatistics(strategy: string): any {
    // Would get from historical performance
    return {
      trades: 50,
      winRate: 0.6,
      avgWinPercent: 2.5,
      avgLossPercent: -1.5
    };
  }

  /**
   * Get current risk status summary
   */
  getRiskStatus(): {
    tradingAllowed: boolean;
    currentDrawdown: number;
    dailyPnL: number;
    riskScore: number;
    alerts: RiskAlert[];
  } {
    const currentDrawdown = this.calculateCurrentDrawdown();
    const dailyPnL = ((this.portfolio.totalValue - this.dailyStartEquity) / this.dailyStartEquity) * 100;
    
    // Calculate overall risk score (0-100, higher is riskier)
    const drawdownScore = (currentDrawdown / this.limits.maxDrawdown) * 40;
    const dailyLossScore = Math.max(0, (-dailyPnL / (this.limits.maxDailyLoss * 100))) * 30;
    const concentrationScore = this.calculateConcentrationRisk() * 30;
    const riskScore = Math.min(100, drawdownScore + dailyLossScore + concentrationScore);

    return {
      tradingAllowed: !this.tradingHalted,
      currentDrawdown: currentDrawdown * 100,
      dailyPnL,
      riskScore,
      alerts: this.riskAlerts
    };
  }
}