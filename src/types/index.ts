export interface MarketEvent {
  id: string;
  title: string;
  source: string;
  timestamp: Date;
  impactScore: number;
  category: EventCategory;
  relatedSectors: Sector[];
  sentiment: 'positive' | 'negative' | 'neutral';
  keywords: string[];
}

export type EventCategory = 
  | 'economic_policy'
  | 'market_movement'
  | 'corporate_news'
  | 'regulatory'
  | 'technology'
  | 'energy'
  | 'geopolitical';

export type Sector = 
  | 'technology'
  | 'defense'
  | 'energy'
  | 'financials'
  | 'healthcare'
  | 'industrials'
  | 'consumer'
  | 'materials'
  | 'utilities'
  | 'real_estate';

export interface Stock {
  ticker: string;
  name: string;
  sector: Sector;
  currentPrice: number;
  previousClose: number;
  dayChange: number;
  dayChangePercent: number;
  volume: number;
  marketCap: number;
  pe?: number;
  beta?: number;
}

export interface Trade {
  id: string;
  ticker: string;
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  total: number;
  date: Date;
  sector: Sector;
  notes?: string;
}

export interface Portfolio {
  totalValue: number;
  totalCost: number;
  totalReturn: number;
  totalReturnPercent: number;
  holdings: Holding[];
  sectorAllocation: SectorAllocation[];
}

export interface Holding {
  ticker: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  totalValue: number;
  totalReturn: number;
  returnPercent: number;
  sector: Sector;
}

export interface SectorAllocation {
  sector: Sector;
  value: number;
  percentage: number;
}

export interface BacktestResult {
  id: string;
  eventType: EventCategory;
  ticker: string;
  entryDate: Date;
  exitDate: Date;
  entryPrice: number;
  exitPrice: number;
  returnValue: number;
  returnPercent: number;
  holdingPeriod: number;
}

export interface MarketIndicator {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  timestamp: Date;
}

export interface Alert {
  id: string;
  type: 'opportunity' | 'risk' | 'news';
  title: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  timestamp: Date;
  relatedStocks?: string[];
  actionable: boolean;
}