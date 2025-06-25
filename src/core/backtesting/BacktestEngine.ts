/**
 * BacktestEngine - Core backtesting infrastructure
 * Validates trading strategies against historical data with realistic execution simulation
 */

import {
  BacktestConfig,
  BacktestResult,
  Trade,
  Portfolio,
  Position,
  Signal,
  MarketData,
  EquityPoint,
  DrawdownPoint,
  PortfolioMetrics,
  BacktestStatistics
} from '@/core/domain/types';
import { EventEmitter } from 'events';

export interface Strategy {
  id: string;
  name: string;
  description: string;
  generateSignals(data: MarketData[], portfolio: Portfolio): Promise<Signal[]>;
  onTradeExecuted?(trade: Trade): void;
  onDayEnd?(portfolio: Portfolio): void;
}

export class BacktestEngine extends EventEmitter {
  private config: BacktestConfig;
  private portfolio: Portfolio;
  private equityCurve: EquityPoint[] = [];
  private drawdownCurve: DrawdownPoint[] = [];
  private peakEquity: number = 0;
  private currentDrawdownStart?: Date;
  private warnings: string[] = [];

  constructor(config: BacktestConfig) {
    super();
    this.config = config;
    this.portfolio = this.initializePortfolio(config.initialCapital);
  }

  /**
   * Run backtest for a strategy over historical data
   */
  async runBacktest(
    strategy: Strategy,
    historicalData: Map<string, MarketData[]>
  ): Promise<BacktestResult> {
    console.log(`🚀 Starting backtest for strategy: ${strategy.name}`);
    console.log(`📅 Period: ${this.config.startDate.toDateString()} to ${this.config.endDate.toDateString()}`);
    console.log(`💰 Initial capital: $${this.config.initialCapital.toLocaleString()}`);

    // Reset portfolio for new backtest
    this.portfolio = this.initializePortfolio(this.config.initialCapital);
    this.equityCurve = [];
    this.drawdownCurve = [];
    this.warnings = [];

    try {
      // Get all unique timestamps from historical data
      const allTimestamps = this.extractTimestamps(historicalData);
      const tradingDays = this.filterTradingDays(allTimestamps);

      // Iterate through each trading day
      for (const timestamp of tradingDays) {
        // Update portfolio with current market prices
        await this.updatePortfolioValues(timestamp, historicalData);

        // Get current market snapshot
        const currentData = this.getCurrentMarketData(timestamp, historicalData);

        // Generate trading signals
        const signals = await strategy.generateSignals(currentData, this.portfolio);

        // Execute trades based on signals
        for (const signal of signals) {
          if (signal.action !== 'HOLD') {
            await this.executeSignal(signal, timestamp, historicalData);
          }
        }

        // Record daily metrics
        this.recordDailyMetrics(timestamp);

        // Call strategy's end-of-day hook
        if (strategy.onDayEnd) {
          strategy.onDayEnd(this.portfolio);
        }

        // Emit progress event
        this.emit('progress', {
          currentDate: timestamp,
          portfolioValue: this.portfolio.totalValue,
          trades: this.portfolio.trades.length
        });
      }

      // Calculate final metrics
      const metrics = this.calculateMetrics();
      const statistics = this.calculateStatistics(tradingDays);

      const result: BacktestResult = {
        config: this.config,
        portfolio: this.portfolio,
        trades: this.portfolio.trades,
        equityCurve: this.equityCurve,
        drawdownCurve: this.drawdownCurve,
        metrics,
        statistics,
        warnings: this.warnings
      };

      console.log(`✅ Backtest completed: ${this.portfolio.trades.length} trades executed`);
      console.log(`📊 Total return: ${metrics.totalReturnPercent.toFixed(2)}%`);
      console.log(`📉 Max drawdown: ${metrics.maxDrawdown.toFixed(2)}%`);
      console.log(`📈 Sharpe ratio: ${metrics.sharpeRatio.toFixed(2)}`);

      return result;

    } catch (error) {
      console.error('❌ Backtest failed:', error);
      throw error;
    }
  }

