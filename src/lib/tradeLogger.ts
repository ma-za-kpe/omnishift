/**
 * Trade Logger - Manual Trade Entry for Robinhood
 * Allows users to log buy/sell trades with P&L tracking
 */

export interface Trade {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  totalCost: number;
  commission: number;
  timestamp: string;
  notes?: string;
  tags?: string[];
  source: 'MANUAL' | 'RECOMMENDATION' | 'AUTO';
  recommendationId?: string;
  status: 'PENDING' | 'FILLED' | 'CANCELLED';
  platform: 'ROBINHOOD' | 'OTHER';
}

export interface Position {
  symbol: string;
  totalShares: number;
  averagePrice: number;
  totalCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL: number;
  trades: Trade[];
  lastUpdated: string;
}

export interface TradingPerformance {
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  totalPnLPercent: number;
  bestTrade: Trade | null;
  worstTrade: Trade | null;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

/**
 * Trade Logger Service
 */
export class TradeLoggerService {
  private trades: Trade[] = [];
  private positions: Map<string, Position> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Log a new trade
   */
  logTrade(trade: Omit<Trade, 'id' | 'timestamp' | 'status'>): Trade {
    const newTrade: Trade = {
      ...trade,
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      status: 'FILLED', // Assume manual entries are filled
      commission: trade.commission || 0
    };

    this.trades.push(newTrade);
    this.updatePosition(newTrade);
    this.saveToStorage();

    console.log(`📊 Trade logged: ${newTrade.action} ${newTrade.quantity} ${newTrade.symbol} @ $${newTrade.price}`);
    return newTrade;
  }

  /**
   * Log a buy trade
   */
  logBuy(
    symbol: string,
    quantity: number,
    price: number,
    options: {
      notes?: string;
      tags?: string[];
      source?: 'MANUAL' | 'RECOMMENDATION' | 'AUTO';
      recommendationId?: string;
      platform?: 'ROBINHOOD' | 'OTHER';
      commission?: number;
    } = {}
  ): Trade {
    return this.logTrade({
      symbol: symbol.toUpperCase(),
      action: 'BUY',
      quantity,
      price,
      totalCost: quantity * price + (options.commission || 0),
      commission: options.commission || 0,
      notes: options.notes,
      tags: options.tags || [],
      source: options.source || 'MANUAL',
      recommendationId: options.recommendationId,
      platform: options.platform || 'ROBINHOOD'
    });
  }

  /**
   * Log a sell trade
   */
  logSell(
    symbol: string,
    quantity: number,
    price: number,
    options: {
      notes?: string;
      tags?: string[];
      source?: 'MANUAL' | 'RECOMMENDATION' | 'AUTO';
      recommendationId?: string;
      platform?: 'ROBINHOOD' | 'OTHER';
      commission?: number;
    } = {}
  ): Trade {
    return this.logTrade({
      symbol: symbol.toUpperCase(),
      action: 'SELL',
      quantity,
      price,
      totalCost: quantity * price - (options.commission || 0),
      commission: options.commission || 0,
      notes: options.notes,
      tags: options.tags || [],
      source: options.source || 'MANUAL',
      recommendationId: options.recommendationId,
      platform: options.platform || 'ROBINHOOD'
    });
  }

  /**
   * Update position based on trade
   */
  private updatePosition(trade: Trade): void {
    const existing = this.positions.get(trade.symbol);

    if (!existing) {
      // New position
      if (trade.action === 'BUY') {
        this.positions.set(trade.symbol, {
          symbol: trade.symbol,
          totalShares: trade.quantity,
          averagePrice: trade.price,
          totalCost: trade.totalCost,
          currentPrice: trade.price,
          marketValue: trade.quantity * trade.price,
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0,
          realizedPnL: 0,
          trades: [trade],
          lastUpdated: trade.timestamp
        });
      }
      return;
    }

    // Update existing position
    const position = existing;
    position.trades.push(trade);
    position.lastUpdated = trade.timestamp;

    if (trade.action === 'BUY') {
      // Add to position
      const newTotalCost = position.totalCost + trade.totalCost;
      const newTotalShares = position.totalShares + trade.quantity;
      
      position.averagePrice = newTotalShares > 0 ? newTotalCost / newTotalShares : 0;
      position.totalShares = newTotalShares;
      position.totalCost = newTotalCost;
    } else {
      // Sell from position
      const sellValue = trade.quantity * trade.price - trade.commission;
      const costBasis = trade.quantity * position.averagePrice;
      const realizedPnL = sellValue - costBasis;

      position.totalShares -= trade.quantity;
      position.totalCost -= costBasis;
      position.realizedPnL += realizedPnL;

      if (position.totalShares <= 0) {
        // Position closed
        position.totalShares = 0;
        position.totalCost = 0;
        position.averagePrice = 0;
      }
    }

    // Update market value and unrealized P&L (will be updated with real prices later)
    position.marketValue = position.totalShares * position.currentPrice;
    position.unrealizedPnL = position.marketValue - position.totalCost;
    position.unrealizedPnLPercent = position.totalCost > 0 ? 
      (position.unrealizedPnL / position.totalCost) * 100 : 0;

    this.positions.set(trade.symbol, position);
  }

