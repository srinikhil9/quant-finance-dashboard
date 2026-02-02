"""
Market Analysis API - Combined endpoint for Options Chain, Technical Analysis, and Pairs Trading
Uses ?action=options-chain, ?action=technical, or ?action=pairs to route requests

This consolidation keeps us under Vercel's 12 serverless function limit.
"""

from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import yfinance as yf
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from scipy import stats
import math


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


# ============================================================================
# PAIRS TRADING / COINTEGRATION FUNCTIONS
# ============================================================================

def adf_test(series):
    """
    Augmented Dickey-Fuller test for stationarity
    Returns test statistic and p-value
    """
    n = len(series)
    y = np.array(series)
    dy = np.diff(y)
    y_lag = y[:-1]

    # Add constant and trend
    X = np.column_stack([np.ones(n-1), y_lag])

    # OLS regression
    XtX_inv = np.linalg.inv(X.T @ X)
    beta = XtX_inv @ X.T @ dy
    residuals = dy - X @ beta
    sigma2 = np.sum(residuals**2) / (n - 3)

    # t-statistic for y_lag coefficient
    se = np.sqrt(sigma2 * XtX_inv[1, 1])
    t_stat = beta[1] / se

    # Approximate p-value (simplified)
    if t_stat < -3.5:
        p_value = 0.01
    elif t_stat < -2.9:
        p_value = 0.05
    elif t_stat < -2.6:
        p_value = 0.10
    else:
        p_value = 0.5

    return float(t_stat), p_value


def calculate_hedge_ratio(series1, series2):
    """Calculate optimal hedge ratio using OLS"""
    slope, intercept, r_value, p_value, std_err = stats.linregress(series2, series1)
    return float(slope), float(intercept), float(r_value**2)


def calculate_spread(series1, series2, hedge_ratio, intercept):
    """Calculate spread between two series"""
    return (np.array(series1) - hedge_ratio * np.array(series2) - intercept).tolist()


def calculate_zscore(spread, lookback=20):
    """Calculate rolling z-score of spread"""
    spread = np.array(spread)
    n = len(spread)
    zscore = np.zeros(n)
    for i in range(lookback, n):
        window = spread[i-lookback:i]
        zscore[i] = (spread[i] - np.mean(window)) / (np.std(window) + 1e-10)
    return zscore.tolist()


def generate_signals(zscore, entry_threshold=2.0, exit_threshold=0.5):
    """Generate trading signals based on z-score"""
    signals = []
    position = 0  # 0 = flat, 1 = long spread, -1 = short spread

    for z in zscore:
        if position == 0:
            if z < -entry_threshold:
                position = 1  # Long spread (buy series1, sell series2)
                signals.append(1)
            elif z > entry_threshold:
                position = -1  # Short spread (sell series1, buy series2)
                signals.append(-1)
            else:
                signals.append(0)
        elif position == 1:
            if z > -exit_threshold:
                position = 0  # Exit long
                signals.append(0)
            else:
                signals.append(1)
        elif position == -1:
            if z < exit_threshold:
                position = 0  # Exit short
                signals.append(0)
            else:
                signals.append(-1)

    return signals


def backtest_strategy(prices1, prices2, signals, hedge_ratio):
    """Backtest pairs trading strategy"""
    returns1 = np.diff(prices1) / prices1[:-1]
    returns2 = np.diff(prices2) / prices2[:-1]

    strategy_returns = []
    for i in range(len(returns1)):
        sig = signals[i] if i < len(signals) else 0
        # Long spread = long stock1, short hedge_ratio * stock2
        ret = sig * (returns1[i] - hedge_ratio * returns2[i])
        strategy_returns.append(ret)

    cumulative = np.cumprod(1 + np.array(strategy_returns)).tolist()
    total_return = float(cumulative[-1] - 1) if cumulative else 0
    sharpe = float(np.mean(strategy_returns) / (np.std(strategy_returns) + 1e-10) * np.sqrt(252))
    max_dd = float(np.max(1 - np.array(cumulative) / np.maximum.accumulate(cumulative)))

    return {
        "cumulative_returns": [round(c, 4) for c in cumulative],
        "total_return": round(total_return * 100, 2),
        "sharpe_ratio": round(sharpe, 2),
        "max_drawdown": round(max_dd * 100, 2),
        "n_trades": sum(1 for i in range(1, len(signals)) if signals[i] != signals[i-1])
    }


