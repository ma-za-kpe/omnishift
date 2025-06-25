# OmniShift Market Analysis Dashboard

A comprehensive financial market analysis tool built with Next.js, Firebase, and real-time market data APIs.

## Features

- **Real-time Market Data**: Track stocks, ETFs, and market indicators
- **Event Monitoring**: Monitor market-moving news and events
- **Portfolio Management**: Track trades and calculate returns
- **Market Analysis**: Analyze trends and correlations
- **Alert System**: Get notified of high-impact market events

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Firebase (Firestore, Realtime Database)
- **APIs**: Yahoo Finance, NewsAPI, Alpha Vantage
- **Charts**: Chart.js, Recharts
- **Deployment**: Vercel

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/omnishift.git
cd omnishift
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Firebase Setup

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Firestore Database
3. Enable Realtime Database
4. Create a web app and copy the configuration

### 4. API Keys

1. **NewsAPI**: Sign up at [newsapi.org](https://newsapi.org) ($30/month for production)
2. **Alpha Vantage**: Get a free key at [alphavantage.co](https://www.alphavantage.co/support/#api-key)

### 5. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your keys:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Firebase config and API keys.

### 6. Initialize Firebase Collections

The app will automatically create collections when you first add data:
- `events`: Market events and news
- `trades`: Your trading history
- `stocks`: Stock watchlist
- `backtests`: Historical performance data

### 7. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Project Structure

```
omnishift/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── dashboard/    # Dashboard pages
│   │   └── layout.tsx    # Root layout
│   ├── components/       # React components
│   ├── lib/             # Services and utilities
│   └── types/           # TypeScript definitions
├── public/              # Static assets
└── package.json
```

## Usage

1. **Dashboard**: View market overview, indicators, and recent events
2. **Events**: Monitor real-time market news and analysis
3. **Portfolio**: Log trades and track performance
4. **Analysis**: View charts and backtesting results
5. **Alerts**: Configure and view market alerts

## API Rate Limits

- **Yahoo Finance**: ~2000 requests/hour (unofficial)
- **NewsAPI**: Based on your plan
- **Alpha Vantage**: 5 requests/minute (free tier)

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy

```bash
vercel --prod
```

## Security Notes

- Never commit API keys or Firebase config to git
- Use Firebase Security Rules for production
- Implement rate limiting for API routes
- Consider using Firebase Functions for sensitive operations

## Development Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## License

MIT
# omnishift
