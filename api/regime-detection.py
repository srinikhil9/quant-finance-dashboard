"""
Hidden Markov Model (HMM) Regime Detection API
Detect market regimes (bull, bear, high-vol, low-vol) using Baum-Welch EM algorithm
"""

from http.server import BaseHTTPRequestHandler
import json
import numpy as np
from urllib.parse import urlparse, parse_qs
from datetime import datetime, timedelta

try:
    import yfinance as yf
    YFINANCE_AVAILABLE = True
except ImportError:
    YFINANCE_AVAILABLE = False

try:
    from scipy.stats import norm
    from scipy.special import logsumexp
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False


def fetch_returns(ticker: str, period: str = "2y") -> tuple:
    """Fetch historical returns for a ticker"""
    if not YFINANCE_AVAILABLE:
        raise ImportError("yfinance not available")

    stock = yf.Ticker(ticker)
    hist = stock.history(period=period)

    if len(hist) < 50:
        raise ValueError(f"Insufficient data for {ticker}")

    prices = hist['Close'].values
    returns = np.diff(np.log(prices))  # Log returns
    dates = hist.index[1:].strftime('%Y-%m-%d').tolist()

    return returns, prices[1:], dates


def initialize_hmm(n_states: int, returns: np.ndarray) -> dict:
    """Initialize HMM parameters using k-means style initialization"""
    # Sort returns and divide into quantiles for initial means
    sorted_returns = np.sort(returns)
    n = len(sorted_returns)
    quantile_indices = [int(i * n / n_states) for i in range(n_states)]

    means = np.array([sorted_returns[idx] for idx in quantile_indices])
    # Sort means so state 0 is lowest (bearish) and state n-1 is highest (bullish)
    means = np.sort(means)

    # Initialize variances based on data
    overall_var = np.var(returns)
    variances = np.full(n_states, overall_var)

    # Initialize transition matrix (favor staying in same state)
    transition = np.full((n_states, n_states), 0.1 / (n_states - 1))
    np.fill_diagonal(transition, 0.9)
    # Normalize rows
    transition = transition / transition.sum(axis=1, keepdims=True)

    # Initialize uniform start probabilities
    start_prob = np.ones(n_states) / n_states

    return {
        'means': means,
        'variances': variances,
        'transition': transition,
        'start_prob': start_prob
    }


def gaussian_log_likelihood(x: np.ndarray, mean: float, var: float) -> np.ndarray:
    """Compute log likelihood of observations under Gaussian"""
    if var <= 0:
        var = 1e-10
    return -0.5 * np.log(2 * np.pi * var) - 0.5 * (x - mean) ** 2 / var


def forward_algorithm(observations: np.ndarray, params: dict) -> tuple:
    """
    Forward algorithm to compute log likelihood and forward variables
    Returns: log_likelihood, alpha (forward probabilities)
    """
    n_states = len(params['means'])
    T = len(observations)

    # Log emission probabilities
    log_emission = np.zeros((T, n_states))
    for s in range(n_states):
        log_emission[:, s] = gaussian_log_likelihood(
            observations, params['means'][s], params['variances'][s]
        )

    # Log transition matrix
    log_trans = np.log(params['transition'] + 1e-10)
    log_start = np.log(params['start_prob'] + 1e-10)

    # Forward pass (in log space)
    log_alpha = np.zeros((T, n_states))
    log_alpha[0] = log_start + log_emission[0]

    for t in range(1, T):
        for s in range(n_states):
            log_alpha[t, s] = logsumexp(log_alpha[t-1] + log_trans[:, s]) + log_emission[t, s]

    log_likelihood = logsumexp(log_alpha[-1])
    return log_likelihood, log_alpha


def backward_algorithm(observations: np.ndarray, params: dict) -> np.ndarray:
    """Backward algorithm to compute backward variables"""
    n_states = len(params['means'])
    T = len(observations)

    log_emission = np.zeros((T, n_states))
    for s in range(n_states):
        log_emission[:, s] = gaussian_log_likelihood(
            observations, params['means'][s], params['variances'][s]
        )

    log_trans = np.log(params['transition'] + 1e-10)

    log_beta = np.zeros((T, n_states))
    # log_beta[-1] = 0 (log(1) = 0)

    for t in range(T - 2, -1, -1):
        for s in range(n_states):
            log_beta[t, s] = logsumexp(
                log_trans[s, :] + log_emission[t + 1] + log_beta[t + 1]
            )

    return log_beta


