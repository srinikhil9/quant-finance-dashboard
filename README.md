# Quantitative Finance Dashboard

An interactive dashboard for quantitative finance analysis, featuring options pricing, Monte Carlo simulation, risk management, volatility modeling, machine learning predictions, pairs trading, and bond pricing.

![Dashboard Preview](https://img.shields.io/badge/status-live-brightgreen) ![Next.js](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Python](https://img.shields.io/badge/Python-3.x-yellow)

## Features

### 1. Black-Scholes Options Calculator
- Real-time option pricing for calls and puts
- Greeks calculation (Delta, Gamma, Vega, Theta, Rho)
- Implied volatility solver using Newton-Raphson
- Interactive price and Greeks visualization

### 2. Monte Carlo Portfolio Simulation
- Geometric Brownian Motion (GBM) path simulation
- Up to 2,000 simulations with statistical analysis
- Distribution percentiles and probability of profit
- Path visualization and histogram

### 3. Value at Risk (VaR)
- Three VaR methodologies: Historical, Parametric, Monte Carlo
- Conditional VaR (Expected Shortfall)
- Returns distribution analysis
- Live market data integration

### 4. Volatility Modeling
- EWMA (Exponentially Weighted Moving Average)
- Rolling volatility calculation
- Volatility forecasting
- RiskMetrics-style parameters

### 5. ML Stock Prediction
- On-demand model training
- 30+ technical indicators as features
- Multiple models: Linear, Ridge, Lasso, Random Forest
- Feature importance analysis

### 6. Pairs Trading Analysis
- Engle-Granger cointegration testing
- Optimal hedge ratio calculation
- Z-score signal generation
- Backtest performance metrics

### 7. Bond Pricing Calculator
- Price calculation from yield
- YTM solver
- Duration and Convexity analysis
- DV01 calculation
- Yield curve visualization

## Tech Stack

- **Frontend**: Next.js 16, React, TypeScript, Tailwind CSS
- **Charts**: Plotly.js
- **Backend**: Vercel Python Serverless Functions
- **Data**: Yahoo Finance (yfinance)
- **ML**: scikit-learn, statsmodels

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/srinikhil9/quant-finance-dashboard.git
cd quant-finance-dashboard

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

### Build for Production

```bash
npm run build
npm start
```

## Deployment on Vercel

This project is configured for easy deployment on Vercel:

1. Push to GitHub
2. Import project in [Vercel Dashboard](https://vercel.com/new)
3. Deploy automatically

The `vercel.json` configuration handles Python serverless functions with appropriate timeouts and memory limits.

## Project Structure

```
quant-finance-dashboard/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── black-scholes/      # Options pricing
│   │   ├── monte-carlo/        # Portfolio simulation
│   │   ├── var/                # Value at Risk
│   │   ├── volatility/         # Volatility modeling
│   │   ├── ml-prediction/      # ML predictions
│   │   ├── pairs-trading/      # Statistical arbitrage
│   │   └── fixed-income/       # Bond pricing
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   ├── charts/             # Plotly chart components
│   │   └── layout/             # Navbar, Footer
│   └── lib/
│       ├── calculations/       # Client-side TypeScript math
│       └── utils/              # Formatters, utilities
├── api/                        # Vercel Python serverless functions
│   ├── stock-data.py
│   ├── monte-carlo.py
│   ├── var-calculator.py
│   ├── volatility.py
│   ├── ml-predict.py
│   └── cointegration.py
├── vercel.json                 # Vercel configuration
└── requirements.txt            # Python dependencies
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/stock-data` | Fetch OHLCV data from Yahoo Finance |
| `/api/monte-carlo` | Run GBM simulation |
| `/api/var-calculator` | Calculate VaR using multiple methods |
| `/api/volatility` | EWMA volatility modeling |
| `/api/ml-predict` | Train and predict with ML models |
| `/api/cointegration` | Pairs trading cointegration test |

## License

**Proprietary Source-Available License** - This project is the intellectual property of Srinikhil Vemuri. You may view and study the code for personal educational purposes, but commercial use, redistribution, and derivative works are prohibited. See the [LICENSE](LICENSE) file for full terms.

## Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [Plotly.js](https://plotly.com/javascript/)
- [yfinance](https://github.com/ranaroussi/yfinance)
- [scikit-learn](https://scikit-learn.org/)
