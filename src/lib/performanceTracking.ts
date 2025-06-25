/**
 * Performance Tracking Module - Real-time Portfolio Analytics
 * Tracks live performance, benchmarks, and advanced metrics
 */

import { tradeLogger, Trade, Position } from './tradeLogger';
import { backtestService } from './backtesting';
import { recommendationEngine } from './recommendationEngine';
import { smartDataManager } from './smartDataManager';

export interface PerformanceSnapshot {
  id: string;
  timestamp: string;
  portfolioValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  dayChange: number;
  dayChangePercent: number;
  positions: Position[];
  benchmarkValue?: number;
  benchmarkChange?: number;
}

export interface BenchmarkData {
  symbol: string;
  name: string;
  currentPrice: number;
  dayChange: number;
  dayChangePercent: number;
  weekChange: number;
  monthChange: number;
  ytdChange: number;
}

export interface PerformanceMetrics {
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  calmarRatio: number;
  sortinoRatio: number;
  beta: number;
  alpha: number;
  informationRatio: number;
  trackingError: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  recoveryFactor: number;
  payoffRatio: number;
}

export interface AttributionAnalysis {
  sectors: Array<{
    name: string;
    allocation: number;
    return: number;
    contribution: number;
  }>;
  strategies: Array<{
    name: string;
    trades: number;
    return: number;
    contribution: number;
  }>;
  timeBasedReturns: Array<{
    period: string;
    return: number;
    benchmark: number;
    alpha: number;
  }>;
}

export interface RiskMetrics {
  valueAtRisk: number; // 95% VaR
  conditionalVaR: number; // Expected shortfall
  maximumDrawdown: number;
  downsideDeviation: number;
  uptimePercentage: number;
  positiveMonths: number;
  negativeMonths: number;
  worstMonth: number;
  bestMonth: number;
  concentrationRisk: number;
  correlationRisk: number;
}

/**
 * Performance Tracking Service
 */
export class PerformanceTrackingService {
  private snapshots: PerformanceSnapshot[] = [];
  private benchmarkData: Map<string, BenchmarkData> = new Map();
  private lastUpdateTime: string = '';

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Take a performance snapshot
   */
  async takeSnapshot(): Promise<PerformanceSnapshot> {
    const positions = tradeLogger.getAllPositions();
    const trades = tradeLogger.getAllTrades();
    
    // Update position values with current market prices
    await this.updatePositionPrices(positions);
    
    const portfolioValue = this.calculatePortfolioValue(positions);
    const totalPnL = this.calculateTotalPnL(positions);
    const totalCost = this.calculateTotalCost(positions);
    const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
    
    // Calculate day change (vs previous snapshot)
    const previousSnapshot = this.snapshots[this.snapshots.length - 1];
    const dayChange = previousSnapshot ? portfolioValue - previousSnapshot.portfolioValue : 0;
    const dayChangePercent = previousSnapshot && previousSnapshot.portfolioValue > 0 ? 
      (dayChange / previousSnapshot.portfolioValue) * 100 : 0;

    const snapshot: PerformanceSnapshot = {
      id: `snap_${Date.now()}`,
      timestamp: new Date().toISOString(),
      portfolioValue,
      totalPnL,
      totalPnLPercent,
      dayChange,
      dayChangePercent,
      positions: positions.map(pos => ({ ...pos })), // Deep copy
      benchmarkValue: await this.getBenchmarkValue('SPY'),
      benchmarkChange: await this.getBenchmarkChange('SPY')
    };

    this.snapshots.push(snapshot);
    
    // Keep only last 1000 snapshots
    if (this.snapshots.length > 1000) {
      this.snapshots = this.snapshots.slice(-1000);
    }
    
    this.lastUpdateTime = snapshot.timestamp;
    this.saveToStorage();
    
    console.log(`📊 Performance snapshot taken: $${portfolioValue.toFixed(2)} (${totalPnLPercent.toFixed(2)}%)`);
    return snapshot;
  }