def baum_welch_iteration(observations: np.ndarray, params: dict) -> dict:
    """One iteration of Baum-Welch EM algorithm"""
    n_states = len(params['means'])
    T = len(observations)

    # E-step: compute forward and backward variables
    log_likelihood, log_alpha = forward_algorithm(observations, params)
    log_beta = backward_algorithm(observations, params)

    # Compute gamma (state occupation probabilities)
    log_gamma = log_alpha + log_beta
    log_gamma = log_gamma - logsumexp(log_gamma, axis=1, keepdims=True)
    gamma = np.exp(log_gamma)

    # Compute xi (transition probabilities)
    log_emission = np.zeros((T, n_states))
    for s in range(n_states):
        log_emission[:, s] = gaussian_log_likelihood(
            observations, params['means'][s], params['variances'][s]
        )

    log_trans = np.log(params['transition'] + 1e-10)

    log_xi = np.zeros((T - 1, n_states, n_states))
    for t in range(T - 1):
        for i in range(n_states):
            for j in range(n_states):
                log_xi[t, i, j] = (
                    log_alpha[t, i] +
                    log_trans[i, j] +
                    log_emission[t + 1, j] +
                    log_beta[t + 1, j]
                )
        log_xi[t] = log_xi[t] - logsumexp(log_xi[t])
    xi = np.exp(log_xi)

    # M-step: update parameters
    new_params = params.copy()

    # Update start probabilities
    new_params['start_prob'] = gamma[0] + 1e-10
    new_params['start_prob'] /= new_params['start_prob'].sum()

    # Update transition matrix
    new_trans = np.sum(xi, axis=0) + 1e-10
    new_trans /= new_trans.sum(axis=1, keepdims=True)
    new_params['transition'] = new_trans

    # Update emission parameters
    new_means = np.zeros(n_states)
    new_variances = np.zeros(n_states)

    for s in range(n_states):
        gamma_s = gamma[:, s]
        gamma_sum = gamma_s.sum() + 1e-10

        new_means[s] = np.sum(gamma_s * observations) / gamma_sum
        new_variances[s] = np.sum(gamma_s * (observations - new_means[s]) ** 2) / gamma_sum
        new_variances[s] = max(new_variances[s], 1e-10)  # Ensure positive variance

    new_params['means'] = new_means
    new_params['variances'] = new_variances

    return new_params, log_likelihood, gamma


def viterbi_decode(observations: np.ndarray, params: dict) -> np.ndarray:
    """Viterbi algorithm to find most likely state sequence"""
    n_states = len(params['means'])
    T = len(observations)

    log_emission = np.zeros((T, n_states))
    for s in range(n_states):
        log_emission[:, s] = gaussian_log_likelihood(
            observations, params['means'][s], params['variances'][s]
        )

    log_trans = np.log(params['transition'] + 1e-10)
    log_start = np.log(params['start_prob'] + 1e-10)

    # Viterbi forward pass
    log_delta = np.zeros((T, n_states))
    psi = np.zeros((T, n_states), dtype=int)

    log_delta[0] = log_start + log_emission[0]

    for t in range(1, T):
        for s in range(n_states):
            candidates = log_delta[t-1] + log_trans[:, s]
            psi[t, s] = np.argmax(candidates)
            log_delta[t, s] = candidates[psi[t, s]] + log_emission[t, s]

    # Backtrack
    states = np.zeros(T, dtype=int)
    states[-1] = np.argmax(log_delta[-1])

    for t in range(T - 2, -1, -1):
        states[t] = psi[t + 1, states[t + 1]]

    return states


def fit_hmm(returns: np.ndarray, n_states: int, n_iterations: int = 50) -> tuple:
    """Fit HMM using Baum-Welch algorithm"""
    params = initialize_hmm(n_states, returns)

    log_likelihoods = []

    for i in range(n_iterations):
        params, ll, gamma = baum_welch_iteration(returns, params)
        log_likelihoods.append(ll)

        # Check convergence
        if i > 0 and abs(log_likelihoods[-1] - log_likelihoods[-2]) < 1e-6:
            break

    # Decode states
    states = viterbi_decode(returns, params)

    return params, states, log_likelihoods


