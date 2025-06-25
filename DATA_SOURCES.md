# OmniShift Data Sources Integration Guide

## 🎯 Current Implementation

### ✅ Working Data Sources
1. **Yahoo Finance API** (Proxy) - `/api/market-data`
   - Stock quotes and prices
   - Market indicators (VIX, S&P 500, Oil, Gold)
   - Historical price data
   - **Status**: ✅ Working with fallbacks

2. **Firebase Firestore**
   - User portfolio data
   - Trade history
   - Event storage
   - **Status**: ✅ Configured

3. **Mock Data Systems**
   - Geopolitical tension scores
   - Defense sector events
   - Realistic fallback data
   - **Status**: ✅ Working

## 🚀 Live Data Integration Roadmap

### 1. Real-Time News & Events

#### Option A: NewsAPI (Recommended)
```bash
# Cost: $449/month for business plan
# Features: Real-time news, 100,000 requests/day
```

#### Option B: Alpha Vantage News
```bash
# Cost: Free tier available, $49.99/month premium
# Features: Financial news sentiment, market-moving events
```

#### Option C: GDELT Project (Free)
```bash
# Cost: Free
# Features: Global event database, geopolitical monitoring
```

### 2. Real-Time Market Data

#### Option A: Alpha Vantage (Current Choice)
```bash
# Cost: Free (5 calls/min), $49.99/month (75 calls/min)
# Features: Real-time quotes, technical indicators, forex
```

#### Option B: Polygon.io
```bash
# Cost: $99/month starter
# Features: Real-time market data, websockets, options data
```

#### Option C: IEX Cloud
```bash
# Cost: Free tier, $9/month premium
# Features: Real-time quotes, news, economic data
```

### 3. Geopolitical Intelligence

#### Option A: ACLED (Armed Conflict Location & Event Data)
```bash
# Cost: Free for academic use, paid for commercial
# Features: Real conflict data, crisis monitoring
```

#### Option B: Crisis Group Data
```bash
# Cost: Subscription required
# Features: Professional geopolitical analysis
```

### 4. Defense Industry Data

#### Option A: Defense News API
```bash
# Cost: Custom pricing
# Features: Defense industry news, contract announcements
```

#### Option B: Government Contract Data
```bash
# Cost: Free (USASpending.gov API)
# Features: Federal contract awards, defense spending
```

## 🔑 API Keys Required

Create these accounts and add keys to `.env.local`:

```bash
# News & Events
NEXT_PUBLIC_NEWS_API_KEY=your_newsapi_key
NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY=your_alphavantage_key

# Advanced Options (Optional)
NEXT_PUBLIC_POLYGON_API_KEY=your_polygon_key
NEXT_PUBLIC_IEX_API_KEY=your_iex_key
NEXT_PUBLIC_GDELT_API_KEY=your_gdelt_key
```

## 📈 Implementation Priority

### Phase 1: Essential Live Data (Week 1)
1. ✅ Yahoo Finance (Working)
2. 🔄 NewsAPI integration
3. 🔄 Alpha Vantage real-time quotes

### Phase 2: Enhanced Intelligence (Week 2)
1. 🔄 GDELT geopolitical events
2. 🔄 USASpending.gov defense contracts
3. 🔄 Real-time sentiment analysis

### Phase 3: Professional Grade (Week 3-4)
1. 🔄 Polygon.io streaming data
2. 🔄 Advanced geopolitical feeds
3. 🔄 Custom event correlation algorithms

## 💰 Cost Breakdown

### Free Tier Setup
- Yahoo Finance: Free (with rate limits)
- GDELT: Free
- USASpending.gov: Free
- **Total: $0/month**

### Professional Setup
- NewsAPI Business: $449/month
- Alpha Vantage Premium: $49.99/month
- Polygon.io Starter: $99/month
- **Total: ~$600/month**

### Enterprise Setup
- All premium APIs
- Custom geopolitical feeds
- Dedicated data sources
- **Total: $2000+/month**

## 🛠️ Next Steps

1. **Sign up for API keys** (start with free tiers)
2. **Implement NewsAPI integration** 
3. **Add real-time event monitoring**
4. **Enhance geopolitical tracking**
5. **Add websocket connections** for live updates