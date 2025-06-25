/**
 * Core Domain Types for AI Trading System
 * These types define the fundamental building blocks of our trading infrastructure
 */

export interface Trade {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  entryTime: Date;
  exitTime?: Date;
  commission: number;
  slippage: number;
  realizedPnL?: number;
  realizedPnLPercent?: number;
  strategy: string;
  signals: Signal[];
  metadata?: Record<string, any>;
}

export interface Position {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  trades: Trade[];
  correlations: Map<string, number>;
}

export interface Portfolio {
  cash: number;
  totalValue: number;
  positions: Map<string, Position>;
  trades: Trade[];
  metrics: PortfolioMetrics;
  riskMetrics: RiskMetrics;
}

export interface PortfolioMetrics {
  totalReturn: number;
  totalReturnPercent: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number;
}

export interface RiskMetrics {
  dailyVaR: number;
  beta: number;
  correlation: number;
  currentDrawdown: number;
  sectorExposure: Map<string, number>;
  concentrationRisk: number;
}

export interface Signal {
  timestamp: Date;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  strength: number; // -1 to 1
  confidence: number; // 0 to 1
  strategy: string;
  reasoning: string;
  expectedReturn?: number;
  riskScore?: number;
}

export interface MarketData {
  symbol: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose?: number;
  indicators?: TechnicalIndicators;
}

export interface TechnicalIndicators {
  sma20?: number;
  sma50?: number;
  ema20?: number;
  rsi?: number;
  macd?: { macd: number; signal: number; histogram: number };
  bollingerBands?: { upper: number; middle: number; lower: number };
  atr?: number;
  volume?: number;
}

export interface BacktestConfig {
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  commission: number; // per trade
  slippageModel: 'FIXED' | 'PERCENTAGE' | 'MARKET_IMPACT';
  slippageValue: number;
  dataFrequency: 'MINUTE' | 'HOURLY' | 'DAILY';
  includeDividends: boolean;
  includeShorts: boolean;
  marginRequirement?: number;
  maxPositions?: number;
}

export interface BacktestResult {
  config: BacktestConfig;
  portfolio: Portfolio;
  trades: Trade[];
  equityCurve: EquityPoint[];
  drawdownCurve: DrawdownPoint[];
  metrics: PortfolioMetrics;
  statistics: BacktestStatistics;
  warnings: string[];
}

export interface EquityPoint {
  timestamp: Date;
  value: number;
  cash: number;
  positions: number;
  drawdown: number;
}

export interface DrawdownPoint {
  timestamp: Date;
  drawdown: number;
  duration: number;
}

export interface BacktestStatistics {
  totalDays: number;
  tradingDays: number;
  totalTrades: number;
  avgTradesPerDay: number;
  avgHoldingPeriod: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  bestTrade: Trade | null;
  worstTrade: Trade | null;
  monthlyReturns: Map<string, number>;
  annualizedReturn: number;
  annualizedVolatility: number;
}

export interface RiskLimits {
  maxDailyLoss: number;
  maxDrawdown: number;
  maxPositionSize: number;
  maxSectorExposure: number;
  maxCorrelation: number;
  maxLeverage: number;
  stopLossPercent: number;
  trailingStopPercent?: number;
}

export interface RiskAlert {
  id: string;
  timestamp: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  type: 'DAILY_LOSS' | 'DRAWDOWN' | 'CONCENTRATION' | 'CORRELATION' | 'LEVERAGE';
  message: string;
  currentValue: number;
  limit: number;
  action: 'WARNING' | 'REDUCE_POSITION' | 'HALT_TRADING';
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  generateSignals: (data: Map<string, MarketData[]>) => Promise<Signal[]>;
  parameters?: Record<string, any>;
}