def get_regime_statistics(returns: np.ndarray, prices: np.ndarray,
                          states: np.ndarray, n_states: int) -> list:
    """Calculate statistics for each regime"""
    stats = []

    for s in range(n_states):
        mask = states == s
        if not np.any(mask):
            continue

        regime_returns = returns[mask]
        days_in_regime = np.sum(mask)

        avg_return = np.mean(regime_returns) * 252 * 100  # Annualized %
        volatility = np.std(regime_returns) * np.sqrt(252) * 100  # Annualized %
        sharpe = avg_return / volatility if volatility > 0 else 0

        stats.append({
            'state': int(s),
            'days': int(days_in_regime),
            'pct_time': round(days_in_regime / len(states) * 100, 1),
            'avg_return_annualized': round(float(avg_return), 2),
            'volatility_annualized': round(float(volatility), 2),
            'sharpe_ratio': round(float(sharpe), 2)
        })

    return stats


def get_regime_labels(params: dict) -> list:
    """Generate descriptive labels for each regime based on mean/variance"""
    n_states = len(params['means'])
    means = params['means']
    variances = params['variances']

    # Classify regimes
    labels = []
    for s in range(n_states):
        mean_pct = means[s] * 252 * 100
        vol_pct = np.sqrt(variances[s]) * np.sqrt(252) * 100

        if mean_pct > 10 and vol_pct < 20:
            label = "Bull Market"
        elif mean_pct > 10:
            label = "High-Vol Bull"
        elif mean_pct < -10 and vol_pct > 25:
            label = "Crisis/Bear"
        elif mean_pct < -10:
            label = "Bear Market"
        elif vol_pct > 30:
            label = "High Volatility"
        elif vol_pct < 15:
            label = "Low Volatility"
        else:
            label = f"Regime {s+1}"

        labels.append({
            'state': s,
            'label': label,
            'description': f"Avg Return: {mean_pct:.1f}%, Vol: {vol_pct:.1f}%"
        })

    return labels


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)

            # Get parameters
            ticker = params.get('ticker', ['SPY'])[0].upper()
            n_states = int(params.get('n_states', ['3'])[0])
            period = params.get('period', ['2y'])[0]

            # Validate
            n_states = min(max(n_states, 2), 4)  # 2-4 states

            # Fetch data
            returns, prices, dates = fetch_returns(ticker, period)

            # Fit HMM
            hmm_params, states, log_likelihoods = fit_hmm(returns, n_states, n_iterations=50)

            # Get statistics
            regime_stats = get_regime_statistics(returns, prices, states, n_states)
            regime_labels = get_regime_labels(hmm_params)

            # Current regime
            current_state = int(states[-1])
            current_label = next((l for l in regime_labels if l['state'] == current_state), {'label': 'Unknown'})

            # Count regime transitions
            transitions = np.sum(np.diff(states) != 0)

            # Prepare time series for visualization (downsample if needed)
            max_points = 500
            if len(dates) > max_points:
                step = len(dates) // max_points
                viz_dates = dates[::step]
                viz_prices = prices[::step].tolist()
                viz_states = states[::step].tolist()
                viz_returns = returns[::step].tolist()
            else:
                viz_dates = dates
                viz_prices = prices.tolist()
                viz_states = states.tolist()
                viz_returns = returns.tolist()

            response = {
                "ticker": ticker,
                "period": period,
                "n_states": n_states,
                "data_points": int(len(returns)),
                "current_regime": {
                    "state": current_state,
                    "label": current_label['label'],
                    "description": current_label['description']
                },
                "total_transitions": int(transitions),
                "avg_regime_duration": round(len(returns) / max(transitions, 1), 1),
                "regime_statistics": regime_stats,
                "regime_labels": regime_labels,
                "hmm_parameters": {
                    "means": [round(float(m) * 252 * 100, 2) for m in hmm_params['means']],  # Annualized %
                    "volatilities": [round(float(np.sqrt(v)) * np.sqrt(252) * 100, 2) for v in hmm_params['variances']],
                    "transition_matrix": [[round(float(p), 4) for p in row] for row in hmm_params['transition']]
                },
                "convergence": {
                    "iterations": len(log_likelihoods),
                    "final_log_likelihood": round(float(log_likelihoods[-1]), 2),
                    "log_likelihoods": [round(float(ll), 2) for ll in log_likelihoods[-20:]]  # Last 20
                },
                "time_series": {
                    "dates": viz_dates,
                    "prices": [round(float(p), 2) for p in viz_prices],
                    "states": viz_states,
                    "returns": [round(float(r) * 100, 4) for r in viz_returns]  # As percentages
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