  /**
   * Execute a trading signal with realistic simulation
   */
  private async executeSignal(
    signal: Signal,
    timestamp: Date,
    historicalData: Map<string, MarketData[]>
  ): Promise<void> {
    const marketData = this.getMarketDataPoint(signal.symbol, timestamp, historicalData);
    if (!marketData) {
      this.warnings.push(`No market data for ${signal.symbol} at ${timestamp}`);
      return;
    }

    // Calculate execution price with slippage
    const executionPrice = this.calculateExecutionPrice(
      marketData,
      signal.action,
      signal.strength
    );

    if (signal.action === 'BUY') {
      await this.executeBuy(signal, executionPrice, timestamp);
    } else if (signal.action === 'SELL') {
      await this.executeSell(signal, executionPrice, timestamp);
    }
  }

  /**
   * Execute buy order
   */
  private async executeBuy(
    signal: Signal,
    price: number,
    timestamp: Date
  ): Promise<void> {
    // Check risk limits before buying
    const positionSize = this.calculatePositionSize(signal, price);
    const totalCost = positionSize * price + this.config.commission;

    if (totalCost > this.portfolio.cash) {
      this.warnings.push(`Insufficient cash for ${signal.symbol} at ${timestamp}`);
      return;
    }

    // Check max positions limit
    if (this.config.maxPositions && this.portfolio.positions.size >= this.config.maxPositions) {
      this.warnings.push(`Max positions limit reached at ${timestamp}`);
      return;
    }

    // Create trade
    const trade: Trade = {
      id: `trade_${Date.now()}_${Math.random()}`,
      symbol: signal.symbol,
      side: 'BUY',
      quantity: positionSize,
      entryPrice: price,
      entryTime: timestamp,
      commission: this.config.commission,
      slippage: this.calculateSlippage(price, signal.action),
      strategy: signal.strategy,
      signals: [signal]
    };

    // Update portfolio
    this.portfolio.cash -= totalCost;
    this.portfolio.trades.push(trade);

    // Update or create position
    const position = this.portfolio.positions.get(signal.symbol);
    if (position) {
      // Average into existing position
      const totalShares = position.quantity + positionSize;
      const totalCost = (position.quantity * position.averagePrice) + (positionSize * price);
      position.quantity = totalShares;
      position.averagePrice = totalCost / totalShares;
      position.trades.push(trade);
    } else {
      // Create new position
      const newPosition: Position = {
        symbol: signal.symbol,
        quantity: positionSize,
        averagePrice: price,
        currentPrice: price,
        marketValue: positionSize * price,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        trades: [trade],
        correlations: new Map()
      };
      this.portfolio.positions.set(signal.symbol, newPosition);
    }

    this.emit('tradeExecuted', trade);
  }

  /**
   * Execute sell order
   */
  private async executeSell(
    signal: Signal,
    price: number,
    timestamp: Date
  ): Promise<void> {
    const position = this.portfolio.positions.get(signal.symbol);
    if (!position || position.quantity === 0) {
      this.warnings.push(`No position to sell for ${signal.symbol} at ${timestamp}`);
      return;
    }

    const quantityToSell = Math.min(position.quantity, this.calculatePositionSize(signal, price));
    const proceeds = quantityToSell * price - this.config.commission;

    // Calculate realized P&L
    const costBasis = quantityToSell * position.averagePrice;
    const realizedPnL = proceeds - costBasis;
    const realizedPnLPercent = (realizedPnL / costBasis) * 100;

    // Create trade
    const trade: Trade = {
      id: `trade_${Date.now()}_${Math.random()}`,
      symbol: signal.symbol,
      side: 'SELL',
      quantity: quantityToSell,
      entryPrice: position.averagePrice,
      exitPrice: price,
      entryTime: position.trades[0].entryTime,
      exitTime: timestamp,
      commission: this.config.commission,
      slippage: this.calculateSlippage(price, signal.action),
      realizedPnL,
      realizedPnLPercent,
      strategy: signal.strategy,
      signals: [signal]
    };

    // Update portfolio
    this.portfolio.cash += proceeds;
    this.portfolio.trades.push(trade);

    // Update position
    position.quantity -= quantityToSell;
    if (position.quantity === 0) {
      this.portfolio.positions.delete(signal.symbol);
    } else {
      // Recalculate average price if partial sell
      position.trades.push(trade);
    }

    this.emit('tradeExecuted', trade);
  }

