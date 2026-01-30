"""
Pairs Trading / Cointegration API
Uses scipy instead of statsmodels for lighter deployment
"""
from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import parse_qs, urlparse

try:
    import numpy as np
    import pandas as pd
    from scipy import stats
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False

try:
    import yfinance as yf
    YFINANCE_AVAILABLE = True
except ImportError:
    YFINANCE_AVAILABLE = False


def simple_ols(x, y):
    """Simple OLS regression without sklearn"""
    x_mean, y_mean = np.mean(x), np.mean(y)
    numerator = np.sum((x - x_mean) * (y - y_mean))
    denominator = np.sum((x - x_mean) ** 2)
    slope = numerator / denominator if denominator != 0 else 0
    intercept = y_mean - slope * x_mean
    return slope, intercept


def adf_test_simple(series, max_lags=None):
    """
    Simplified ADF test using OLS regression
    Returns: (adf_stat, pvalue_approx, is_stationary)
    """
    n = len(series)
    if max_lags is None:
        max_lags = int(np.floor(12 * (n / 100) ** 0.25))
    max_lags = min(max_lags, n // 2 - 2)

    # First difference
    diff = np.diff(series)

    # Lagged level
    lagged = series[:-1]

    # Trim to align
    y = diff[max_lags:]
    x = lagged[max_lags:]

    # Simple regression: diff ~ lagged_level
    slope, _ = simple_ols(x, y)

    # Calculate t-statistic
    residuals = y - (slope * x)
    se = np.std(residuals) / np.sqrt(np.sum((x - np.mean(x))**2))
    t_stat = slope / se if se > 0 else 0

    # Approximate p-value using critical values
    # ADF critical values at 5%: ~-2.86 for n>250
    is_stationary = t_stat < -2.86

    # Very rough p-value approximation
    if t_stat < -3.5:
        pvalue = 0.01
    elif t_stat < -2.86:
        pvalue = 0.05
    elif t_stat < -2.57:
        pvalue = 0.10
    else:
        pvalue = 0.5

    return float(t_stat), pvalue, is_stationary


def test_cointegration(prices1, prices2):
    """
    Test for cointegration using Engle-Granger method
    1. Regress prices1 on prices2
    2. Test residuals for stationarity (ADF test)
    """
    if not SCIPY_AVAILABLE:
        return None, None, False

    # Step 1: OLS regression
    slope, intercept = simple_ols(prices2, prices1)

    # Step 2: Get residuals (spread)
    residuals = prices1 - (slope * prices2 + intercept)

    # Step 3: ADF test on residuals
    adf_stat, pvalue, is_stationary = adf_test_simple(residuals)

    return adf_stat, pvalue, is_stationary


def calculate_hedge_ratio(prices1, prices2):
    """Calculate optimal hedge ratio using OLS"""
    slope, _ = simple_ols(prices2, prices1)
    return float(slope)


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
    position = 0

    for i in range(1, len(zscore)):
        if np.isnan(zscore[i]):
            signals[i] = position
            continue

        if position == 0:
            if zscore[i] < -entry_threshold:
                position = 1
            elif zscore[i] > entry_threshold:
                position = -1
        elif position == 1:
            if zscore[i] > -exit_threshold:
                position = 0
        elif position == -1:
            if zscore[i] < exit_threshold:
                position = 0

        signals[i] = position

    return signals


def calculate_strategy_returns(prices1, prices2, signals, hedge_ratio):
    """Calculate strategy returns"""
    returns1 = np.diff(prices1) / prices1[:-1]
    returns2 = np.diff(prices2) / prices2[:-1]
    spread_returns = returns1 - hedge_ratio * returns2
    strategy_returns = signals[:-1] * spread_returns
    return strategy_returns


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        try:
            if not SCIPY_AVAILABLE or not YFINANCE_AVAILABLE:
                raise ImportError("Required packages not available")

            ticker1 = params.get("ticker1", ["AAPL"])[0].upper()
            ticker2 = params.get("ticker2", ["MSFT"])[0].upper()
            period = params.get("period", ["1y"])[0]
            entry_threshold = float(params.get("entry", [2.0])[0])
            exit_threshold = float(params.get("exit", [0.5])[0])

            stock1 = yf.Ticker(ticker1)
            stock2 = yf.Ticker(ticker2)

            df1 = stock1.history(period=period)
            df2 = stock2.history(period=period)

            if df1.empty or df2.empty:
                raise ValueError("No data found for one or both tickers")

            common_dates = df1.index.intersection(df2.index)
            prices1 = df1.loc[common_dates, 'Close'].values
            prices2 = df2.loc[common_dates, 'Close'].values
            dates = common_dates.strftime("%Y-%m-%d").tolist()

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
