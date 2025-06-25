/**
 * Geopolitical Events API - Free Alternative to GDELT
 * Aggregates geopolitical news from multiple free sources
 * NO MOCK DATA - Only real news events from verified sources
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'geopolitical';
  const days = parseInt(searchParams.get('days') || '7');
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
    console.log(`🌍 Fetching geopolitical events for ${days} days`);

    // Aggregate events from multiple free sources
    const events = await aggregateGeopoliticalEvents(category, days, limit);

    return NextResponse.json({
      success: true,
      dataSource: 'MULTI_SOURCE_GEOPOLITICAL_AGGREGATOR',
      category,
      timeframe: `${days}d`,
      events,
      count: events.length,
      timestamp: new Date().toISOString(),
      sources: [
        'Google News RSS',
        'NewsAPI Free Tier',
        'World News API',
        'The News API',
        'Reddit Geopolitics'
      ]
    });

  } catch (error) {
    console.error('❌ Geopolitical events fetch failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch geopolitical events',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Aggregate geopolitical events from multiple free sources
 */
async function aggregateGeopoliticalEvents(category: string, days: number, limit: number) {
  const events: any[] = [];

  try {
    // 1. Google News RSS - Free and reliable
    const googleNewsEvents = await fetchGoogleNewsEvents(category, days);
    events.push(...googleNewsEvents);

    // 2. The News API - Free tier
    const theNewsApiEvents = await fetchTheNewsApiEvents(category, days);
    events.push(...theNewsApiEvents);

    // 3. World News API - Free tier
    const worldNewsEvents = await fetchWorldNewsApiEvents(category, days);
    events.push(...worldNewsEvents);

    // 4. Reddit Geopolitics - Free via Reddit API
    const redditEvents = await fetchRedditGeopolitics(days);
    events.push(...redditEvents);

  } catch (error) {
    console.error('Error aggregating events:', error);
  }

  // Sort by relevance score and date
  return events
    .sort((a, b) => {
      const scoreA = calculateRelevanceScore(a);
      const scoreB = calculateRelevanceScore(b);
      return scoreB - scoreA;
    })
    .slice(0, limit);
}

/**
 * Fetch events from Google News RSS (Free)
 */
async function fetchGoogleNewsEvents(category: string, days: number) {
  try {
    const topics = getGeopoliticalKeywords();
    const topicQuery = topics.slice(0, 3).join(' OR ');
    
    // Google News RSS is free and doesn't require API key
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(topicQuery)}&hl=en-US&gl=US&ceid=US:en`;
    
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AI-Trading-System/1.0; Geopolitical-Monitor)'
      }
    });

    if (!response.ok) {
      throw new Error(`Google News RSS error: ${response.status}`);
    }

    const xmlText = await response.text();
    const events = parseGoogleNewsRSS(xmlText);
    
    return events.map(event => ({
      ...event,
      source: 'Google News',
      category: 'geopolitical',
      impact: assessGeopoliticalImpact(event.title + ' ' + event.description),
      relevanceScore: calculateNewsRelevance(event.title, event.description)
    }));

  } catch (error) {
    console.error('Google News RSS fetch failed:', error);
    return [];
  }
}

/**
 * Fetch from The News API (Free tier: 100 requests/day)
 */
async function fetchTheNewsApiEvents(category: string, days: number) {
  try {
    const apiKey = process.env.THE_NEWS_API_KEY;
    if (!apiKey) {
      console.log('The News API key not configured, skipping');
      return [];
    }

    const keywords = getGeopoliticalKeywords().slice(0, 5).join(',');
    const url = `https://api.thenewsapi.com/v1/news/all?api_token=${apiKey}&search=${encodeURIComponent(keywords)}&language=en&limit=10`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.data) {
      return [];
    }

    return data.data.map((article: any) => ({
      id: article.uuid,
      title: article.title,
      description: article.description,
      url: article.url,
      publishedAt: article.published_at,
      source: `The News API - ${article.source}`,
      category: 'geopolitical',
      impact: assessGeopoliticalImpact(article.title + ' ' + article.description),
      relevanceScore: calculateNewsRelevance(article.title, article.description),
      imageUrl: article.image_url
    }));

  } catch (error) {
    console.error('The News API fetch failed:', error);
    return [];
  }
}

/**
 * Fetch from World News API (Free tier: 1000 requests/month)
 */