  /**
   * Calculate position size based on signal strength and risk limits
   */
  private calculatePositionSize(signal: Signal, price: number): number {
    const availableCash = this.portfolio.cash;
    const portfolioValue = this.portfolio.totalValue;

    // Base position size on signal confidence and strength
    let positionValue = portfolioValue * 0.1 * signal.confidence; // Base 10% position

    // Adjust for signal strength
    positionValue *= Math.abs(signal.strength);

    // Apply max position size limit
    const maxPositionValue = portfolioValue * 0.15; // Max 15% per position
    positionValue = Math.min(positionValue, maxPositionValue);

    // Ensure we don't exceed available cash
    positionValue = Math.min(positionValue, availableCash * 0.95); // Keep 5% cash buffer

    return Math.floor(positionValue / price);
  }

  /**
   * Calculate execution price with slippage
   */
  private calculateExecutionPrice(
    marketData: MarketData,
    action: 'BUY' | 'SELL',
    strength: number
  ): number {
    let basePrice = marketData.close;

    // Add bid-ask spread simulation
    const spread = marketData.close * 0.0001; // 0.01% spread
    if (action === 'BUY') {
      basePrice += spread / 2;
    } else {
      basePrice -= spread / 2;
    }

    // Apply slippage based on model
    const slippage = this.calculateSlippage(basePrice, action);
    if (action === 'BUY') {
      return basePrice + slippage;
    } else {
      return basePrice - slippage;
    }
  }

  /**
   * Calculate slippage based on configuration
   */
  private calculateSlippage(price: number, action: 'BUY' | 'SELL'): number {
    switch (this.config.slippageModel) {
      case 'FIXED':
        return this.config.slippageValue;
      
      case 'PERCENTAGE':
        return price * this.config.slippageValue;
      
      case 'MARKET_IMPACT':
        // Simulate market impact based on order size
        const baseSlippage = price * this.config.slippageValue;
        const impactMultiplier = action === 'BUY' ? 1.2 : 0.8;
        return baseSlippage * impactMultiplier;
      
      default:
        return 0;
    }
  }

  /**
   * Update portfolio values with current market prices
   */
  private async updatePortfolioValues(
    timestamp: Date,
    historicalData: Map<string, MarketData[]>
  ): Promise<void> {
    let totalPositionValue = 0;

    for (const [symbol, position] of this.portfolio.positions) {
      const marketData = this.getMarketDataPoint(symbol, timestamp, historicalData);
      if (marketData) {
        position.currentPrice = marketData.close;
        position.marketValue = position.quantity * position.currentPrice;
        position.unrealizedPnL = position.marketValue - (position.quantity * position.averagePrice);
        position.unrealizedPnLPercent = (position.unrealizedPnL / (position.quantity * position.averagePrice)) * 100;
        
        totalPositionValue += position.marketValue;
      }
    }

    this.portfolio.totalValue = this.portfolio.cash + totalPositionValue;
  }

  /**
   * Record daily metrics for analysis
   */
  private recordDailyMetrics(timestamp: Date): void {
    const equity = this.portfolio.totalValue;
    
    // Update peak equity
    if (equity > this.peakEquity) {
      this.peakEquity = equity;
      this.currentDrawdownStart = undefined;
    }

    // Calculate drawdown
    const drawdown = this.peakEquity > 0 ? ((this.peakEquity - equity) / this.peakEquity) * 100 : 0;
    
    // Record equity point
    this.equityCurve.push({
      timestamp,
      value: equity,
      cash: this.portfolio.cash,
      positions: this.portfolio.totalValue - this.portfolio.cash,
      drawdown
    });

    // Record drawdown point if in drawdown
    if (drawdown > 0) {
      if (!this.currentDrawdownStart) {
        this.currentDrawdownStart = timestamp;
      }
      
      const duration = Math.floor((timestamp.getTime() - this.currentDrawdownStart.getTime()) / (1000 * 60 * 60 * 24));
      
      this.drawdownCurve.push({
        timestamp,
        drawdown,
        duration
      });
    }
  }

