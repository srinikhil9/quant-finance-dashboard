# Quant Finance Dashboard - Claude Context

This file provides context for Claude AI to understand the project when starting a new conversation.

## Project Overview

**Live URL:** https://quant-finance-dashboard.vercel.app

A **Bloomberg Terminal alternative** for regular traders who can't afford Bloomberg ($24k/year). Professional-grade quantitative finance dashboard with 17 interactive modules, real-time data, and comprehensive analytics tracking.

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend:** Python serverless functions on Vercel (11 APIs)
- **Database:** Supabase (PostgreSQL) for analytics
- **Charts:** Plotly.js with dark theme
- **UI Components:** shadcn/ui, Lucide icons
- **Deployment:** Vercel (Hobby plan - 12 function limit)

## Project Structure

```
D:\quant-finance-dashboard\
├── api/                          # Python serverless functions (11 files)
│   ├── anomaly-detection.py      # Isolation Forest anomaly detection
│   ├── basket-optimizer.py       # Portfolio optimization
│   ├── market-analysis.py        # Combined: options-chain, technical, pairs, portfolio, backtest
│   ├── ml-predict.py             # ML stock prediction
│   ├── monte-carlo.py            # GBM simulation
│   ├── regime-detection.py       # HMM regime detection
│   ├── rl-hedging.py             # Reinforcement learning hedging
│   ├── spo-portfolio.py          # SPO portfolio optimization
│   ├── stock-clustering.py       # K-means clustering
│   ├── var-calculator.py         # Value at Risk
│   └── volatility.py             # EWMA volatility
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── admin/                # Admin dashboard (analytics viewer)
│   │   ├── anomaly-detection/
│   │   ├── backtest/             # Backtesting engine
│   │   ├── basket-trading/
│   │   ├── black-scholes/
│   │   ├── fixed-income/
│   │   ├── ml-prediction/
│   │   ├── monte-carlo/
│   │   ├── options-chain/
│   │   ├── pairs-trading/
│   │   ├── portfolio/            # Portfolio analytics
│   │   ├── regime-detection/
│   │   ├── rl-hedging/
│   │   ├── spo-portfolio/
│   │   ├── stock-clustering/
│   │   ├── technical/            # Technical analysis
│   │   ├── var/
│   │   ├── volatility/
│   │   ├── layout.tsx            # Root layout with navbar
│   │   └── page.tsx              # Home page with module cards
│   ├── components/
│   │   ├── charts/               # PlotlyChart wrapper
│   │   ├── command-palette/      # Ctrl+K command palette (cmdk)
│   │   ├── layout/               # Navbar with dropdown menus
│   │   └── ui/                   # shadcn/ui + custom components
│   │       ├── data-table.tsx    # Professional data grid
│   │       ├── metric-card.tsx   # Compact metric display
│   │       └── result-interpretation.tsx  # "What does this mean?" cards
│   └── lib/
│       ├── analytics/            # Supabase analytics tracking
│       │   ├── index.ts          # trackPageView, trackCalculation, trackEvent
│       │   ├── session.ts        # Session ID, page tracking, geo data
│       │   └── visitorInfo.ts    # IP/geolocation via client-side APIs
│       ├── calculations/         # Client-side TypeScript calculations
│       │   ├── blackScholes.ts   # Option pricing + Greeks
│       │   └── bondPricing.ts    # Duration, convexity, YTM
│       ├── supabase/
│       │   ├── client.ts         # Supabase client initialization
│       │   └── types.ts          # Database types
│       └── tooltips.ts           # Module descriptions
├── supabase-schema.sql           # Initial database schema
├── supabase-schema-v2.sql        # Enhanced schema with IP tracking, sessions table
├── .coderabbit.yaml              # CodeRabbit AI code review config
├── vercel.json                   # Vercel deployment config
└── requirements.txt              # Python dependencies
```

## 17 Interactive Modules

