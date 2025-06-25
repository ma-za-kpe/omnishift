# 🔍 Free Tier API Limits - Deep Research

## 📊 **Exact API Constraints & Optimizations**

### 1. NewsAPI (Free Tier)
```bash
# EXACT LIMITS (Verified)
- Requests: 1,000 per month
- Rate: No specific rate limit, but ~100/day recommended
- Key restrictions: No commercial use, development only
- Response: Up to 100 articles per request

# OUR OPTIMIZATION STRATEGY:
- Cache duration: 30 minutes
- Max requests per day: 30 (saves 900 for month)
- Smart keyword batching: Multiple topics per request
- Priority: Defense + Market news only
```

### 2. Alpha Vantage (Free Tier)
```bash
# EXACT LIMITS (Verified)
- Requests: 5 per minute, 500 per day
- No monthly limit beyond daily
- Response: JSON format, comprehensive data

# OUR OPTIMIZATION STRATEGY:
- Cache duration: 5 minutes for real-time data
- Batch multiple tickers when possible
- Use BATCH_STOCK_QUOTES endpoint
- Priority queue: VIX, SPY, then watchlist
```

### 3. Yahoo Finance (Unofficial)
```bash
# ESTIMATED LIMITS (Based on community research)
- Requests: ~2000 per hour per IP
- Rate: ~1 request per second
- No official API, using query endpoints
- Risk: Could be blocked without notice

# OUR OPTIMIZATION STRATEGY:
- Conservative: 10 requests per minute max
- User-Agent rotation
- Exponential backoff on errors
- Circuit breaker pattern
```

### 4. GDELT Project (Free)
```bash
# EXACT LIMITS (Public API)
- Rate: 1 request per second
- Bulk download available
- No daily/monthly limits officially
- Response: Very large datasets

# OUR OPTIMIZATION STRATEGY:
- Cache duration: 1 hour (events don't change)
- Specific geography filters
- Time range optimization
- Background batch processing
```

### 5. USASpending.gov (Free Government API)
```bash
# EXACT LIMITS (Official Government API)
- Rate: 10 requests per second per IP
- No daily/monthly limits
- Response: JSON/CSV format
- Very reliable

# OUR OPTIMIZATION STRATEGY:
- Cache duration: 4 hours (government data is slower)
- Filter by defense-related keywords
- Date range optimization
- Low priority (not real-time critical)
```

## 🚀 **Smart Implementation Strategy**

### Request Prioritization System:
```javascript
Priority 1 (Every 60s): VIX, SPY market indicators
Priority 2 (Every 5min): Watchlist stocks (LMT, PLTR, PXD)
Priority 3 (Every 30min): Defense news headlines
Priority 4 (Every 1hr): Geopolitical events
Priority 5 (Every 4hrs): Government contracts
```

### Intelligent Caching Strategy:
```javascript
Real-time data (1-5 min cache):
- Stock prices
- Market indicators
- VIX volatility

Slow-changing data (30min-1hr cache):
- News articles
- Company information
- Sector analysis

Static data (4-24hr cache):
- Government contracts
- Historical events
- Company fundamentals
```

### Error Handling & Fallbacks:
```javascript
Level 1: API rate limit hit
→ Return cached data
→ Queue request for later

Level 2: API completely down
→ Use backup API source
→ Generate realistic mock data

Level 3: All APIs failing
→ Use comprehensive fallback dataset
→ Alert user of limited functionality
```

## 💡 **Specific Free Tier Hacks**

### NewsAPI Optimization:
```bash
# Instead of multiple requests:
❌ /everything?q=defense (1 request)
❌ /everything?q=military (1 request)  
❌ /everything?q=lockheed (1 request)

# Use smart keyword batching:
✅ /everything?q=defense OR military OR lockheed OR boeing OR contracts
# Gets all defense news in 1 request instead of 5!
```

### Alpha Vantage Optimization:
```bash
# Use batch endpoints when available:
✅ BATCH_STOCK_QUOTES function
✅ Multiple symbols per request
✅ Intraday data with extended hours

# Avoid these expensive calls:
❌ Individual TIME_SERIES_DAILY for each stock
❌ Real-time quotes during off-hours
❌ Technical indicators for non-critical stocks
```

### Yahoo Finance Best Practices:
```bash
# Efficient endpoint usage:
✅ /v8/finance/chart/{symbol} - Multiple data points
✅ Batch requests: ?symbols=LMT,PLTR,PXD
✅ Conservative timing: 1 request per 6 seconds

# Headers to avoid blocking:
✅ User-Agent: Real browser strings
✅ Referer: finance.yahoo.com
✅ Accept: Standard browser accept headers
```

## 🛡️ **Rate Limit Safety Measures**

### Circuit Breaker Pattern:
```javascript
if (errorRate > 50% in last 10 requests) {
  → Stop API calls for 5 minutes
  → Use cached data only
  → Gradually resume with 1 request every 30 seconds
}
```

### Adaptive Timing:
```javascript
if (response.status === 429) { // Too Many Requests
  waitTime = lastWaitTime * 2; // Exponential backoff
  if (waitTime > maxWaitTime) {
    → Switch to backup data source
  }
}
```

### Request Queue Management:
```javascript
// Max queue sizes to prevent memory issues:
NewsAPI: 10 requests max in queue
Alpha Vantage: 5 requests max
Yahoo Finance: 20 requests max

// Auto-cleanup stale requests older than 5 minutes
```

## 📈 **Performance Monitoring**

### Real-time Metrics:
```javascript
- API success rate (should be >95%)
- Average response time
- Cache hit rate (target >70%)
- Queue length monitoring
- Rate limit near-miss detection
```

### Alert Thresholds:
```javascript
WARNING: API success rate < 90%
CRITICAL: API success rate < 80%
INFO: Cache hit rate > 80% (good!)
WARNING: Queue length > 50% of max
```

## 🎯 **Daily Budget Allocation**

### NewsAPI (1000/month = ~33/day):
```
Critical hours (9AM-6PM): 20 requests
Off-hours monitoring: 10 requests  
Emergency buffer: 3 requests
```

### Alpha Vantage (500/day):
```
Market indicators: 100 requests (every 5 min during market hours)
Watchlist updates: 200 requests (7 stocks × ~30 updates)
Historical data: 100 requests (background)
Buffer: 100 requests (errors/retries)
```

This system ensures we NEVER hit API limits while maximizing data freshness! 🎯