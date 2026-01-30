"""
Value at Risk (VaR) Calculator API
"""
from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import parse_qs, urlparse
import math
import random

try:
    import numpy as np
    from scipy import stats
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False

try:
    import yfinance as yf
    import pandas as pd
    YFINANCE_AVAILABLE = True
except ImportError:
    YFINANCE_AVAILABLE = False


def historical_var(returns, confidence_level):
    """Calculate Historical VaR"""
    if SCIPY_AVAILABLE:
        return float(np.percentile(returns, (1 - confidence_level) * 100))
    else:
        sorted_returns = sorted(returns)
        idx = int(len(sorted_returns) * (1 - confidence_level))
        return sorted_returns[idx]


def parametric_var(returns, confidence_level):
    """Calculate Parametric (Gaussian) VaR"""
    if SCIPY_AVAILABLE:
        mean_return = np.mean(returns)
        std_return = np.std(returns)
        z_score = stats.norm.ppf(1 - confidence_level)
        return float(mean_return + z_score * std_return)
    else:
        mean_return = sum(returns) / len(returns)
        variance = sum((r - mean_return)**2 for r in returns) / len(returns)
        std_return = math.sqrt(variance)
        # Approximate z-score for common confidence levels
        z_scores = {0.95: -1.645, 0.99: -2.326}
        z_score = z_scores.get(confidence_level, -1.645)
        return mean_return + z_score * std_return


def monte_carlo_var(mean_return, std_return, confidence_level, n_simulations=10000):
    """Calculate Monte Carlo VaR"""
    if SCIPY_AVAILABLE:
        simulated_returns = np.random.normal(mean_return, std_return, n_simulations)
        return float(np.percentile(simulated_returns, (1 - confidence_level) * 100))
    else:
        simulated_returns = [random.gauss(mean_return, std_return) for _ in range(n_simulations)]
        sorted_sim = sorted(simulated_returns)
        idx = int(n_simulations * (1 - confidence_level))
        return sorted_sim[idx]


def conditional_var(returns, confidence_level):
    """Calculate Conditional VaR (Expected Shortfall)"""
    var = historical_var(returns, confidence_level)
    if SCIPY_AVAILABLE:
        returns_arr = np.array(returns)
        tail_losses = returns_arr[returns_arr <= var]
        return float(np.mean(tail_losses)) if len(tail_losses) > 0 else var
    else:
        tail_losses = [r for r in returns if r <= var]
        return sum(tail_losses) / len(tail_losses) if tail_losses else var


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        try:
            ticker = params.get("ticker", ["AAPL"])[0].upper()
            confidence_level = float(params.get("confidence", [0.95])[0])
            portfolio_value = float(params.get("portfolio_value", [1000000])[0])
            period = params.get("period", ["1y"])[0]

            if YFINANCE_AVAILABLE:
                stock = yf.Ticker(ticker)
                df = stock.history(period=period)

                if df.empty:
                    raise ValueError(f"No data found for {ticker}")

                returns = df["Close"].pct_change().dropna().values
            else:
                # Generate sample returns if yfinance not available
                returns = [random.gauss(0.0005, 0.02) for _ in range(252)]

            if SCIPY_AVAILABLE:
                returns = np.array(returns)
                mean_return = float(np.mean(returns))
                std_return = float(np.std(returns))
            else:
                mean_return = sum(returns) / len(returns)
                variance = sum((r - mean_return)**2 for r in returns) / len(returns)
                std_return = math.sqrt(variance)

            # Calculate VaR using different methods
            hist_var = historical_var(returns, confidence_level)
            param_var = parametric_var(returns, confidence_level)
            mc_var = monte_carlo_var(mean_return, std_return, confidence_level)
            cvar = conditional_var(list(returns) if SCIPY_AVAILABLE else returns, confidence_level)

            result = {
                "ticker": ticker,
                "confidence_level": confidence_level,
                "portfolio_value": portfolio_value,
                "period": period,
                "data_points": len(returns),
                "statistics": {
                    "mean_daily_return": round(mean_return, 6),
                    "std_daily_return": round(std_return, 6),
                    "annualized_return": round(mean_return * 252 * 100, 2),
                    "annualized_volatility": round(std_return * math.sqrt(252) * 100, 2),
                },
                "var_percentages": {
                    "historical": round(hist_var * 100, 4),
                    "parametric": round(param_var * 100, 4),
                    "monte_carlo": round(mc_var * 100, 4),
                    "cvar": round(cvar * 100, 4),
                },
                "var_dollar": {
                    "historical": round(abs(hist_var) * portfolio_value, 2),
                    "parametric": round(abs(param_var) * portfolio_value, 2),
                    "monte_carlo": round(abs(mc_var) * portfolio_value, 2),
                    "cvar": round(abs(cvar) * portfolio_value, 2),
                },
                "returns_histogram": [round(r * 100, 4) for r in list(returns)[:252]],
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
