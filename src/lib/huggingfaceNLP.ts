/**
 * Hugging Face NLP Integration
 * Free sentiment analysis and text classification for financial insights
 */

import axios from 'axios';

export interface SentimentResult {
  label: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  score: number;
}

export interface ClassificationResult {
  label: string;
  score: number;
}

export interface SummarizationResult {
  summary_text: string;
}

/**
 * Hugging Face NLP Service
 * Uses free Inference API with rate limiting
 */
export class HuggingFaceNLPService {
  private apiKey: string | null = null;
  private baseUrl = 'https://api-inference.huggingface.co/models';
  
  // Free tier models that work well for financial analysis
  private models = {
    sentiment: 'ProsusAI/finbert', // Financial sentiment analysis
    classification: 'yiyanghkust/finbert-tone', // Financial tone classification
    summarization: 'facebook/bart-large-cnn', // Text summarization
    zeroShot: 'facebook/bart-large-mnli' // Zero-shot classification
  };

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY || null;
  }

  /**
   * Analyze sentiment of financial text
   */
  async analyzeSentiment(text: string): Promise<SentimentResult> {
    if (!this.apiKey) {
      // Fallback to rule-based sentiment if no API key
      return this.ruleBasedSentimentAnalysis(text);
    }

    try {
      const response = await this.query(this.models.sentiment, { inputs: text });
      
      // FinBERT returns multiple labels, map to our format
      const results = response[0] || [];
      const sentimentMap: Record<string, 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'> = {
        'positive': 'POSITIVE',
        'negative': 'NEGATIVE',
        'neutral': 'NEUTRAL'
      };

      // Find the highest scoring sentiment
      let bestResult = { label: 'NEUTRAL' as const, score: 0 };
      for (const result of results) {
        const mappedLabel = sentimentMap[result.label.toLowerCase()];
        if (mappedLabel && result.score > bestResult.score) {
          bestResult = { label: mappedLabel, score: result.score };
        }
      }

      return bestResult;
    } catch (error) {
      console.error('HuggingFace sentiment analysis failed:', error);
      return this.ruleBasedSentimentAnalysis(text);
    }
  }

  /**
   * Classify financial text into categories
   */
  async classifyFinancialTone(text: string): Promise<ClassificationResult[]> {
    if (!this.apiKey) {
      return this.ruleBasedClassification(text);
    }

    try {
      const response = await this.query(this.models.classification, { inputs: text });
      return response[0] || [];
    } catch (error) {
      console.error('HuggingFace classification failed:', error);
      return this.ruleBasedClassification(text);
    }
  }

  /**
   * Zero-shot classification for custom categories
   */
  async classifyCustom(text: string, categories: string[]): Promise<ClassificationResult[]> {
    if (!this.apiKey || categories.length === 0) {
      return categories.map(cat => ({ label: cat, score: 1 / categories.length }));
    }

    try {
      const response = await this.query(this.models.zeroShot, {
        inputs: text,
        parameters: {
          candidate_labels: categories,
          multi_label: true
        }
      });

      return categories.map((cat, idx) => ({
        label: cat,
        score: response.scores?.[idx] || 0
      }));
    } catch (error) {
      console.error('HuggingFace zero-shot classification failed:', error);
      return categories.map(cat => ({ label: cat, score: 1 / categories.length }));
    }
  }

  /**
   * Summarize long financial articles
   */
  async summarize(text: string, maxLength: number = 150): Promise<string> {
    if (!this.apiKey) {
      // Simple extractive summarization fallback
      return this.extractiveSummarization(text, maxLength);
    }

    try {
      const response = await this.query(this.models.summarization, {
        inputs: text,
        parameters: {
          max_length: maxLength,
          min_length: 30,
          do_sample: false
        }
      });

      return response[0]?.summary_text || this.extractiveSummarization(text, maxLength);
    } catch (error) {
      console.error('HuggingFace summarization failed:', error);
      return this.extractiveSummarization(text, maxLength);
    }
  }

  /**
   * Extract financial entities and metrics from text
   */
  async extractFinancialEntities(text: string): Promise<{
    companies: string[];
    tickers: string[];
    amounts: string[];
    percentages: string[];
  }> {
    // Regex-based extraction for financial entities
    const tickerRegex = /\b[A-Z]{2,5}\b(?=\s|,|\.|\)|$)/g;
    const amountRegex = /\$[\d,]+(?:\.\d{1,2})?(?:\s*(?:billion|million|thousand|B|M|K))?/gi;
    const percentRegex = /\d+(?:\.\d{1,2})?%/g;
    
    const tickers = [...new Set(text.match(tickerRegex) || [])].filter(t => 
      // Filter out common words that match ticker pattern
      !['THE', 'AND', 'FOR', 'WITH', 'FROM', 'THIS', 'THAT', 'HAVE', 'WILL'].includes(t)
    );

    const amounts = [...new Set(text.match(amountRegex) || [])];
    const percentages = [...new Set(text.match(percentRegex) || [])];

    // Extract company names (simplified)
    const companyPatterns = [
      /\b(?:Inc\.|Corp\.|Corporation|Company|Ltd\.|LLC|Group|Holdings)\b/gi
    ];
    const companies: string[] = [];
    
    companyPatterns.forEach(pattern => {
      const matches = text.match(new RegExp(`\\b[A-Z][\\w\\s&]+\\s+${pattern.source}`, 'g')) || [];
      companies.push(...matches);
    });

    return {
      companies: [...new Set(companies)],
      tickers,
      amounts,
      percentages
    };
  }

  /**
   * Analyze impact score based on financial language
   */
  async analyzeImpactScore(text: string): Promise<number> {
    const sentiment = await this.analyzeSentiment(text);
    const entities = await this.extractFinancialEntities(text);
    
    let score = 0.5; // Base score

    // Adjust based on sentiment
    if (sentiment.label === 'POSITIVE') {
      score += 0.2 * sentiment.score;
    } else if (sentiment.label === 'NEGATIVE') {
      score += 0.3 * sentiment.score; // Negative news often has higher impact
    }

    // Adjust based on financial entities
    if (entities.amounts.length > 0) {
      score += 0.1; // Contains financial amounts
    }
    if (entities.tickers.length > 0) {
      score += 0.05 * Math.min(entities.tickers.length, 3); // Multiple companies mentioned
    }

    // High-impact keywords
    const impactKeywords = [
      'breakthrough', 'crash', 'surge', 'plunge', 'record', 'crisis',
      'acquisition', 'merger', 'bankruptcy', 'investigation', 'sanction'
    ];
    
    const lowerText = text.toLowerCase();
    const keywordMatches = impactKeywords.filter(kw => lowerText.includes(kw)).length;
    score += keywordMatches * 0.1;

    return Math.min(1.0, Math.max(0.1, score));
  }

  /**
   * Make API request to HuggingFace
   */
  private async query(model: string, payload: any): Promise<any> {
    if (!this.apiKey) {
      throw new Error('HuggingFace API key not configured');
    }

    const response = await axios.post(
      `${this.baseUrl}/${model}`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      }
    );

    return response.data;
  }

  /**
   * Rule-based sentiment analysis fallback
   */
  private ruleBasedSentimentAnalysis(text: string): SentimentResult {
    const lowerText = text.toLowerCase();
    
    const positiveWords = [
      'gain', 'profit', 'surge', 'rise', 'increase', 'growth', 'positive',
      'strong', 'outperform', 'upgrade', 'bullish', 'record', 'success'
    ];
    
    const negativeWords = [
      'loss', 'decline', 'fall', 'drop', 'decrease', 'negative', 'weak',
      'underperform', 'downgrade', 'bearish', 'crash', 'failure', 'risk'
    ];

    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;

    if (positiveCount > negativeCount) {
      return { label: 'POSITIVE', score: Math.min(0.9, 0.5 + positiveCount * 0.1) };
    } else if (negativeCount > positiveCount) {
      return { label: 'NEGATIVE', score: Math.min(0.9, 0.5 + negativeCount * 0.1) };
    } else {
      return { label: 'NEUTRAL', score: 0.5 };
    }
  }

  /**
   * Rule-based classification fallback
   */
  private ruleBasedClassification(text: string): ClassificationResult[] {
    const lowerText = text.toLowerCase();
    const categories = [];

    if (lowerText.includes('defense') || lowerText.includes('military')) {
      categories.push({ label: 'defense', score: 0.8 });
    }
    if (lowerText.includes('energy') || lowerText.includes('oil') || lowerText.includes('gas')) {
      categories.push({ label: 'energy', score: 0.8 });
    }
    if (lowerText.includes('tech') || lowerText.includes('software') || lowerText.includes('ai')) {
      categories.push({ label: 'technology', score: 0.8 });
    }
    if (lowerText.includes('cyber') || lowerText.includes('security')) {
      categories.push({ label: 'cybersecurity', score: 0.8 });
    }

    return categories.length > 0 ? categories : [{ label: 'general', score: 0.5 }];
  }

  /**
   * Simple extractive summarization
   */
  private extractiveSummarization(text: string, maxLength: number): string {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const importantSentences = sentences.filter(sentence => {
      const hasNumbers = /\d/.test(sentence);
      const hasKeywords = /\b(announce|report|increase|decrease|contract|deal)\b/i.test(sentence);
      return hasNumbers || hasKeywords;
    });

    const selectedSentences = importantSentences.length > 0 ? importantSentences : sentences;
    let summary = '';
    
    for (const sentence of selectedSentences) {
      if (summary.length + sentence.length <= maxLength) {
        summary += sentence.trim() + ' ';
      } else {
        break;
      }
    }

    return summary.trim() || text.substring(0, maxLength) + '...';
  }
}

// Export singleton instance
export const huggingfaceNLP = new HuggingFaceNLPService();