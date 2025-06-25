/**
 * Real-Time Price Feed API - Enhanced for AI Virtual Trader
 * Provides streaming-like price updates with validation
 * NO MOCK DATA - Only real market prices from Yahoo Finance
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const symbols = searchParams.get('symbols')?.split(',').filter(s => s.trim());

  if (!symbol && !symbols) {
    return NextResponse.json({ error: 'Symbol or symbols parameter required' }, { status: 400 });
  }

  try {
    if (symbols && symbols.length > 0) {
      // Batch real-time quotes
      console.log(`📊 Fetching real-time batch quotes for ${symbols.length} symbols`);
      const quotes = await fetchBatchRealTimeQuotes(symbols);
      
      return NextResponse.json({
        success: true,
        dataSource: 'YAHOO_FINANCE_REALTIME_BATCH',
        symbols: symbols,
        quotes,
        timestamp: new Date().toISOString(),
        count: quotes.length
      });
    } else if (symbol) {
      // Single real-time quote
      console.log(`📊 Fetching real-time quote for ${symbol}`);
      const quote = await fetchRealTimeQuote(symbol);
      
      return NextResponse.json({
        success: true,
        dataSource: 'YAHOO_FINANCE_REALTIME',
        symbol: symbol.toUpperCase(),
        quote,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Real-time price fetch failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch real-time price data',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Fetch single real-time quote with enhanced data
 */
async function fetchRealTimeQuote(symbol: string) {
  const cleanSymbol = symbol.trim().toUpperCase();
  
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanSymbol}`;
  const params = new URLSearchParams({
    region: 'US',
    lang: 'en-US',
    includePrePost: 'true',
    interval: '1m',
    range: '1d'
  });

  const response = await fetch(`${yahooUrl}?${params}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; AI-Trading-System/1.0; Real-Time-Feed)',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Yahoo Finance API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.chart?.result?.[0]) {
    throw new Error(`No real-time data available for ${cleanSymbol}`);
  }

  const result = data.chart.result[0];
  const meta = result.meta;
  const timestamps = result.timestamp;
  const quotes = result.indicators.quote[0];
  
  // Get the most recent data point
  const lastIndex = timestamps.length - 1;
  const currentPrice = quotes.close[lastIndex] || meta.regularMarketPrice || 0;
  const previousClose = meta.previousClose || currentPrice;
  const volume = quotes.volume[lastIndex] || meta.regularMarketVolume || 0;
  
  // Calculate changes
  const dayChange = currentPrice - previousClose;
  const dayChangePercent = previousClose > 0 ? (dayChange / previousClose) * 100 : 0;
  
  // Market state information
  const isMarketOpen = meta.marketState === 'REGULAR';
  const lastTradeTime = new Date(timestamps[lastIndex] * 1000).toISOString();

  return {
    symbol: cleanSymbol,
    name: meta.longName || cleanSymbol,
    price: Number(currentPrice.toFixed(2)),
    previousClose: Number(previousClose.toFixed(2)),
    change: Number(dayChange.toFixed(2)),
    changePercent: Number(dayChangePercent.toFixed(4)),
    volume: volume,
    marketCap: meta.marketCap || 0,
    currency: meta.currency || 'USD',
    exchangeName: meta.exchangeName || 'NYSE',
    marketState: meta.marketState || 'UNKNOWN',
    isMarketOpen,
    lastTradeTime,
    dataFreshness: Date.now() - (timestamps[lastIndex] * 1000), // Age in milliseconds
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || 0,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow || 0,
    validatedAt: new Date().toISOString()
  };
}

/**
 * Fetch batch real-time quotes efficiently
 */
async function fetchBatchRealTimeQuotes(symbols: string[]) {
  const cleanSymbols = symbols.map(s => s.trim().toUpperCase()).filter(s => s.length > 0);
  
  // Fetch all quotes in parallel for speed
  const quotePromises = cleanSymbols.map(async (symbol) => {
    try {
      return await fetchRealTimeQuote(symbol);
    } catch (error) {
      console.error(`Failed to fetch real-time data for ${symbol}:`, error);
      return null;
    }
  });

  const results = await Promise.all(quotePromises);
  return results.filter(quote => quote !== null);
}