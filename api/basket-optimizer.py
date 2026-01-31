"""
Bayesian Optimization Basket Trading API
Optimizes cointegration weights to maximize Sharpe ratio using differential evolution (pseudo-BO)
"""

from http.server import BaseHTTPRequestHandler
import json
import numpy as np
from urllib.parse import urlparse, parse_qs
from datetime import datetime, timedelta

# Try to import optional dependencies
try:
    import yfinance as yf
    YFINANCE_AVAILABLE = True
except ImportError:
    YFINANCE_AVAILABLE = False

try:
    from scipy.optimize import differential_evolution, minimize
    from scipy import stats
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False


def fetch_prices(tickers: list, period: str = "1y") -> dict:
    """Fetch historical prices for multiple tickers"""
    if not YFINANCE_AVAILABLE:
        raise ImportError("yfinance not available")

    data = {}
    for ticker in tickers:
        try:
            stock = yf.Ticker(ticker)
            hist = stock.history(period=period)
            if len(hist) > 50:
                data[ticker] = hist['Close'].values
        except Exception:
            continue

    return data


def align_prices(prices_dict: dict) -> tuple:
    """Align price series to same length"""
    min_len = min(len(v) for v in prices_dict.values())
    aligned = {k: v[-min_len:] for k, v in prices_dict.items()}
    tickers = list(aligned.keys())
    prices_matrix = np.column_stack([aligned[t] for t in tickers])
    return tickers, prices_matrix


def calculate_returns(prices: np.ndarray) -> np.ndarray:
    """Calculate log returns from prices"""
    return np.diff(np.log(prices), axis=0)


def johansen_weights(prices_matrix: np.ndarray) -> np.ndarray:
    """
    Simplified Johansen-style cointegration weights
    Uses regression-based approach as proxy for eigenvector weights
    """
    n_assets = prices_matrix.shape[1]

    # Use first asset as dependent, regress others
    y = prices_matrix[:, 0]
    X = prices_matrix[:, 1:]

    # Add constant term
    X_with_const = np.column_stack([np.ones(len(y)), X])

    try:
        # OLS regression
        beta = np.linalg.lstsq(X_with_const, y, rcond=None)[0]
        weights = np.zeros(n_assets)
        weights[0] = 1.0
        weights[1:] = -beta[1:]  # Hedge ratios (negative)

        # Normalize to sum to 1
        weights = weights / np.sum(np.abs(weights))
    except Exception:
        # Equal weights fallback
        weights = np.ones(n_assets) / n_assets

    return weights


def calculate_spread(prices_matrix: np.ndarray, weights: np.ndarray) -> np.ndarray:
    """Calculate weighted spread"""
    return np.dot(prices_matrix, weights)


def calculate_zscore(spread: np.ndarray, window: int = 20) -> np.ndarray:
    """Calculate rolling z-score of spread"""
    zscore = np.zeros(len(spread))
    for i in range(window, len(spread)):
        window_data = spread[i-window:i]
        mean = np.mean(window_data)
        std = np.std(window_data)
        if std > 0:
            zscore[i] = (spread[i] - mean) / std
    return zscore


