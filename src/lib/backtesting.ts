/**
 * Backtesting Module - Historical Strategy Performance Testing
 * Tests recommendation engine against historical market data
 */

import { strategyEngine } from './strategyMatrix';
import { smartDataManager } from './smartDataManager';

export interface BacktestTrade {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  entryDate: string;
  exitDate?: string;
  pnl?: number;
  pnlPercent?: number;
  holdingPeriod?: number; // days
  triggerEvent: string;
  confidence: number;
  status: 'OPEN' | 'CLOSED' | 'EXPIRED';
}

export interface BacktestPosition {
  symbol: string;
  shares: number;
  averagePrice: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  trades: BacktestTrade[];
}

export interface BacktestResults {
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  totalReturnPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  calmarRatio: number;
  trades: BacktestTrade[];
  positions: BacktestPosition[];
  equityCurve: Array<{ date: string; value: number; drawdown: number }>;
  monthlyReturns: Array<{ month: string; return: number; returnPercent: number }>;
}

export interface BacktestConfig {
  startDate: string;
  endDate: string;
  initialCapital: number;
  positionSize: number; // Fixed dollar amount per trade
  maxPositions: number; // Maximum concurrent positions
  holdingPeriod: number; // Maximum days to hold a position
  stopLoss?: number; // Stop loss percentage (optional)
  takeProfit?: number; // Take profit percentage (optional)
  commission: number; // Commission per trade
}

/**
 * Backtesting Engine
 */
export class BacktestingEngine {
  private config: BacktestConfig;
  private trades: BacktestTrade[] = [];
  private positions: Map<string, BacktestPosition> = new Map();
  private capital: number;
  private equityCurve: Array<{ date: string; value: number; drawdown: number }> = [];
  private peakCapital: number;

  constructor(config: BacktestConfig) {
    this.config = config;
    this.capital = config.initialCapital;
    this.peakCapital = config.initialCapital;
  }

  /**
   * Run backtest simulation
   */
  async runBacktest(): Promise<BacktestResults> {
    console.log('🔄 Starting backtesting simulation...');
    
    // Reset state
    this.trades = [];
    this.positions.clear();
    this.capital = this.config.initialCapital;
    this.peakCapital = this.config.initialCapital;
    this.equityCurve = [];

    // Get historical events and market data
    const historicalData = await this.getHistoricalData();
    
    // Simulate trading day by day
    for (const dayData of historicalData) {
      await this.simulateDay(dayData);
    }

    // Close any remaining open positions
    this.closeAllPositions(this.config.endDate);

    // Calculate final results
    const results = this.calculateResults();
    
    console.log(`✅ Backtesting completed. Total return: ${results.totalReturnPercent.toFixed(2)}%`);
    return results;
  }

  /**
   * Get historical market data and events
   */
  private async getHistoricalData(): Promise<any[]> {
    // TODO: Replace with real historical data from:
    // - Yahoo Finance Historical API
    // - Alpha Vantage Historical Data
    // - GDELT Project for geopolitical events
    // - USASpending.gov for defense contracts
    
    console.warn('Backtesting requires real historical data. Please implement data sources.');
    return [];
  }

  // Removed synthetic data generation methods
  // Real historical data should be fetched from actual market data providers

  /**
   * Simulate one trading day
   */
  private async simulateDay(dayData: any): Promise<void> {
    const currentDate = dayData.date;
    
    // Update position values with current prices
    this.updatePositionValues(dayData.stockPrices);
    
    // Check for exit conditions on existing positions
    this.checkExitConditions(dayData);
    
    // Generate new recommendations based on events
    if (dayData.events.length > 0) {
      const recommendations = strategyEngine.generateRecommendations(
        dayData.events,
        [], // No geopolitical events for simplicity
        dayData.marketData
      );
      
      // Execute new trades based on recommendations
      for (const rec of recommendations) {
        await this.executeRecommendation(rec, dayData.stockPrices, currentDate);
      }
    }
    
    // Record equity curve point
    const totalValue = this.calculateTotalPortfolioValue(dayData.stockPrices);
    const drawdown = this.calculateDrawdown(totalValue);
    
    this.equityCurve.push({
      date: currentDate,
      value: totalValue,
      drawdown
    });
    
    // Update peak capital
    if (totalValue > this.peakCapital) {
      this.peakCapital = totalValue;
    }
  }

