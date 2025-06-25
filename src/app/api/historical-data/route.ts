/**
 * Historical Market Data API - REAL Yahoo Finance Historical Data
 * NO MOCK DATA - Only authentic historical prices and volume
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const period = searchParams.get('period') || '1y'; // 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
  const interval = searchParams.get('interval') || '1d'; // 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol parameter required' }, { status: 400 });
  }

  try {
    console.log(`📈 Fetching REAL historical data for ${symbol} (${period}, ${interval})`);

    // Yahoo Finance v8 API - Real historical data
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
    const params = new URLSearchParams({
      period1: getPeriodTimestamp(period).toString(),
      period2: Math.floor(Date.now() / 1000).toString(),
      interval: interval,
      includePrePost: 'true',
      events: 'div,splits'
    });

    const response = await fetch(`${yahooUrl}?${params}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AI-Trading-System/1.0)',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.chart?.result?.[0]) {
      throw new Error('No historical data available');
    }

    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    const adjClose = result.indicators.adjclose?.[0]?.adjclose;

    // Transform to standard format
    const historicalData = timestamps.map((timestamp: number, index: number) => ({
      timestamp: timestamp * 1000, // Convert to milliseconds
      date: new Date(timestamp * 1000).toISOString(),
      open: quotes.open[index],
      high: quotes.high[index],
      low: quotes.low[index],
      close: quotes.close[index],
      adjClose: adjClose ? adjClose[index] : quotes.close[index],
      volume: quotes.volume[index]
    })).filter((item: any) => 
      item.open !== null && 
      item.high !== null && 
      item.low !== null && 
      item.close !== null
    );

    const meta = result.meta;
    
    return NextResponse.json({
      success: true,
      symbol: symbol.toUpperCase(),
      period,
      interval,
      dataSource: 'YAHOO_FINANCE_REAL',
      meta: {
        currency: meta.currency,
        symbol: meta.symbol,
        exchangeName: meta.exchangeName,
        instrumentType: meta.instrumentType,
        firstTradeDate: meta.firstTradeDate,
        regularMarketTime: meta.regularMarketTime,
        gmtoffset: meta.gmtoffset,
        timezone: meta.timezone,
        exchangeTimezoneName: meta.exchangeTimezoneName,
        currentTradingPeriod: meta.currentTradingPeriod
      },
      data: historicalData,
      count: historicalData.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Historical data fetch failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch real historical data',
      message: error instanceof Error ? error.message : 'Unknown error',
      symbol,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Convert period string to Unix timestamp
 */
function getPeriodTimestamp(period: string): number {
  const now = Date.now() / 1000;
  const periodMap: Record<string, number> = {
    '1d': now - (24 * 60 * 60),
    '5d': now - (5 * 24 * 60 * 60),
    '1mo': now - (30 * 24 * 60 * 60),
    '3mo': now - (90 * 24 * 60 * 60),
    '6mo': now - (180 * 24 * 60 * 60),
    '1y': now - (365 * 24 * 60 * 60),
    '2y': now - (2 * 365 * 24 * 60 * 60),
    '5y': now - (5 * 365 * 24 * 60 * 60),
    '10y': now - (10 * 365 * 24 * 60 * 60),
    'ytd': getYearStart(),
    'max': 0 // Yahoo Finance will use the earliest available data
  };

  return Math.floor(periodMap[period] || periodMap['1y']);
}

/**
 * Get timestamp for start of current year
 */
function getYearStart(): number {
  const now = new Date();
  return Math.floor(new Date(now.getFullYear(), 0, 1).getTime() / 1000);
}