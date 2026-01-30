"""
Monte Carlo Simulation API - GBM-based portfolio path simulation
"""
from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import parse_qs, urlparse
import math
import random

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False


def simulate_gbm(S0, mu, sigma, T, dt, n_simulations):
    """
    Simulate Geometric Brownian Motion paths

    S(t+dt) = S(t) * exp((mu - 0.5*sigma^2)*dt + sigma*sqrt(dt)*Z)
    """
    n_steps = int(T / dt)

    if NUMPY_AVAILABLE:
        # Use numpy for faster computation
        paths = np.zeros((n_simulations, n_steps + 1))
        paths[:, 0] = S0

        for t in range(1, n_steps + 1):
            Z = np.random.standard_normal(n_simulations)
            paths[:, t] = paths[:, t-1] * np.exp(
                (mu - 0.5 * sigma**2) * dt + sigma * np.sqrt(dt) * Z
            )

        return paths
    else:
        # Pure Python fallback
        paths = [[S0] for _ in range(n_simulations)]

        for sim in range(n_simulations):
            for t in range(n_steps):
                Z = random.gauss(0, 1)
                S_prev = paths[sim][-1]
                S_next = S_prev * math.exp(
                    (mu - 0.5 * sigma**2) * dt + sigma * math.sqrt(dt) * Z
                )
                paths[sim].append(S_next)

        return paths


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Parse query parameters
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        try:
            # Parameters
            S0 = float(params.get("S0", [100])[0])
            mu = float(params.get("mu", [0.10])[0])  # Expected return (10%)
            sigma = float(params.get("sigma", [0.2])[0])  # Volatility (20%)
            T = float(params.get("T", [1])[0])  # Time horizon in years
            n_simulations = min(int(params.get("n_simulations", [1000])[0]), 2000)

            dt = 1/252  # Daily steps
            n_steps = int(T / dt)

            # Run simulation
            paths = simulate_gbm(S0, mu, sigma, T, dt, n_simulations)

            if NUMPY_AVAILABLE:
                final_prices = paths[:, -1]

                # Calculate statistics
                mean_price = float(np.mean(final_prices))
                std_price = float(np.std(final_prices))
                percentile_5 = float(np.percentile(final_prices, 5))
                percentile_25 = float(np.percentile(final_prices, 25))
                percentile_50 = float(np.percentile(final_prices, 50))
                percentile_75 = float(np.percentile(final_prices, 75))
                percentile_95 = float(np.percentile(final_prices, 95))
                prob_profit = float(np.mean(final_prices > S0))
                max_price = float(np.max(final_prices))
                min_price = float(np.min(final_prices))

                # Get sample paths for visualization (first 100)
                sample_paths = paths[:min(100, n_simulations), :].tolist()
                final_prices_list = final_prices.tolist()
            else:
                final_prices = [p[-1] for p in paths]
                final_prices_sorted = sorted(final_prices)

                mean_price = sum(final_prices) / len(final_prices)
                variance = sum((x - mean_price)**2 for x in final_prices) / len(final_prices)
                std_price = math.sqrt(variance)

                def percentile(data, p):
                    idx = int(len(data) * p / 100)
                    return data[max(0, min(idx, len(data)-1))]

                percentile_5 = percentile(final_prices_sorted, 5)
                percentile_25 = percentile(final_prices_sorted, 25)
                percentile_50 = percentile(final_prices_sorted, 50)
                percentile_75 = percentile(final_prices_sorted, 75)
                percentile_95 = percentile(final_prices_sorted, 95)
                prob_profit = sum(1 for p in final_prices if p > S0) / len(final_prices)
                max_price = max(final_prices)
                min_price = min(final_prices)

                sample_paths = paths[:min(100, n_simulations)]
                final_prices_list = final_prices

            result = {
                "parameters": {
                    "S0": S0,
                    "mu": mu,
                    "sigma": sigma,
                    "T": T,
                    "n_simulations": n_simulations,
                    "n_steps": n_steps,
                },
                "statistics": {
                    "mean": round(mean_price, 2),
                    "std": round(std_price, 2),
                    "min": round(min_price, 2),
                    "max": round(max_price, 2),
                    "percentile_5": round(percentile_5, 2),
                    "percentile_25": round(percentile_25, 2),
                    "percentile_50": round(percentile_50, 2),
                    "percentile_75": round(percentile_75, 2),
                    "percentile_95": round(percentile_95, 2),
                    "prob_profit": round(prob_profit, 4),
                },
                "sample_paths": [[round(p, 2) for p in path[::5]] for path in sample_paths[:50]],  # Sample every 5th point
                "final_prices": [round(p, 2) for p in final_prices_list[:500]],  # First 500 for histogram
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
