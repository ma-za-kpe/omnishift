import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const region = searchParams.get('region') || 'global';

  try {
    const events = await calculateTensionFromNews(region);
    return NextResponse.json({ success: true, data: events });

  } catch (error) {
    console.error('Geopolitical API error:', error);
    
    // Return fallback data
    const fallbackEvents = getFallbackGeopoliticalEvents(region);
    return NextResponse.json({ success: true, data: fallbackEvents });
  }
}

async function calculateTensionFromNews(region: string) {
  try {
    // Get regional news keywords
    const regionKeywords = getRegionKeywords(region);
    const tensionKeywords = ['conflict', 'crisis', 'tension', 'war', 'military', 'defense', 'threat', 'sanctions', 'dispute', 'violence'];
    
    // Fetch news from multiple sources
    const newsQueries = [
      `${regionKeywords} AND (${tensionKeywords.slice(0, 3).join(' OR ')})`,
      `${regionKeywords} AND (${tensionKeywords.slice(3, 6).join(' OR ')})`,
      `${regionKeywords} AND (${tensionKeywords.slice(6).join(' OR ')})`
    ];

    let allArticles: any[] = [];
    
    // Try NewsAPI first (our primary source)
    for (const query of newsQueries) {
      try {
        const baseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '';
        const response = await axios.get(`${baseUrl}/api/news`, {
          params: { q: query.replace(' AND ', ' '), source: 'newsapi' },
          timeout: 5000
        });
        if (response.data.success) {
          allArticles = allArticles.concat(response.data.data.slice(0, 5));
        }
        break; // If one query succeeds, that's enough
      } catch (error) {
        console.log(`NewsAPI query failed for: ${query}`);
      }
    }

    // If no articles found, use fallback queries
    if (allArticles.length === 0) {
      try {
        const baseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '';
        const response = await axios.get(`${baseUrl}/api/news`, {
          params: { q: `${regionKeywords.split(' OR ')[0]} military`, source: 'newsapi' },
          timeout: 5000
        });
        if (response.data.success) {
          allArticles = response.data.data.slice(0, 8);
        }
      } catch (error) {
        console.log('Fallback news query failed');
      }
    }

    // Analyze articles to calculate tension
    const tensionMetrics = analyzeTensionFromArticles(allArticles, region);
    
    // Convert to geopolitical events format
    const events = createEventsFromTension(tensionMetrics, allArticles, region);
    
    return events;

  } catch (error) {
    console.error('News-based tension calculation failed:', error);
    throw error;
  }
}

function getRegionKeywords(region: string): string {
  const regionMap: Record<string, string> = {
    'middle_east': 'Middle East OR Israel OR Iran OR Syria OR Iraq OR Saudi Arabia OR Yemen OR Turkey',
    'europe': 'Europe OR Ukraine OR Russia OR Germany OR France OR UK OR NATO OR EU',
    'asia': 'China OR Taiwan OR North Korea OR South Korea OR Japan OR India OR Pakistan OR Asia Pacific',
    'americas': 'United States OR USA OR Mexico OR Canada OR South America OR Brazil OR Venezuela',
    'global': 'global OR international OR worldwide OR geopolitical'
  };
  return regionMap[region] || regionMap['global'];
}

function analyzeTensionFromArticles(articles: any[], region: string) {
  if (articles.length === 0) {
    return {
      tensionScore: 25, // Base tension without random component
      eventCount: 0,
      sentimentScore: 0,
      severityLevel: 'low' as const
    };
  }

  // Calculate tension based on multiple factors
  let tensionScore = 30; // Base tension
  let negativeCount = 0;
  let highImpactCount = 0;

  articles.forEach(article => {
    // Sentiment analysis
    if (article.sentiment === 'negative') {
      negativeCount++;
      tensionScore += 8;
    }

    // Impact score analysis
    if (article.impactScore > 0.7) {
      highImpactCount++;
      tensionScore += 12;
    } else if (article.impactScore > 0.5) {
      tensionScore += 6;
    }

    // Category-based tension
    if (article.category === 'defense') {
      tensionScore += 10;
    } else if (article.category === 'energy') {
      tensionScore += 5;
    }

    // Keyword-based tension
    const title = (article.title || '').toLowerCase();
    const description = (article.description || '').toLowerCase();
    const content = title + ' ' + description;

    const highTensionWords = ['crisis', 'war', 'conflict', 'attack', 'threat', 'sanctions', 'military', 'violence'];
    const mediumTensionWords = ['tension', 'dispute', 'concern', 'warning', 'alert', 'exercise', 'deployment'];

    highTensionWords.forEach(word => {
      if (content.includes(word)) tensionScore += 5;
    });

    mediumTensionWords.forEach(word => {
      if (content.includes(word)) tensionScore += 2;
    });
  });

  // Normalize without random variation
  tensionScore = Math.min(tensionScore, 95); // Cap at 95
  tensionScore = Math.max(tensionScore, 15); // Minimum 15

  const severityLevel = 
    tensionScore > 75 ? 'critical' as const :
    tensionScore > 60 ? 'high' as const :
    tensionScore > 40 ? 'medium' as const : 'low' as const;

  return {
    tensionScore: Math.round(tensionScore),
    eventCount: articles.length,
    sentimentScore: negativeCount / Math.max(articles.length, 1),
    severityLevel
  };
}

function createEventsFromTension(metrics: any, articles: any[], region: string) {
  const events = [];

  // Create events from actual news articles
  articles.slice(0, 6).forEach((article, index) => {
    events.push({
      id: `news_${Date.now()}_${index}`,
      title: article.title || `${formatRegionName(region)} Security Update`,
      description: article.description || 'Regional security monitoring continues',
      region: formatRegionName(region),
      coordinates: getRegionCoordinates(region),
      tensionLevel: article.impactScore > 0.7 ? 'high' : 
                   article.impactScore > 0.5 ? 'medium' : 'low',
      timestamp: article.publishedAt || new Date().toISOString(),
      source: article.source || 'News Analysis',
      eventType: mapCategoryToEventType(article.category),
      impactScore: article.impactScore || 0.5
    });
  });

  // Return only real events from news analysis - no synthetic events

  return events.slice(0, 8); // Return max 8 events
}

// Removed generateSyntheticEvents function - no longer using synthetic events

function mapCategoryToEventType(category: string): string {
  const mapping: Record<string, string> = {
    'defense': 'military',
    'energy': 'economic',
    'technology': 'cyber',
    'market_movement': 'economic',
    'economic_policy': 'economic'
  };
  return mapping[category] || 'general';
}

function getRegionCoordinates(region: string): [number, number] {
  const coordinates: Record<string, [number, number]> = {
    'middle_east': [29.3, 47.4],
    'europe': [54.5, 15.2],
    'asia': [35.8, 104.1],
    'americas': [40.7, -74.0],
    'global': [0, 0]
  };
  return coordinates[region] || [0, 0];
}

function formatRegionName(region: string): string {
  const names: Record<string, string> = {
    'middle_east': 'Middle East',
    'europe': 'Europe',
    'asia': 'Asia Pacific',
    'americas': 'Americas',
    'global': 'Global'
  };
  return names[region] || region;
}

function getFallbackGeopoliticalEvents(region: string) {
  // Return empty array instead of fake data
  // Real implementation should have robust error handling and retry mechanisms
  console.warn(`No geopolitical data available for ${region} - implement robust data sources`);
  return [];
}