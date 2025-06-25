/**
 * Enhanced AI Virtual Trader - Integrates all critical components
 * Combines backtesting, risk management, and logging for production-ready trading
 */

import { RiskManager } from '@/core/risk/RiskManager';
import { BacktestEngine, Strategy } from '@/core/backtesting/BacktestEngine';
import { logger, log } from '@/infrastructure/logging/Logger';
import {
  Portfolio,
  Trade,
  Signal,
  MarketData,
  RiskLimits,
  BacktestConfig,
  BacktestResult
} from '@/core/domain/types';
import { aiVirtualTrader } from '@/lib/aiVirtualTrader';
import { EventEmitter } from 'events';

export class EnhancedVirtualTrader extends EventEmitter {
  private riskManager: RiskManager;
  private backtestEngine?: BacktestEngine;
  private isInitialized: boolean = false;
  private tradingActive: boolean = true;
  private portfolio: Portfolio;

  constructor() {
    super();
    
    // Initialize risk limits from environment
    const riskLimits: RiskLimits = {
      maxDailyLoss: parseFloat(process.env.MAX_DAILY_LOSS || '0.02'),
      maxDrawdown: parseFloat(process.env.MAX_DRAWDOWN || '0.10'),
      maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE || '0.15'),
      maxSectorExposure: parseFloat(process.env.MAX_SECTOR_EXPOSURE || '0.30'),
      maxCorrelation: parseFloat(process.env.MAX_CORRELATION || '0.70'),
      maxLeverage: parseFloat(process.env.MAX_LEVERAGE || '2.0'),
      stopLossPercent: parseFloat(process.env.STOP_LOSS_PERCENT || '0.12'),
      trailingStopPercent: parseFloat(process.env.TRAILING_STOP_PERCENT || '0.08')
    };

    this.riskManager = new RiskManager(riskLimits, 100000);
    this.portfolio = this.initializePortfolio();

    // Set up event listeners
    this.setupEventListeners();

