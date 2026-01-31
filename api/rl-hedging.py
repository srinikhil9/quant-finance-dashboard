"""
RL Derivative Hedging API
Tabular Q-learning for adaptive delta hedging of European options
"""

from http.server import BaseHTTPRequestHandler
import json
import numpy as np
from urllib.parse import urlparse, parse_qs
import math

try:
    from scipy.stats import norm
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False


def black_scholes_delta(S, K, T, r, sigma, option_type="call"):
    """Calculate Black-Scholes delta"""
    if T <= 0:
        if option_type == "call":
            return 1.0 if S > K else 0.0
        else:
            return -1.0 if S < K else 0.0

    d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))

    if SCIPY_AVAILABLE:
        if option_type == "call":
            return float(norm.cdf(d1))
        else:
            return float(norm.cdf(d1) - 1)
    else:
        # Approximate normal CDF
        def approx_cdf(x):
            return 0.5 * (1 + math.erf(x / math.sqrt(2)))
        if option_type == "call":
            return approx_cdf(d1)
        else:
            return approx_cdf(d1) - 1


def black_scholes_price(S, K, T, r, sigma, option_type="call"):
    """Calculate Black-Scholes option price"""
    if T <= 0:
        if option_type == "call":
            return max(S - K, 0)
        else:
            return max(K - S, 0)

    d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)

    if SCIPY_AVAILABLE:
        if option_type == "call":
            return S * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)
        else:
            return K * np.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)
    else:
        def approx_cdf(x):
            return 0.5 * (1 + math.erf(x / math.sqrt(2)))
        if option_type == "call":
            return S * approx_cdf(d1) - K * np.exp(-r * T) * approx_cdf(d2)
        else:
            return K * np.exp(-r * T) * approx_cdf(-d2) - S * approx_cdf(-d1)


def simulate_gbm_path(S0, r, sigma, T, n_steps):
    """Simulate GBM path for stock price"""
    dt = T / n_steps
    prices = [S0]

    for _ in range(n_steps):
        dW = np.random.normal(0, np.sqrt(dt))
        S_new = prices[-1] * np.exp((r - 0.5 * sigma ** 2) * dt + sigma * dW)
        prices.append(S_new)

    return np.array(prices)


def discretize_state(S, K, T, T_total, delta):
    """
    Discretize continuous state into buckets for Q-table
    State: (moneyness_bucket, time_bucket, delta_bucket)
    """
    # Moneyness buckets: deep ITM, ITM, ATM, OTM, deep OTM
    moneyness = S / K
    if moneyness < 0.9:
        moneyness_bucket = 0  # Deep OTM
    elif moneyness < 0.97:
        moneyness_bucket = 1  # OTM
    elif moneyness < 1.03:
        moneyness_bucket = 2  # ATM
    elif moneyness < 1.1:
        moneyness_bucket = 3  # ITM
    else:
        moneyness_bucket = 4  # Deep ITM

    # Time buckets: 5 buckets from start to expiry
    time_frac = T / T_total if T_total > 0 else 0
    time_bucket = min(4, int(time_frac * 5))

    # Delta buckets: 5 buckets from 0 to 1
    delta_bucket = min(4, max(0, int(delta * 5)))

    return (moneyness_bucket, time_bucket, delta_bucket)


def get_action_from_q(q_table, state, epsilon=0.1):
    """Epsilon-greedy action selection"""
    if np.random.random() < epsilon:
        return np.random.randint(3)  # Random action

    state_key = str(state)
    if state_key not in q_table:
        return 1  # Default: delta hedge

    return np.argmax(q_table[state_key])


def apply_action(current_hedge, bs_delta, action):
    """
    Apply action to get new hedge position
    Actions: 0 = under-hedge (0.8x delta), 1 = delta hedge, 2 = over-hedge (1.2x delta)
    """
    multipliers = [0.8, 1.0, 1.2]
    target = bs_delta * multipliers[action]
    return target


def calculate_hedge_pnl(prices, hedge_positions, K, r, T_total, n_steps, transaction_cost, option_type="call"):
    """Calculate hedging P&L for a path"""
    dt = T_total / n_steps

    # Option payoff at expiry
    S_final = prices[-1]
    if option_type == "call":
        option_payoff = max(S_final - K, 0)
    else:
        option_payoff = max(K - S_final, 0)

    # Hedging P&L
    hedge_pnl = 0
    transaction_costs = 0

    for t in range(len(prices) - 1):
        # P&L from hedge position
        dS = prices[t + 1] - prices[t]
        hedge_pnl += hedge_positions[t] * dS

        # Transaction costs from rebalancing
        if t > 0:
            rebalance = abs(hedge_positions[t] - hedge_positions[t - 1])
            transaction_costs += rebalance * prices[t] * transaction_cost

    # Total hedging error
    hedging_error = option_payoff - hedge_pnl - transaction_costs

    return {
        "option_payoff": float(option_payoff),
        "hedge_pnl": float(hedge_pnl),
        "transaction_costs": float(transaction_costs),
        "hedging_error": float(hedging_error)
    }