def backtest_strategy(prices_matrix: np.ndarray, weights: np.ndarray,
                      entry_threshold: float = 2.0, exit_threshold: float = 0.5) -> dict:
    """
    Backtest mean reversion strategy on the spread
    Returns: Sharpe ratio, total return, max drawdown, number of trades
    """
    spread = calculate_spread(prices_matrix, weights)
    zscore = calculate_zscore(spread, window=20)

    # Generate signals
    position = 0
    positions = []
    returns = []

    for i in range(1, len(zscore)):
        if position == 0:
            if zscore[i] > entry_threshold:
                position = -1  # Short spread
            elif zscore[i] < -entry_threshold:
                position = 1  # Long spread
        elif position == 1:
            if zscore[i] > -exit_threshold:
                position = 0  # Close long
        elif position == -1:
            if zscore[i] < exit_threshold:
                position = 0  # Close short

        positions.append(position)

        # Calculate return based on spread change
        if len(positions) > 1 and positions[-2] != 0:
            spread_return = (spread[i] - spread[i-1]) / abs(spread[i-1]) if spread[i-1] != 0 else 0
            returns.append(positions[-2] * spread_return)
        else:
            returns.append(0)

    returns = np.array(returns)

    # Calculate metrics
    if len(returns) > 0 and np.std(returns) > 0:
        sharpe = np.mean(returns) / np.std(returns) * np.sqrt(252)
    else:
        sharpe = 0

    total_return = np.sum(returns) * 100

    # Max drawdown
    cumulative = np.cumsum(returns)
    running_max = np.maximum.accumulate(cumulative)
    drawdown = running_max - cumulative
    max_drawdown = np.max(drawdown) * 100 if len(drawdown) > 0 else 0

    # Count trades
    n_trades = sum(1 for i in range(1, len(positions)) if positions[i] != positions[i-1] and positions[i] != 0)

    return {
        "sharpe_ratio": float(sharpe),
        "total_return": float(total_return),
        "max_drawdown": float(max_drawdown),
        "n_trades": int(n_trades),
        "positions": positions,
        "cumulative_returns": (np.cumsum(returns) * 100).tolist()
    }