    log.info('Enhanced Virtual Trader initialized', {
      component: 'EnhancedVirtualTrader',
      action: 'INITIALIZATION',
      metadata: { riskLimits }
    });
  }

  /**
   * Initialize the enhanced trading system
   */
  async initialize(): Promise<void> {
    try {
      const timer = log.timer();

      // Load existing portfolio from AI Virtual Trader
      await this.loadExistingPortfolio();

      // Reset daily risk limits
      this.riskManager.resetDailyLimits();

      // Mark as initialized
      this.isInitialized = true;

      const duration = timer.end();
      log.performance({
        operation: 'SYSTEM_INITIALIZATION',
        duration,
        success: true,
        metadata: { portfolioValue: this.portfolio.totalValue }
      });

      log.info('Enhanced Virtual Trader fully initialized', {
        component: 'EnhancedVirtualTrader',
        action: 'INITIALIZATION_COMPLETE',
        metadata: {
          portfolioValue: this.portfolio.totalValue,
          initDuration: duration
        }
      });

    } catch (error) {
      log.error('Failed to initialize Enhanced Virtual Trader', error, {
        component: 'EnhancedVirtualTrader',
        action: 'INITIALIZATION_FAILED'
      });
      throw error;
    }
  }

  /**
   * Execute enhanced trading cycle with full risk management
   */
  async executeTradingCycle(): Promise<{
    tradesExecuted: number;
    riskChecks: number;
    alertsGenerated: number;
    portfolioValue: number;
  }> {
    if (!this.isInitialized) {
      throw new Error('System not initialized. Call initialize() first.');
    }

    const timer = log.timer();
    const cycleId = `cycle_${Date.now()}`;

    log.info('Starting enhanced trading cycle', {
      component: 'EnhancedVirtualTrader',
      action: 'CYCLE_START',
      metadata: { cycleId }
    });

    try {
      let tradesExecuted = 0;
      let riskChecks = 0;
      let alertsGenerated = 0;

      // Check system health before trading
      const healthCheck = await this.performHealthCheck();
      if (!healthCheck.healthy) {
        log.warn('System health check failed', {
          component: 'EnhancedVirtualTrader',
          action: 'HEALTH_CHECK_FAILED',
          metadata: healthCheck
        });
        return { tradesExecuted: 0, riskChecks: 0, alertsGenerated: 0, portfolioValue: this.portfolio.totalValue };
      }

      // Get trading signals from existing AI trader
      const originalResult = await aiVirtualTrader.executeTradingCycle();
      
      // Get recent signals from the AI trader
      const recentTrades = aiVirtualTrader.getRecentTrades(10);
      
      // Process each potential trade through risk management
      for (const trade of recentTrades) {
        if (trade.status === 'PENDING') {
          const signal = this.convertTradeToSignal(trade);
          
          // Perform pre-trade risk check
          const riskCheck = await this.riskManager.preTradeRiskCheck(
            signal,
            trade.quantity,
            trade.price
          );
          riskChecks++;

          log.debug('Risk check completed', {
            component: 'EnhancedVirtualTrader',
            action: 'RISK_CHECK',
            symbol: trade.symbol,
            metadata: {
              allowed: riskCheck.allowed,
              violations: riskCheck.violations.length,
              adjustedSize: riskCheck.adjustedSize
            }
          });

          if (riskCheck.allowed) {
            // Execute trade with risk-adjusted size
            const enhancedTrade = await this.executeEnhancedTrade(trade, riskCheck.adjustedSize);
            if (enhancedTrade) {
              tradesExecuted++;
              log.trade(enhancedTrade);
            }
          } else {
            // Log rejected trade
            log.warn('Trade rejected by risk management', {
              component: 'EnhancedVirtualTrader',
              action: 'TRADE_REJECTED',
              symbol: trade.symbol,
              metadata: {
                violations: riskCheck.violations,
                proposedSize: trade.quantity
              }
            });
          }

          // Process risk alerts
          for (const violation of riskCheck.violations) {
            const alert = this.createRiskAlert(violation, trade.symbol);
            log.risk(alert);
            alertsGenerated++;
          }
        }
      }

      // Update portfolio metrics
      await this.updatePortfolioMetrics();

      // Generate daily report if end of day
      if (this.isEndOfTradingDay()) {
        await this.generateDailyReport();
      }

      const duration = timer.end();
      log.performance({
        operation: 'TRADING_CYCLE',
        duration,
        success: true,
        metadata: {
          cycleId,
          tradesExecuted,
          riskChecks,
          alertsGenerated
        }
      });

      log.info('Enhanced trading cycle completed', {
        component: 'EnhancedVirtualTrader',
        action: 'CYCLE_COMPLETE',
        metadata: {
          cycleId,
          tradesExecuted,
          riskChecks,
          alertsGenerated,
          portfolioValue: this.portfolio.totalValue,
          duration
        }
      });

      return {
        tradesExecuted,
        riskChecks,
        alertsGenerated,
        portfolioValue: this.portfolio.totalValue
      };

    } catch (error) {
      const duration = timer.end();
      log.error('Enhanced trading cycle failed', error, {
        component: 'EnhancedVirtualTrader',
        action: 'CYCLE_FAILED',
        metadata: { cycleId, duration }
      });

      log.performance({
        operation: 'TRADING_CYCLE',
        duration,
        success: false,
        metadata: { cycleId, error: error instanceof Error ? error.message : 'Unknown error' }
      });

      throw error;
    }
  }

  /**
   * Run comprehensive backtest on strategy
   */
  async runBacktest(
    strategy: Strategy,
    historicalData: Map<string, MarketData[]>,
    config?: Partial<BacktestConfig>
  ): Promise<BacktestResult> {
    log.info('Starting backtest', {
      component: 'EnhancedVirtualTrader',
      action: 'BACKTEST_START',
      strategyId: strategy.id,
      metadata: { config }
    });

    const backtestConfig: BacktestConfig = {
      startDate: new Date('2023-01-01'),
      endDate: new Date('2024-01-01'),
      initialCapital: parseFloat(process.env.INITIAL_CAPITAL || '100000'),
      commission: parseFloat(process.env.COMMISSION_PER_TRADE || '1.00'),
      slippageModel: (process.env.SLIPPAGE_MODEL as any) || 'PERCENTAGE',
      slippageValue: parseFloat(process.env.SLIPPAGE_VALUE || '0.0005'),
      dataFrequency: 'DAILY',
      includeDividends: true,
      includeShorts: false,
      ...config
    };

    try {
      this.backtestEngine = new BacktestEngine(backtestConfig);
      
      // Set up backtest event listeners
      this.backtestEngine.on('progress', (progress) => {
        log.debug('Backtest progress', {
          component: 'BacktestEngine',
          action: 'BACKTEST_PROGRESS',
          metadata: progress
        });
      });

      this.backtestEngine.on('tradeExecuted', (trade) => {
        log.debug('Backtest trade executed', {
          component: 'BacktestEngine',
          action: 'BACKTEST_TRADE',
          symbol: trade.symbol,
          metadata: trade
        });
      });

      const result = await this.backtestEngine.runBacktest(strategy, historicalData);

      log.info('Backtest completed', {
        component: 'EnhancedVirtualTrader',
        action: 'BACKTEST_COMPLETE',
        strategyId: strategy.id,
        metadata: {
          totalReturn: result.metrics.totalReturnPercent,
          sharpeRatio: result.metrics.sharpeRatio,
          maxDrawdown: result.metrics.maxDrawdown,
          totalTrades: result.trades.length
        }
      });

      return result;

    } catch (error) {
      log.error('Backtest failed', error, {
        component: 'EnhancedVirtualTrader',
        action: 'BACKTEST_FAILED',
        strategyId: strategy.id
      });
      throw error;
    }
  }

  /**
   * Get comprehensive risk status
   */
  getRiskStatus(): {
    tradingAllowed: boolean;
    riskScore: number;
    dailyPnL: number;
    currentDrawdown: number;
    alerts: any[];
    limits: RiskLimits;
  } {
    const riskStatus = this.riskManager.getRiskStatus();
    
    return {
      ...riskStatus,
      limits: this.getRiskLimits()
    };
  }

  /**
   * Generate comprehensive trading report
   */
  async generateTradingReport(period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<{
    summary: any;
    performance: any;
    risk: any;
    trades: any[];
  }> {
    log.info('Generating trading report', {
      component: 'EnhancedVirtualTrader',
      action: 'REPORT_GENERATION',
      metadata: { period }
    });

    const report = {
      summary: {
        period,
        generatedAt: new Date().toISOString(),
        portfolioValue: this.portfolio.totalValue,
        totalTrades: this.portfolio.trades.length,
        activePosistions: this.portfolio.positions.size
      },
      performance: this.portfolio.metrics,
      risk: this.portfolio.riskMetrics,
      trades: this.portfolio.trades.slice(-50) // Last 50 trades
    };

    return report;
  }

  // Private helper methods

  private setupEventListeners(): void {
    // Risk manager events
    this.riskManager.on('riskAssessment', (data) => {
      this.emit('riskAssessment', data);
    });

    this.riskManager.on('tradingHalted', (alert) => {
      this.tradingActive = false;
      this.emit('tradingHalted', alert);
      log.critical('Trading halted due to risk violation', {
        component: 'EnhancedVirtualTrader',
        action: 'TRADING_HALTED',
        metadata: alert
      });
    });

    this.riskManager.on('riskUpdate', (data) => {
      this.emit('riskUpdate', data);
    });
  }

  private async loadExistingPortfolio(): Promise<void> {
    const existingPortfolio = aiVirtualTrader.getPortfolio();
    
    // Convert existing portfolio to our format
    this.portfolio = {
      cash: existingPortfolio.cash,
      totalValue: existingPortfolio.totalValue,
      positions: new Map(),
      trades: existingPortfolio.trades || [],
      metrics: {} as any,
      riskMetrics: {} as any
    };

    // Convert positions
    for (const position of existingPortfolio.positions || []) {
      this.portfolio.positions.set(position.symbol, {
        symbol: position.symbol,
        quantity: position.shares,
        averagePrice: position.averagePrice,
        currentPrice: position.currentPrice,
        marketValue: position.currentValue,
        unrealizedPnL: position.unrealizedPnL,
        unrealizedPnLPercent: position.unrealizedPnLPercent,
        trades: position.trades || [],
        correlations: new Map()
      });
    }
  }

  private async performHealthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];

    // Check if trading is active
    if (!this.tradingActive) {
      issues.push('Trading is currently halted');
    }

    // Check API connectivity
    try {
      // This would ping your data sources
      const marketDataHealth = await this.checkMarketDataHealth();
      if (!marketDataHealth) {
        issues.push('Market data connectivity issues');
      }
    } catch (error) {
      issues.push('Failed to check market data health');
    }

    // Check risk limits
    const riskStatus = this.riskManager.getRiskStatus();
    if (!riskStatus.tradingAllowed) {
      issues.push('Risk limits prevent trading');
    }

    return {
      healthy: issues.length === 0,
      issues
    };
  }

  private async checkMarketDataHealth(): Promise<boolean> {
    // Simplified health check - would test actual data sources
    return true;
  }

  private convertTradeToSignal(trade: any): Signal {
    return {
      timestamp: new Date(trade.timestamp),
      symbol: trade.symbol,
      action: trade.action,
      strength: trade.confidence || 0.7,
      confidence: trade.confidence || 0.7,
      strategy: trade.strategyType || 'UNKNOWN',
      reasoning: trade.triggerReason || 'No reason provided'
    };
  }

  private async executeEnhancedTrade(trade: any, adjustedSize?: number): Promise<Trade | null> {
    const enhancedTrade: Trade = {
      id: trade.id,
      symbol: trade.symbol,
      side: trade.action,
      quantity: adjustedSize || trade.quantity,
      entryPrice: trade.price,
      entryTime: new Date(trade.timestamp),
      commission: parseFloat(process.env.COMMISSION_PER_TRADE || '1.00'),
      slippage: trade.price * parseFloat(process.env.SLIPPAGE_VALUE || '0.0005'),
      strategy: trade.strategyType || 'AI_STRATEGY',
      signals: [this.convertTradeToSignal(trade)]
    };

    // Notify risk manager
    await this.riskManager.onTradeExecuted(enhancedTrade);

    return enhancedTrade;
  }

  private createRiskAlert(violation: any, symbol: string): any {
    return {
      type: violation.type,
      severity: violation.severity,
      message: `Risk violation: ${violation.type} for ${symbol}`,
      currentValue: violation.currentValue,
      limit: violation.limit,
      symbol
    };
  }

  private async updatePortfolioMetrics(): Promise<void> {
    // This would calculate comprehensive portfolio metrics
    // Using existing portfolio data
  }

  private isEndOfTradingDay(): boolean {
    const now = new Date();
    const hour = now.getHours();
    // Market closes at 4 PM EST (16:00)
    return hour >= 16;
  }

  private async generateDailyReport(): Promise<void> {
    const report = await this.generateTradingReport('daily');
    
    log.info('Daily trading report generated', {
      component: 'EnhancedVirtualTrader',
      action: 'DAILY_REPORT',
      metadata: report.summary
    });

    // Send report to configured channels
    // Could email, Slack, or store in database
  }

  private initializePortfolio(): Portfolio {
    return {
      cash: 100000,
      totalValue: 100000,
      positions: new Map(),
      trades: [],
      metrics: {} as any,
      riskMetrics: {} as any
    };
  }

  private getRiskLimits(): RiskLimits {
    return {
      maxDailyLoss: parseFloat(process.env.MAX_DAILY_LOSS || '0.02'),
      maxDrawdown: parseFloat(process.env.MAX_DRAWDOWN || '0.10'),
      maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE || '0.15'),
      maxSectorExposure: parseFloat(process.env.MAX_SECTOR_EXPOSURE || '0.30'),
      maxCorrelation: parseFloat(process.env.MAX_CORRELATION || '0.70'),
      maxLeverage: parseFloat(process.env.MAX_LEVERAGE || '2.0'),
      stopLossPercent: parseFloat(process.env.STOP_LOSS_PERCENT || '0.12')
    };
  }
}

// Export singleton instance
export const enhancedVirtualTrader = new EnhancedVirtualTrader();