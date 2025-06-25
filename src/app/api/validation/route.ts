/**
 * API Route for Benchmark Validation
 * Handles cross-validation from multiple data sources server-side to avoid CORS
 * Includes rate limiting to respect API limits
 */

import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(source: string, limit: number = 5): boolean {
  const now = Date.now();
  const key = source;
  const windowMs = 60000; // 1 minute window
  
  const record = rateLimitMap.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= limit) {
    return false;
  }
  
  record.count++;
  return true;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ 
      success: false, 
      error: 'Symbol parameter is required' 
    }, { status: 400 });
  }

  // Check rate limits
  if (!checkRateLimit(`${action}-${symbol}`, action === 'alpha-vantage' ? 3 : 5)) {
    return NextResponse.json({ 
      success: false, 
      error: 'Rate limit exceeded. Please try again later.' 
    }, { status: 429 });
  }

  try {
    switch (action) {
      case 'alpha-vantage':
        return await fetchAlphaVantagePrice(symbol);
      case 'polygon':
        return await fetchPolygonPrice(symbol);
      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid action. Use: alpha-vantage or polygon' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error(`Validation API error for ${symbol}:`, error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

/**
 * Fetch price from Alpha Vantage (server-side)
 */
async function fetchAlphaVantagePrice(symbol: string) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      throw new Error('Alpha Vantage API key not configured');
    }

    console.log(`🔍 Alpha Vantage API: Fetching ${symbol}`);
    
    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`,
      { 
        headers: { 'User-Agent': 'AI-Virtual-Trader/1.0' },
        next: { revalidate: 60 } // Cache for 1 minute
      }
    );

    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Check for API limit/error messages
    if (data.Note || data['Error Message']) {
      throw new Error(data.Note || data['Error Message']);
    }

    const globalQuote = data['Global Quote'];
    if (!globalQuote) {
      throw new Error('No Global Quote data in response');
    }

    // Try different field variations
    const price = parseFloat(
      globalQuote['05. price'] || 
      globalQuote.price || 
      globalQuote['02. open'] ||
      globalQuote.open
    );

    if (isNaN(price) || price <= 0) {
      throw new Error('Invalid price data from Alpha Vantage');
    }

    console.log(`✅ Alpha Vantage: ${symbol} = $${price}`);
    
    return NextResponse.json({
      success: true,
      data: {
        symbol,
        price,
        source: 'Alpha Vantage',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error(`Alpha Vantage error for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Fetch price from Polygon.io (server-side)
 */
async function fetchPolygonPrice(symbol: string) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_POLYGON_KEY;
    if (!apiKey) {
      throw new Error('Polygon API key not configured');
    }

    console.log(`🔍 Polygon API: Fetching ${symbol}`);
    
    // Try current/previous day price first
    let response = await fetch(
      `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apikey=${apiKey}`,
      { 
        headers: { 'User-Agent': 'AI-Virtual-Trader/1.0' },
        next: { revalidate: 60 } // Cache for 1 minute
      }
    );

    if (response.ok) {
      const data = await response.json();
      
      if (data.status === 'OK' && data.results?.[0]?.c) {
        const price = data.results[0].c;
        console.log(`✅ Polygon: ${symbol} = $${price}`);
        
        return NextResponse.json({
          success: true,
          data: {
            symbol,
            price,
            source: 'Polygon.io',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Fallback to historical data
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Skip weekends
    while (yesterday.getDay() === 0 || yesterday.getDay() === 6) {
      yesterday.setDate(yesterday.getDate() - 1);
    }
    
    const dateStr = yesterday.toISOString().split('T')[0];
    
    response = await fetch(
      `https://api.polygon.io/v1/open-close/${symbol}/${dateStr}?adjusted=true&apikey=${apiKey}`,
      { 
        headers: { 'User-Agent': 'AI-Virtual-Trader/1.0' },
        next: { revalidate: 300 } // Cache for 5 minutes
      }
    );

    if (!response.ok) {
      throw new Error(`Polygon API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status === 'OK' && typeof data.close === 'number') {
      const price = data.close;
      console.log(`✅ Polygon (historical): ${symbol} = $${price}`);
      
      return NextResponse.json({
        success: true,
        data: {
          symbol,
          price,
          source: 'Polygon.io',
          timestamp: new Date().toISOString()
        }
      });
    }

    throw new Error('No valid price data from Polygon');

  } catch (error) {
    console.error(`Polygon error for ${symbol}:`, error);
    throw error;
  }
}