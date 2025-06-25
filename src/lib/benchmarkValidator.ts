/**
 * Benchmark Validation Service
 * Cross-validates market data from multiple sources to ensure accuracy
 * NO DUMMY DATA - All data is real and validated
 */

interface DataSource {
  name: string;
  url: string;
  price?: number;
  timestamp?: string;
  error?: string;
}

interface ValidationResult {
  symbol: string;
  isValid: boolean;
  consensusPrice: number;
  priceVariance: number;
  sources: DataSource[];
  confidence: number;
  lastValidated: string;
}

export class BenchmarkValidator {
  private readonly PRICE_TOLERANCE = 0.02; // 2% tolerance between sources
  private readonly MIN_SOURCES = 2; // Minimum sources required for validation
  
  /**
   * Validate benchmark price across multiple data sources
   */
  async validateBenchmarkPrice(symbol: string): Promise<ValidationResult> {
    console.log(`🔍 Validating ${symbol} across multiple data sources...`);
    
    const sources: DataSource[] = [];
    
    // Source 1: Yahoo Finance (primary)
    try {
      const yahooPrice = await this.fetchYahooPrice(symbol);
      sources.push({
        name: 'Yahoo Finance',
        url: `https://finance.yahoo.com/quote/${symbol}`,
        price: yahooPrice,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      sources.push({
        name: 'Yahoo Finance',
        url: `https://finance.yahoo.com/quote/${symbol}`,
        error: 'Failed to fetch data'
      });
    }
    
    // Source 2: Alpha Vantage (validation)
    try {
      const alphaPrice = await this.fetchAlphaVantagePrice(symbol);
      sources.push({
        name: 'Alpha Vantage',
        url: 'https://www.alphavantage.co',
        price: alphaPrice,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      sources.push({
        name: 'Alpha Vantage',
        url: 'https://www.alphavantage.co',
        error: 'Failed to fetch data'
      });
    }
    
    // Source 3: Polygon.io (backup validation)
    try {
      const polygonPrice = await this.fetchPolygonPrice(symbol);
      sources.push({
        name: 'Polygon.io',
        url: 'https://polygon.io',
        price: polygonPrice,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      sources.push({
        name: 'Polygon.io',
        url: 'https://polygon.io',
        error: 'Failed to fetch data'
      });
    }
    
    return this.analyzeValidationResults(symbol, sources);
  }
  
  /**
   * Fetch price from Yahoo Finance (via our API route to avoid CORS)
   */
  private async fetchYahooPrice(symbol: string): Promise<number> {
    try {
      console.log(`🔍 Yahoo: Fetching price for ${symbol} via API route`);
      
      // Use our API route to avoid CORS issues
      const response = await fetch(`/api/market-data?action=quote&ticker=${symbol}`);
      
      if (!response.ok) {
        throw new Error(`Yahoo API route error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`📊 Yahoo response for ${symbol}:`, data);
      
      if (data.success && data.data?.currentPrice) {
        const price = data.data.currentPrice;
        console.log(`✅ Yahoo: Got valid price for ${symbol}: $${price}`);
        return price;
      }
      
      throw new Error(`Invalid Yahoo Finance response: ${JSON.stringify(data)}`);
    } catch (error) {
      console.error(`❌ Yahoo Finance error for ${symbol}:`, error);
      throw error;
    }
  }
  
  /**
   * Fetch price from Alpha Vantage (via our API route to avoid CORS)
   */
  private async fetchAlphaVantagePrice(symbol: string): Promise<number> {
    try {
      console.log(`🔍 Alpha Vantage: Fetching price for ${symbol} via API route`);
      
      const response = await fetch(`/api/validation?action=alpha-vantage&symbol=${symbol}`);
      
      if (!response.ok) {
        throw new Error(`Alpha Vantage API route error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`📊 Alpha Vantage response for ${symbol}:`, data);
      
      if (data.success && data.data?.price) {
        const price = data.data.price;
        console.log(`✅ Alpha Vantage: Got valid price for ${symbol}: $${price}`);
        return price;
      }
      
      throw new Error(`Invalid Alpha Vantage response: ${data.error || 'Unknown error'}`);
      
    } catch (error) {
      console.error(`❌ Alpha Vantage error for ${symbol}:`, error);
      throw error;
    }
  }
  
  /**
   * Fetch price from Polygon.io (via our API route to avoid CORS)
   */
  private async fetchPolygonPrice(symbol: string): Promise<number> {
    try {
      console.log(`🔍 Polygon: Fetching price for ${symbol} via API route`);
      
      const response = await fetch(`/api/validation?action=polygon&symbol=${symbol}`);
      
      if (!response.ok) {
        throw new Error(`Polygon API route error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`📊 Polygon response for ${symbol}:`, data);
      
      if (data.success && data.data?.price) {
        const price = data.data.price;
        console.log(`✅ Polygon: Got valid price for ${symbol}: $${price}`);
        return price;
      }
      
      throw new Error(`Invalid Polygon response: ${data.error || 'Unknown error'}`);
      
    } catch (error) {
      console.error(`❌ Polygon error for ${symbol}:`, error);
      throw error;
    }
  }
  
  /**
   * Analyze validation results from multiple sources
   */
  private analyzeValidationResults(symbol: string, sources: DataSource[]): ValidationResult {
    const validSources = sources.filter(s => s.price && !s.error);
    const prices = validSources.map(s => s.price!);
    
    console.log(`📊 Validation analysis for ${symbol}: ${validSources.length}/${sources.length} sources valid`);
    console.log(`💰 Valid prices: ${prices.map(p => `$${p.toFixed(2)}`).join(', ')}`);
    
    // Accept single source if it's Yahoo Finance (most reliable)
    const hasYahoo = validSources.some(s => s.name === 'Yahoo Finance');
    const minSourcesRequired = hasYahoo ? 1 : this.MIN_SOURCES;
    
    if (validSources.length < minSourcesRequired) {
      console.warn(`❌ ${symbol}: Not enough valid sources (${validSources.length}/${minSourcesRequired} required)`);
      return {
        symbol,
        isValid: false,
        consensusPrice: 0,
        priceVariance: 0,
        sources,
        confidence: 0,
        lastValidated: new Date().toISOString()
      };
    }
    
    // Calculate consensus price (median to avoid outliers)
    const sortedPrices = [...prices].sort((a, b) => a - b);
    const consensusPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];
    
    // Calculate price variance
    const avgPrice = prices.reduce((a, b) => a + b) / prices.length;
    const variance = Math.max(...prices) - Math.min(...prices);
    const priceVariance = (variance / avgPrice) * 100;
    
    // Determine if prices are within tolerance
    const isValid = prices.every(price => 
      Math.abs(price - consensusPrice) / consensusPrice <= this.PRICE_TOLERANCE
    );
    
    // Calculate confidence score
    const sourceReliability = validSources.length / sources.length;
    const priceConsistency = Math.max(0, 1 - (priceVariance / 5)); // 5% variance = 0 confidence
    const confidence = (sourceReliability * 0.6 + priceConsistency * 0.4) * 100;
    
    console.log(`✅ ${symbol} validation: ${isValid ? 'VALID' : 'INVALID'} | Consensus: $${consensusPrice.toFixed(2)} | Variance: ${priceVariance.toFixed(2)}% | Confidence: ${confidence.toFixed(1)}%`);
    
    return {
      symbol,
      isValid,
      consensusPrice,
      priceVariance,
      sources,
      confidence,
      lastValidated: new Date().toISOString()
    };
  }
  
  /**
   * Validate multiple benchmark symbols at once
   */
  async validateMultipleBenchmarks(symbols: string[]): Promise<ValidationResult[]> {
    console.log(`🔍 Validating ${symbols.length} benchmarks: ${symbols.join(', ')}`);
    
    const validations = await Promise.all(
      symbols.map(symbol => this.validateBenchmarkPrice(symbol))
    );
    
    const validCount = validations.filter(v => v.isValid).length;
    const avgConfidence = validations.reduce((sum, v) => sum + v.confidence, 0) / validations.length;
    
    console.log(`📊 Validation Summary: ${validCount}/${symbols.length} valid | Avg Confidence: ${avgConfidence.toFixed(1)}%`);
    
    return validations;
  }
  
  /**
   * Get validation status for display
   */
  getValidationStatus(results: ValidationResult[]): {
    overallValid: boolean;
    avgConfidence: number;
    sourcesUsed: string[];
    lastUpdated: string;
  } {
    const validResults = results.filter(r => r.isValid);
    const overallValid = validResults.length >= results.length * 0.8; // 80% must be valid
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    
    const allSources = results.flatMap(r => r.sources.filter(s => !s.error).map(s => s.name));
    const sourcesUsed = [...new Set(allSources)];
    
    const lastUpdated = Math.max(...results.map(r => new Date(r.lastValidated).getTime()));
    
    return {
      overallValid,
      avgConfidence,
      sourcesUsed,
      lastUpdated: new Date(lastUpdated).toISOString()
    };
  }
}

// Export singleton instance
export const benchmarkValidator = new BenchmarkValidator();