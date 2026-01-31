"""
K-Means Stock Clustering API
Group stocks by behavior patterns (returns, volatility, momentum) for portfolio diversification
"""

from http.server import BaseHTTPRequestHandler
import json
import numpy as np
from urllib.parse import urlparse, parse_qs
from datetime import datetime

try:
    import yfinance as yf
    YFINANCE_AVAILABLE = True
except ImportError:
    YFINANCE_AVAILABLE = False

try:
    from scipy.stats import zscore
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False


def fetch_stock_data(tickers: list, period: str = "1y") -> dict:
    """Fetch historical prices for multiple tickers"""
    if not YFINANCE_AVAILABLE:
        raise ImportError("yfinance not available")

    data = {}
    for ticker in tickers:
        try:
            stock = yf.Ticker(ticker)
            hist = stock.history(period=period)
            if len(hist) > 50:
                data[ticker] = {
                    'prices': hist['Close'].values,
                    'volume': hist['Volume'].values if 'Volume' in hist.columns else np.ones(len(hist))
                }
        except Exception:
            continue

    return data


def calculate_features(data: dict, market_data: dict = None) -> tuple:
    """
    Calculate features for clustering:
    - Average daily return
    - Volatility (std of returns)
    - Momentum (20d, 60d)
    - Beta (if market data provided)
    """
    tickers = list(data.keys())
    features = []
    feature_names = ['Avg Return', 'Volatility', 'Mom 20d', 'Mom 60d', 'Beta']

    for ticker in tickers:
        prices = data[ticker]['prices']
        returns = np.diff(np.log(prices))

        # Average daily return (annualized)
        avg_return = np.mean(returns) * 252

        # Volatility (annualized)
        volatility = np.std(returns) * np.sqrt(252)

        # Momentum (last 20d and 60d returns)
        mom_20d = (prices[-1] / prices[-21] - 1) if len(prices) > 21 else 0
        mom_60d = (prices[-1] / prices[-61] - 1) if len(prices) > 61 else 0

        # Beta (vs market)
        if market_data is not None and len(market_data) > 0:
            market_prices = list(market_data.values())[0]['prices']
            market_returns = np.diff(np.log(market_prices))

            # Align lengths
            min_len = min(len(returns), len(market_returns))
            stock_ret = returns[-min_len:]
            market_ret = market_returns[-min_len:]

            # Calculate beta
            covariance = np.cov(stock_ret, market_ret)[0, 1]
            market_var = np.var(market_ret)
            beta = covariance / market_var if market_var > 0 else 1.0
        else:
            beta = 1.0

        features.append([avg_return, volatility, mom_20d, mom_60d, beta])

    return np.array(features), tickers, feature_names


def standardize_features(features: np.ndarray) -> np.ndarray:
    """Standardize features (z-score normalization)"""
    mean = np.mean(features, axis=0)
    std = np.std(features, axis=0)
    std[std == 0] = 1  # Avoid division by zero
    return (features - mean) / std


def kmeans_plusplus_init(X: np.ndarray, k: int) -> np.ndarray:
    """K-means++ initialization for better convergence"""
    n_samples = X.shape[0]
    centroids = []

    # Choose first centroid randomly
    first_idx = np.random.randint(n_samples)
    centroids.append(X[first_idx])

    for _ in range(1, k):
        # Calculate distances to nearest centroid
        distances = np.zeros(n_samples)
        for i, point in enumerate(X):
            min_dist = min(np.sum((point - c) ** 2) for c in centroids)
            distances[i] = min_dist

        # Choose next centroid with probability proportional to distance^2
        probs = distances / distances.sum()
        next_idx = np.random.choice(n_samples, p=probs)
        centroids.append(X[next_idx])

    return np.array(centroids)