  /**
   * Calculate portfolio metrics
   */
  private calculateMetrics(): PortfolioMetrics {
    const returns = this.calculateReturns();
    const trades = this.portfolio.trades.filter(t => t.realizedPnL !== undefined);
    
    const winningTrades = trades.filter(t => t.realizedPnL! > 0);
    const losingTrades = trades.filter(t => t.realizedPnL! <= 0);
    
    const totalReturn = this.portfolio.totalValue - this.config.initialCapital;
    const totalReturnPercent = (totalReturn / this.config.initialCapital) * 100;
    
    const metrics: PortfolioMetrics = {
      totalReturn,
      totalReturnPercent,
      sharpeRatio: this.calculateSharpeRatio(returns),
      sortinoRatio: this.calculateSortinoRatio(returns),
      calmarRatio: this.calculateCalmarRatio(totalReturnPercent),
      maxDrawdown: Math.max(...this.drawdownCurve.map(d => d.drawdown), 0),
      winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
      profitFactor: this.calculateProfitFactor(winningTrades, losingTrades),
      avgWin: winningTrades.length > 0 ? 
        winningTrades.reduce((sum, t) => sum + t.realizedPnL!, 0) / winningTrades.length : 0,
      avgLoss: losingTrades.length > 0 ?
        losingTrades.reduce((sum, t) => sum + t.realizedPnL!, 0) / losingTrades.length : 0,
      expectancy: this.calculateExpectancy(trades)
    };

    return metrics;
  }

  /**
   * Calculate daily returns for ratio calculations
   */
  private calculateReturns(): number[] {
    const returns: number[] = [];
    
    for (let i = 1; i < this.equityCurve.length; i++) {
      const prevValue = this.equityCurve[i - 1].value;
      const currValue = this.equityCurve[i].value;
      const dailyReturn = ((currValue - prevValue) / prevValue) * 100;
      returns.push(dailyReturn);
    }
    
    return returns;
  }

  /**
   * Calculate Sharpe Ratio (assuming risk-free rate of 2% annually)
   */
  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const stdDev = this.calculateStdDev(returns);
    
    const annualizedReturn = avgReturn * 252; // Trading days per year
    const annualizedStdDev = stdDev * Math.sqrt(252);
    const riskFreeRate = 2; // 2% annual risk-free rate
    
