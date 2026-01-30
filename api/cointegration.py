"""
Pairs Trading / Cointegration API
"""
from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import parse_qs, urlparse
import math

try:
    import numpy as np
    import pandas as pd
    from statsmodels.tsa.stattools import coint, adfuller
    from sklearn.linear_model import LinearRegression
    STATS_AVAILABLE = True
except ImportError:
    STATS_AVAILABLE = False

try:
    import yfinance as yf
    YFINANCE_AVAILABLE = True
except ImportError:
    YFINANCE_AVAILABLE = False


def test_cointegration(prices1, prices2):
    """Test for cointegration between two price series"""
    if not STATS_AVAILABLE:
        return None, None, False

    # Engle-Granger test
    score, pvalue, _ = coint(prices1, prices2)

    return float(score), float(pvalue), pvalue < 0.05


def calculate_hedge_ratio(prices1, prices2):
    """Calculate optimal hedge ratio using OLS"""
    if STATS_AVAILABLE:
        model = LinearRegression()
        model.fit(prices2.reshape(-1, 1), prices1)
        return float(model.coef_[0])
    else:
        # Simple regression
        mean1, mean2 = np.mean(prices1), np.mean(prices2)
        cov = np.sum((prices1 - mean1) * (prices2 - mean2))
        var2 = np.sum((prices2 - mean2) ** 2)
        return cov / var2 if var2 != 0 else 1.0


def calculate_spread(prices1, prices2, hedge_ratio):
    """Calculate the spread between two assets"""
    return prices1 - hedge_ratio * prices2


def calculate_zscore(spread, window=20):
    """Calculate rolling z-score of the spread"""
    mean = pd.Series(spread).rolling(window).mean()
    std = pd.Series(spread).rolling(window).std()
    zscore = (spread - mean) / std
    return zscore.values


def generate_signals(zscore, entry_threshold=2.0, exit_threshold=0.5):
    """Generate trading signals based on z-score"""
    signals = np.zeros(len(zscore))

    position = 0  # 0 = flat, 1 = long spread, -1 = short spread

    for i in range(1, len(zscore)):
        if np.isnan(zscore[i]):
            signals[i] = position
            continue

        if position == 0:
            if zscore[i] < -entry_threshold:
                position = 1  # Long spread (buy stock1, sell stock2)
            elif zscore[i] > entry_threshold:
                position = -1  # Short spread (sell stock1, buy stock2)
        elif position == 1:
            if zscore[i] > -exit_threshold:
                position = 0  # Exit long
        elif position == -1:
            if zscore[i] < exit_threshold:
                position = 0  # Exit short

        signals[i] = position

    return signals


def calculate_strategy_returns(prices1, prices2, signals, hedge_ratio):
    """Calculate strategy returns"""
    returns1 = np.diff(prices1) / prices1[:-1]
    returns2 = np.diff(prices2) / prices2[:-1]

    # Spread returns
    spread_returns = returns1 - hedge_ratio * returns2

    # Strategy returns (signal applied to spread returns)
    strategy_returns = signals[:-1] * spread_returns

    return strategy_returns


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        try:
            if not STATS_AVAILABLE:
                raise ImportError("statsmodels not available")

            ticker1 = params.get("ticker1", ["AAPL"])[0].upper()
            ticker2 = params.get("ticker2", ["MSFT"])[0].upper()
            period = params.get("period", ["1y"])[0]
            entry_threshold = float(params.get("entry", [2.0])[0])
            exit_threshold = float(params.get("exit", [0.5])[0])

            if YFINANCE_AVAILABLE:
                stock1 = yf.Ticker(ticker1)
                stock2 = yf.Ticker(ticker2)

                df1 = stock1.history(period=period)
                df2 = stock2.history(period=period)

                if df1.empty or df2.empty:
                    raise ValueError("No data found for one or both tickers")

                # Align dates
                common_dates = df1.index.intersection(df2.index)
                prices1 = df1.loc[common_dates, 'Close'].values
                prices2 = df2.loc[common_dates, 'Close'].values
                dates = common_dates.strftime("%Y-%m-%d").tolist()
            else:
                raise ImportError("yfinance not available")

            # Cointegration test
            coint_score, coint_pvalue, is_cointegrated = test_cointegration(prices1, prices2)

            # Calculate hedge ratio and spread
            hedge_ratio = calculate_hedge_ratio(prices1, prices2)
            spread = calculate_spread(prices1, prices2, hedge_ratio)
            zscore = calculate_zscore(spread)

            # Generate signals
            signals = generate_signals(zscore, entry_threshold, exit_threshold)

            # Calculate strategy returns
            strategy_returns = calculate_strategy_returns(prices1, prices2, signals, hedge_ratio)

            # Performance metrics
            total_return = float(np.sum(strategy_returns))
            sharpe_ratio = float(np.mean(strategy_returns) / np.std(strategy_returns) * np.sqrt(252)) if np.std(strategy_returns) > 0 else 0

            cumulative_returns = np.cumprod(1 + strategy_returns) - 1
            running_max = np.maximum.accumulate(cumulative_returns + 1)
            drawdown = (cumulative_returns + 1) / running_max - 1
            max_drawdown = float(np.min(drawdown))

            # Trade statistics
            n_trades = int(np.sum(np.abs(np.diff(signals)) > 0))
            winning_trades = int(np.sum(strategy_returns > 0))
            win_rate = winning_trades / len(strategy_returns) if len(strategy_returns) > 0 else 0

            result = {
                "ticker1": ticker1,
                "ticker2": ticker2,
                "period": period,
                "data_points": len(prices1),
                "cointegration": {
                    "score": round(coint_score, 4) if coint_score else None,
                    "pvalue": round(coint_pvalue, 4) if coint_pvalue else None,
                    "is_cointegrated": is_cointegrated,
                },
                "hedge_ratio": round(hedge_ratio, 4),
                "thresholds": {
                    "entry": entry_threshold,
                    "exit": exit_threshold,
                },
                "performance": {
                    "total_return": round(total_return * 100, 2),
                    "sharpe_ratio": round(sharpe_ratio, 2),
                    "max_drawdown": round(max_drawdown * 100, 2),
                    "n_trades": n_trades,
                    "win_rate": round(win_rate * 100, 2),
                },
                "time_series": {
                    "dates": dates[-100:],
                    "prices1": [round(p, 2) for p in prices1[-100:].tolist()],
                    "prices2": [round(p, 2) for p in prices2[-100:].tolist()],
                    "spread": [round(s, 2) for s in spread[-100:].tolist()],
                    "zscore": [round(z, 4) if not np.isnan(z) else None for z in zscore[-100:].tolist()],
                    "signals": signals[-100:].tolist(),
                },
            }

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
