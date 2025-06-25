import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const ticker = searchParams.get('ticker');
    const source = searchParams.get('source') || 'yahoo'; // Default to Yahoo Finance

    if (action === 'health') {
      return NextResponse.json({ success: true, data: { status: 'healthy' } });
    }

    if (action === 'quote' && ticker) {
      const quote = await fetchStockQuote(ticker, source);
      return NextResponse.json({ success: true, data: quote });
    }

    if (action === 'batch') {
      const tickers = searchParams.get('tickers')?.split(',').filter(t => t.trim()) || [];
      if (tickers.length === 0) {
        return NextResponse.json({ success: true, data: [] });
      }
      const quotes = await fetchBatchQuotes(tickers, source);
      return NextResponse.json({ success: true, data: quotes });
    }

    if (action === 'indicators') {
      const indicators = await getMarketIndicators(source);
      return NextResponse.json({ success: true, data: indicators });
    }

    if (action === 'historical' && ticker) {
      const days = parseInt(searchParams.get('days') || '30');
      const data = await getHistoricalData(ticker, days, source);
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action or missing parameters' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Market data API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}

async function fetchStockQuote(ticker: string, source: string = 'yahoo') {
  if (!ticker || ticker.trim() === '') {
    console.error('Empty ticker provided');
    return null;
  }
  
  const cleanTicker = ticker.trim().toUpperCase();
  
  try {
    // Always prioritize Yahoo Finance for real-time data
    switch (source) {
      case 'yahoo':
        return await fetchYahooQuote(cleanTicker);
      case 'polygon':
        return await fetchPolygonQuote(cleanTicker);
      case 'iex':
        return await fetchIEXQuote(cleanTicker);
      default:
        return await fetchYahooQuote(cleanTicker);
    }
  } catch (error) {
    console.error(`Error fetching quote for ${ticker} from ${source}:`, error);
    
    // Always fallback to Yahoo Finance for real-time data
    if (source !== 'yahoo') {
      try {
        console.log(`Falling back to Yahoo Finance for ${ticker}`);
        return await fetchYahooQuote(cleanTicker);
      } catch (yahooError) {
        console.error(`Fallback Yahoo quote failed for ${ticker}:`, yahooError);
      }
    }
    
    // Return null - NO MOCK DATA EVER
    return null;
  }
}

async function fetchBatchQuotes(tickers: string[], source: string = 'yahoo') {
  const quotes = await Promise.all(tickers.map(t => fetchStockQuote(t.trim(), source)));
  return quotes.filter(q => q !== null);
}

async function fetchYahooQuote(ticker: string) {
  console.log(`📊 Fetching REAL-TIME data for ${ticker} from Yahoo Finance`);
  
  const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`, {
    params: {
      region: 'US',
      lang: 'en-US',
      includePrePost: true, // Include pre/post market data for real-time
      interval: '1m', // Use 1-minute intervals for real-time data
      range: '1d'
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; AI-Trading-System/1.0; Real-Time-Data)'
    }
  });

  const result = response.data.chart.result[0];
  const quote = result.meta;
  
  // Get the most recent price from the latest data point
  const timestamps = result.timestamp;
  const quotes = result.indicators.quote[0];
  const lastIndex = timestamps.length - 1;
  
  const currentPrice = quotes.close[lastIndex] || quote.regularMarketPrice || 0;
  const previousClose = quote.previousClose || currentPrice;
  const dayChange = currentPrice - previousClose;
  const dayChangePercent = previousClose > 0 ? (dayChange / previousClose) * 100 : 0;
  
  // Real-time timestamp
  const lastUpdate = new Date(timestamps[lastIndex] * 1000).toISOString();

  console.log(`✅ Real-time ${ticker}: $${currentPrice.toFixed(2)} (${dayChangePercent.toFixed(2)}%)`);

  return {
    ticker,
    name: quote.longName || getTickerName(ticker),
    sector: mapSector(ticker),
    currentPrice,
    previousClose,
    dayChange,
    dayChangePercent,
    volume: quote.regularMarketVolume || 0,
    marketCap: quote.marketCap || 0,
    lastUpdate,
    currency: quote.currency || 'USD',
    marketState: quote.marketState || 'REGULAR',
    exchangeName: quote.exchangeName || 'NYSE',
    dataSource: 'YAHOO_FINANCE_REALTIME'
  };
}

// Alpha Vantage removed - replaced with enhanced Yahoo Finance real-time data

async function fetchPolygonQuote(ticker: string) {
  const apiKey = process.env.POLYGON_API_KEY;
  if (!apiKey) {
    throw new Error('Polygon API key not configured');
  }

  const response = await axios.get(`https://api.polygon.io/v2/aggs/ticker/${ticker}/prev`, {
    params: {
      adjusted: true,
      apikey: apiKey
    }
  });

  const result = response.data.results[0];
  if (!result) {
    throw new Error('No quote data found');
  }

  const currentPrice = result.c || 0;
  const previousClose = result.o || currentPrice;
  const change = currentPrice - previousClose;
  const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

  return {
    ticker,
    name: getTickerName(ticker),
    sector: mapSector(ticker),
    currentPrice,
    previousClose,
    dayChange: change,
    dayChangePercent: changePercent,
    volume: result.v || 0,
    marketCap: 0,
  };
}

