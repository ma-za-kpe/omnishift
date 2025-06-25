import OpenAI from 'openai';
import { MarketEvent, EventCategory, Sector } from '@/types';

export class AIAnalysisService {
  private openai: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (apiKey && apiKey.length > 20 && !apiKey.includes('None')) {
      this.openai = new OpenAI({
        apiKey: apiKey,
      });
    }
  }

  async analyzeMarketEvent(title: string, description: string): Promise<{
    category: EventCategory;
    sectors: Sector[];
    impactScore: number;
    sentiment: 'positive' | 'negative' | 'neutral';
    tradingSignals: string[];
    summary: string;
  }> {
    // If OpenAI is not available, use fallback analysis
    if (!this.openai) {
      return this.fallbackAnalysis(title, description);
    }

    try {
      const prompt = `Analyze this market event and provide structured output:

Title: "${title}"
Description: "${description}"

Please analyze and return a JSON response with:
1. category: One of ["economic_policy", "market_movement", "corporate_news", "regulatory", "technology", "energy", "geopolitical"]
2. sectors: Array from ["technology", "defense", "energy", "financials", "healthcare", "industrials", "consumer", "materials", "utilities", "real_estate"]
3. impactScore: Number between 0.0 and 1.0 (0.0 = no impact, 1.0 = major market impact)
4. sentiment: "positive", "negative", or "neutral"
5. tradingSignals: Array of specific stock/ETF recommendations with reasoning
6. summary: 1-2 sentence summary of market implications

Example response format:
{
  "category": "energy",
  "sectors": ["energy", "defense"],
  "impactScore": 0.8,
  "sentiment": "negative",
  "tradingSignals": ["Consider buying XOM due to oil supply concerns", "Watch defense stocks like LMT"],
  "summary": "Geopolitical tensions affecting oil supply could drive energy sector volatility and benefit defense contractors."
}`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a financial analyst expert in market events and trading. Always respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      try {
        return JSON.parse(response);
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', response);
        // Fallback to basic analysis
        return this.fallbackAnalysis(title, description);
      }
    } catch (error) {
      console.error('OpenAI analysis failed:', error);
      return this.fallbackAnalysis(title, description);
    }
  }

  async generateTradingStrategy(events: MarketEvent[]): Promise<{
    recommendations: Array<{
      ticker: string;
      action: 'buy' | 'sell' | 'hold';
      confidence: number;
      reasoning: string;
      targetPrice?: number;
    }>;
    marketOutlook: string;
    riskFactors: string[];
  }> {
    if (!this.openai) {
      return {
        recommendations: [],
        marketOutlook: "AI analysis unavailable - using basic market data only",
        riskFactors: ["Limited analysis due to missing AI integration"]
      };
    }

    try {
      const eventSummaries = events.slice(0, 5).map(e => ({
        title: e.title,
        category: e.category,
        impactScore: e.impactScore,
        sentiment: e.sentiment
      }));

      const prompt = `Based on these recent market events, generate trading recommendations:

Events: ${JSON.stringify(eventSummaries, null, 2)}

Provide a JSON response with:
1. recommendations: Array of stock/ETF recommendations with ticker, action (buy/sell/hold), confidence (0-1), reasoning
2. marketOutlook: Overall market sentiment and direction
3. riskFactors: Key risks to monitor

Focus on liquid, major stocks and ETFs. Consider both opportunities and risks.`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a quantitative trading strategist. Provide specific, actionable trading recommendations with proper risk assessment."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 800
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      return JSON.parse(response);
    } catch (error) {
      console.error('Strategy generation failed:', error);
      return {
        recommendations: [],
        marketOutlook: "Unable to generate outlook due to analysis error",
        riskFactors: ["AI analysis temporarily unavailable"]
      };
    }
  }

  async analyzePortfolioRisk(holdings: Array<{ticker: string; value: number; sector: Sector}>): Promise<{
    riskScore: number;
    diversificationScore: number;
    recommendations: string[];
    hedgingSuggestions: string[];
  }> {
    if (!this.openai) {
      return {
        riskScore: 0.5,
        diversificationScore: 0.5,
        recommendations: ["AI portfolio analysis unavailable"],
        hedgingSuggestions: ["Consider standard hedging instruments"]
      };
    }

    try {
      const prompt = `Analyze this portfolio for risk and diversification:

Holdings: ${JSON.stringify(holdings, null, 2)}

Provide JSON response with:
1. riskScore: 0-1 (0 = low risk, 1 = high risk)
2. diversificationScore: 0-1 (0 = poor diversification, 1 = excellent)
3. recommendations: Array of specific improvement suggestions
4. hedgingSuggestions: Array of hedging strategies`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a portfolio risk management expert. Analyze portfolios for risk, correlation, and diversification."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 600
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      return JSON.parse(response);
    } catch (error) {
      console.error('Portfolio analysis failed:', error);
      return {
        riskScore: 0.5,
        diversificationScore: 0.5,
        recommendations: ["Unable to analyze portfolio due to technical error"],
        hedgingSuggestions: ["Consider standard hedging instruments like VIX or inverse ETFs"]
      };
    }
  }

  private fallbackAnalysis(title: string, description: string) {
    // Minimal fallback - real AI analysis should be implemented
    console.warn('AI Analysis unavailable - using minimal keyword detection');
    
    const text = (title + ' ' + description).toLowerCase();
    
    // Basic categorization
    let category: EventCategory = 'market_movement';
    if (text.includes('defense') || text.includes('military')) category = 'geopolitical';
    if (text.includes('earnings') || text.includes('revenue')) category = 'corporate_news';
    if (text.includes('fed') || text.includes('rate')) category = 'economic_policy';
    
    return {
      category,
      sectors: [] as Sector[], // Don't assume sectors without proper analysis
      impactScore: 0.5, // Neutral impact when unsure
      sentiment: 'neutral' as const,
      tradingSignals: ['Insufficient data for trading signals - requires AI analysis'],
      summary: 'Basic text analysis completed - implement OpenAI integration for detailed insights'
    };
  }
}

export const aiAnalysisService = new AIAnalysisService();