  /**
   * Execute a recommendation as a trade
   */
  private async executeRecommendation(
    recommendation: any,
    stockPrices: Record<string, number>,
    date: string
  ): Promise<void> {
    const symbol = recommendation.symbol;
    const price = stockPrices[symbol];
    
    if (!price) return; // No price data available
    
    // Check if we already have a position in this symbol
    if (this.positions.has(symbol)) return;
    
    // Check if we have reached max positions
    if (this.positions.size >= this.config.maxPositions) return;
    
    // Calculate position size
    const tradeValue = Math.min(this.config.positionSize, this.capital * 0.95);
    const quantity = Math.floor(tradeValue / price);
    
    if (quantity <= 0) return; // Not enough capital
    
    const totalCost = quantity * price + this.config.commission;
    
    if (totalCost > this.capital) return; // Not enough capital
    
    // Execute the trade
    const trade: BacktestTrade = {
      id: `bt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol,
      action: 'BUY', // Backtesting focuses on long positions
      quantity,
      entryPrice: price,
      entryDate: date,
      triggerEvent: recommendation.triggerEvent || 'Strategy Signal',
      confidence: recommendation.confidence || 0.5,
      status: 'OPEN'
    };
    
    this.trades.push(trade);
    
    // Update capital
    this.capital -= totalCost;
    
    // Create/update position
    const position: BacktestPosition = {
      symbol,
      shares: quantity,
      averagePrice: price,
      currentValue: quantity * price,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      trades: [trade]
    };
    
    this.positions.set(symbol, position);
    
    console.log(`📊 BT Trade: BUY ${quantity} ${symbol} @ $${price.toFixed(2)} (${date})`);
  }

  /**
   * Update position values with current prices
   */
  private updatePositionValues(stockPrices: Record<string, number>): void {
    this.positions.forEach((position, symbol) => {
      const currentPrice = stockPrices[symbol];
      if (currentPrice) {
        position.currentValue = position.shares * currentPrice;
        position.unrealizedPnL = position.currentValue - (position.shares * position.averagePrice);
        position.unrealizedPnLPercent = (position.unrealizedPnL / (position.shares * position.averagePrice)) * 100;
      }
    });
  }

  /**
   * Check exit conditions for existing positions
   */
  private checkExitConditions(dayData: any): void {
    const positionsToClose: string[] = [];
    
    this.positions.forEach((position, symbol) => {
      const currentPrice = dayData.stockPrices[symbol];
      if (!currentPrice) return;
      
      const openTrade = position.trades.find(t => t.status === 'OPEN');
      if (!openTrade) return;
      
      const daysSinceEntry = this.getDaysBetween(openTrade.entryDate, dayData.date);
      const pnlPercent = ((currentPrice - openTrade.entryPrice) / openTrade.entryPrice) * 100;
      
      let shouldClose = false;
      let reason = '';
      
      // Holding period limit
      if (daysSinceEntry >= this.config.holdingPeriod) {
        shouldClose = true;
        reason = 'Holding period expired';
      }
      
      // Stop loss
      if (this.config.stopLoss && pnlPercent <= -this.config.stopLoss) {
        shouldClose = true;
        reason = 'Stop loss triggered';
      }
      
      // Take profit
      if (this.config.takeProfit && pnlPercent >= this.config.takeProfit) {
        shouldClose = true;
        reason = 'Take profit triggered';
      }
      
      if (shouldClose) {
        this.closePosition(symbol, currentPrice, dayData.date, reason);
        positionsToClose.push(symbol);
      }
    });
    
    // Remove closed positions
    positionsToClose.forEach(symbol => this.positions.delete(symbol));
  }

  /**
   * Close a position
   */
  private closePosition(symbol: string, exitPrice: number, exitDate: string, reason: string): void {
    const position = this.positions.get(symbol);
    if (!position) return;
    
    const openTrade = position.trades.find(t => t.status === 'OPEN');
    if (!openTrade) return;
    
    // Calculate P&L
    const grossPnL = (exitPrice - openTrade.entryPrice) * openTrade.quantity;
    const netPnL = grossPnL - (this.config.commission * 2); // Entry + exit commission
    const pnlPercent = (netPnL / (openTrade.entryPrice * openTrade.quantity)) * 100;
    
    // Update trade
    openTrade.exitPrice = exitPrice;
    openTrade.exitDate = exitDate;
    openTrade.pnl = netPnL;
    openTrade.pnlPercent = pnlPercent;
    openTrade.holdingPeriod = this.getDaysBetween(openTrade.entryDate, exitDate);
    openTrade.status = 'CLOSED';
    
    // Add capital back
    const saleProceeds = openTrade.quantity * exitPrice - this.config.commission;
    this.capital += saleProceeds;
    
    console.log(`📊 BT Close: SELL ${openTrade.quantity} ${symbol} @ $${exitPrice.toFixed(2)} | P&L: $${netPnL.toFixed(2)} (${pnlPercent.toFixed(1)}%) - ${reason}`);
  }

  /**
   * Close all open positions (end of backtest)
   */
  private closeAllPositions(endDate: string): void {
    const openPositions = Array.from(this.positions.keys());
    
    openPositions.forEach(symbol => {
      const position = this.positions.get(symbol);
      if (position) {
        // Use last known price or estimate
        const estimatedPrice = position.averagePrice * (1 + Math.random() * 0.1 - 0.05); // ±5%
        this.closePosition(symbol, estimatedPrice, endDate, 'End of backtest');
      }
    });
    
    this.positions.clear();
  }

  /**
   * Calculate final backtest results
   */
  private calculateResults(): BacktestResults {
    const closedTrades = this.trades.filter(t => t.status === 'CLOSED');
    const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
    const losingTrades = closedTrades.filter(t => (t.pnl || 0) < 0);
    
    const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalReturn = this.capital - this.config.initialCapital;
    const totalReturnPercent = (totalReturn / this.config.initialCapital) * 100;
    
    const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
    const avgWin = winningTrades.length > 0 ? 
      winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? 
      Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)) / losingTrades.length : 0;
    
    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;
    const sharpeRatio = this.calculateSharpeRatio();
    const maxDrawdown = this.calculateMaxDrawdown();
    const maxDrawdownPercent = this.config.initialCapital > 0 ? (maxDrawdown / this.config.initialCapital) * 100 : 0;
    const calmarRatio = maxDrawdownPercent > 0 ? totalReturnPercent / maxDrawdownPercent : 0;
    
    return {
      startDate: this.config.startDate,
      endDate: this.config.endDate,
      initialCapital: this.config.initialCapital,
      finalCapital: this.capital,
      totalReturn,
      totalReturnPercent,
      totalTrades: this.trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      sharpeRatio,
      maxDrawdown,
      maxDrawdownPercent,
      calmarRatio,
      trades: this.trades,
      positions: Array.from(this.positions.values()),
      equityCurve: this.equityCurve,
      monthlyReturns: this.calculateMonthlyReturns()
    };
  }

  /**
   * Calculate total portfolio value
   */
  private calculateTotalPortfolioValue(stockPrices: Record<string, number>): number {
    let totalValue = this.capital;
    
    this.positions.forEach((position, symbol) => {
      const currentPrice = stockPrices[symbol];
      if (currentPrice) {
        totalValue += position.shares * currentPrice;
      }
    });
    
    return totalValue;
  }

  /**
   * Calculate drawdown
   */
  private calculateDrawdown(currentValue: number): number {
    return this.peakCapital > 0 ? ((this.peakCapital - currentValue) / this.peakCapital) * 100 : 0;
  }

  /**
   * Calculate maximum drawdown
   */
  private calculateMaxDrawdown(): number {
    let maxDrawdown = 0;
    
    this.equityCurve.forEach(point => {
      if (point.drawdown > maxDrawdown) {
        maxDrawdown = point.drawdown;
      }
    });
    
    return maxDrawdown * this.config.initialCapital / 100;
  }

  /**
   * Calculate Sharpe ratio
   */
  private calculateSharpeRatio(): number {
    if (this.equityCurve.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < this.equityCurve.length; i++) {
      const prevValue = this.equityCurve[i - 1].value;
      const currentValue = this.equityCurve[i].value;
      const dailyReturn = (currentValue - prevValue) / prevValue;
      returns.push(dailyReturn);
    }
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    // Annualized Sharpe ratio (assuming 252 trading days)
    const annualizedReturn = avgReturn * 252;
    const annualizedVolatility = stdDev * Math.sqrt(252);
    
    return annualizedVolatility > 0 ? annualizedReturn / annualizedVolatility : 0;
  }

  /**
   * Calculate monthly returns
   */
  private calculateMonthlyReturns(): Array<{ month: string; return: number; returnPercent: number }> {
    const monthlyReturns = [];
    const monthlyData = new Map<string, { start: number; end: number }>();
    
    this.equityCurve.forEach(point => {
      const date = new Date(point.date);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { start: point.value, end: point.value });
      } else {
        monthlyData.get(monthKey)!.end = point.value;
      }
    });
    
    monthlyData.forEach((data, month) => {
      const monthReturn = data.end - data.start;
      const monthReturnPercent = data.start > 0 ? (monthReturn / data.start) * 100 : 0;
      
      monthlyReturns.push({
        month,
        return: monthReturn,
        returnPercent: monthReturnPercent
      });
    });
    
    return monthlyReturns.sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Get days between two dates
   */
  private getDaysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

/**
 * Backtest Service - Singleton instance
 */
export class BacktestService {
  private engine: BacktestingEngine | null = null;
  private lastResults: BacktestResults | null = null;

  /**
   * Run a new backtest
   */
  async runBacktest(config: BacktestConfig): Promise<BacktestResults> {
    this.engine = new BacktestingEngine(config);
    this.lastResults = await this.engine.runBacktest();
    return this.lastResults;
  }

  /**
   * Get last backtest results
   */
  getLastResults(): BacktestResults | null {
    return this.lastResults;
  }

  /**
   * Quick backtest with default settings
   */
  async quickBacktest(
    startDate: string,
    endDate: string,
    initialCapital: number = 100000
  ): Promise<BacktestResults> {
    const config: BacktestConfig = {
      startDate,
      endDate,
      initialCapital,
      positionSize: 10000, // $10k per position
      maxPositions: 8,
      holdingPeriod: 30, // 30 days max hold
      stopLoss: 10, // 10% stop loss
      takeProfit: 20, // 20% take profit
      commission: 0 // Commission-free trading
    };

    return this.runBacktest(config);
  }

  /**
   * Get predefined backtest scenarios
   */
  getBacktestScenarios(): Array<{ name: string; config: BacktestConfig }> {
    const baseConfig = {
      initialCapital: 100000,
      commission: 0
    };

    return [
      {
        name: 'Conservative Strategy',
        config: {
          ...baseConfig,
          startDate: '2023-01-01',
          endDate: '2023-12-31',
          positionSize: 5000,
          maxPositions: 10,
          holdingPeriod: 45,
          stopLoss: 8,
          takeProfit: 15
        }
      },
      {
        name: 'Aggressive Strategy',
        config: {
          ...baseConfig,
          startDate: '2023-01-01',
          endDate: '2023-12-31',
          positionSize: 15000,
          maxPositions: 5,
          holdingPeriod: 21,
          stopLoss: 15,
          takeProfit: 30
        }
      },
      {
        name: 'Long-term Strategy',
        config: {
          ...baseConfig,
          startDate: '2022-01-01',
          endDate: '2023-12-31',
          positionSize: 8000,
          maxPositions: 12,
          holdingPeriod: 90,
          stopLoss: 12,
          takeProfit: 25
        }
      }
    ];
  }
}

// Export singleton instance
export const backtestService = new BacktestService();