async function fetchIEXQuote(ticker: string) {
  const apiKey = process.env.IEX_API_KEY;
  if (!apiKey) {
    throw new Error('IEX API key not configured');
  }

  const response = await axios.get(`https://cloud.iexapis.com/stable/stock/${ticker}/quote`, {
    params: {
      token: apiKey
    }
  });

  const quote = response.data;
  const currentPrice = quote.latestPrice || 0;
  const previousClose = quote.previousClose || currentPrice;

  return {
    ticker,
    name: quote.companyName || getTickerName(ticker),
    sector: mapSector(ticker),
    currentPrice,
    previousClose,
    dayChange: quote.change || 0,
    dayChangePercent: quote.changePercent ? quote.changePercent * 100 : 0,
    volume: quote.latestVolume || 0,
    marketCap: quote.marketCap || 0,
  };
}

// Removed getMockQuote function - no longer using mock data

async function getMarketIndicators(source: string = 'yahoo') {
  const indicators = [];
  const tickers = ['VIX', 'SPY', 'USO', 'GLD'];
  
  for (const ticker of tickers) {
    try {
      const data = await fetchStockQuote(ticker, source);
      if (data) {
        const name = ticker === 'VIX' ? 'VIX' : 
                    ticker === 'SPY' ? 'S&P 500' :
                    ticker === 'USO' ? 'Oil (USO)' : 'Gold (GLD)';
        
        indicators.push({
          name,
          value: Number((data.currentPrice || 0).toFixed(2)),
          change: Number((data.dayChange || 0).toFixed(2)),
          changePercent: Number((data.dayChangePercent || 0).toFixed(2)),
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error(`Error fetching ${ticker} from ${source}:`, error);
    }
  }

  // Return whatever indicators we successfully loaded, even if empty
  // The client should handle missing data gracefully

  return indicators;
}

async function getHistoricalData(ticker: string, days: number = 30, _source: string = 'yahoo') {
  if (!ticker || ticker.trim() === '') {
    console.error('Empty ticker provided for historical data');
    return [];
  }
  
  try {
    const cleanTicker = ticker.trim().toUpperCase();
    const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${cleanTicker}`, {
      params: {
        region: 'US',
        lang: 'en-US',
        includePrePost: false,
        interval: '1d',
        range: `${days}d`
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const result = response.data.chart.result[0];
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];

    return timestamps.map((timestamp: number, index: number) => ({
      date: new Date(timestamp * 1000),
      open: quotes.open[index],
      high: quotes.high[index],
      low: quotes.low[index],
      close: quotes.close[index],
      volume: quotes.volume[index]
    }));
  } catch (error) {
    console.error(`Error fetching historical data for ${ticker}:`, error);
    
    // Return empty array instead of mock data
    return [];
  }
}

function mapSector(ticker: string): 'technology' | 'defense' | 'energy' | 'financials' | 'healthcare' | 'industrials' | 'consumer' | 'materials' | 'utilities' | 'real_estate' {
  const sectorMap: Record<string, 'technology' | 'defense' | 'energy' | 'financials' | 'healthcare' | 'industrials' | 'consumer' | 'materials' | 'utilities' | 'real_estate'> = {
    // Technology
    'AAPL': 'technology', 'MSFT': 'technology', 'GOOGL': 'technology', 'META': 'technology',
    'NVDA': 'technology', 'AMD': 'technology', 'INTC': 'technology', 'MU': 'technology',
    'PLTR': 'technology', 'CRWD': 'technology', 'CSCO': 'technology',
    
    // Defense
    'LMT': 'defense', 'NOC': 'defense', 'RTX': 'defense', 'BA': 'defense',
    
    // Energy
    'XOM': 'energy', 'CVX': 'energy', 'COP': 'energy', 'PXD': 'energy',
    'CHK': 'energy', 'LNG': 'energy', 'USO': 'energy', 'HES': 'energy',
    
    // Financials
    'JPM': 'financials', 'BAC': 'financials', 'WFC': 'financials', 'GS': 'financials',
    
    // Healthcare
    'JNJ': 'healthcare', 'PFE': 'healthcare', 'UNH': 'healthcare', 'CVS': 'healthcare',
    
    // Green Tech/Utilities
    'FSLR': 'utilities', 'GNRC': 'utilities', 'NEE': 'utilities',
    
    // Materials
    'VALE': 'materials', 'LIT': 'materials', 'GLD': 'materials',
    
    // Consumer
    'AMZN': 'consumer', 'TSLA': 'consumer', 'WMT': 'consumer',
    
    // Industrials
    'CAT': 'industrials', 'DE': 'industrials', 'UPS': 'industrials',
    'ACN': 'industrials', 'UPWK': 'industrials',
    
    // Market Indices
    'SPY': 'financials', 'VIX': 'financials'
  };

  return sectorMap[ticker.toUpperCase()] || 'technology';
}

function getTickerName(ticker: string): string {
  const nameMap: Record<string, string> = {
    'LMT': 'Lockheed Martin Corporation',
    'PLTR': 'Palantir Technologies Inc.',
    'PXD': 'Pioneer Natural Resources Company',
    'VIX': 'CBOE Volatility Index',
    'SPY': 'SPDR S&P 500 ETF Trust',
    'USO': 'United States Oil Fund',
    'GLD': 'SPDR Gold Trust',
    'CRWD': 'CrowdStrike Holdings Inc.',
    'NOC': 'Northrop Grumman Corporation',
    'RTX': 'Raytheon Technologies Corporation',
    'COP': 'ConocoPhillips',
    'CHK': 'Chesapeake Energy Corporation',
    'LNG': 'Cheniere Energy Inc.',
    'FSLR': 'First Solar Inc.',
    'GNRC': 'Generac Holdings Inc.',
    'NEE': 'NextEra Energy Inc.'
  };

  return nameMap[ticker.toUpperCase()] || `${ticker.toUpperCase()} Inc.`;
}