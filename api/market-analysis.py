"""
Market Analysis API - Combined endpoint for Options Chain and Technical Analysis
Uses ?action=options-chain or ?action=technical to route requests

This consolidation keeps us under Vercel's 12 serverless function limit.
"""

from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import yfinance as yf
import numpy as np
import pandas as pd
from datetime import datetime, timedelta


def calculate_greeks(S, K, T, r, sigma, option_type='call'):
    """Calculate option Greeks using Black-Scholes"""
    from scipy.stats import norm

    if T <= 0 or sigma <= 0:
        return {'delta': 0, 'gamma': 0, 'theta': 0, 'vega': 0, 'rho': 0}

    d1 = (np.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)

    if option_type == 'call':
        delta = norm.cdf(d1)
        theta = (-S * norm.pdf(d1) * sigma / (2 * np.sqrt(T))
                 - r * K * np.exp(-r * T) * norm.cdf(d2)) / 365
        rho = K * T * np.exp(-r * T) * norm.cdf(d2) / 100
    else:
        delta = norm.cdf(d1) - 1
        theta = (-S * norm.pdf(d1) * sigma / (2 * np.sqrt(T))
                 + r * K * np.exp(-r * T) * norm.cdf(-d2)) / 365
        rho = -K * T * np.exp(-r * T) * norm.cdf(-d2) / 100

    gamma = norm.pdf(d1) / (S * sigma * np.sqrt(T))
    vega = S * norm.pdf(d1) * np.sqrt(T) / 100

    return {
        'delta': round(delta, 4),
        'gamma': round(gamma, 6),
        'theta': round(theta, 4),
        'vega': round(vega, 4),
        'rho': round(rho, 4)
    }


def get_options_chain(ticker: str):
    """Fetch options chain data for a ticker"""
    try:
        stock = yf.Ticker(ticker)

        # Get current stock price
        hist = stock.history(period='1d')
        if hist.empty:
            return {'error': f'No data found for {ticker}'}

        current_price = float(hist['Close'].iloc[-1])

        # Get available expiration dates
        expirations = stock.options
        if not expirations:
            return {'error': f'No options available for {ticker}'}

        # Get options for the nearest 3 expiration dates
        chains = []
        risk_free_rate = 0.05  # Approximate risk-free rate

        for exp_date in expirations[:3]:
            try:
                opt = stock.option_chain(exp_date)

                # Calculate days to expiration
                exp_datetime = datetime.strptime(exp_date, '%Y-%m-%d')
                days_to_exp = (exp_datetime - datetime.now()).days
                T = max(days_to_exp / 365, 0.001)  # Time in years

                # Process calls
                calls_data = []
                for _, row in opt.calls.iterrows():
                    strike = float(row['strike'])
                    iv = float(row['impliedVolatility']) if pd.notna(row['impliedVolatility']) else 0.3

                    greeks = calculate_greeks(current_price, strike, T, risk_free_rate, iv, 'call')

                    calls_data.append({
                        'strike': strike,
                        'bid': float(row['bid']) if pd.notna(row['bid']) else 0,
                        'ask': float(row['ask']) if pd.notna(row['ask']) else 0,
                        'last': float(row['lastPrice']) if pd.notna(row['lastPrice']) else 0,
                        'volume': int(row['volume']) if pd.notna(row['volume']) else 0,
                        'openInterest': int(row['openInterest']) if pd.notna(row['openInterest']) else 0,
                        'iv': round(iv * 100, 2),  # As percentage
                        **greeks
                    })

                # Process puts
                puts_data = []
                for _, row in opt.puts.iterrows():
                    strike = float(row['strike'])
                    iv = float(row['impliedVolatility']) if pd.notna(row['impliedVolatility']) else 0.3

                    greeks = calculate_greeks(current_price, strike, T, risk_free_rate, iv, 'put')

                    puts_data.append({
                        'strike': strike,
                        'bid': float(row['bid']) if pd.notna(row['bid']) else 0,
                        'ask': float(row['ask']) if pd.notna(row['ask']) else 0,
                        'last': float(row['lastPrice']) if pd.notna(row['lastPrice']) else 0,
                        'volume': int(row['volume']) if pd.notna(row['volume']) else 0,
                        'openInterest': int(row['openInterest']) if pd.notna(row['openInterest']) else 0,
                        'iv': round(iv * 100, 2),
                        **greeks
                    })

                chains.append({
                    'expiration': exp_date,
                    'daysToExpiration': days_to_exp,
                    'calls': calls_data,
                    'puts': puts_data
                })

            except Exception as e:
                continue

        if not chains:
            return {'error': 'Could not fetch options data'}

        # Calculate IV surface data for visualization
        iv_surface = []
        for chain in chains:
            for call in chain['calls']:
                if call['iv'] > 0:
                    iv_surface.append({
                        'strike': call['strike'],
                        'expiration': chain['daysToExpiration'],
                        'iv': call['iv'],
                        'type': 'call'
                    })
            for put in chain['puts']:
                if put['iv'] > 0:
                    iv_surface.append({
                        'strike': put['strike'],
                        'expiration': chain['daysToExpiration'],
                        'iv': put['iv'],
                        'type': 'put'
                    })

        return {
            'ticker': ticker,
            'currentPrice': round(current_price, 2),
            'expirations': expirations[:5],
            'chains': chains,
            'ivSurface': iv_surface,
            'timestamp': datetime.now().isoformat()
        }

    except Exception as e:
        return {'error': str(e)}