def optimize_weights(prices_matrix: np.ndarray, metric: str = "sharpe",
                     entry_threshold: float = 2.0, exit_threshold: float = 0.5) -> tuple:
    """
    Optimize basket weights using differential evolution (pseudo-Bayesian optimization)
    """
    n_assets = prices_matrix.shape[1]

    # Track optimization history
    history = {
        "iterations": [],
        "objectives": [],
        "best_objective": []
    }
    iteration = [0]
    best_so_far = [float('-inf')]

    def objective(weights):
        # Normalize weights
        weights = weights / np.sum(np.abs(weights)) if np.sum(np.abs(weights)) > 0 else weights

        result = backtest_strategy(prices_matrix, weights, entry_threshold, exit_threshold)

        if metric == "sharpe":
            obj = result["sharpe_ratio"]
        elif metric == "return":
            obj = result["total_return"]
        elif metric == "min_dd":
            obj = -result["max_drawdown"]  # Minimize drawdown
        else:
            obj = result["sharpe_ratio"]

        # Track history
        iteration[0] += 1
        if iteration[0] % 5 == 0:  # Log every 5 iterations
            history["iterations"].append(iteration[0])
            history["objectives"].append(float(obj))
            if obj > best_so_far[0]:
                best_so_far[0] = obj
            history["best_objective"].append(best_so_far[0])

        return -obj  # Minimize negative objective

    # Bounds: weights between -2 and 2
    bounds = [(-2, 2) for _ in range(n_assets)]

    if SCIPY_AVAILABLE:
        # Use differential evolution (global optimizer)
        result = differential_evolution(
            objective,
            bounds,
            maxiter=50,
            popsize=10,
            tol=0.01,
            seed=42,
            workers=1
        )
        optimal_weights = result.x
    else:
        # Fallback: random search
        best_weights = np.ones(n_assets) / n_assets
        best_obj = float('inf')

        for _ in range(100):
            weights = np.random.uniform(-2, 2, n_assets)
            obj = objective(weights)
            if obj < best_obj:
                best_obj = obj
                best_weights = weights

        optimal_weights = best_weights

    # Normalize final weights
    optimal_weights = optimal_weights / np.sum(np.abs(optimal_weights))

    return optimal_weights, history


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)

            # Get parameters
            tickers_str = params.get('tickers', ['SPY,QQQ,IWM,GLD,TLT'])[0]
            tickers = [t.strip().upper() for t in tickers_str.split(',')]
            period = params.get('period', ['1y'])[0]
            metric = params.get('metric', ['sharpe'])[0]  # sharpe, return, min_dd
            entry = float(params.get('entry', ['2.0'])[0])
            exit_val = float(params.get('exit', ['0.5'])[0])

            if len(tickers) < 2:
                raise ValueError("Need at least 2 tickers")
            if len(tickers) > 6:
                tickers = tickers[:6]  # Limit to 6 for performance

            # Fetch data
            prices_dict = fetch_prices(tickers, period)

            if len(prices_dict) < 2:
                raise ValueError(f"Could not fetch data for enough tickers. Got: {list(prices_dict.keys())}")

            # Align prices
            valid_tickers, prices_matrix = align_prices(prices_dict)

            # Get baseline Johansen weights
            baseline_weights = johansen_weights(prices_matrix)
            baseline_result = backtest_strategy(prices_matrix, baseline_weights, entry, exit_val)

            # Optimize weights
            optimized_weights, optimization_history = optimize_weights(
                prices_matrix, metric, entry, exit_val
            )
            optimized_result = backtest_strategy(prices_matrix, optimized_weights, entry, exit_val)

            # Calculate spread time series for visualization
            baseline_spread = calculate_spread(prices_matrix, baseline_weights)
            optimized_spread = calculate_spread(prices_matrix, optimized_weights)

            baseline_zscore = calculate_zscore(baseline_spread)
            optimized_zscore = calculate_zscore(optimized_spread)

            # Generate dates (approximate)
            end_date = datetime.now()
            dates = [(end_date - timedelta(days=len(prices_matrix)-1-i)).strftime('%Y-%m-%d')
                     for i in range(len(prices_matrix))]

            response = {
                "tickers": valid_tickers,
                "period": period,
                "data_points": int(len(prices_matrix)),
                "optimization_metric": metric,
                "baseline": {
                    "weights": {t: round(float(w), 4) for t, w in zip(valid_tickers, baseline_weights)},
                    "performance": {
                        "sharpe_ratio": round(baseline_result["sharpe_ratio"], 4),
                        "total_return": round(baseline_result["total_return"], 2),
                        "max_drawdown": round(baseline_result["max_drawdown"], 2),
                        "n_trades": baseline_result["n_trades"]
                    }
                },
                "optimized": {
                    "weights": {t: round(float(w), 4) for t, w in zip(valid_tickers, optimized_weights)},
                    "performance": {
                        "sharpe_ratio": round(optimized_result["sharpe_ratio"], 4),
                        "total_return": round(optimized_result["total_return"], 2),
                        "max_drawdown": round(optimized_result["max_drawdown"], 2),
                        "n_trades": optimized_result["n_trades"]
                    }
                },
                "improvement": {
                    "sharpe_delta": round(optimized_result["sharpe_ratio"] - baseline_result["sharpe_ratio"], 4),
                    "return_delta": round(optimized_result["total_return"] - baseline_result["total_return"], 2)
                },
                "convergence": {
                    "iterations": optimization_history["iterations"],
                    "objectives": [round(o, 4) for o in optimization_history["objectives"]],
                    "best_objective": [round(o, 4) for o in optimization_history["best_objective"]]
                },
                "time_series": {
                    "dates": dates[-100:],  # Last 100 days
                    "baseline_spread": [round(float(s), 4) for s in baseline_spread[-100:]],
                    "optimized_spread": [round(float(s), 4) for s in optimized_spread[-100:]],
                    "baseline_zscore": [round(float(z), 4) for z in baseline_zscore[-100:]],
                    "optimized_zscore": [round(float(z), 4) for z in optimized_zscore[-100:]],
                    "baseline_cumulative": [round(r, 2) for r in baseline_result["cumulative_returns"][-100:]],
                    "optimized_cumulative": [round(r, 2) for r in optimized_result["cumulative_returns"][-100:]]
                }
            }

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