def kmeans(X: np.ndarray, k: int, max_iters: int = 100, tol: float = 1e-4) -> tuple:
    """
    K-means clustering algorithm (Lloyd's algorithm)
    Returns: labels, centroids, inertia
    """
    n_samples = X.shape[0]

    # Initialize centroids with k-means++
    centroids = kmeans_plusplus_init(X, k)

    for _ in range(max_iters):
        # Assign points to nearest centroid
        distances = np.zeros((n_samples, k))
        for i in range(k):
            distances[:, i] = np.sum((X - centroids[i]) ** 2, axis=1)

        labels = np.argmin(distances, axis=1)

        # Update centroids
        new_centroids = np.zeros_like(centroids)
        for i in range(k):
            mask = labels == i
            if np.any(mask):
                new_centroids[i] = X[mask].mean(axis=0)
            else:
                new_centroids[i] = centroids[i]

        # Check convergence
        if np.sum((new_centroids - centroids) ** 2) < tol:
            break

        centroids = new_centroids

    # Calculate inertia (sum of squared distances to centroids)
    inertia = 0
    for i in range(k):
        mask = labels == i
        if np.any(mask):
            inertia += np.sum((X[mask] - centroids[i]) ** 2)

    return labels, centroids, inertia


def silhouette_score(X: np.ndarray, labels: np.ndarray) -> float:
    """Calculate silhouette score for clustering quality"""
    n_samples = X.shape[0]
    unique_labels = np.unique(labels)

    if len(unique_labels) <= 1:
        return 0.0

    silhouette_vals = []

    for i in range(n_samples):
        # a(i) = average distance to points in same cluster
        same_cluster = X[labels == labels[i]]
        if len(same_cluster) > 1:
            a_i = np.mean([np.sqrt(np.sum((X[i] - x) ** 2)) for x in same_cluster if not np.array_equal(x, X[i])])
        else:
            a_i = 0

        # b(i) = minimum average distance to points in other clusters
        b_i = float('inf')
        for label in unique_labels:
            if label != labels[i]:
                other_cluster = X[labels == label]
                if len(other_cluster) > 0:
                    avg_dist = np.mean([np.sqrt(np.sum((X[i] - x) ** 2)) for x in other_cluster])
                    b_i = min(b_i, avg_dist)

        if b_i == float('inf'):
            b_i = 0

        # Silhouette coefficient
        if max(a_i, b_i) > 0:
            s_i = (b_i - a_i) / max(a_i, b_i)
        else:
            s_i = 0

        silhouette_vals.append(s_i)

    return float(np.mean(silhouette_vals))


def pca_reduce(X: np.ndarray, n_components: int = 2) -> np.ndarray:
    """PCA for dimensionality reduction (for visualization)"""
    # Center data
    X_centered = X - np.mean(X, axis=0)

    # Compute covariance matrix
    cov = np.cov(X_centered.T)

    # Eigen decomposition
    eigenvalues, eigenvectors = np.linalg.eigh(cov)

    # Sort by eigenvalue (descending)
    idx = np.argsort(eigenvalues)[::-1]
    eigenvectors = eigenvectors[:, idx]

    # Project data
    return X_centered @ eigenvectors[:, :n_components]