def calculate_technical_indicators(ticker: str, period: str = '6mo'):
    """Calculate technical analysis indicators"""
    try:
        stock = yf.Ticker(ticker)
        df = stock.history(period=period)

        if df.empty or len(df) < 50:
            return {'error': f'Insufficient data for {ticker}'}

        # Basic price data
        close = df['Close']
        high = df['High']
        low = df['Low']
        volume = df['Volume']

        # Moving Averages
        df['SMA_20'] = close.rolling(window=20).mean()
        df['SMA_50'] = close.rolling(window=50).mean()
        df['SMA_200'] = close.rolling(window=200).mean() if len(df) >= 200 else None
        df['EMA_12'] = close.ewm(span=12, adjust=False).mean()
        df['EMA_26'] = close.ewm(span=26, adjust=False).mean()

        # RSI (14-period)
        delta = close.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['RSI'] = 100 - (100 / (1 + rs))

        # MACD
        df['MACD'] = df['EMA_12'] - df['EMA_26']
        df['MACD_Signal'] = df['MACD'].ewm(span=9, adjust=False).mean()
        df['MACD_Histogram'] = df['MACD'] - df['MACD_Signal']

        # Bollinger Bands
        df['BB_Middle'] = close.rolling(window=20).mean()
        bb_std = close.rolling(window=20).std()
        df['BB_Upper'] = df['BB_Middle'] + (bb_std * 2)
        df['BB_Lower'] = df['BB_Middle'] - (bb_std * 2)
        df['BB_Width'] = (df['BB_Upper'] - df['BB_Lower']) / df['BB_Middle'] * 100

        # Stochastic Oscillator
        low_14 = low.rolling(window=14).min()
        high_14 = high.rolling(window=14).max()
        df['Stoch_K'] = 100 * (close - low_14) / (high_14 - low_14)
        df['Stoch_D'] = df['Stoch_K'].rolling(window=3).mean()

        # Average True Range (ATR)
        tr1 = high - low
        tr2 = abs(high - close.shift())
        tr3 = abs(low - close.shift())
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        df['ATR'] = tr.rolling(window=14).mean()

        # Volume indicators
        df['Volume_SMA'] = volume.rolling(window=20).mean()
        df['Volume_Ratio'] = volume / df['Volume_SMA']

        # On-Balance Volume (OBV)
        obv = [0]
        for i in range(1, len(close)):
            if close.iloc[i] > close.iloc[i-1]:
                obv.append(obv[-1] + volume.iloc[i])
            elif close.iloc[i] < close.iloc[i-1]:
                obv.append(obv[-1] - volume.iloc[i])
            else:
                obv.append(obv[-1])
        df['OBV'] = obv

        # Generate signals
        current = df.iloc[-1]
        prev = df.iloc[-2]

        signals = []

        # RSI signals
        if current['RSI'] > 70:
            signals.append({'indicator': 'RSI', 'signal': 'OVERBOUGHT', 'value': round(current['RSI'], 2)})
        elif current['RSI'] < 30:
            signals.append({'indicator': 'RSI', 'signal': 'OVERSOLD', 'value': round(current['RSI'], 2)})

        # MACD signals
        if current['MACD'] > current['MACD_Signal'] and prev['MACD'] <= prev['MACD_Signal']:
            signals.append({'indicator': 'MACD', 'signal': 'BULLISH_CROSSOVER', 'value': round(current['MACD'], 4)})
        elif current['MACD'] < current['MACD_Signal'] and prev['MACD'] >= prev['MACD_Signal']:
            signals.append({'indicator': 'MACD', 'signal': 'BEARISH_CROSSOVER', 'value': round(current['MACD'], 4)})

        # Bollinger Band signals
        if close.iloc[-1] > current['BB_Upper']:
            signals.append({'indicator': 'Bollinger', 'signal': 'ABOVE_UPPER', 'value': round(current['BB_Upper'], 2)})
        elif close.iloc[-1] < current['BB_Lower']:
            signals.append({'indicator': 'Bollinger', 'signal': 'BELOW_LOWER', 'value': round(current['BB_Lower'], 2)})

        # Moving average signals
        if current['SMA_20'] > current['SMA_50']:
            signals.append({'indicator': 'MA', 'signal': 'BULLISH_TREND', 'value': 'SMA20 > SMA50'})
        else:
            signals.append({'indicator': 'MA', 'signal': 'BEARISH_TREND', 'value': 'SMA20 < SMA50'})

        # Prepare chart data (last 100 data points)
        chart_df = df.tail(100).copy()
        chart_df = chart_df.reset_index()
        chart_df['Date'] = chart_df['Date'].dt.strftime('%Y-%m-%d')

        # Convert to serializable format
        chart_data = {
            'dates': chart_df['Date'].tolist(),
            'ohlc': {
                'open': chart_df['Open'].round(2).tolist(),
                'high': chart_df['High'].round(2).tolist(),
                'low': chart_df['Low'].round(2).tolist(),
                'close': chart_df['Close'].round(2).tolist()
            },
            'volume': chart_df['Volume'].tolist(),
            'indicators': {
                'sma20': chart_df['SMA_20'].round(2).tolist(),
                'sma50': chart_df['SMA_50'].round(2).tolist(),
                'ema12': chart_df['EMA_12'].round(2).tolist(),
                'ema26': chart_df['EMA_26'].round(2).tolist(),
                'rsi': chart_df['RSI'].round(2).tolist(),
                'macd': chart_df['MACD'].round(4).tolist(),
                'macdSignal': chart_df['MACD_Signal'].round(4).tolist(),
                'macdHistogram': chart_df['MACD_Histogram'].round(4).tolist(),
                'bbUpper': chart_df['BB_Upper'].round(2).tolist(),
                'bbMiddle': chart_df['BB_Middle'].round(2).tolist(),
                'bbLower': chart_df['BB_Lower'].round(2).tolist(),
                'stochK': chart_df['Stoch_K'].round(2).tolist(),
                'stochD': chart_df['Stoch_D'].round(2).tolist(),
                'atr': chart_df['ATR'].round(2).tolist(),
            }
        }

        # Current indicator values
        current_values = {
            'price': round(close.iloc[-1], 2),
            'change': round(close.iloc[-1] - close.iloc[-2], 2),
            'changePercent': round((close.iloc[-1] - close.iloc[-2]) / close.iloc[-2] * 100, 2),
            'sma20': round(current['SMA_20'], 2) if pd.notna(current['SMA_20']) else None,
            'sma50': round(current['SMA_50'], 2) if pd.notna(current['SMA_50']) else None,
            'rsi': round(current['RSI'], 2) if pd.notna(current['RSI']) else None,
            'macd': round(current['MACD'], 4) if pd.notna(current['MACD']) else None,
            'macdSignal': round(current['MACD_Signal'], 4) if pd.notna(current['MACD_Signal']) else None,
            'bbUpper': round(current['BB_Upper'], 2) if pd.notna(current['BB_Upper']) else None,
            'bbLower': round(current['BB_Lower'], 2) if pd.notna(current['BB_Lower']) else None,
            'atr': round(current['ATR'], 2) if pd.notna(current['ATR']) else None,
            'volumeRatio': round(current['Volume_Ratio'], 2) if pd.notna(current['Volume_Ratio']) else None,
        }

        return {
            'ticker': ticker,
            'period': period,
            'signals': signals,
            'current': current_values,
            'chartData': chart_data,
            'timestamp': datetime.now().isoformat()
        }

    except Exception as e:
        return {'error': str(e)}


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        query_params = parse_qs(parsed_path.query)

        # Get action parameter
        action = query_params.get('action', [''])[0]
        ticker = query_params.get('ticker', ['AAPL'])[0].upper()

        if action == 'options-chain':
            result = get_options_chain(ticker)
        elif action == 'technical':
            period = query_params.get('period', ['6mo'])[0]
            result = calculate_technical_indicators(ticker, period)
        else:
            result = {
                'error': 'Invalid action. Use ?action=options-chain or ?action=technical',
                'availableActions': ['options-chain', 'technical']
            }

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(result, default=str).encode())
        return

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        return
