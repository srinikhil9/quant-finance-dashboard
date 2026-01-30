"""
Stock Data API - Fetches OHLCV data from Yahoo Finance
"""
from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import parse_qs, urlparse
from datetime import datetime, timedelta

try:
    import yfinance as yf
    import pandas as pd
    YFINANCE_AVAILABLE = True
except ImportError:
    YFINANCE_AVAILABLE = False


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Parse query parameters
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        ticker = params.get("ticker", ["AAPL"])[0].upper()
        period = params.get("period", ["1y"])[0]

        try:
            if not YFINANCE_AVAILABLE:
                raise ImportError("yfinance not available")

            # Fetch data
            stock = yf.Ticker(ticker)
            df = stock.history(period=period)

            if df.empty:
                raise ValueError(f"No data found for {ticker}")

            # Convert to JSON-serializable format
            data = {
                "ticker": ticker,
                "period": period,
                "dates": df.index.strftime("%Y-%m-%d").tolist(),
                "open": df["Open"].round(2).tolist(),
                "high": df["High"].round(2).tolist(),
                "low": df["Low"].round(2).tolist(),
                "close": df["Close"].round(2).tolist(),
                "volume": df["Volume"].tolist(),
                "returns": df["Close"].pct_change().fillna(0).round(6).tolist(),
                "current_price": round(df["Close"].iloc[-1], 2),
                "data_points": len(df),
            }

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(data).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