def calculate_cluster_portfolios(data: dict, tickers: list, labels: np.ndarray,
                                  n_clusters: int) -> list:
    """Calculate equal-weight portfolio performance for each cluster"""
    portfolios = []

    for c in range(n_clusters):
        cluster_tickers = [t for t, l in zip(tickers, labels) if l == c]
        if len(cluster_tickers) == 0:
            continue

        # Get returns for cluster stocks
        all_returns = []
        min_len = float('inf')

        for t in cluster_tickers:
            prices = data[t]['prices']
            returns = np.diff(np.log(prices))
            all_returns.append(returns)
            min_len = min(min_len, len(returns))

        # Align and calculate equal-weight portfolio
        aligned_returns = np.array([r[-int(min_len):] for r in all_returns])
        portfolio_returns = np.mean(aligned_returns, axis=0)

        # Calculate metrics
        total_return = (np.exp(np.sum(portfolio_returns)) - 1) * 100
        volatility = np.std(portfolio_returns) * np.sqrt(252) * 100
        sharpe = (np.mean(portfolio_returns) * 252 / (np.std(portfolio_returns) * np.sqrt(252))) if np.std(portfolio_returns) > 0 else 0

        portfolios.append({
            'cluster': int(c),
            'tickers': cluster_tickers,
            'n_stocks': len(cluster_tickers),
            'total_return': round(float(total_return), 2),
            'volatility': round(float(volatility), 2),
            'sharpe_ratio': round(float(sharpe), 2),
            'cumulative_returns': (np.cumsum(portfolio_returns) * 100).tolist()
        })

    return portfolios


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)

            # Get parameters
            tickers_str = params.get('tickers', ['AAPL,MSFT,GOOGL,AMZN,META,NVDA,JPM,BAC,XOM,CVX,JNJ,PFE,WMT,HD,DIS,NFLX,TSLA,AMD,INTC,CRM'])[0]
            tickers = [t.strip().upper() for t in tickers_str.split(',')]
            n_clusters = int(params.get('n_clusters', ['4'])[0])
            period = params.get('period', ['1y'])[0]

            # Validate
            n_clusters = min(max(n_clusters, 2), min(6, len(tickers) // 2))

            # Fetch data
            stock_data = fetch_stock_data(tickers, period)

            if len(stock_data) < n_clusters:
                raise ValueError(f"Only {len(stock_data)} stocks have data. Need at least {n_clusters}.")

            # Fetch market data for beta calculation
            market_data = fetch_stock_data(['SPY'], period)

            # Calculate features
            features, valid_tickers, feature_names = calculate_features(stock_data, market_data)

            # Standardize
            features_std = standardize_features(features)

            # Run K-means
            np.random.seed(42)
            labels, centroids, inertia = kmeans(features_std, n_clusters)

            # Calculate silhouette score
            sil_score = silhouette_score(features_std, labels)

            # PCA for visualization
            pca_coords = pca_reduce(features_std, 2)

            # Calculate cluster portfolios
            portfolios = calculate_cluster_portfolios(stock_data, valid_tickers, labels, n_clusters)

            # Cluster statistics
            cluster_stats = []
            for c in range(n_clusters):
                mask = labels == c
                cluster_features = features[mask]

                if len(cluster_features) > 0:
                    cluster_stats.append({
                        'cluster': int(c),
                        'n_stocks': int(np.sum(mask)),
                        'avg_return': round(float(np.mean(cluster_features[:, 0]) * 100), 2),
                        'avg_volatility': round(float(np.mean(cluster_features[:, 1]) * 100), 2),
                        'avg_beta': round(float(np.mean(cluster_features[:, 4])), 2),
                        'tickers': [t for t, l in zip(valid_tickers, labels) if l == c]
                    })

            # Stock details with cluster assignments
            stock_details = []
            for i, ticker in enumerate(valid_tickers):
                stock_details.append({
                    'ticker': ticker,
                    'cluster': int(labels[i]),
                    'features': {
                        'return': round(float(features[i, 0] * 100), 2),
                        'volatility': round(float(features[i, 1] * 100), 2),
                        'momentum_20d': round(float(features[i, 2] * 100), 2),
                        'momentum_60d': round(float(features[i, 3] * 100), 2),
                        'beta': round(float(features[i, 4]), 2)
                    },
                    'pca': {
                        'x': round(float(pca_coords[i, 0]), 4),
                        'y': round(float(pca_coords[i, 1]), 4)
                    }
                })

            response = {
                "n_stocks": len(valid_tickers),
                "n_clusters": n_clusters,
                "period": period,
                "silhouette_score": round(sil_score, 4),
                "inertia": round(float(inertia), 4),
                "feature_names": feature_names,
                "cluster_statistics": cluster_stats,
                "portfolios": portfolios,
                "stocks": stock_details,
                "centroids": {
                    "features": [[round(float(c), 4) for c in centroid] for centroid in centroids],
                    "pca": [
                        {
                            'x': round(float(pca_reduce(centroids, 2)[i, 0]), 4),
                            'y': round(float(pca_reduce(centroids, 2)[i, 1]), 4)
                        }
                        for i in range(n_clusters)
                    ]
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