    return stdDev > 0 ? (annualizedReturn - riskFreeRate) / annualizedStdDev : 0;
  }

  /**
   * Calculate Sortino Ratio (downside deviation)
   */
  private calculateSortinoRatio(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const negativeReturns = returns.filter(r => r < 0);
    
    if (negativeReturns.length === 0) return avgReturn > 0 ? 10 : 0; // Max sortino if no negative returns
    
    const downsideDeviation = this.calculateStdDev(negativeReturns);
    const annualizedReturn = avgReturn * 252;
    const annualizedDownsideDev = downsideDeviation * Math.sqrt(252);
    
    return annualizedDownsideDev > 0 ? annualizedReturn / annualizedDownsideDev : 0;
  }

  /**
   * Calculate Calmar Ratio (return / max drawdown)
   */
  private calculateCalmarRatio(totalReturn: number): number {
    const maxDrawdown = Math.max(...this.drawdownCurve.map(d => d.drawdown), 1); // Avoid division by zero
    return totalReturn / maxDrawdown;
  }

  /**
   * Calculate profit factor (gross profit / gross loss)
   */
  private calculateProfitFactor(winningTrades: Trade[], losingTrades: Trade[]): number {
    const grossProfit = winningTrades.reduce((sum, t) => sum + t.realizedPnL!, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.realizedPnL!, 0));
    
    return grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;
  }

  /**
   * Calculate expectancy (average expected profit per trade)
   */
  private calculateExpectancy(trades: Trade[]): number {
    if (trades.length === 0) return 0;
    
    const totalPnL = trades.reduce((sum, t) => sum + (t.realizedPnL || 0), 0);
    return totalPnL / trades.length;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
    
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Calculate comprehensive statistics
   */
  private calculateStatistics(tradingDays: Date[]): BacktestStatistics {
    const trades = this.portfolio.trades.filter(t => t.realizedPnL !== undefined);
    const sortedTrades = [...trades].sort((a, b) => (b.realizedPnL || 0) - (a.realizedPnL || 0));
    
    // Calculate consecutive wins/losses
    let currentStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    
    for (const trade of trades) {
      if (trade.realizedPnL! > 0) {
        if (currentStreak >= 0) {
          currentStreak++;
          maxWinStreak = Math.max(maxWinStreak, currentStreak);
        } else {
          currentStreak = 1;
        }
      } else {
        if (currentStreak <= 0) {
          currentStreak--;
          maxLossStreak = Math.max(maxLossStreak, Math.abs(currentStreak));
        } else {
          currentStreak = -1;
        }
      }
    }

    // Calculate monthly returns
    const monthlyReturns = this.calculateMonthlyReturns();

    // Calculate holding periods
    const holdingPeriods = trades
      .filter(t => t.exitTime)
      .map(t => (t.exitTime!.getTime() - t.entryTime.getTime()) / (1000 * 60 * 60 * 24));
    
    const avgHoldingPeriod = holdingPeriods.length > 0 ?
      holdingPeriods.reduce((sum, p) => sum + p, 0) / holdingPeriods.length : 0;

    const stats: BacktestStatistics = {
      totalDays: Math.floor((this.config.endDate.getTime() - this.config.startDate.getTime()) / (1000 * 60 * 60 * 24)),
      tradingDays: tradingDays.length,
      totalTrades: trades.length,
      avgTradesPerDay: trades.length / tradingDays.length,
      avgHoldingPeriod,
      maxConsecutiveWins: maxWinStreak,
      maxConsecutiveLosses: maxLossStreak,
      bestTrade: sortedTrades[0] || null,
      worstTrade: sortedTrades[sortedTrades.length - 1] || null,
      monthlyReturns,
      annualizedReturn: this.calculateAnnualizedReturn(),
      annualizedVolatility: this.calculateAnnualizedVolatility()
    };

    return stats;
  }

  /**
   * Calculate monthly returns
   */
  private calculateMonthlyReturns(): Map<string, number> {
    const monthlyReturns = new Map<string, number>();
    
    // Group equity points by month
    const monthlyEquity = new Map<string, { start: number; end: number }>();
    
    for (const point of this.equityCurve) {
      const monthKey = `${point.timestamp.getFullYear()}-${(point.timestamp.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (!monthlyEquity.has(monthKey)) {
        monthlyEquity.set(monthKey, { start: point.value, end: point.value });
      } else {
        monthlyEquity.get(monthKey)!.end = point.value;
      }
    }
    
    // Calculate returns for each month
    for (const [month, equity] of monthlyEquity) {
      const monthlyReturn = ((equity.end - equity.start) / equity.start) * 100;
      monthlyReturns.set(month, monthlyReturn);
    }
    
    return monthlyReturns;
  }

  /**
   * Calculate annualized return
   */
  private calculateAnnualizedReturn(): number {
    const totalReturn = (this.portfolio.totalValue - this.config.initialCapital) / this.config.initialCapital;
    const years = this.equityCurve.length / 252; // Trading days per year
    
    return years > 0 ? (Math.pow(1 + totalReturn, 1 / years) - 1) * 100 : 0;
  }

  /**
   * Calculate annualized volatility
   */
  private calculateAnnualizedVolatility(): number {
    const returns = this.calculateReturns();
    const stdDev = this.calculateStdDev(returns);
    
    return stdDev * Math.sqrt(252); // Annualized
  }

  // Helper methods

  private initializePortfolio(capital: number): Portfolio {
    return {
      cash: capital,
      totalValue: capital,
      positions: new Map(),
      trades: [],
      metrics: {} as PortfolioMetrics,
      riskMetrics: {} as any
    };
  }

  private extractTimestamps(historicalData: Map<string, MarketData[]>): Date[] {
    const timestampSet = new Set<number>();
    
    for (const data of historicalData.values()) {
      for (const point of data) {
        timestampSet.add(point.timestamp.getTime());
      }
    }
    
    return Array.from(timestampSet)
      .sort((a, b) => a - b)
      .map(ts => new Date(ts));
  }

  private filterTradingDays(timestamps: Date[]): Date[] {
    return timestamps.filter(date => {
      const time = date.getTime();
      return time >= this.config.startDate.getTime() && 
             time <= this.config.endDate.getTime();
    });
  }

  private getCurrentMarketData(timestamp: Date, historicalData: Map<string, MarketData[]>): MarketData[] {
    const snapshot: MarketData[] = [];
    
    for (const [symbol, data] of historicalData) {
      const point = this.getMarketDataPoint(symbol, timestamp, historicalData);
      if (point) {
        snapshot.push(point);
      }
    }
    
    return snapshot;
  }

  private getMarketDataPoint(
    symbol: string,
    timestamp: Date,
    historicalData: Map<string, MarketData[]>
  ): MarketData | null {
    const data = historicalData.get(symbol);
    if (!data) return null;
    
    // Find the data point for this timestamp
    return data.find(d => d.timestamp.getTime() === timestamp.getTime()) || null;
  }
}