def analyze_pairs_trading(ticker1: str, ticker2: str, entry_threshold: float = 2.0,
                          exit_threshold: float = 0.5, period: str = '2y'):
    """Full pairs trading analysis"""
    try:
        stock1 = yf.Ticker(ticker1)
        stock2 = yf.Ticker(ticker2)
        df1 = stock1.history(period=period)
        df2 = stock2.history(period=period)

        if df1.empty or df2.empty:
            return {'error': f'No data found for {ticker1} or {ticker2}'}

        # Align dates
        common_dates = df1.index.intersection(df2.index)
        prices1 = df1.loc[common_dates, "Close"].values.tolist()
        prices2 = df2.loc[common_dates, "Close"].values.tolist()
        dates = common_dates.strftime("%Y-%m-%d").tolist()

        # Calculate hedge ratio and spread
        hedge_ratio, intercept, r_squared = calculate_hedge_ratio(prices1, prices2)
        spread = calculate_spread(prices1, prices2, hedge_ratio, intercept)

        # Test for cointegration (ADF test on spread)
        adf_stat, p_value = adf_test(spread)
        is_cointegrated = p_value < 0.05

        # Calculate z-score and generate signals
        zscore = calculate_zscore(spread)
        signals = generate_signals(zscore, entry_threshold, exit_threshold)

        # Backtest
        backtest_results = backtest_strategy(prices1, prices2, signals, hedge_ratio)

        # Subsample for visualization
        max_points = 200
        step = max(1, len(dates) // max_points)

        return {
            "ticker1": ticker1,
            "ticker2": ticker2,
            "period": period,
            "data_points": len(prices1),
            "cointegration": {
                "adf_statistic": round(adf_stat, 4),
                "p_value": round(p_value, 4),
                "is_cointegrated": is_cointegrated,
                "hedge_ratio": round(hedge_ratio, 4),
                "intercept": round(intercept, 4),
                "r_squared": round(r_squared, 4),
            },
            "thresholds": {
                "entry": entry_threshold,
                "exit": exit_threshold,
            },
            "backtest": backtest_results,
            "time_series": {
                "dates": dates[::step],
                "prices1": [round(p, 2) for p in prices1[::step]],
                "prices2": [round(p, 2) for p in prices2[::step]],
                "spread": [round(s, 4) for s in spread[::step]],
                "zscore": [round(z, 4) for z in zscore[::step]],
                "signals": signals[::step],
            },
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        return {'error': str(e)}


# ============================================================================
# BACKTESTING ENGINE FUNCTIONS
# ============================================================================

def backtest_strategy(ticker: str, strategy: str, period: str = '2y',
                      short_window: int = 20, long_window: int = 50,
                      rsi_oversold: int = 30, rsi_overbought: int = 70,
                      initial_capital: float = 10000):
    """Run backtest for various trading strategies"""
    try:
        stock = yf.Ticker(ticker)
        df = stock.history(period=period)

        if df.empty or len(df) < long_window + 50:
            return {'error': f'Insufficient data for {ticker}'}

        close = df['Close'].values
        high = df['High'].values
        low = df['Low'].values
        dates = df.index.strftime('%Y-%m-%d').tolist()

        # Generate signals based on strategy
        signals = np.zeros(len(close))

        if strategy == 'ma_crossover':
            # Moving Average Crossover
            short_ma = np.convolve(close, np.ones(short_window)/short_window, mode='valid')
            long_ma = np.convolve(close, np.ones(long_window)/long_window, mode='valid')

            # Align arrays
            offset = long_window - short_window
            short_ma = short_ma[offset:]

            # Pad signals
            pad = long_window - 1
            for i in range(len(short_ma)):
                if short_ma[i] > long_ma[i]:
                    signals[pad + i] = 1  # Buy
                else:
                    signals[pad + i] = -1  # Sell

        elif strategy == 'rsi':
            # RSI Strategy
            delta = np.diff(close)
            gain = np.where(delta > 0, delta, 0)
            loss = np.where(delta < 0, -delta, 0)

            avg_gain = np.zeros(len(close))
            avg_loss = np.zeros(len(close))

            # Initial averages
            avg_gain[14] = np.mean(gain[:14])
            avg_loss[14] = np.mean(loss[:14])

            for i in range(15, len(close)):
                avg_gain[i] = (avg_gain[i-1] * 13 + gain[i-1]) / 14
                avg_loss[i] = (avg_loss[i-1] * 13 + loss[i-1]) / 14

            rs = np.where(avg_loss > 0, avg_gain / avg_loss, 100)
            rsi = 100 - (100 / (1 + rs))

            for i in range(14, len(close)):
                if rsi[i] < rsi_oversold:
                    signals[i] = 1  # Buy (oversold)
                elif rsi[i] > rsi_overbought:
                    signals[i] = -1  # Sell (overbought)

        elif strategy == 'bollinger':
            # Bollinger Band Breakout
            window = 20
            sma = np.convolve(close, np.ones(window)/window, mode='valid')
            rolling_std = np.array([np.std(close[i:i+window]) for i in range(len(close)-window+1)])

            upper = sma + 2 * rolling_std
            lower = sma - 2 * rolling_std

            pad = window - 1
            for i in range(len(sma)):
                if close[pad + i] < lower[i]:
                    signals[pad + i] = 1  # Buy (below lower band)
                elif close[pad + i] > upper[i]:
                    signals[pad + i] = -1  # Sell (above upper band)

        elif strategy == 'buy_hold':
            # Simple buy and hold
            signals[:] = 1

        # Calculate returns
        returns = np.diff(close) / close[:-1]
        returns = np.insert(returns, 0, 0)

        # Position tracking (1 = long, 0 = flat, -1 = short)
        position = 0
        positions = np.zeros(len(close))
        trades = []

        for i in range(len(signals)):
            if signals[i] == 1 and position <= 0:  # Buy signal
                position = 1
                trades.append({'date': dates[i], 'type': 'BUY', 'price': float(close[i])})
            elif signals[i] == -1 and position >= 0:  # Sell signal
                position = 0 if position == 1 else -1
                if trades and trades[-1]['type'] == 'BUY':
                    trades[-1]['exitDate'] = dates[i]
                    trades[-1]['exitPrice'] = float(close[i])
                    trades[-1]['pnl'] = float(close[i] - trades[-1]['price'])
                    trades[-1]['pnlPercent'] = float((close[i] - trades[-1]['price']) / trades[-1]['price'] * 100)
            positions[i] = position

        # Strategy returns
        strategy_returns = positions[:-1] * returns[1:]
        strategy_returns = np.insert(strategy_returns, 0, 0)

        # Cumulative returns
        strategy_cumulative = np.cumprod(1 + strategy_returns)
        buyhold_cumulative = np.cumprod(1 + returns)

        # Performance metrics
        total_return = float((strategy_cumulative[-1] - 1) * 100)
        buyhold_return = float((buyhold_cumulative[-1] - 1) * 100)

        ann_return = float(np.mean(strategy_returns) * 252 * 100)
        ann_vol = float(np.std(strategy_returns) * np.sqrt(252) * 100)
        sharpe = ann_return / ann_vol if ann_vol > 0 else 0

        # Max drawdown
        running_max = np.maximum.accumulate(strategy_cumulative)
        drawdown = (strategy_cumulative - running_max) / running_max
        max_drawdown = float(np.min(drawdown) * 100)

        # Win rate
        winning_trades = [t for t in trades if 'pnl' in t and t['pnl'] > 0]
        losing_trades = [t for t in trades if 'pnl' in t and t['pnl'] < 0]
        n_trades = len([t for t in trades if 'pnl' in t])
        win_rate = float(len(winning_trades) / n_trades * 100) if n_trades > 0 else 0

        # Average win/loss
        avg_win = float(np.mean([t['pnlPercent'] for t in winning_trades])) if winning_trades else 0
        avg_loss = float(np.mean([t['pnlPercent'] for t in losing_trades])) if losing_trades else 0

        # Profit factor
        gross_profit = sum(t['pnl'] for t in winning_trades) if winning_trades else 0
        gross_loss = abs(sum(t['pnl'] for t in losing_trades)) if losing_trades else 1
        profit_factor = float(gross_profit / gross_loss) if gross_loss > 0 else 0

        # Final equity
        final_equity = initial_capital * strategy_cumulative[-1]

        # Subsample for chart
        step = max(1, len(dates) // 200)

        return {
            'ticker': ticker,
            'strategy': strategy,
            'period': period,
            'parameters': {
                'shortWindow': short_window,
                'longWindow': long_window,
                'rsiOversold': rsi_oversold,
                'rsiOverbought': rsi_overbought,
                'initialCapital': initial_capital
            },
            'performance': {
                'totalReturn': round(total_return, 2),
                'buyholdReturn': round(buyhold_return, 2),
                'annualizedReturn': round(ann_return, 2),
                'annualizedVolatility': round(ann_vol, 2),
                'sharpeRatio': round(sharpe, 2),
                'maxDrawdown': round(max_drawdown, 2),
                'winRate': round(win_rate, 1),
                'avgWin': round(avg_win, 2),
                'avgLoss': round(avg_loss, 2),
                'profitFactor': round(profit_factor, 2),
                'numTrades': n_trades,
                'finalEquity': round(final_equity, 2)
            },
            'trades': trades[-20:],  # Last 20 trades
            'chartData': {
                'dates': dates[::step],
                'prices': [round(p, 2) for p in close[::step]],
                'strategyEquity': [round(c * initial_capital, 2) for c in strategy_cumulative[::step]],
                'buyholdEquity': [round(c * initial_capital, 2) for c in buyhold_cumulative[::step]],
                'signals': [int(s) for s in signals[::step]],
                'drawdown': [round(d * 100, 2) for d in drawdown[::step]]
            },
            'timestamp': datetime.now().isoformat()
        }

    except Exception as e:
        return {'error': str(e)}


# ============================================================================
# PORTFOLIO ANALYTICS FUNCTIONS
# ============================================================================

def analyze_portfolio(tickers_str: str, shares_str: str, cost_basis_str: str, period: str = '1y'):
    """Comprehensive portfolio analysis"""
    try:
        # Parse inputs
        tickers = [t.strip().upper() for t in tickers_str.split(',')]
        shares = [float(s.strip()) for s in shares_str.split(',')]
        cost_basis = [float(c.strip()) for c in cost_basis_str.split(',')]

        if len(tickers) != len(shares) or len(tickers) != len(cost_basis):
            return {'error': 'Tickers, shares, and cost basis must have the same number of items'}

        if len(tickers) > 10:
            return {'error': 'Maximum 10 tickers allowed'}

        # Fetch data for all tickers
        holdings = []
        all_returns = []
        total_cost = 0
        total_value = 0

        for i, ticker in enumerate(tickers):
            stock = yf.Ticker(ticker)
            hist = stock.history(period=period)

            if hist.empty:
                return {'error': f'No data found for {ticker}'}

            current_price = float(hist['Close'].iloc[-1])
            position_value = current_price * shares[i]
            position_cost = cost_basis[i] * shares[i]
            pnl = position_value - position_cost
            pnl_pct = (pnl / position_cost) * 100 if position_cost > 0 else 0

            # Calculate daily returns
            returns = hist['Close'].pct_change().dropna()
            all_returns.append(returns)

            # Get stock info
            try:
                info = stock.info
                sector = info.get('sector', 'Unknown')
                name = info.get('shortName', ticker)
            except:
                sector = 'Unknown'
                name = ticker

            holdings.append({
                'ticker': ticker,
                'name': name,
                'shares': shares[i],
                'costBasis': round(cost_basis[i], 2),
                'currentPrice': round(current_price, 2),
                'positionValue': round(position_value, 2),
                'positionCost': round(position_cost, 2),
                'pnl': round(pnl, 2),
                'pnlPercent': round(pnl_pct, 2),
                'sector': sector
            })

            total_cost += position_cost
            total_value += position_value

        # Calculate portfolio weights
        weights = np.array([h['positionValue'] for h in holdings]) / total_value
        for i, h in enumerate(holdings):
            h['weight'] = round(weights[i] * 100, 2)

        # Align all return series to common dates
        min_len = min(len(r) for r in all_returns)
        aligned_returns = np.column_stack([r.values[-min_len:] for r in all_returns])
        dates = all_returns[0].index[-min_len:].strftime('%Y-%m-%d').tolist()

        # Portfolio returns (weighted)
        portfolio_returns = aligned_returns @ weights

        # Portfolio statistics
        ann_return = float(np.mean(portfolio_returns) * 252 * 100)
        ann_volatility = float(np.std(portfolio_returns) * np.sqrt(252) * 100)
        sharpe = ann_return / ann_volatility if ann_volatility > 0 else 0

        # Max drawdown
        cumulative = np.cumprod(1 + portfolio_returns)
        running_max = np.maximum.accumulate(cumulative)
        drawdown = (cumulative - running_max) / running_max
        max_drawdown = float(np.min(drawdown) * 100)

        # Correlation matrix
        corr_matrix = np.corrcoef(aligned_returns.T)

        # Sector allocation
        sectors = {}
        for h in holdings:
            sector = h['sector']
            if sector not in sectors:
                sectors[sector] = 0
            sectors[sector] += h['weight']

        sector_allocation = [{'sector': k, 'weight': round(v, 2)} for k, v in sectors.items()]

        # Portfolio VaR (95%)
        var_95 = float(np.percentile(portfolio_returns, 5) * total_value)

        # Beta (vs SPY if not in portfolio)
        try:
            spy = yf.Ticker('SPY')
            spy_hist = spy.history(period=period)
            spy_returns = spy_hist['Close'].pct_change().dropna().values[-min_len:]
            cov = np.cov(portfolio_returns, spy_returns)[0, 1]
            var_market = np.var(spy_returns)
            beta = float(cov / var_market) if var_market > 0 else 1.0
        except:
            beta = 1.0

        # Performance chart data
        cumulative_returns = np.cumprod(1 + portfolio_returns).tolist()

        return {
            'holdings': holdings,
            'summary': {
                'totalValue': round(total_value, 2),
                'totalCost': round(total_cost, 2),
                'totalPnl': round(total_value - total_cost, 2),
                'totalPnlPercent': round((total_value - total_cost) / total_cost * 100, 2) if total_cost > 0 else 0,
                'numPositions': len(holdings)
            },
            'metrics': {
                'annualizedReturn': round(ann_return, 2),
                'annualizedVolatility': round(ann_volatility, 2),
                'sharpeRatio': round(sharpe, 2),
                'maxDrawdown': round(max_drawdown, 2),
                'beta': round(beta, 2),
                'var95': round(var_95, 2)
            },
            'sectorAllocation': sector_allocation,
            'correlationMatrix': {
                'tickers': tickers,
                'matrix': [[round(corr_matrix[i][j], 3) for j in range(len(tickers))] for i in range(len(tickers))]
            },
            'performance': {
                'dates': dates[::5],  # Subsample for chart
                'cumulativeReturns': [round(c, 4) for c in cumulative_returns[::5]]
            },
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
        elif action == 'pairs':
            ticker1 = query_params.get('ticker1', ['KO'])[0].upper()
            ticker2 = query_params.get('ticker2', ['PEP'])[0].upper()
            entry_threshold = float(query_params.get('entry', ['2.0'])[0])
            exit_threshold = float(query_params.get('exit', ['0.5'])[0])
            period = query_params.get('period', ['2y'])[0]
            result = analyze_pairs_trading(ticker1, ticker2, entry_threshold, exit_threshold, period)
        elif action == 'portfolio':
            tickers = query_params.get('tickers', ['AAPL,MSFT,GOOGL'])[0]
            shares = query_params.get('shares', ['10,10,10'])[0]
            cost_basis = query_params.get('costBasis', ['150,300,140'])[0]
            period = query_params.get('period', ['1y'])[0]
            result = analyze_portfolio(tickers, shares, cost_basis, period)
        elif action == 'backtest':
            strategy = query_params.get('strategy', ['ma_crossover'])[0]
            period = query_params.get('period', ['2y'])[0]
            short_window = int(query_params.get('shortWindow', ['20'])[0])
            long_window = int(query_params.get('longWindow', ['50'])[0])
            rsi_oversold = int(query_params.get('rsiOversold', ['30'])[0])
            rsi_overbought = int(query_params.get('rsiOverbought', ['70'])[0])
            initial_capital = float(query_params.get('capital', ['10000'])[0])
            result = backtest_strategy(ticker, strategy, period, short_window, long_window,
                                       rsi_oversold, rsi_overbought, initial_capital)
        else:
            result = {
                'error': 'Invalid action. Use ?action=options-chain, ?action=technical, ?action=pairs, ?action=portfolio, or ?action=backtest',
                'availableActions': ['options-chain', 'technical', 'pairs', 'portfolio', 'backtest']
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
