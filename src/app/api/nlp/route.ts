import { NextRequest, NextResponse } from 'next/server';
import { huggingfaceNLP } from '@/lib/huggingfaceNLP';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, text, options } = body;

    if (!text) {
      return NextResponse.json({
        success: false,
        error: 'Text is required'
      }, { status: 400 });
    }

    let result;

    switch (action) {
      case 'sentiment':
        result = await huggingfaceNLP.analyzeSentiment(text);
        break;

      case 'classify':
        result = await huggingfaceNLP.classifyFinancialTone(text);
        break;

      case 'classify-custom':
        if (!options?.categories || !Array.isArray(options.categories)) {
          return NextResponse.json({
            success: false,
            error: 'Categories array is required for custom classification'
          }, { status: 400 });
        }
        result = await huggingfaceNLP.classifyCustom(text, options.categories);
        break;

      case 'summarize':
        const maxLength = options?.maxLength || 150;
        result = await huggingfaceNLP.summarize(text, maxLength);
        break;

      case 'extract-entities':
        result = await huggingfaceNLP.extractFinancialEntities(text);
        break;

      case 'impact-score':
        result = await huggingfaceNLP.analyzeImpactScore(text);
        break;

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Available actions: sentiment, classify, classify-custom, summarize, extract-entities, impact-score'
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('NLP API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process NLP request'
    }, { status: 500 });
  }
}

// Support GET for basic info
export async function GET() {
  return NextResponse.json({
    success: true,
    info: {
      provider: 'HuggingFace',
      models: {
        sentiment: 'ProsusAI/finbert',
        classification: 'yiyanghkust/finbert-tone',
        summarization: 'facebook/bart-large-cnn',
        zeroShot: 'facebook/bart-large-mnli'
      },
      features: [
        'Financial sentiment analysis',
        'Financial tone classification',
        'Text summarization',
        'Custom category classification',
        'Financial entity extraction',
        'Impact score calculation'
      ],
      requiresApiKey: false // Works with fallbacks
    }
  });
}