"""
Volatility Modeling API - EWMA and basic volatility calculations
"""
from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import parse_qs, urlparse
import math

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False

try:
    import yfinance as yf
    import pandas as pd
    YFINANCE_AVAILABLE = True
except ImportError:
    YFINANCE_AVAILABLE = False


def calculate_ewma_volatility(returns, lambda_param=0.94):
    """
    Calculate EWMA (Exponentially Weighted Moving Average) volatility

    sigma^2_t = lambda * sigma^2_{t-1} + (1 - lambda) * r^2_{t-1}
    """
    n = len(returns)

    if NUMPY_AVAILABLE:
        returns = np.array(returns)
        variance = np.zeros(n)
        variance[0] = returns[0] ** 2

        for t in range(1, n):
            variance[t] = lambda_param * variance[t-1] + (1 - lambda_param) * returns[t-1] ** 2

        volatility = np.sqrt(variance) * np.sqrt(252)  # Annualized
        return volatility.tolist()
    else:
        variance = [returns[0] ** 2]

        for t in range(1, n):
            v = lambda_param * variance[-1] + (1 - lambda_param) * returns[t-1] ** 2
            variance.append(v)

        volatility = [math.sqrt(v) * math.sqrt(252) for v in variance]
        return volatility


def calculate_rolling_volatility(returns, window=20):
    """Calculate rolling standard deviation volatility"""
    n = len(returns)
    volatility = []

    for i in range(n):
        if i < window:
            # Use available data
            subset = returns[:i+1] if i > 0 else [returns[0]]
        else:
            subset = returns[i-window+1:i+1]

        if NUMPY_AVAILABLE:
            vol = float(np.std(subset)) * np.sqrt(252)
        else:
            mean = sum(subset) / len(subset)
            var = sum((r - mean)**2 for r in subset) / len(subset)
            vol = math.sqrt(var) * math.sqrt(252)

        volatility.append(vol)

    return volatility


def forecast_ewma_volatility(last_variance, last_return, lambda_param, horizon):
    """Forecast future volatility using EWMA"""
    forecasts = []
    variance = last_variance

    for h in range(1, horizon + 1):
        # EWMA forecast (converges to long-term variance)
        variance = lambda_param * variance + (1 - lambda_param) * last_return ** 2
        forecasts.append(math.sqrt(variance) * math.sqrt(252))

    return forecasts


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        try:
            ticker = params.get("ticker", ["AAPL"])[0].upper()
            lambda_param = float(params.get("lambda", [0.94])[0])
            period = params.get("period", ["1y"])[0]
            forecast_horizon = int(params.get("forecast_horizon", [5])[0])

            if YFINANCE_AVAILABLE:
                stock = yf.Ticker(ticker)
                df = stock.history(period=period)

                if df.empty:
                    raise ValueError(f"No data found for {ticker}")

                returns = df["Close"].pct_change().dropna().values.tolist()
                dates = df.index[1:].strftime("%Y-%m-%d").tolist()
            else:
                # Generate sample data
                import random
                returns = [random.gauss(0, 0.02) for _ in range(252)]
                dates = [f"2024-{(i//22)+1:02d}-{(i%22)+1:02d}" for i in range(len(returns))]

            # Calculate volatilities
            ewma_vol = calculate_ewma_volatility(returns, lambda_param)
            rolling_vol = calculate_rolling_volatility(returns, window=20)

            # Calculate realized volatility (actual std of returns)
            if NUMPY_AVAILABLE:
                realized_vol = float(np.std(returns)) * np.sqrt(252)
                mean_return = float(np.mean(returns))
            else:
                mean_return = sum(returns) / len(returns)
                variance = sum((r - mean_return)**2 for r in returns) / len(returns)
                realized_vol = math.sqrt(variance) * math.sqrt(252)

            # Forecast
            last_variance = (ewma_vol[-1] / math.sqrt(252)) ** 2
            last_return = returns[-1]
            forecast = forecast_ewma_volatility(last_variance, last_return, lambda_param, forecast_horizon)

            result = {
                "ticker": ticker,
                "lambda": lambda_param,
                "period": period,
                "data_points": len(returns),
                "statistics": {
                    "realized_volatility": round(realized_vol * 100, 2),
                    "current_ewma_volatility": round(ewma_vol[-1] * 100, 2),
                    "current_rolling_volatility": round(rolling_vol[-1] * 100, 2),
                    "mean_daily_return": round(mean_return * 100, 4),
                },
                "time_series": {
                    "dates": dates[-100:],  # Last 100 data points
                    "ewma": [round(v * 100, 2) for v in ewma_vol[-100:]],
                    "rolling_20d": [round(v * 100, 2) for v in rolling_vol[-100:]],
                },
                "forecast": {
                    "horizon": forecast_horizon,
                    "ewma_forecast": [round(v * 100, 2) for v in forecast],
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