| # | Module | API | Description |
|---|--------|-----|-------------|
| 1 | Black-Scholes | Client-side | Option pricing + Greeks |
| 2 | Monte Carlo | monte-carlo.py | GBM portfolio simulation |
| 3 | Value at Risk | var-calculator.py | Historical/Parametric/MC VaR |
| 4 | Volatility | volatility.py | EWMA volatility modeling |
| 5 | ML Prediction | ml-predict.py | Random Forest stock prediction |
| 6 | Pairs Trading | market-analysis.py?action=pairs | Cointegration analysis |
| 7 | Bond Pricing | Client-side | Duration, convexity, YTM |
| 8 | Basket Optimization | basket-optimizer.py | Portfolio optimization |
| 9 | SPO Portfolio | spo-portfolio.py | Second-order cone optimization |
| 10 | RL Hedging | rl-hedging.py | Reinforcement learning hedging |
| 11 | HMM Regimes | regime-detection.py | Market regime detection |
| 12 | Stock Clustering | stock-clustering.py | K-means portfolio clustering |
| 13 | Anomaly Detection | anomaly-detection.py | Isolation Forest |
| 14 | Options Chain | market-analysis.py?action=options-chain | Full options chain + Greeks |
| 15 | Technical Analysis | market-analysis.py?action=technical | RSI, MACD, Bollinger Bands |
| 16 | Portfolio Analytics | market-analysis.py?action=portfolio | Multi-position P&L tracking |
| 17 | Backtesting | market-analysis.py?action=backtest | Strategy backtesting engine |

## Critical Constraints

### Vercel Hobby Plan Limits
- **12 serverless functions max** - Currently at 11 Python APIs
- **60s execution timeout** per function
- **~512MB memory** per function
- **No sklearn, torch, tensorflow** - only numpy, pandas, scipy, yfinance

### API Consolidation Strategy
To stay under the 12 function limit, related APIs are consolidated using `?action=` parameter:
- `market-analysis.py` handles: options-chain, technical, pairs, portfolio, backtest

## Analytics System

### What's Tracked
- **Page views** with session ID, user agent, referrer
- **Calculations** with inputs, results, execution time
- **IP addresses** and geolocation (country, city, ISP)
- **Session data** (pages visited, modules used, duration)
- **Tickers analyzed** per session

### Supabase Tables
1. `calculations` - Every calculation performed
2. `analytics_events` - Page views, clicks, errors
3. `sessions` - Comprehensive session tracking with geo data
4. `watchlists` - User watchlists (future use)

### Admin Dashboard
Located at `/admin` - shows:
- Total calculations, unique sessions, countries
- Geography tab with world map, top countries/cities
- Sessions tab with IP, location, device, activity
- Module usage charts, popular tickers

## UI Features

### Bloomberg Terminal Style
- Dense information display, minimal whitespace
- Color-coded values (green=profit, red=loss)
- Monospace fonts for numbers
- Data tables with sorting

### Keyboard Shortcuts
- `Ctrl+K` - Command palette (quick navigation)
- Navigate to any module quickly

### Result Interpretation
Every module has "What does this mean?" cards explaining results in plain English.

## Development Commands

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Build for production
npm run build

# Deploy to Vercel
vercel --prod

# Type check
npm run lint
```

## Environment Variables (Vercel)

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Recent Changes (Latest First)

### Enhanced Analytics & IP Tracking
- Added IP address tracking via client-side geolocation APIs
- Created `sessions` table for comprehensive session tracking
- Added Geography tab to admin dashboard with world map
- Added Sessions tab showing IP, location, device, duration
- Files: `visitorInfo.ts`, `session.ts`, `supabase-schema-v2.sql`, `admin/page.tsx`

### New Modules (Sprint 4-6)
- Portfolio Analytics module (`/portfolio`)
- Backtesting Engine module (`/backtest`)
- Admin Dashboard (`/admin`)
- Files: `market-analysis.py`, portfolio/page.tsx, backtest/page.tsx, admin/page.tsx

### Professional UI Overhaul
- Bloomberg Terminal-style dense layout
- Command palette (Ctrl+K) for quick navigation
- Dropdown navbar menus for better organization
- Data tables for results display
- Result interpretation cards for all modules

### API Consolidation
- Merged 5 APIs into `market-analysis.py` to stay under 12 function limit
- Options Chain, Technical Analysis, Pairs Trading, Portfolio, Backtest

## Known Issues / TODOs

1. **Supabase Connection** - User needs to add env vars to Vercel
2. **Run enhanced schema** - `supabase-schema-v2.sql` needs to be run
3. **CodeRabbit** - Config added, user needs to install GitHub App

## Useful Links

- **Live Site:** https://quant-finance-dashboard.vercel.app
- **GitHub:** (user's repository)
- **Supabase Dashboard:** https://supabase.com/dashboard
- **Vercel Dashboard:** https://vercel.com/dashboard

## Code Quality

- **CodeRabbit** configured (`.coderabbit.yaml`) for AI code reviews
- **ESLint** enabled for TypeScript
- **Ruff** enabled for Python linting

## File Naming Conventions

- Pages: `src/app/[module-name]/page.tsx`
- Python APIs: `api/[module-name].py`
- Components: `src/components/[category]/[ComponentName].tsx`
- Libraries: `src/lib/[category]/index.ts`
