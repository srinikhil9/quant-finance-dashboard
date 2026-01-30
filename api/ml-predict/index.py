"""
ML Stock Prediction API - Train and predict stock returns
"""
from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import parse_qs, urlparse
import math

try:
    import numpy as np
    import pandas as pd
    from sklearn.linear_model import LinearRegression, Ridge, Lasso
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False

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


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        try:
            if not ML_AVAILABLE:
                raise ImportError("scikit-learn not available")

            ticker = params.get("ticker", ["AAPL"])[0].upper()
            period = params.get("period", ["2y"])[0]
            model_type = params.get("model", ["ridge"])[0].lower()

            if YFINANCE_AVAILABLE:
                stock = yf.Ticker(ticker)
                df = stock.history(period=period)

                if df.empty or len(df) < 100:
                    raise ValueError(f"Insufficient data for {ticker}")
            else:
                raise ImportError("yfinance not available")

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

            # Train/test split
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, shuffle=False
            )

            # Select and train model
            models = {
                'linear': LinearRegression(),
                'ridge': Ridge(alpha=1.0),
                'lasso': Lasso(alpha=0.01),
                'random_forest': RandomForestRegressor(n_estimators=50, max_depth=10, random_state=42)
            }

            if model_type not in models:
                model_type = 'ridge'

            model = models[model_type]
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
            actual_direction = (y_test > 0).astype(int)
            pred_direction = (y_pred_test > 0).astype(int)
            directional_accuracy = (actual_direction == pred_direction).mean()

            # Feature importance
            if model_type == 'random_forest':
                importance = dict(zip(X.columns, model.feature_importances_))
            else:
                importance = dict(zip(X.columns, np.abs(model.coef_) if hasattr(model, 'coef_') else [0]*len(X.columns)))

            # Sort by importance
            importance = dict(sorted(importance.items(), key=lambda x: x[1], reverse=True)[:10])

            result = {
                "ticker": ticker,
                "model": model_type,
                "data_points": len(data),
                "features_used": len(X.columns),
                "metrics": {
                    "train_r2": round(train_r2, 4),
                    "test_r2": round(test_r2, 4),
                    "test_rmse": round(test_rmse * 100, 4),  # Convert to percentage
                    "test_mae": round(test_mae * 100, 4),
                    "directional_accuracy": round(directional_accuracy, 4),
                },
                "feature_importance": {k: round(v, 4) for k, v in importance.items()},
                "predictions": {
                    "dates": X_test.index.strftime("%Y-%m-%d").tolist()[-30:],
                    "actual": (y_test * 100).round(4).tolist()[-30:],
                    "predicted": (pd.Series(y_pred_test) * 100).round(4).tolist()[-30:],
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
