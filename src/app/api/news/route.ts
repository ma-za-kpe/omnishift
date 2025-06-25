import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || 'defense stocks military technology';
  const source = searchParams.get('source') || 'newsapi';
  
  try {
    const articles = await fetchNews(query, source);
    return NextResponse.json({ success: true, data: articles });
  } catch (error) {
    console.error('News API error:', error);
    
    // Try alternative real sources automatically (remove mock fallback)
    const fallbackSources = ['gnews', 'newsdata', 'gdelt'];
    
    for (const fallbackSource of fallbackSources) {
      try {
        const articles = await fetchNews(query, fallbackSource);
        console.log(`📰 Using fallback source: ${fallbackSource}`);
        return NextResponse.json({ success: true, data: articles });
      } catch (fallbackError) {
        console.error(`Fallback source ${fallbackSource} failed:`, fallbackError);
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'All news sources failed' },
      { status: 500 }
    );
  }
}

async function fetchNews(query: string, source: string) {
  switch (source) {
    case 'newsapi':
      return await fetchNewsAPI(query);
    case 'gnews':
      return await fetchGNews(query);
    case 'newsdata':
      return await fetchNewsData(query);
    case 'gdelt':
      return await fetchGDELT(query);
    // Removed mock option - only real sources
    default:
      return await fetchNewsAPI(query);
  }
}

async function fetchNewsAPI(query: string) {
  const apiKey = process.env.NEXT_PUBLIC_NEWS_API_KEY;
  if (!apiKey) {
    throw new Error('NewsAPI key not configured');
  }

  const response = await axios.get('https://newsapi.org/v2/everything', {
    params: {
      q: query,
      sortBy: 'publishedAt',
      language: 'en',
      pageSize: 20,
      apiKey: apiKey
    }
  });

  return response.data.articles.map((article: any) => ({
    id: `news_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: article.title,
    description: article.description,
    url: article.url,
    source: article.source.name,
    publishedAt: article.publishedAt,
    urlToImage: article.urlToImage,
    category: categorizeNews(article.title + ' ' + (article.description || '')),
    sentiment: analyzeSentiment(article.title + ' ' + (article.description || '')),
    impactScore: calculateImpactScore(article.title + ' ' + (article.description || ''))
  }));
}

async function fetchGNews(query: string) {
  const apiKey = process.env.NEXT_PUBLIC_GNEWS_KEY;
  if (!apiKey) {
    throw new Error('GNews API key not configured');
  }

  const response = await axios.get('https://gnews.io/api/v4/search', {
    params: {
      q: query,
      lang: 'en',
      country: 'us',
      max: 20,
      apikey: apiKey
    }
  });

  return response.data.articles.map((article: any) => ({
    id: `gnews_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: article.title,
    description: article.description,
    url: article.url,
    source: article.source.name,
    publishedAt: article.publishedAt,
    urlToImage: article.image,
    category: categorizeNews(article.title + ' ' + (article.description || '')),
    sentiment: analyzeSentiment(article.title + ' ' + (article.description || '')),
    impactScore: calculateImpactScore(article.title + ' ' + (article.description || ''))
  }));
}

async function fetchNewsData(query: string) {
  const apiKey = process.env.NEXT_PUBLIC_NEWSDATA_KEY;
  if (!apiKey) {
    throw new Error('NewsData API key not configured');
  }

  const response = await axios.get('https://newsdata.io/api/1/news', {
    params: {
      apikey: apiKey,
      q: query,
      language: 'en',
      country: 'us',
      size: 20
    }
  });

  return response.data.results.map((article: any) => ({
    id: `newsdata_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: article.title,
    description: article.description,
    url: article.link,
    source: article.source_id,
    publishedAt: article.pubDate,
    urlToImage: article.image_url,
    category: categorizeNews(article.title + ' ' + (article.description || '')),
    sentiment: analyzeSentiment(article.title + ' ' + (article.description || '')),
    impactScore: calculateImpactScore(article.title + ' ' + (article.description || ''))
  }));
}

async function fetchGDELT(query: string) {
  // GDELT Global Knowledge Graph API (always free)
  const baseUrl = 'https://api.gdeltproject.org/api/v2/doc/doc';
  
  const response = await axios.get(baseUrl, {
    params: {
      query: query,
      mode: 'artlist',
      maxrecords: 20,
      format: 'json',
      sort: 'dateasc'
    }
  });

  // GDELT returns articles in a different format
  const articles = response.data.articles || [];
  
  return articles.map((article: any) => ({
    id: `gdelt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: article.title,
    description: article.seendate,
    url: article.url,
    source: article.domain,
    publishedAt: article.seendate,
    urlToImage: null,
    category: categorizeNews(article.title),
    sentiment: analyzeSentiment(article.title),
    impactScore: calculateImpactScore(article.title)
  }));
}

// Removed getFallbackNews function - no longer using mock news data

function categorizeNews(text: string): string {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('defense') || lowerText.includes('military') || lowerText.includes('contract')) {
    return 'defense';
  }
  if (lowerText.includes('oil') || lowerText.includes('energy') || lowerText.includes('petroleum')) {
    return 'energy';
  }
  if (lowerText.includes('tech') || lowerText.includes('ai') || lowerText.includes('cyber')) {
    return 'technology';
  }
  if (lowerText.includes('fed') || lowerText.includes('federal') || lowerText.includes('rate')) {
    return 'economic_policy';
  }
  
  return 'market_movement';
}

function analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const lowerText = text.toLowerCase();
  const positiveWords = ['surge', 'gain', 'rise', 'boost', 'increase', 'award', 'secure', 'expand', 'growth'];
  const negativeWords = ['fall', 'drop', 'concern', 'tension', 'decline', 'risk', 'threat', 'crisis'];
  
  const positiveScore = positiveWords.filter(word => lowerText.includes(word)).length;
  const negativeScore = negativeWords.filter(word => lowerText.includes(word)).length;
  
  if (positiveScore > negativeScore) return 'positive';
  if (negativeScore > positiveScore) return 'negative';
  return 'neutral';
}

function calculateImpactScore(text: string): number {
  const lowerText = text.toLowerCase();
  const highImpactWords = ['billion', 'contract', 'pentagon', 'surge', 'crisis', 'federal'];
  const matches = highImpactWords.filter(word => lowerText.includes(word)).length;
  
  return Math.min(0.3 + (matches * 0.15), 1.0);
}