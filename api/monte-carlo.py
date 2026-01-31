"""
Monte Carlo Portfolio Simulation API
Simulates future portfolio paths using Geometric Brownian Motion (GBM)
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
    YFINANCE_AVAILABLE = True
except ImportError:
    YFINANCE_AVAILABLE = False


def gbm_simulation(S0, mu, sigma, T, dt, n_paths):
    """Simulate GBM paths using numpy for efficiency"""
    n_steps = int(T / dt)

    if NUMPY_AVAILABLE:
        # Vectorized simulation
        Z = np.random.standard_normal((n_steps, n_paths))
        drift = (mu - 0.5 * sigma**2) * dt
        diffusion = sigma * np.sqrt(dt) * Z
        log_returns = drift + diffusion
        log_paths = np.vstack([np.zeros(n_paths), np.cumsum(log_returns, axis=0)])
        paths = S0 * np.exp(log_paths)
        return paths.T.tolist()  # Transpose to (n_paths, n_steps)
    else:
        # Fallback without numpy
        import random
        paths = []
        for _ in range(n_paths):
            path = [S0]
            for _ in range(n_steps):
                Z = random.gauss(0, 1)
                drift = (mu - 0.5 * sigma**2) * dt
                diffusion = sigma * math.sqrt(dt) * Z
                path.append(path[-1] * math.exp(drift + diffusion))
            paths.append(path)
        return paths


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        try:
            ticker = params.get("ticker", ["AAPL"])[0].upper()
            initial_investment = float(params.get("investment", [10000])[0])
            n_simulations = min(int(params.get("simulations", [1000])[0]), 2000)
            time_horizon = float(params.get("horizon", [1])[0])  # Years
            period = params.get("period", ["1y"])[0]

            # Fetch historical data
            if YFINANCE_AVAILABLE:
                stock = yf.Ticker(ticker)
                hist = stock.history(period=period)
                if hist.empty:
                    raise ValueError(f"No data found for {ticker}")
                returns = hist["Close"].pct_change().dropna()
                current_price = float(hist["Close"].iloc[-1])

                if NUMPY_AVAILABLE:
                    mu = float(np.mean(returns)) * 252
                    sigma = float(np.std(returns)) * np.sqrt(252)
                else:
                    returns_list = returns.tolist()
                    mu = sum(returns_list) / len(returns_list) * 252
                    var = sum((r - mu/252)**2 for r in returns_list) / len(returns_list)
                    sigma = math.sqrt(var) * math.sqrt(252)
            else:
                mu, sigma, current_price = 0.08, 0.20, 100.0

            # Run simulation
            dt = 1/252
            paths = gbm_simulation(initial_investment, mu, sigma, time_horizon, dt, n_simulations)

            # Calculate statistics
            if NUMPY_AVAILABLE:
                final_values = np.array([p[-1] for p in paths])
                mean_value = float(np.mean(final_values))
                median_value = float(np.median(final_values))
                std_value = float(np.std(final_values))
                percentile_5 = float(np.percentile(final_values, 5))
                percentile_25 = float(np.percentile(final_values, 25))
                percentile_75 = float(np.percentile(final_values, 75))
                percentile_95 = float(np.percentile(final_values, 95))
                prob_profit = float(np.mean(final_values > initial_investment))
            else:
                final_values = sorted([p[-1] for p in paths])
                n = len(final_values)
                mean_value = sum(final_values) / n
                median_value = final_values[n // 2]
                var = sum((v - mean_value)**2 for v in final_values) / n
                std_value = math.sqrt(var)
                percentile_5 = final_values[int(n * 0.05)]
                percentile_25 = final_values[int(n * 0.25)]
                percentile_75 = final_values[int(n * 0.75)]
                percentile_95 = final_values[int(n * 0.95)]
                prob_profit = sum(1 for v in final_values if v > initial_investment) / n

            # Sample paths for visualization (max 50)
            sample_indices = list(range(0, n_simulations, max(1, n_simulations // 50)))[:50]
            sample_paths = [[round(v, 2) for v in paths[i]] for i in sample_indices]

            result = {
                "ticker": ticker,
                "initial_investment": initial_investment,
                "n_simulations": n_simulations,
                "time_horizon_years": time_horizon,
                "current_price": round(current_price, 2),
                "parameters": {
                    "annualized_return": round(mu * 100, 2),
                    "annualized_volatility": round(sigma * 100, 2),
                },
                "statistics": {
                    "expected_value": round(mean_value, 2),
                    "median_value": round(median_value, 2),
                    "std_deviation": round(std_value, 2),
                    "percentile_5": round(percentile_5, 2),
                    "percentile_25": round(percentile_25, 2),
                    "percentile_75": round(percentile_75, 2),
                    "percentile_95": round(percentile_95, 2),
                    "probability_of_profit": round(prob_profit * 100, 2),
                    "probability_of_loss": round((1 - prob_profit) * 100, 2),
                },
                "sample_paths": sample_paths,
                "final_values_histogram": [round(v, 2) for v in sorted(final_values)[::max(1, n_simulations // 100)]],
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