  /**
   * Update position prices with current market data
   */
  private async updatePositionPrices(positions: Position[]): Promise<void> {
    for (const position of positions) {
      try {
        // TODO: Replace with real market data API calls
        // This should fetch live prices from Yahoo Finance, Alpha Vantage, etc.
        console.warn(`Mock price update for ${position.symbol} - implement real market data`);
        
        // Skip mock updates - only use real data
        // await tradeLogger.updatePositionPrice(position.symbol, newPrice);
      } catch (error) {
        console.error(`Failed to update price for ${position.symbol}:`, error);
      }
    }
  }

  /**
   * Calculate comprehensive performance metrics
   */
  calculatePerformanceMetrics(): PerformanceMetrics {
    if (this.snapshots.length < 2) {
      return this.getEmptyMetrics();
    }

    const returns = this.calculateReturns();
    const trades = tradeLogger.getAllTrades().filter(t => t.status === 'CLOSED');
    const winningTrades = trades.filter(t => (t.pnl || 0) > 0);
    const losingTrades = trades.filter(t => (t.pnl || 0) < 0);

    // Basic performance
    const totalReturn = this.getTotalReturn();
    const totalReturnPercent = this.getTotalReturnPercent();
    const annualizedReturn = this.calculateAnnualizedReturn(returns);
    const volatility = this.calculateVolatility(returns);
    
    // Risk-adjusted metrics
    const sharpeRatio = this.calculateSharpeRatio(returns, volatility);
    const maxDrawdown = this.calculateMaxDrawdown();
    const maxDrawdownPercent = this.calculateMaxDrawdownPercent();
    const calmarRatio = maxDrawdownPercent > 0 ? annualizedReturn / maxDrawdownPercent : 0;
    const sortinoRatio = this.calculateSortinoRatio(returns);
    
    // Market comparison metrics
    const beta = this.calculateBeta();
    const alpha = this.calculateAlpha(annualizedReturn, beta);
    const informationRatio = this.calculateInformationRatio();
    const trackingError = this.calculateTrackingError();

    // Trade-based metrics
    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
    const avgWin = winningTrades.length > 0 ? 
      winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? 
      Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)) / losingTrades.length : 0;
    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;

    const pnls = trades.map(t => t.pnl || 0);
    const largestWin = Math.max(...pnls, 0);
    const largestLoss = Math.min(...pnls, 0);

    return {
      totalReturn,
      totalReturnPercent,
      annualizedReturn,
      volatility: volatility * 100, // Convert to percentage
      sharpeRatio,
      maxDrawdown,
      maxDrawdownPercent,
      calmarRatio,
      sortinoRatio,
      beta,
      alpha,
      informationRatio,
      trackingError,
      winRate,
      profitFactor,
      averageWin: avgWin,
      averageLoss: avgLoss,
      largestWin,
      largestLoss,
      consecutiveWins: this.calculateConsecutiveWins(trades),
      consecutiveLosses: this.calculateConsecutiveLosses(trades),
      recoveryFactor: maxDrawdown > 0 ? totalReturn / Math.abs(maxDrawdown) : 0,
      payoffRatio: avgLoss > 0 ? avgWin / avgLoss : 0
    };
  }

  /**
   * Calculate attribution analysis
   */
  calculateAttribution(): AttributionAnalysis {
    const positions = tradeLogger.getAllPositions();
    const trades = tradeLogger.getAllTrades();
    
    // Sector attribution (simplified)
    const sectorMap: Record<string, string> = {
      'LMT': 'Defense', 'NOC': 'Defense', 'RTX': 'Defense', 'PLTR': 'Defense',
      'COP': 'Energy', 'XOM': 'Energy', 'PXD': 'Energy', 'USO': 'Energy',
      'CRWD': 'Technology', 'NVDA': 'Technology', 'AMD': 'Technology', 'INTC': 'Technology',
      'GLD': 'Commodities', 'VXX': 'Volatility', 'UVXY': 'Volatility'
    };

    const sectorAllocation = new Map<string, { value: number; pnl: number }>();
    const totalValue = this.calculatePortfolioValue(positions);

    positions.forEach(pos => {
      const sector = sectorMap[pos.symbol] || 'Other';
      const existing = sectorAllocation.get(sector) || { value: 0, pnl: 0 };
      existing.value += pos.marketValue;
      existing.pnl += pos.unrealizedPnL + pos.realizedPnL;
      sectorAllocation.set(sector, existing);
    });

    const sectors = Array.from(sectorAllocation.entries()).map(([name, data]) => ({
      name,
      allocation: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
      return: data.pnl,
      contribution: totalValue > 0 ? (data.pnl / totalValue) * 100 : 0
    }));

    // Strategy attribution (based on trade source)
    const strategyPnL = new Map<string, { trades: number; pnl: number }>();
    trades.forEach(trade => {
      const strategy = trade.source || 'MANUAL';
      const existing = strategyPnL.get(strategy) || { trades: 0, pnl: 0 };
      existing.trades += 1;
      existing.pnl += trade.pnl || 0;
      strategyPnL.set(strategy, existing);
    });

    const strategies = Array.from(strategyPnL.entries()).map(([name, data]) => ({
      name,
      trades: data.trades,
      return: data.pnl,
      contribution: this.getTotalReturn() > 0 ? (data.pnl / this.getTotalReturn()) * 100 : 0
    }));

    // Time-based returns (monthly)
    const timeBasedReturns = this.calculateMonthlyReturns();

    return {
      sectors,
      strategies,
      timeBasedReturns
    };
  }

  /**
   * Calculate risk metrics
   */
  calculateRiskMetrics(): RiskMetrics {
    const returns = this.calculateReturns();
    const portfolioValues = this.snapshots.map(s => s.portfolioValue);
    
    if (returns.length < 30) {
      return this.getEmptyRiskMetrics();
    }

    const sortedReturns = [...returns].sort((a, b) => a - b);
    const valueAtRisk = -sortedReturns[Math.floor(returns.length * 0.05)]; // 5th percentile
    const conditionalVaR = -sortedReturns.slice(0, Math.floor(returns.length * 0.05))
      .reduce((sum, r) => sum + r, 0) / Math.floor(returns.length * 0.05);

    const maximumDrawdown = this.calculateMaxDrawdown();
    const downsideReturns = returns.filter(r => r < 0);
    const downsideDeviation = downsideReturns.length > 0 ? 
      Math.sqrt(downsideReturns.reduce((sum, r) => sum + r * r, 0) / downsideReturns.length) : 0;

    const positiveReturns = returns.filter(r => r > 0);
    const uptimePercentage = (positiveReturns.length / returns.length) * 100;

    const monthlyReturns = this.calculateMonthlyReturns();
    const positiveMonths = monthlyReturns.filter(m => m.return > 0).length;
    const negativeMonths = monthlyReturns.filter(m => m.return < 0).length;
    const worstMonth = Math.min(...monthlyReturns.map(m => m.return), 0);
    const bestMonth = Math.max(...monthlyReturns.map(m => m.return), 0);

    const concentrationRisk = this.calculateConcentrationRisk();
    const correlationRisk = this.calculateCorrelationRisk();

    return {
      valueAtRisk: valueAtRisk * 100,
      conditionalVaR: conditionalVaR * 100,
      maximumDrawdown,
      downsideDeviation: downsideDeviation * 100,
      uptimePercentage,
      positiveMonths,
      negativeMonths,
      worstMonth,
      bestMonth,
      concentrationRisk,
      correlationRisk
    };
  }

  /**
   * Get latest snapshot
   */
  getLatestSnapshot(): PerformanceSnapshot | null {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
  }

  /**
   * Get performance over time
   */
  getPerformanceHistory(days: number = 30): PerformanceSnapshot[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return this.snapshots.filter(snapshot => 
      new Date(snapshot.timestamp) >= cutoffDate
    );
  }

  /**
   * Get benchmark data
   */
  async updateBenchmarkData(): Promise<void> {
    const benchmarks = ['SPY', 'QQQ', 'IWM', 'DIA', 'VTI'];
    
    for (const symbol of benchmarks) {
      try {
        // TODO: Fetch real benchmark data from market API
        console.warn(`Mock benchmark data for ${symbol} - implement real market data`);
        
        // Skip mock data - benchmarks should use real market data
        // this.benchmarkData.set(symbol, realData);
      } catch (error) {
        console.error(`Failed to update benchmark ${symbol}:`, error);
      }
    }
  }

  /**
   * Compare against benchmark
   */
  compareAgainstBenchmark(benchmarkSymbol: string = 'SPY'): any {
    const portfolioReturn = this.getTotalReturnPercent();
    const benchmark = this.benchmarkData.get(benchmarkSymbol);
    
    if (!benchmark) {
      return null;
    }

    const benchmarkReturn = benchmark.ytdChange; // Simplified
    const alpha = portfolioReturn - benchmarkReturn;
    const outperformance = alpha > 0;

    return {
      portfolio: {
        return: portfolioReturn,
        volatility: this.calculateVolatility(this.calculateReturns()) * 100
      },
      benchmark: {
        symbol: benchmarkSymbol,
        name: benchmark.name,
        return: benchmarkReturn,
        volatility: 15 // Simplified assumption
      },
      comparison: {
        alpha,
        outperformance,
        trackingError: this.calculateTrackingError(),
        informationRatio: this.calculateInformationRatio(),
        beta: this.calculateBeta()
      }
    };
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): any {
    const metrics = this.calculatePerformanceMetrics();
    const attribution = this.calculateAttribution();
    const riskMetrics = this.calculateRiskMetrics();
    const benchmark = this.compareAgainstBenchmark();
    const latest = this.getLatestSnapshot();

    return {
      summary: {
        portfolioValue: latest?.portfolioValue || 0,
        totalReturn: metrics.totalReturn,
        totalReturnPercent: metrics.totalReturnPercent,
        dayChange: latest?.dayChange || 0,
        dayChangePercent: latest?.dayChangePercent || 0,
        lastUpdated: this.lastUpdateTime
      },
      performance: metrics,
      attribution,
      risk: riskMetrics,
      benchmark,
      positions: latest?.positions || [],
      history: this.getPerformanceHistory(90) // Last 90 days
    };
  }

  // Private helper methods
  private calculatePortfolioValue(positions: Position[]): number {
    return positions.reduce((total, pos) => total + pos.marketValue, 0);
  }

  private calculateTotalPnL(positions: Position[]): number {
    return positions.reduce((total, pos) => total + pos.unrealizedPnL + pos.realizedPnL, 0);
  }

  private calculateTotalCost(positions: Position[]): number {
    return positions.reduce((total, pos) => total + pos.totalCost, 0);
  }

  private calculateReturns(): number[] {
    const returns = [];
    for (let i = 1; i < this.snapshots.length; i++) {
      const prevValue = this.snapshots[i - 1].portfolioValue;
      const currentValue = this.snapshots[i].portfolioValue;
      if (prevValue > 0) {
        returns.push((currentValue - prevValue) / prevValue);
      }
    }
    return returns;
  }

  private getTotalReturn(): number {
    if (this.snapshots.length < 2) return 0;
    const first = this.snapshots[0].portfolioValue;
    const last = this.snapshots[this.snapshots.length - 1].portfolioValue;
    return last - first;
  }

  private getTotalReturnPercent(): number {
    if (this.snapshots.length < 2) return 0;
    const first = this.snapshots[0].portfolioValue;
    const last = this.snapshots[this.snapshots.length - 1].portfolioValue;
    return first > 0 ? ((last - first) / first) * 100 : 0;
  }

  private calculateAnnualizedReturn(returns: number[]): number {
    if (returns.length === 0) return 0;
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    return (Math.pow(1 + avgReturn, 252) - 1) * 100; // Assume 252 trading days
  }

  private calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0;
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    return Math.sqrt(variance * 252); // Annualized
  }

  private calculateSharpeRatio(returns: number[], volatility: number): number {
    if (volatility === 0) return 0;
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const riskFreeRate = 0.02 / 252; // 2% annual risk-free rate
    return (avgReturn - riskFreeRate) / (volatility / Math.sqrt(252));
  }

  private calculateMaxDrawdown(): number {
    let maxDrawdown = 0;
    let peak = 0;

    this.snapshots.forEach(snapshot => {
      if (snapshot.portfolioValue > peak) {
        peak = snapshot.portfolioValue;
      }
      const drawdown = peak - snapshot.portfolioValue;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    return maxDrawdown;
  }

  private calculateMaxDrawdownPercent(): number {
    let maxDrawdownPercent = 0;
    let peak = 0;

    this.snapshots.forEach(snapshot => {
      if (snapshot.portfolioValue > peak) {
        peak = snapshot.portfolioValue;
      }
      if (peak > 0) {
        const drawdownPercent = ((peak - snapshot.portfolioValue) / peak) * 100;
        if (drawdownPercent > maxDrawdownPercent) {
          maxDrawdownPercent = drawdownPercent;
        }
      }
    });

    return maxDrawdownPercent;
  }

  private calculateSortinoRatio(returns: number[]): number {
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const downsideReturns = returns.filter(r => r < 0);
    if (downsideReturns.length === 0) return 0;
    
    const downsideDeviation = Math.sqrt(
      downsideReturns.reduce((sum, r) => sum + r * r, 0) / downsideReturns.length
    );
    
    return downsideDeviation > 0 ? avgReturn / downsideDeviation : 0;
  }

  private calculateBeta(): number {
    // Calculate beta based on portfolio volatility relative to market
    const returns = this.calculateReturns();
    if (returns.length < 10) return 1.0; // Default market beta
    
    const portfolioVolatility = this.calculateVolatility(returns);
    const marketVolatility = 0.15; // Assume 15% market volatility
    
    // Higher portfolio volatility = higher beta
    const beta = portfolioVolatility / marketVolatility;
    return Math.max(0.1, Math.min(3.0, beta)); // Constrain between 0.1 and 3.0
  }

  private calculateAlpha(portfolioReturn: number, beta: number): number {
    const benchmarkReturn = 10; // Simplified 10% benchmark return
    return portfolioReturn - (benchmarkReturn * beta);
  }

  private calculateInformationRatio(): number {
    // Simplified calculation
    const trackingError = this.calculateTrackingError();
    return trackingError > 0 ? (this.getTotalReturnPercent() - 10) / trackingError : 0;
  }

  private calculateTrackingError(): number {
    // Calculate tracking error based on portfolio vs benchmark volatility difference
    const returns = this.calculateReturns();
    if (returns.length < 2) return 0;
    
    const portfolioVolatility = this.calculateVolatility(returns);
    const benchmarkVolatility = 0.15; // Assume benchmark volatility
    
    // Tracking error is the volatility of the difference in returns
    return Math.abs(portfolioVolatility - benchmarkVolatility) * 100;
  }

  private calculateConsecutiveWins(trades: Trade[]): number {
    let maxConsecutive = 0;
    let current = 0;
    
    trades.forEach(trade => {
      if ((trade.pnl || 0) > 0) {
        current++;
        maxConsecutive = Math.max(maxConsecutive, current);
      } else {
        current = 0;
      }
    });
    
    return maxConsecutive;
  }

  private calculateConsecutiveLosses(trades: Trade[]): number {
    let maxConsecutive = 0;
    let current = 0;
    
    trades.forEach(trade => {
      if ((trade.pnl || 0) < 0) {
        current++;
        maxConsecutive = Math.max(maxConsecutive, current);
      } else {
        current = 0;
      }
    });
    
    return maxConsecutive;
  }

  private calculateMonthlyReturns(): Array<{ period: string; return: number; benchmark: number; alpha: number }> {
    // Calculate actual monthly returns from snapshots
    const monthlyData = new Map<string, { start: number; end: number }>();
    
    this.snapshots.forEach(snapshot => {
      const date = new Date(snapshot.timestamp);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { start: snapshot.portfolioValue, end: snapshot.portfolioValue });
      } else {
        monthlyData.get(monthKey)!.end = snapshot.portfolioValue;
      }
    });

    return Array.from(monthlyData.entries()).map(([period, data]) => {
      const monthReturn = data.start > 0 ? ((data.end - data.start) / data.start) * 100 : 0;
      const benchmarkReturn = 2; // Simplified 2% monthly benchmark
      const alpha = monthReturn - benchmarkReturn;
      
      return { period, return: monthReturn, benchmark: benchmarkReturn, alpha };
    }).sort((a, b) => a.period.localeCompare(b.period));
  }

  private calculateConcentrationRisk(): number {
    const positions = tradeLogger.getAllPositions();
    const totalValue = this.calculatePortfolioValue(positions);
    
    if (totalValue === 0) return 0;
    
    const weights = positions.map(pos => pos.marketValue / totalValue);
    const herfindahlIndex = weights.reduce((sum, w) => sum + w * w, 0);
    
    return herfindahlIndex * 100; // Higher = more concentrated
  }

  private calculateCorrelationRisk(): number {
    // Calculate correlation risk based on sector concentration
    const positions = tradeLogger.getAllPositions();
    const sectorMap: Record<string, string> = {
      'LMT': 'Defense', 'NOC': 'Defense', 'RTX': 'Defense',
      'COP': 'Energy', 'XOM': 'Energy', 'PXD': 'Energy',
      'CRWD': 'Technology', 'NVDA': 'Technology', 'AMD': 'Technology'
    };

    const sectorCounts = new Map<string, number>();
    positions.forEach(pos => {
      const sector = sectorMap[pos.symbol] || 'Other';
      sectorCounts.set(sector, (sectorCounts.get(sector) || 0) + 1);
    });

    // Higher concentration in same sectors = higher correlation risk
    const maxSectorCount = Math.max(...Array.from(sectorCounts.values()), 1);
    const correlationRisk = (maxSectorCount / positions.length) * 100;
    
    return Math.min(correlationRisk, 100);
  }

  private async getBenchmarkValue(symbol: string): Promise<number> {
    const benchmark = this.benchmarkData.get(symbol);
    return benchmark?.currentPrice || 400;
  }

  private async getBenchmarkChange(symbol: string): Promise<number> {
    const benchmark = this.benchmarkData.get(symbol);
    return benchmark?.dayChangePercent || 0;
  }

  private getBenchmarkName(symbol: string): string {
    const names: Record<string, string> = {
      'SPY': 'S&P 500 ETF',
      'QQQ': 'Nasdaq 100 ETF',
      'IWM': 'Russell 2000 ETF',
      'DIA': 'Dow Jones ETF',
      'VTI': 'Total Stock Market ETF'
    };
    return names[symbol] || symbol;
  }

  private getEmptyMetrics(): PerformanceMetrics {
    return {
      totalReturn: 0, totalReturnPercent: 0, annualizedReturn: 0, volatility: 0,
      sharpeRatio: 0, maxDrawdown: 0, maxDrawdownPercent: 0, calmarRatio: 0,
      sortinoRatio: 0, beta: 0, alpha: 0, informationRatio: 0, trackingError: 0,
      winRate: 0, profitFactor: 0, averageWin: 0, averageLoss: 0,
      largestWin: 0, largestLoss: 0, consecutiveWins: 0, consecutiveLosses: 0,
      recoveryFactor: 0, payoffRatio: 0
    };
  }

  private getEmptyRiskMetrics(): RiskMetrics {
    return {
      valueAtRisk: 0, conditionalVaR: 0, maximumDrawdown: 0, downsideDeviation: 0,
      uptimePercentage: 0, positiveMonths: 0, negativeMonths: 0, worstMonth: 0,
      bestMonth: 0, concentrationRisk: 0, correlationRisk: 0
    };
  }

  /**
   * Save to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem('omnishift_performance_snapshots', JSON.stringify(this.snapshots));
      localStorage.setItem('omnishift_benchmark_data', JSON.stringify(Array.from(this.benchmarkData.entries())));
      localStorage.setItem('omnishift_last_update', this.lastUpdateTime);
    } catch (error) {
      console.error('Failed to save performance data:', error);
    }
  }

  /**
   * Load from localStorage
   */
  private loadFromStorage(): void {
    try {
      const snapshotsData = localStorage.getItem('omnishift_performance_snapshots');
      if (snapshotsData) {
        this.snapshots = JSON.parse(snapshotsData);
      }

      const benchmarkData = localStorage.getItem('omnishift_benchmark_data');
      if (benchmarkData) {
        const benchmarkArray = JSON.parse(benchmarkData);
        this.benchmarkData = new Map(benchmarkArray);
      }

      const lastUpdate = localStorage.getItem('omnishift_last_update');
      if (lastUpdate) {
        this.lastUpdateTime = lastUpdate;
      }
    } catch (error) {
      console.error('Failed to load performance data:', error);
      this.snapshots = [];
      this.benchmarkData.clear();
      this.lastUpdateTime = '';
    }
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    this.snapshots = [];
    this.benchmarkData.clear();
    this.lastUpdateTime = '';
    this.saveToStorage();
  }
}

// Export singleton instance
export const performanceTracker = new PerformanceTrackingService();