import { collection, addDoc, query, orderBy, getDocs, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import { Trade, Portfolio, Holding, SectorAllocation, Sector } from '@/types';
import { marketDataService } from './marketData';

export class PortfolioService {
  async addTrade(trade: Omit<Trade, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'trades'), {
        ...trade,
        date: trade.date
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding trade:', error);
      throw error;
    }
  }

  async getTrades(): Promise<Trade[]> {
    try {
      const q = query(collection(db, 'trades'), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        date: doc.data().date.toDate()
      } as Trade));
    } catch (error) {
      console.error('Error fetching trades:', error);
      return [];
    }
  }

  async getTradesByTicker(ticker: string): Promise<Trade[]> {
    try {
      const q = query(
        collection(db, 'trades'), 
        where('ticker', '==', ticker),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        date: doc.data().date.toDate()
      } as Trade));
    } catch (error) {
      console.error('Error fetching trades by ticker:', error);
      return [];
    }
  }

  async updateTrade(tradeId: string, updates: Partial<Trade>): Promise<void> {
    try {
      const tradeRef = doc(db, 'trades', tradeId);
      await updateDoc(tradeRef, updates);
    } catch (error) {
      console.error('Error updating trade:', error);
      throw error;
    }
  }

  async deleteTrade(tradeId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'trades', tradeId));
    } catch (error) {
      console.error('Error deleting trade:', error);
      throw error;
    }
  }

  async calculatePortfolio(): Promise<Portfolio> {
    const trades = await this.getTrades();
    const holdings: Map<string, Holding> = new Map();
    
    // Calculate holdings from trades
    for (const trade of trades) {
      const existing = holdings.get(trade.ticker) || {
        ticker: trade.ticker,
        shares: 0,
        avgCost: 0,
        currentPrice: 0,
        totalValue: 0,
        totalReturn: 0,
        returnPercent: 0,
        sector: trade.sector
      };

      if (trade.type === 'buy') {
        const totalCost = existing.avgCost * existing.shares + trade.total;
        existing.shares += trade.shares;
        existing.avgCost = existing.shares > 0 ? totalCost / existing.shares : 0;
      } else {
        existing.shares -= trade.shares;
        if (existing.shares <= 0) {
          holdings.delete(trade.ticker);
          continue;
        }
      }

      holdings.set(trade.ticker, existing);
    }

    // Get current prices and calculate values
    const tickers = Array.from(holdings.keys());
    const quotes = await marketDataService.getBatchQuotes(tickers);
    
    let totalValue = 0;
    let totalCost = 0;

    for (const quote of quotes) {
      const holding = holdings.get(quote.ticker);
      if (holding) {
        holding.currentPrice = quote.currentPrice;
        holding.totalValue = holding.shares * quote.currentPrice;
        const holdingCost = holding.shares * holding.avgCost;
        holding.totalReturn = holding.totalValue - holdingCost;
        holding.returnPercent = holdingCost > 0 ? (holding.totalReturn / holdingCost) * 100 : 0;
        
        totalValue += holding.totalValue;
        totalCost += holdingCost;
      }
    }

    // Calculate sector allocation
    const sectorMap: Map<Sector, number> = new Map();
    
    for (const holding of holdings.values()) {
      const currentSectorValue = sectorMap.get(holding.sector) || 0;
      sectorMap.set(holding.sector, currentSectorValue + holding.totalValue);
    }

    const sectorAllocation: SectorAllocation[] = Array.from(sectorMap.entries())
      .map(([sector, value]) => ({
        sector,
        value,
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);

    const totalReturn = totalValue - totalCost;
    const totalReturnPercent = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;

    return {
      totalValue,
      totalCost,
      totalReturn,
      totalReturnPercent,
      holdings: Array.from(holdings.values()).sort((a, b) => b.totalValue - a.totalValue),
      sectorAllocation
    };
  }

  async getPortfolioHistory(days: number = 30): Promise<{ date: Date; value: number }[]> {
    const trades = await this.getTrades();
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const history: { date: Date; value: number }[] = [];
    const holdings: Map<string, { shares: number; avgCost: number }> = new Map();

    // Sort trades by date ascending for chronological processing
    const sortedTrades = [...trades].sort((a, b) => a.date.getTime() - b.date.getTime());

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const currentDate = new Date(d);
      
      // Apply all trades up to this date
      for (const trade of sortedTrades) {
        if (trade.date <= currentDate) {
          const holding = holdings.get(trade.ticker) || { shares: 0, avgCost: 0 };
          
          if (trade.type === 'buy') {
            const totalCost = holding.avgCost * holding.shares + trade.total;
            holding.shares += trade.shares;
            holding.avgCost = holding.shares > 0 ? totalCost / holding.shares : 0;
          } else {
            holding.shares -= trade.shares;
          }

          if (holding.shares > 0) {
            holdings.set(trade.ticker, holding);
          } else {
            holdings.delete(trade.ticker);
          }
        }
      }

      // Calculate portfolio value for this date
      let dayValue = 0;
      for (const [ticker, holding] of holdings.entries()) {
        // In a real implementation, you'd fetch historical prices
        // For now, we'll use current price as approximation
        const quote = await marketDataService.getStockQuote(ticker);
        if (quote) {
          dayValue += holding.shares * quote.currentPrice;
        }
      }

      history.push({ date: new Date(currentDate), value: dayValue });
    }

    return history;
  }
}

export const portfolioService = new PortfolioService();