def train_q_learning(S0, K, T, r, sigma, n_episodes, n_steps, transaction_cost,
                     learning_rate=0.1, gamma=0.95, epsilon_start=1.0, epsilon_end=0.1):
    """
    Train Q-learning agent for delta hedging
    """
    q_table = {}
    epsilon = epsilon_start
    epsilon_decay = (epsilon_start - epsilon_end) / n_episodes

    episode_rewards = []
    episode_errors = []

    for episode in range(n_episodes):
        # Simulate path
        prices = simulate_gbm_path(S0, r, sigma, T, n_steps)
        dt = T / n_steps

        total_reward = 0
        hedge_positions = []
        states_visited = []
        actions_taken = []

        for t in range(n_steps):
            S = prices[t]
            T_remaining = T - t * dt

            # Calculate BS delta
            bs_delta = black_scholes_delta(S, K, T_remaining, r, sigma)

            # Get state
            state = discretize_state(S, K, T_remaining, T, bs_delta)
            states_visited.append(state)

            # Get action
            action = get_action_from_q(q_table, state, epsilon)
            actions_taken.append(action)

            # Apply action
            hedge_position = apply_action(0, bs_delta, action)
            hedge_positions.append(hedge_position)

            # Calculate immediate reward (negative of hedging cost + transaction cost)
            if t > 0:
                dS = prices[t] - prices[t - 1]
                hedge_return = hedge_positions[t - 1] * dS
                rebalance = abs(hedge_position - hedge_positions[t - 1])
                tc = rebalance * S * transaction_cost
                reward = hedge_return - tc - 0.01 * abs(bs_delta - hedge_position)  # Penalize deviation
            else:
                reward = 0

            total_reward += reward

            # Update Q-table
            state_key = str(state)
            if state_key not in q_table:
                q_table[state_key] = [0.0, 0.0, 0.0]

            # For non-terminal states, estimate future value
            if t < n_steps - 1:
                next_state = discretize_state(prices[t + 1], K, T - (t + 1) * dt, T,
                                             black_scholes_delta(prices[t + 1], K, T - (t + 1) * dt, r, sigma))
                next_state_key = str(next_state)
                if next_state_key not in q_table:
                    q_table[next_state_key] = [0.0, 0.0, 0.0]
                max_next_q = max(q_table[next_state_key])
            else:
                max_next_q = 0

            # Q-learning update
            q_table[state_key][action] += learning_rate * (reward + gamma * max_next_q - q_table[state_key][action])

        # Calculate final hedging error
        result = calculate_hedge_pnl(prices, hedge_positions, K, r, T, n_steps, transaction_cost)

        episode_rewards.append(total_reward)
        episode_errors.append(abs(result["hedging_error"]))

        # Decay epsilon
        epsilon = max(epsilon_end, epsilon - epsilon_decay)

    return q_table, episode_rewards, episode_errors


