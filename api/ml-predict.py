"""
ML Stock Prediction API - Train and predict stock returns
Uses numpy-only implementations to avoid scikit-learn dependency
"""
from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import parse_qs, urlparse

try:
    import numpy as np
    import pandas as pd
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False

try:
    import yfinance as yf
    YFINANCE_AVAILABLE = True
except ImportError:
    YFINANCE_AVAILABLE = False


def calculate_rsi(prices, period=14):
    """Calculate Relative Strength Index"""
    deltas = np.diff(prices)
    gains = np.where(deltas > 0, deltas, 0)
    losses = np.where(deltas < 0, -deltas, 0)

    avg_gain = np.zeros(len(prices))
    avg_loss = np.zeros(len(prices))

    if period < len(gains):
        avg_gain[period] = np.mean(gains[:period])
        avg_loss[period] = np.mean(losses[:period])

        for i in range(period + 1, len(prices)):
            avg_gain[i] = (avg_gain[i-1] * (period - 1) + gains[i-1]) / period
            avg_loss[i] = (avg_loss[i-1] * (period - 1) + losses[i-1]) / period

    rs = np.where(avg_loss != 0, avg_gain / avg_loss, 0)
    rsi = 100 - (100 / (1 + rs))

    return rsi


def calculate_macd(prices, fast=12, slow=26, signal=9):
    """Calculate MACD"""
    exp_fast = pd.Series(prices).ewm(span=fast, adjust=False).mean()
    exp_slow = pd.Series(prices).ewm(span=slow, adjust=False).mean()
    macd_line = exp_fast - exp_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()

    return macd_line.values, signal_line.values


def create_features(df):
    """Create technical indicator features"""
    features = pd.DataFrame(index=df.index)

    # Returns
    features['return_1d'] = df['Close'].pct_change(1)
    features['return_5d'] = df['Close'].pct_change(5)
    features['return_20d'] = df['Close'].pct_change(20)

    # Moving averages
    features['sma_5'] = df['Close'].rolling(5).mean()
    features['sma_20'] = df['Close'].rolling(20).mean()
    features['sma_50'] = df['Close'].rolling(50).mean()

    # SMA ratios
    features['price_sma5_ratio'] = df['Close'] / features['sma_5']
    features['price_sma20_ratio'] = df['Close'] / features['sma_20']
    features['sma5_sma20_ratio'] = features['sma_5'] / features['sma_20']

    # Volatility
    features['volatility_5d'] = df['Close'].pct_change().rolling(5).std()
    features['volatility_20d'] = df['Close'].pct_change().rolling(20).std()

    # RSI
    features['rsi'] = calculate_rsi(df['Close'].values)

    # MACD
    macd, macd_signal = calculate_macd(df['Close'].values)
    features['macd'] = macd
    features['macd_signal'] = macd_signal

    # Bollinger Bands
    features['bb_middle'] = df['Close'].rolling(20).mean()
    bb_std = df['Close'].rolling(20).std()
    features['bb_upper'] = features['bb_middle'] + 2 * bb_std
    features['bb_lower'] = features['bb_middle'] - 2 * bb_std
    features['bb_width'] = (features['bb_upper'] - features['bb_lower']) / features['bb_middle']
    features['bb_position'] = (df['Close'] - features['bb_lower']) / (features['bb_upper'] - features['bb_lower'])

    # Lag features
    for lag in [1, 2, 3, 5]:
        features[f'return_lag_{lag}'] = features['return_1d'].shift(lag)

    return features


class RidgeRegression:
    """Simple Ridge Regression implementation"""
    def __init__(self, alpha=1.0):
        self.alpha = alpha
        self.coef_ = None
        self.intercept_ = None

    def fit(self, X, y):
        X = np.array(X)
        y = np.array(y)

        # Add intercept
        X_with_intercept = np.column_stack([np.ones(len(X)), X])

        # Ridge regression: (X'X + alpha*I)^-1 * X'y
        n_features = X_with_intercept.shape[1]
        identity = np.eye(n_features)
        identity[0, 0] = 0  # Don't regularize intercept

        XtX = X_with_intercept.T @ X_with_intercept
        Xty = X_with_intercept.T @ y

        weights = np.linalg.solve(XtX + self.alpha * identity, Xty)

        self.intercept_ = weights[0]
        self.coef_ = weights[1:]

        return self

    def predict(self, X):
        X = np.array(X)
        return X @ self.coef_ + self.intercept_


def r2_score(y_true, y_pred):
    """Calculate R² score"""
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    ss_res = np.sum((y_true - y_pred) ** 2)
    ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
    return 1 - (ss_res / ss_tot) if ss_tot > 0 else 0


def mean_squared_error(y_true, y_pred):
    """Calculate MSE"""
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    return np.mean((y_true - y_pred) ** 2)


def mean_absolute_error(y_true, y_pred):
    """Calculate MAE"""
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    return np.mean(np.abs(y_true - y_pred))


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        try:
            if not NUMPY_AVAILABLE or not YFINANCE_AVAILABLE:
                raise ImportError("Required packages not available")

            ticker = params.get("ticker", ["AAPL"])[0].upper()
            period = params.get("period", ["2y"])[0]

            stock = yf.Ticker(ticker)
            df = stock.history(period=period)

            if df.empty or len(df) < 100:
                raise ValueError(f"Insufficient data for {ticker}")

            # Create features
            features = create_features(df)

            # Target: next day return
            target = df['Close'].pct_change().shift(-1)

            # Combine and drop NaN
            data = features.copy()
            data['target'] = target
            data = data.dropna()

            if len(data) < 50:
                raise ValueError("Insufficient data after feature engineering")

            # Split features and target
            X = data.drop('target', axis=1)
            y = data['target']

            # Train/test split (80/20, no shuffle for time series)
            split_idx = int(len(X) * 0.8)
            X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
            y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

            # Train Ridge Regression
            model = RidgeRegression(alpha=1.0)
            model.fit(X_train, y_train)

            # Predictions
            y_pred_train = model.predict(X_train)
            y_pred_test = model.predict(X_test)

            # Metrics
            train_r2 = r2_score(y_train, y_pred_train)
            test_r2 = r2_score(y_test, y_pred_test)
            test_rmse = np.sqrt(mean_squared_error(y_test, y_pred_test))
            test_mae = mean_absolute_error(y_test, y_pred_test)

            # Directional accuracy
            actual_direction = (np.array(y_test) > 0).astype(int)
            pred_direction = (np.array(y_pred_test) > 0).astype(int)
            directional_accuracy = (actual_direction == pred_direction).mean()

            # Feature importance (absolute coefficients)
            importance = dict(zip(X.columns, np.abs(model.coef_)))
            importance = dict(sorted(importance.items(), key=lambda x: x[1], reverse=True)[:10])

            result = {
                "ticker": ticker,
                "model": "ridge",
                "data_points": len(data),
                "features_used": len(X.columns),
                "metrics": {
                    "train_r2": round(float(train_r2), 4),
                    "test_r2": round(float(test_r2), 4),
                    "test_rmse": round(float(test_rmse * 100), 4),
                    "test_mae": round(float(test_mae * 100), 4),
                    "directional_accuracy": round(float(directional_accuracy), 4),
                },
                "feature_importance": {k: round(float(v), 6) for k, v in importance.items()},
                "predictions": {
                    "dates": X_test.index.strftime("%Y-%m-%d").tolist()[-30:],
                    "actual": [round(float(v) * 100, 4) for v in y_test.tolist()[-30:]],
                    "predicted": [round(float(v) * 100, 4) for v in y_pred_test[-30:]],
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