async function fetchWorldNewsApiEvents(category: string, days: number) {
  try {
    const apiKey = process.env.WORLD_NEWS_API_KEY;
    if (!apiKey) {
      console.log('World News API key not configured, skipping');
      return [];
    }

    const keywords = getGeopoliticalKeywords().slice(0, 3).join(' OR ');
    const earliestDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const url = `https://api.worldnewsapi.com/search-news?text=${encodeURIComponent(keywords)}&earliest-publish-date=${earliestDate}&number=10&api-key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.news) {
      return [];
    }

    return data.news.map((article: any) => ({
      id: article.id,
      title: article.title,
      description: article.text ? article.text.substring(0, 200) + '...' : '',
      url: article.url,
      publishedAt: article.publish_date,
      source: `World News API - ${article.source_country}`,
      category: 'geopolitical',
      impact: assessGeopoliticalImpact(article.title + ' ' + article.text),
      relevanceScore: calculateNewsRelevance(article.title, article.text),
      sentiment: article.sentiment || 0
    }));

  } catch (error) {
    console.error('World News API fetch failed:', error);
    return [];
  }
}

/**
 * Fetch from Reddit Geopolitics (Free via Reddit API)
 */
async function fetchRedditGeopolitics(days: number) {
  try {
    // Reddit API is free for basic use
    const subreddits = ['geopolitics', 'worldnews', 'news', 'internationalpolitics'];
    const events: any[] = [];

    for (const subreddit of subreddits.slice(0, 2)) {
      const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=5`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'AI-Trading-System/1.0 (Geopolitical Monitoring)'
        }
      });

      if (!response.ok) continue;

      const data = await response.json();
      
      if (data.data?.children) {
        const posts = data.data.children
          .map((child: any) => child.data)
          .filter((post: any) => {
            const postAge = (Date.now() - post.created_utc * 1000) / (1000 * 60 * 60 * 24);
            return postAge <= days && post.score > 100; // Filter by age and score
          });

        posts.forEach((post: any) => {
          events.push({
            id: post.id,
            title: post.title,
            description: post.selftext?.substring(0, 200) + '...' || '',
            url: `https://reddit.com${post.permalink}`,
            publishedAt: new Date(post.created_utc * 1000).toISOString(),
            source: `Reddit r/${subreddit}`,
            category: 'geopolitical',
            impact: assessGeopoliticalImpact(post.title + ' ' + post.selftext),
            relevanceScore: calculateNewsRelevance(post.title, post.selftext) + (post.score / 1000),
            upvotes: post.score,
            comments: post.num_comments
          });
        });
      }
    }

    return events;

  } catch (error) {
    console.error('Reddit geopolitics fetch failed:', error);
    return [];
  }
}

/**
 * Parse Google News RSS XML
 */
function parseGoogleNewsRSS(xmlText: string) {
  const events: any[] = [];
  
  try {
    // Simple XML parsing for RSS items
    const itemRegex = /<item>(.*?)<\/item>/gs;
    const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>/s;
    const linkRegex = /<link>(.*?)<\/link>/s;
    const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/s;
    const descriptionRegex = /<description><!\[CDATA\[(.*?)\]\]><\/description>/s;

    let match;
    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemXml = match[1];
      
      const titleMatch = titleRegex.exec(itemXml);
      const linkMatch = linkRegex.exec(itemXml);
      const pubDateMatch = pubDateRegex.exec(itemXml);
      const descMatch = descriptionRegex.exec(itemXml);

      if (titleMatch && linkMatch) {
        events.push({
          id: linkMatch[1],
          title: titleMatch[1],
          description: descMatch ? descMatch[1].replace(/<[^>]*>/g, '').substring(0, 200) + '...' : '',
          url: linkMatch[1],
          publishedAt: pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString()
        });
      }
    }
  } catch (error) {
    console.error('Error parsing Google News RSS:', error);
  }

  return events;
}

/**
 * Get geopolitical keywords for search
 */
function getGeopoliticalKeywords(): string[] {
  return [
    'geopolitics', 'international relations', 'diplomacy', 'sanctions',
    'trade war', 'military conflict', 'defense', 'NATO', 'UN Security Council',
    'election', 'government', 'policy', 'treaty', 'summit', 'crisis',
    'China US relations', 'Russia Ukraine', 'Middle East', 'European Union',
    'trade agreement', 'oil prices', 'currency', 'cybersecurity',
    'terrorism', 'peacekeeping', 'humanitarian', 'refugee'
  ];
}

/**
 * Assess geopolitical impact of news
 */
function assessGeopoliticalImpact(text: string): 'high' | 'medium' | 'low' {
  const highImpactKeywords = [
    'war', 'invasion', 'nuclear', 'sanctions', 'crisis', 'attack', 'conflict',
    'military', 'defense', 'treaty', 'agreement', 'summit', 'election'
  ];
  
  const mediumImpactKeywords = [
    'trade', 'diplomatic', 'policy', 'government', 'international', 'relations',
    'economy', 'market', 'currency', 'oil', 'energy'
  ];

  const lowerText = text.toLowerCase();
  
  const highMatches = highImpactKeywords.filter(keyword => lowerText.includes(keyword)).length;
  const mediumMatches = mediumImpactKeywords.filter(keyword => lowerText.includes(keyword)).length;

  if (highMatches >= 2) return 'high';
  if (highMatches >= 1 || mediumMatches >= 3) return 'medium';
  return 'low';
}

/**
 * Calculate news relevance score
 */
function calculateNewsRelevance(title: string, description: string): number {
  const keywords = getGeopoliticalKeywords();
  const text = `${title} ${description}`.toLowerCase();
  
  let score = 0;
  keywords.forEach(keyword => {
    if (text.includes(keyword.toLowerCase())) {
      score += keyword.split(' ').length; // Multi-word phrases get higher scores
    }
  });

  return score;
}

/**
 * Calculate overall relevance score for event
 */
function calculateRelevanceScore(event: any): number {
  let score = event.relevanceScore || 0;
  
  // Boost recent events
  const ageInHours = (Date.now() - new Date(event.publishedAt).getTime()) / (1000 * 60 * 60);
  const recencyBoost = Math.max(0, 48 - ageInHours) / 48; // Boost events from last 48 hours
  score += recencyBoost * 5;

  // Boost high impact events
  if (event.impact === 'high') score += 10;
  else if (event.impact === 'medium') score += 5;

  // Boost events with social engagement (Reddit)
  if (event.upvotes) {
    score += Math.log10(event.upvotes + 1);
  }

  return score;
}