def evaluate_strategies(S0, K, T, r, sigma, q_table, n_paths, n_steps, transaction_cost):
    """
    Evaluate RL vs BS delta hedging on test paths
    """
    rl_errors = []
    bs_errors = []
    sample_path = None
    sample_rl_hedges = None
    sample_bs_hedges = None

    dt = T / n_steps

    for path_idx in range(n_paths):
        prices = simulate_gbm_path(S0, r, sigma, T, n_steps)

        # RL hedging
        rl_hedges = []
        for t in range(n_steps):
            S = prices[t]
            T_remaining = T - t * dt
            bs_delta = black_scholes_delta(S, K, T_remaining, r, sigma)
            state = discretize_state(S, K, T_remaining, T, bs_delta)

            state_key = str(state)
            if state_key in q_table:
                action = np.argmax(q_table[state_key])
            else:
                action = 1  # Default to delta hedge

            hedge = apply_action(0, bs_delta, action)
            rl_hedges.append(hedge)

        rl_result = calculate_hedge_pnl(prices, rl_hedges, K, r, T, n_steps, transaction_cost)
        rl_errors.append(rl_result["hedging_error"])

        # BS delta hedging
        bs_hedges = []
        for t in range(n_steps):
            S = prices[t]
            T_remaining = T - t * dt
            bs_delta = black_scholes_delta(S, K, T_remaining, r, sigma)
            bs_hedges.append(bs_delta)

        bs_result = calculate_hedge_pnl(prices, bs_hedges, K, r, T, n_steps, transaction_cost)
        bs_errors.append(bs_result["hedging_error"])

        # Save first path for visualization
        if path_idx == 0:
            sample_path = prices.tolist()
            sample_rl_hedges = rl_hedges
            sample_bs_hedges = bs_hedges

    return {
        "rl_errors": rl_errors,
        "bs_errors": bs_errors,
        "sample_path": sample_path,
        "sample_rl_hedges": sample_rl_hedges,
        "sample_bs_hedges": sample_bs_hedges
    }


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)

            # Get parameters
            S0 = float(params.get('S', ['100'])[0])
            K = float(params.get('K', ['100'])[0])
            T = float(params.get('T', ['0.25'])[0])  # Time to expiry in years
            sigma = float(params.get('sigma', ['0.2'])[0])
            r = float(params.get('r', ['0.05'])[0])
            n_episodes = int(params.get('episodes', ['200'])[0])
            transaction_cost = float(params.get('tc', ['0.001'])[0])

            # Limits for Vercel
            n_episodes = min(n_episodes, 500)
            n_steps = 50  # Daily hedging for ~3 months
            n_test_paths = 100

            # Train Q-learning agent
            np.random.seed(42)
            q_table, episode_rewards, episode_errors = train_q_learning(
                S0, K, T, r, sigma, n_episodes, n_steps, transaction_cost
            )

            # Evaluate on test paths
            eval_results = evaluate_strategies(
                S0, K, T, r, sigma, q_table, n_test_paths, n_steps, transaction_cost
            )

            # Calculate statistics
            rl_errors = np.array(eval_results["rl_errors"])
            bs_errors = np.array(eval_results["bs_errors"])

            rl_mae = np.mean(np.abs(rl_errors))
            bs_mae = np.mean(np.abs(bs_errors))

            rl_std = np.std(rl_errors)
            bs_std = np.std(bs_errors)

            # Format Q-table for visualization (subset)
            q_table_viz = {}
            for state_key, values in list(q_table.items())[:50]:  # Limit for response size
                q_table_viz[state_key] = [round(v, 4) for v in values]

            # Generate histogram bins
            all_errors = np.concatenate([rl_errors, bs_errors])
            bins = np.linspace(min(all_errors), max(all_errors), 21)
            rl_hist, _ = np.histogram(rl_errors, bins)
            bs_hist, _ = np.histogram(bs_errors, bins)

            # Learning curve (smooth)
            window = max(1, len(episode_errors) // 20)
            smoothed_errors = []
            for i in range(0, len(episode_errors), window):
                smoothed_errors.append(np.mean(episode_errors[i:i+window]))

            response = {
                "parameters": {
                    "S0": S0,
                    "K": K,
                    "T": T,
                    "sigma": sigma,
                    "r": r,
                    "transaction_cost": transaction_cost,
                    "n_episodes": n_episodes,
                    "n_test_paths": n_test_paths
                },
                "training": {
                    "final_episode_error": round(float(episode_errors[-1]), 4),
                    "learning_curve": [round(e, 4) for e in smoothed_errors],
                    "learning_curve_x": list(range(0, len(episode_errors), window))
                },
                "evaluation": {
                    "rl": {
                        "mean_abs_error": round(float(rl_mae), 4),
                        "std_error": round(float(rl_std), 4),
                        "mean_error": round(float(np.mean(rl_errors)), 4)
                    },
                    "bs_delta": {
                        "mean_abs_error": round(float(bs_mae), 4),
                        "std_error": round(float(bs_std), 4),
                        "mean_error": round(float(np.mean(bs_errors)), 4)
                    },
                    "improvement": {
                        "mae_reduction": round(float((bs_mae - rl_mae) / bs_mae * 100), 2) if bs_mae > 0 else 0,
                        "std_reduction": round(float((bs_std - rl_std) / bs_std * 100), 2) if bs_std > 0 else 0
                    }
                },
                "histogram": {
                    "bins": [round(float(b), 2) for b in bins[:-1]],
                    "rl_counts": [int(c) for c in rl_hist],
                    "bs_counts": [int(c) for c in bs_hist]
                },
                "sample_path": {
                    "prices": [round(float(p), 2) for p in eval_results["sample_path"]],
                    "rl_hedges": [round(float(h), 4) for h in eval_results["sample_rl_hedges"]],
                    "bs_hedges": [round(float(h), 4) for h in eval_results["sample_bs_hedges"]],
                    "time_steps": list(range(n_steps))
                },
                "q_table_sample": q_table_viz,
                "actions": {
                    "0": "Under-hedge (0.8× delta)",
                    "1": "Delta hedge (1.0× delta)",
                    "2": "Over-hedge (1.2× delta)"
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
