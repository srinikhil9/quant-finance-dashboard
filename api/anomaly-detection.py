"""
Anomaly Detection API using Isolation Forest
Detect unusual market conditions that may signal elevated risk
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


def fetch_market_data(ticker: str, period: str = "2y") -> tuple:
    """Fetch OHLCV data for a ticker"""
    if not YFINANCE_AVAILABLE:
        raise ImportError("yfinance not available")

    stock = yf.Ticker(ticker)
    hist = stock.history(period=period)

    if len(hist) < 100:
        raise ValueError(f"Insufficient data for {ticker}")

    return hist


def calculate_features(hist) -> tuple:
    """
    Calculate features for anomaly detection:
    - Daily returns
    - Volume spike (vs 20d avg)
    - 5-day volatility
    - 20-day volatility
    - Gap (open vs prev close)
    - Range (high-low as % of price)
    """
    prices = hist['Close'].values
    opens = hist['Open'].values
    highs = hist['High'].values
    lows = hist['Low'].values
    volumes = hist['Volume'].values

    n = len(prices)
    dates = hist.index.strftime('%Y-%m-%d').tolist()

    # Calculate features (start from index 20 for lookback)
    features = []
    valid_dates = []
    valid_prices = []

    for i in range(20, n):
        # Daily return
        daily_return = (prices[i] - prices[i-1]) / prices[i-1]

        # Volume spike (vs 20d avg)
        avg_vol_20d = np.mean(volumes[i-20:i])
        volume_spike = volumes[i] / avg_vol_20d if avg_vol_20d > 0 else 1

        # 5-day volatility
        returns_5d = np.diff(prices[i-5:i+1]) / prices[i-5:i]
        vol_5d = np.std(returns_5d)

        # 20-day volatility
        returns_20d = np.diff(prices[i-20:i+1]) / prices[i-20:i]
        vol_20d = np.std(returns_20d)

        # Gap (open vs prev close)
        gap = (opens[i] - prices[i-1]) / prices[i-1] if i > 0 else 0

        # Intraday range
        price_range = (highs[i] - lows[i]) / prices[i]

        features.append([
            daily_return,
            volume_spike,
            vol_5d,
            vol_20d,
            gap,
            price_range
        ])
        valid_dates.append(dates[i])
        valid_prices.append(prices[i])

    feature_names = ['Daily Return', 'Volume Spike', '5d Volatility',
                     '20d Volatility', 'Gap', 'Intraday Range']

    return np.array(features), valid_dates, valid_prices, feature_names


class IsolationTree:
    """A single Isolation Tree"""

    def __init__(self, max_depth=None):
        self.max_depth = max_depth
        self.split_feature = None
        self.split_value = None
        self.left = None
        self.right = None
        self.size = 0

    def fit(self, X, depth=0):
        n_samples, n_features = X.shape
        self.size = n_samples

        # Stopping conditions
        if n_samples <= 1 or (self.max_depth is not None and depth >= self.max_depth):
            return self

        # Randomly select feature and split value
        self.split_feature = np.random.randint(n_features)
        feature_values = X[:, self.split_feature]

        min_val, max_val = np.min(feature_values), np.max(feature_values)

        if min_val == max_val:
            return self

        self.split_value = np.random.uniform(min_val, max_val)

        # Split data
        left_mask = X[:, self.split_feature] < self.split_value
        right_mask = ~left_mask

        if np.sum(left_mask) > 0 and np.sum(right_mask) > 0:
            self.left = IsolationTree(self.max_depth)
            self.right = IsolationTree(self.max_depth)
            self.left.fit(X[left_mask], depth + 1)
            self.right.fit(X[right_mask], depth + 1)

        return self

    def path_length(self, x, depth=0):
        """Calculate path length for a single sample"""
        if self.left is None or self.right is None:
            # Leaf node - add expected path length for remaining samples
            return depth + self._c(self.size)

        if x[self.split_feature] < self.split_value:
            return self.left.path_length(x, depth + 1)
        else:
            return self.right.path_length(x, depth + 1)

    @staticmethod
    def _c(n):
        """Average path length of unsuccessful search in BST"""
        if n <= 1:
            return 0
        return 2 * (np.log(n - 1) + 0.5772156649) - 2 * (n - 1) / n


class IsolationForest:
    """Isolation Forest for anomaly detection"""

    def __init__(self, n_trees=100, max_samples=256, contamination=0.05):
        self.n_trees = n_trees
        self.max_samples = max_samples
        self.contamination = contamination
        self.trees = []
        self.threshold = None

    def fit(self, X):
        n_samples = X.shape[0]
        sample_size = min(self.max_samples, n_samples)

        # Calculate max depth
        max_depth = int(np.ceil(np.log2(sample_size)))

        # Build trees
        self.trees = []
        for _ in range(self.n_trees):
            # Sample data
            indices = np.random.choice(n_samples, sample_size, replace=False)
            X_sample = X[indices]

            # Build tree
            tree = IsolationTree(max_depth=max_depth)
            tree.fit(X_sample)
            self.trees.append(tree)

        # Calculate threshold from scores
        scores = self.score_samples(X)
        self.threshold = np.percentile(scores, 100 * (1 - self.contamination))

        return self

    def score_samples(self, X):
        """Calculate anomaly scores for samples"""
        n_samples = X.shape[0]
        avg_path_lengths = np.zeros(n_samples)

        for tree in self.trees:
            for i in range(n_samples):
                avg_path_lengths[i] += tree.path_length(X[i])

        avg_path_lengths /= self.n_trees

        # Normalize by average path length in tree
        c = IsolationTree._c(self.max_samples)
        scores = 2 ** (-avg_path_lengths / c) if c != 0 else np.zeros(n_samples)

        return scores

    def predict(self, X):
        """Predict anomalies: 1 for anomaly, 0 for normal"""
        scores = self.score_samples(X)
        return (scores > self.threshold).astype(int)


def identify_crisis_dates(dates: list, anomaly_flags: np.ndarray) -> list:
    """Identify known crisis events in detected anomalies"""
    known_crises = {
        '2020-03': 'COVID-19 Crash',
        '2020-02': 'COVID-19 Start',
        '2022-01': 'Tech Selloff',
        '2022-06': 'Inflation Crisis',
        '2023-03': 'Banking Crisis',
        '2024-08': 'Yen Carry Unwind',
    }

    detected_crises = []
    for i, (date, is_anomaly) in enumerate(zip(dates, anomaly_flags)):
        if is_anomaly:
            month = date[:7]  # YYYY-MM
            if month in known_crises:
                detected_crises.append({
                    'date': date,
                    'event': known_crises[month],
                    'anomaly_index': i
                })

    return detected_crises


def calculate_feature_importance(X: np.ndarray, scores: np.ndarray,
                                  feature_names: list, threshold: float) -> list:
    """Calculate which features contribute most to anomalies"""
    anomaly_mask = scores > threshold
    normal_mask = ~anomaly_mask

    if not np.any(anomaly_mask) or not np.any(normal_mask):
        return [{'feature': name, 'importance': 0} for name in feature_names]

    importance = []
    for i, name in enumerate(feature_names):
        # Compare feature distributions between anomalies and normal
        anomaly_mean = np.mean(np.abs(X[anomaly_mask, i]))
        normal_mean = np.mean(np.abs(X[normal_mask, i]))

        # Importance = ratio of absolute values
        imp = anomaly_mean / normal_mean if normal_mean > 0 else 1
        importance.append({
            'feature': name,
            'importance': round(float(imp), 4),
            'anomaly_mean': round(float(anomaly_mean), 6),
            'normal_mean': round(float(normal_mean), 6)
        })

    # Sort by importance
    importance.sort(key=lambda x: x['importance'], reverse=True)
    return importance


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)

            # Get parameters
            ticker = params.get('ticker', ['SPY'])[0].upper()
            contamination = float(params.get('contamination', ['0.05'])[0])
            period = params.get('period', ['2y'])[0]
            n_trees = int(params.get('n_trees', ['100'])[0])

            # Validate
            contamination = min(max(contamination, 0.01), 0.2)
            n_trees = min(max(n_trees, 50), 200)

            # Fetch data
            hist = fetch_market_data(ticker, period)

            # Calculate features
            features, dates, prices, feature_names = calculate_features(hist)

            # Standardize features
            mean = np.mean(features, axis=0)
            std = np.std(features, axis=0)
            std[std == 0] = 1
            features_std = (features - mean) / std

            # Fit Isolation Forest
            np.random.seed(42)
            iso_forest = IsolationForest(
                n_trees=n_trees,
                max_samples=min(256, len(features)),
                contamination=contamination
            )
            iso_forest.fit(features_std)

            # Get scores and predictions
            scores = iso_forest.score_samples(features_std)
            predictions = iso_forest.predict(features_std)

            # Identify crisis dates
            detected_crises = identify_crisis_dates(dates, predictions)

            # Calculate feature importance
            importance = calculate_feature_importance(
                features, scores, feature_names, iso_forest.threshold
            )

            # Get anomaly details
            anomaly_indices = np.where(predictions == 1)[0]
            anomalies = []
            for idx in anomaly_indices[:50]:  # Limit to 50 most recent
                anomalies.append({
                    'date': dates[idx],
                    'price': round(float(prices[idx]), 2),
                    'score': round(float(scores[idx]), 4),
                    'features': {
                        name: round(float(features[idx, i]), 6)
                        for i, name in enumerate(feature_names)
                    }
                })

            # Sort anomalies by score (most anomalous first)
            anomalies.sort(key=lambda x: x['score'], reverse=True)

            # Summary statistics
            n_anomalies = int(np.sum(predictions))
            anomaly_rate = n_anomalies / len(predictions) * 100

            response = {
                "ticker": ticker,
                "period": period,
                "data_points": int(len(features)),
                "n_trees": n_trees,
                "contamination": contamination,
                "threshold": round(float(iso_forest.threshold), 4),
                "summary": {
                    "n_anomalies": n_anomalies,
                    "anomaly_rate": round(float(anomaly_rate), 2),
                    "avg_score": round(float(np.mean(scores)), 4),
                    "max_score": round(float(np.max(scores)), 4)
                },
                "detected_crises": detected_crises,
                "feature_importance": importance,
                "anomalies": anomalies[:30],  # Top 30 anomalies
                "time_series": {
                    "dates": dates,
                    "prices": [round(float(p), 2) for p in prices],
                    "scores": [round(float(s), 4) for s in scores],
                    "is_anomaly": [int(p) for p in predictions]
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