  /**
   * Update position with current market price
   */
  async updatePositionPrice(symbol: string, currentPrice: number): Promise<Position | null> {
    const position = this.positions.get(symbol.toUpperCase());
    if (!position) return null;

    position.currentPrice = currentPrice;
    position.marketValue = position.totalShares * currentPrice;
    position.unrealizedPnL = position.marketValue - position.totalCost;
    position.unrealizedPnLPercent = position.totalCost > 0 ? 
      (position.unrealizedPnL / position.totalCost) * 100 : 0;
    position.lastUpdated = new Date().toISOString();

    this.positions.set(symbol, position);
    this.saveToStorage();

    return position;
  }

  /**
   * Get all trades
   */
  getAllTrades(): Trade[] {
    return [...this.trades].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Get trades for a specific symbol
   */
  getTradesForSymbol(symbol: string): Trade[] {
    return this.trades
      .filter(trade => trade.symbol === symbol.toUpperCase())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Get all positions
   */
  getAllPositions(): Position[] {
    return Array.from(this.positions.values())
      .filter(position => position.totalShares > 0)
      .sort((a, b) => b.marketValue - a.marketValue);
  }

  /**
   * Get position for specific symbol
   */
  getPosition(symbol: string): Position | null {
    return this.positions.get(symbol.toUpperCase()) || null;
  }

  /**
   * Calculate trading performance metrics
   */
  calculatePerformance(): TradingPerformance {
    const completedTrades = this.getCompletedTrades();
    const winningTrades = completedTrades.filter(trade => trade.pnl > 0);
    const losingTrades = completedTrades.filter(trade => trade.pnl < 0);

    const totalPnL = Array.from(this.positions.values()).reduce((sum, pos) => 
      sum + pos.realizedPnL + pos.unrealizedPnL, 0
    );

    const totalCost = Array.from(this.positions.values()).reduce((sum, pos) => 
      sum + pos.totalCost, 0
    );

    const winRate = completedTrades.length > 0 ? 
      (winningTrades.length / completedTrades.length) * 100 : 0;

    const avgWin = winningTrades.length > 0 ? 
      winningTrades.reduce((sum, trade) => sum + trade.pnl, 0) / winningTrades.length : 0;

    const avgLoss = losingTrades.length > 0 ? 
      Math.abs(losingTrades.reduce((sum, trade) => sum + trade.pnl, 0) / losingTrades.length) : 0;

    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;

    return {
      totalTrades: this.trades.length,
      winRate,
      totalPnL,
      totalPnLPercent: totalCost > 0 ? (totalPnL / totalCost) * 100 : 0,
      bestTrade: this.getBestTrade(),
      worstTrade: this.getWorstTrade(),
      avgWin,
      avgLoss,
      profitFactor,
      sharpeRatio: this.calculateSharpeRatio(),
      maxDrawdown: this.calculateMaxDrawdown()
    };
  }

  /**
   * Get completed round-trip trades with P&L
   */
  private getCompletedTrades(): Array<Trade & { pnl: number }> {
    const tradesBySymbol = new Map<string, Trade[]>();
    
    // Group trades by symbol
    this.trades.forEach(trade => {
      const trades = tradesBySymbol.get(trade.symbol) || [];
      trades.push(trade);
      tradesBySymbol.set(trade.symbol, trades);
    });

    const completedTrades: Array<Trade & { pnl: number }> = [];

    // Calculate P&L for each symbol
    tradesBySymbol.forEach((trades, symbol) => {
      const position = this.positions.get(symbol);
      if (position && position.realizedPnL !== 0) {
        // Add realized P&L to sell trades
        const sellTrades = trades.filter(t => t.action === 'SELL');
        sellTrades.forEach(sellTrade => {
          const pnl = position.realizedPnL / sellTrades.length; // Simplified allocation
          completedTrades.push({ ...sellTrade, pnl });
        });
      }
    });

    return completedTrades;
  }

  /**
   * Get best performing trade
   */
  private getBestTrade(): Trade | null {
    const completed = this.getCompletedTrades();
    return completed.length > 0 ? 
      completed.reduce((best, trade) => trade.pnl > best.pnl ? trade : best) : null;
  }

  /**
   * Get worst performing trade
   */
  private getWorstTrade(): Trade | null {
    const completed = this.getCompletedTrades();
    return completed.length > 0 ? 
      completed.reduce((worst, trade) => trade.pnl < worst.pnl ? trade : worst) : null;
  }

  /**
   * Calculate Sharpe ratio (simplified)
   */
  private calculateSharpeRatio(): number {
    const completed = this.getCompletedTrades();
    if (completed.length < 2) return 0;

    const returns = completed.map(trade => trade.pnl);
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    return stdDev > 0 ? avgReturn / stdDev : 0;
  }

  /**
   * Calculate maximum drawdown
   */
  private calculateMaxDrawdown(): number {
    let peak = 0;
    let maxDrawdown = 0;
    let runningPnL = 0;

    this.trades
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .forEach(trade => {
        const position = this.positions.get(trade.symbol);
        if (position) {
          runningPnL += position.realizedPnL + position.unrealizedPnL;
          
          if (runningPnL > peak) {
            peak = runningPnL;
          }
          
          const drawdown = (peak - runningPnL) / Math.max(peak, 1) * 100;
          maxDrawdown = Math.max(maxDrawdown, drawdown);
        }
      });

    return maxDrawdown;
  }

  /**
   * Delete a trade
   */
  deleteTrade(tradeId: string): boolean {
    const index = this.trades.findIndex(trade => trade.id === tradeId);
    if (index === -1) return false;

    const trade = this.trades[index];
    this.trades.splice(index, 1);

    // Recalculate position for this symbol
    this.recalculatePosition(trade.symbol);
    this.saveToStorage();

    return true;
  }

  /**
   * Recalculate position from scratch for a symbol
   */
  private recalculatePosition(symbol: string): void {
    const symbolTrades = this.trades.filter(trade => trade.symbol === symbol);
    
    if (symbolTrades.length === 0) {
      this.positions.delete(symbol);
      return;
    }

    // Reset position
    const position: Position = {
      symbol,
      totalShares: 0,
      averagePrice: 0,
      totalCost: 0,
      currentPrice: 0,
      marketValue: 0,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      realizedPnL: 0,
      trades: symbolTrades,
      lastUpdated: new Date().toISOString()
    };

    // Replay all trades
    symbolTrades
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .forEach(trade => {
        if (trade.action === 'BUY') {
          const newTotalCost = position.totalCost + trade.totalCost;
          const newTotalShares = position.totalShares + trade.quantity;
          
          position.averagePrice = newTotalShares > 0 ? newTotalCost / newTotalShares : 0;
          position.totalShares = newTotalShares;
          position.totalCost = newTotalCost;
        } else {
          const sellValue = trade.quantity * trade.price - trade.commission;
          const costBasis = trade.quantity * position.averagePrice;
          const realizedPnL = sellValue - costBasis;

          position.totalShares -= trade.quantity;
          position.totalCost -= costBasis;
          position.realizedPnL += realizedPnL;

          if (position.totalShares <= 0) {
            position.totalShares = 0;
            position.totalCost = 0;
            position.averagePrice = 0;
          }
        }
      });

    this.positions.set(symbol, position);
  }

  /**
   * Export trades to CSV
   */
  exportToCSV(): string {
    const headers = [
      'Date',
      'Symbol',
      'Action',
      'Quantity',
      'Price',
      'Total Cost',
      'Commission',
      'Platform',
      'Source',
      'Notes'
    ];

    const rows = this.trades.map(trade => [
      new Date(trade.timestamp).toLocaleDateString(),
      trade.symbol,
      trade.action,
      trade.quantity.toString(),
      trade.price.toFixed(2),
      trade.totalCost.toFixed(2),
      trade.commission.toFixed(2),
      trade.platform,
      trade.source,
      trade.notes || ''
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    this.trades = [];
    this.positions.clear();
    this.saveToStorage();
  }

  /**
   * Save to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem('omnishift_trades', JSON.stringify(this.trades));
      localStorage.setItem('omnishift_positions', JSON.stringify(Array.from(this.positions.entries())));
    } catch (error) {
      console.error('Failed to save trade data to storage:', error);
    }
  }

  /**
   * Load from localStorage
   */
  private loadFromStorage(): void {
    try {
      const tradesData = localStorage.getItem('omnishift_trades');
      if (tradesData) {
        this.trades = JSON.parse(tradesData);
      }

      const positionsData = localStorage.getItem('omnishift_positions');
      if (positionsData) {
        const positionsArray = JSON.parse(positionsData);
        this.positions = new Map(positionsArray);
      }
    } catch (error) {
      console.error('Failed to load trade data from storage:', error);
      this.trades = [];
      this.positions.clear();
    }
  }
}

// Export singleton instance
export const tradeLogger = new TradeLoggerService();