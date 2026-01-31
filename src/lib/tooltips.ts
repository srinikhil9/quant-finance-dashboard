/**
 * Centralized tooltip content for all financial terms and inputs
 * Used across all dashboard modules for consistent explanations
 */

// ============================================
// BLACK-SCHOLES MODULE
// ============================================
export const blackScholesTooltips = {
  // Inputs
  stockPrice: "The current market price of the underlying stock. This is the price at which the stock is trading right now.",
  strikePrice: "The price at which the option holder can buy (call) or sell (put) the underlying stock. Also called the exercise price.",
  timeToMaturity: "The time remaining until the option expires, expressed in years. For example, 6 months = 0.5 years.",
  volatility: "A measure of how much the stock price is expected to fluctuate. Higher volatility means more price movement and higher option prices. Expressed as an annual percentage.",
  riskFreeRate: "The theoretical return on a risk-free investment (like US Treasury bonds). Used to discount future cash flows to present value.",
  optionType: "Call options give the right to BUY at the strike price. Put options give the right to SELL at the strike price.",

  // Outputs - Option Prices
  callPrice: "The theoretical fair value of a call option based on the Black-Scholes model. This is what you should pay for the right to buy the stock at the strike price.",
  putPrice: "The theoretical fair value of a put option. This is what you should pay for the right to sell the stock at the strike price.",

  // Greeks
  delta: "Measures how much the option price changes for a $1 change in the stock price. Delta of 0.5 means the option price moves $0.50 for every $1 move in the stock.",
  gamma: "Measures how fast Delta changes. High Gamma means Delta is unstable and will change quickly as the stock price moves.",
  theta: "Time decay - how much value the option loses each day just from the passage of time. Options lose value as they approach expiration.",
  vega: "Measures sensitivity to volatility changes. Vega of 0.20 means the option price changes by $0.20 for each 1% change in implied volatility.",
  rho: "Measures sensitivity to interest rate changes. Less important in practice since rates change slowly.",

  // Tutorial
  tutorial: {
    title: "How to Use Black-Scholes Calculator",
    description: "The Black-Scholes model calculates theoretical option prices and risk metrics (Greeks) based on market conditions.",
    steps: [
      "Enter the current stock price and your target strike price",
      "Set the time until expiration (in years) and expected volatility",
      "Adjust the risk-free rate (default is typically fine)",
      "Click 'Calculate' to see option prices and Greeks"
    ]
  }
};

// ============================================
// MONTE CARLO MODULE
// ============================================
export const monteCarloTooltips = {
  // Inputs
  ticker: "The stock symbol to simulate. Enter any valid ticker like AAPL, MSFT, GOOGL, etc.",
  initialInvestment: "The starting amount of money in your portfolio. All returns will be calculated based on this amount.",
  numSimulations: "How many random price paths to simulate. More simulations = more accurate results but slower calculation. 1,000-10,000 is typical.",
  timeHorizon: "How far into the future to project the portfolio. 1 year = 252 trading days.",

  // Outputs
  expectedValue: "The average portfolio value across all simulations. This is your 'expected' outcome based on historical patterns.",
  medianValue: "The middle value when all simulations are sorted. Often more realistic than the mean since it's less affected by extreme outcomes.",
  bestCase: "The 95th percentile outcome - only 5% of simulations did better than this. Represents an optimistic scenario.",
  worstCase: "The 5th percentile outcome - only 5% of simulations did worse. Use this for risk planning.",
  probabilityOfProfit: "The percentage of simulations that ended with more money than you started with.",
  probabilityOfLoss: "The percentage of simulations that ended with less money than you started with.",

  // Tutorial
  tutorial: {
    title: "How to Use Monte Carlo Simulation",
    description: "Monte Carlo simulation runs thousands of random scenarios to show the range of possible portfolio outcomes.",
    steps: [
      "Enter a stock ticker and your initial investment amount",
      "Choose how many simulations to run (more = slower but more accurate)",
      "Set your time horizon (how far ahead to project)",
      "Click 'Run Simulation' to see the distribution of outcomes"
    ]
  }
};

// ============================================
// VALUE AT RISK (VaR) MODULE
// ============================================
export const varTooltips = {
  // Inputs
  ticker: "The stock or asset to analyze. VaR will be calculated based on this asset's historical price movements.",
  confidenceLevel: "How confident you want to be in the VaR estimate. 95% means you're 95% sure losses won't exceed the VaR. Higher confidence = larger VaR number.",
  portfolioValue: "The total dollar amount at risk. VaR will tell you the maximum expected loss on this amount.",
  period: "Historical data period to use for calculations. Longer periods capture more market conditions but may include outdated patterns.",

  // Outputs
  historicalVaR: "VaR calculated by looking at actual historical returns and finding the worst X% of days. Simple and intuitive.",
  parametricVaR: "VaR calculated assuming returns follow a normal (bell curve) distribution. Fast but may underestimate extreme events.",
  monteCarloVaR: "VaR calculated by simulating thousands of random scenarios. Flexible but computationally intensive.",
  cvar: "Conditional VaR (Expected Shortfall) - the average loss when losses exceed VaR. Answers: 'When things go bad, HOW bad?'",
  annualizedReturn: "The average yearly return based on historical data, expressed as a percentage.",
  annualizedVolatility: "How much the asset's price typically fluctuates in a year. Higher = more risk.",

  // Tutorial
  tutorial: {
    title: "How to Use Value at Risk Calculator",
    description: "VaR estimates the maximum expected loss over a given time period at a specified confidence level.",
    steps: [
      "Enter a stock ticker and your portfolio value",
      "Set confidence level (95% or 99% are common choices)",
      "Choose historical period (1-5 years of data)",
      "Click 'Calculate VaR' to see risk estimates"
    ]
  }
};

// ============================================
// VOLATILITY MODULE
// ============================================
export const volatilityTooltips = {
  // Inputs
  ticker: "The stock to analyze for volatility patterns.",
  period: "Historical data period. Longer periods show more volatility regimes.",
  ewmaSpan: "EWMA decay factor - how quickly older data loses importance. Lower span = more responsive to recent changes.",
  garchWindow: "Window size for GARCH model estimation. Affects how the model captures volatility clustering.",

  // Outputs
  currentVolatility: "The most recent volatility estimate, annualized as a percentage.",
  averageVolatility: "The mean volatility over the entire period.",
  maxVolatility: "The highest volatility observed - often during market crashes or major news events.",
  minVolatility: "The lowest volatility observed - typically during calm, trending markets.",

  // Models
  historicalVolatility: "Simple rolling standard deviation of returns. Easy to understand but treats all data equally.",
  ewma: "Exponentially Weighted Moving Average - gives more weight to recent data. Captures volatility changes faster than simple historical.",
  garch: "Generalized Autoregressive Conditional Heteroskedasticity - a sophisticated model that captures 'volatility clustering' (high volatility tends to follow high volatility).",

  // Tutorial
  tutorial: {
    title: "How to Use Volatility Modeling",
    description: "Compare different volatility models to understand how asset risk changes over time.",
    steps: [
      "Enter a stock ticker to analyze",
      "Choose a historical period for analysis",
      "Adjust EWMA span and GARCH parameters if desired",
      "Click 'Analyze Volatility' to compare models"
    ]
  }
};

// ============================================
// ML PREDICTION MODULE
// ============================================
export const mlPredictionTooltips = {
  // Inputs
  ticker: "The stock to predict. The model will learn from this stock's historical patterns.",
  predictionDays: "How many days ahead to predict. Longer predictions are less reliable.",
  trainingPeriod: "Amount of historical data to train on. More data can improve accuracy but may include outdated patterns.",

  // Features
  features: "Input variables the model uses to make predictions: price momentum, volume, moving averages, volatility, etc.",

  // Outputs
  predictedPrice: "The model's forecast for the future stock price. Use as a guide, not a guarantee!",
  predictedReturn: "Expected percentage change from current price to predicted price.",
  confidence: "Model's self-assessed reliability of the prediction. Based on historical prediction accuracy.",

  // Metrics
  mse: "Mean Squared Error - average of squared differences between predictions and actual values. Lower is better.",
  mae: "Mean Absolute Error - average absolute difference between predictions and actual. Easier to interpret than MSE.",
  r2: "R-squared - how much of the price movement the model explains. 1.0 = perfect, 0 = no better than guessing.",

  // Disclaimer
  disclaimer: "Machine learning predictions are based on historical patterns and may not reflect future performance. Always use multiple sources for investment decisions.",

  // Tutorial
  tutorial: {
    title: "How to Use ML Stock Prediction",
    description: "Train a machine learning model on historical data to forecast future stock prices.",
    steps: [
      "Enter a stock ticker to predict",
      "Set prediction horizon (1-30 days ahead)",
      "Choose training period (1-5 years of data)",
      "Click 'Train & Predict' to run the model"
    ]
  }
};

// ============================================
// PAIRS TRADING MODULE
// ============================================
export const pairsTradingTooltips = {
  // Inputs
  ticker1: "First stock in the pair. Choose stocks that are economically related (same sector, competitors, etc.).",
  ticker2: "Second stock in the pair. Should have a historical relationship with the first stock.",
  entryThreshold: "Z-score level to enter a trade. Higher threshold = fewer but more confident trades. Typical: 2.0 (2 standard deviations).",
  exitThreshold: "Z-score level to exit a trade. When spread returns to normal. Typical: 0.5 (half a standard deviation).",
  period: "Historical period to analyze. Longer periods give more data but relationships may change over time.",

  // Outputs
  cointegrationScore: "ADF test statistic - more negative = stronger cointegration. Below -2.86 typically indicates cointegration.",
  pValue: "Probability that the pair is NOT cointegrated. Lower is better. Below 0.05 is typically significant.",
  isCointegrated: "Whether the statistical test confirms the pair moves together in a predictable way. Essential for pairs trading to work.",
  hedgeRatio: "How many shares of Stock 2 to trade for each share of Stock 1 to create a market-neutral position.",
  spread: "The price difference between the two stocks, adjusted by the hedge ratio. This is what we trade on.",
  zscore: "How many standard deviations the spread is from its mean. High absolute Z-score = trading opportunity.",

  // Performance
  totalReturn: "Total profit/loss from the backtest period, as a percentage.",
  sharpeRatio: "Risk-adjusted return. Above 1.0 is good, above 2.0 is excellent.",
  maxDrawdown: "Largest peak-to-trough decline. Shows worst-case scenario during the period.",
  winRate: "Percentage of trades that were profitable.",

  // Tutorial
  tutorial: {
    title: "How to Use Pairs Trading Analysis",
    description: "Find cointegrated stock pairs and generate mean-reversion trading signals.",
    steps: [
      "Enter two related stocks (e.g., KO and PEP, or AAPL and MSFT)",
      "Set entry/exit Z-score thresholds for trading signals",
      "Choose historical period for analysis",
      "Click 'Analyze Pair' to test for cointegration and see backtest results"
    ]
  }
};

// ============================================
// FIXED INCOME MODULE
// ============================================
export const fixedIncomeTooltips = {
  // Inputs
  faceValue: "The bond's par value - the amount repaid at maturity. Usually $1,000 for corporate bonds.",
  couponRate: "Annual interest rate paid on the face value. A 5% coupon on $1,000 face = $50/year in payments.",
  yearsToMaturity: "Time until the bond matures and face value is repaid.",
  marketRate: "Current market interest rate (yield). Used to discount future cash flows to present value.",
  frequency: "How often coupon payments are made. Most US bonds pay semi-annually (2x per year).",

  // Outputs
  bondPrice: "Theoretical fair value of the bond based on discounted cash flows. Compare to market price to find value.",
  ytm: "Yield to Maturity - the total return if held to maturity, accounting for price, coupons, and time.",
  currentYield: "Annual coupon payment divided by current price. Simple yield measure, ignores capital gains/losses.",

  // Risk Metrics
  duration: "Macaulay Duration - weighted average time to receive cash flows. Measures interest rate sensitivity.",
  modifiedDuration: "Duration adjusted for yield. Shows % price change for 1% yield change. Key risk metric!",
  convexity: "Measures how duration itself changes as yields change. Improves price estimates for large yield moves.",
  dv01: "Dollar Value of 01 - dollar price change for a 0.01% (1 basis point) yield change. Used for hedging.",

  // Concepts
  discountBond: "When market rate > coupon rate, bond trades below face value (at a discount).",
  premiumBond: "When market rate < coupon rate, bond trades above face value (at a premium).",
  parBond: "When market rate = coupon rate, bond trades at face value (at par).",

  // Tutorial
  tutorial: {
    title: "How to Use Bond Pricing Calculator",
    description: "Calculate bond prices, yields, and risk metrics (duration, convexity, DV01).",
    steps: [
      "Enter bond details: face value, coupon rate, maturity",
      "Set the current market yield (discount rate)",
      "Choose payment frequency (annual or semi-annual)",
      "Click 'Calculate' to see price and risk metrics"
    ]
  }
};

// ============================================
// BASKET TRADING MODULE
// ============================================
export const basketTradingTooltips = {
  // Inputs
  tickers: "Comma-separated list of ETFs or stocks to include in the basket. Diverse assets (stocks, bonds, commodities) often show better cointegration opportunities.",
  metric: "Optimization target: Sharpe Ratio maximizes risk-adjusted returns, Total Return maximizes absolute profit, Min Drawdown minimizes worst peak-to-trough decline.",
  entryThreshold: "Z-score level to enter a trade. Higher threshold = fewer but higher conviction trades. Typical: 2.0 (2 standard deviations).",
  exitThreshold: "Z-score level to exit a trade. Lower values = hold positions longer waiting for full mean reversion.",
  period: "Historical data period for optimization. Longer periods capture more market regimes but may include outdated relationships.",

  // Outputs
  baselineWeights: "Weights derived from regression-based cointegration analysis. Serves as a benchmark for the optimized approach.",
  optimizedWeights: "Weights found by differential evolution that maximize the chosen objective (Sharpe, Return, or Min DD).",
  sharpeRatio: "Risk-adjusted return measure. Higher is better. Above 1.0 is good, above 2.0 is excellent.",
  totalReturn: "Total profit/loss from the backtest period, as a percentage.",
  maxDrawdown: "Largest peak-to-trough decline. Shows worst-case scenario during the period.",
  convergence: "How the optimizer improved over iterations. Steep initial improvement followed by plateauing indicates good convergence.",

  // Tutorial
  tutorial: {
    title: "How to Use Basket Optimization",
    description: "Optimize cointegration weights across a basket of assets using differential evolution (pseudo-Bayesian optimization).",
    steps: [
      "Enter 3-6 ticker symbols (ETFs work well: SPY, QQQ, GLD, TLT, IWM)",
      "Select optimization target: Sharpe Ratio, Total Return, or Minimum Drawdown",
      "Adjust entry/exit thresholds for the trading strategy",
      "Click 'Optimize Basket' to find optimal weights and compare vs baseline"
    ]
  }
};

// ============================================
// SPO PORTFOLIO MODULE
// ============================================
export const spoPortfolioTooltips = {
  // Inputs
  tickers: "Comma-separated stock tickers for the portfolio universe. Diversified portfolios work best (mix sectors).",
  riskAversion: "Controls the return-risk tradeoff (λ in mean-variance). Higher values prioritize lower volatility over higher returns.",
  period: "Historical data period for training. Longer periods provide more data but may include outdated patterns.",

  // Concepts
  twoStage: "Traditional approach: (1) Predict returns using ML, (2) Optimize portfolio using predictions. Minimizes prediction error.",
  spo: "Smart Predict-then-Optimize: Train the prediction model to minimize portfolio decision error, not just prediction error.",
  decisionError: "The actual portfolio loss caused by prediction errors. SPO directly minimizes this instead of prediction MSE.",
  predictionMSE: "Mean Squared Error of return predictions. Traditional methods minimize this, but it doesn't always lead to best portfolios.",

  // Outputs
  efficientFrontier: "The curve showing optimal return for each risk level. Portfolios on the frontier are 'efficient'.",
  weights: "Portfolio allocation percentages. SPO may allocate differently than traditional methods to reduce decision error.",
  sharpeRatio: "Risk-adjusted return. Measures excess return per unit of risk.",
  volatility: "Portfolio standard deviation, annualized. Measures how much the portfolio value fluctuates.",

  // Tutorial
  tutorial: {
    title: "How to Use SPO Portfolio Optimization",
    description: "Compare traditional two-stage optimization vs decision-focused learning (SPO).",
    steps: [
      "Select 4-10 stock tickers for your portfolio universe",
      "Adjust risk aversion (higher = more conservative)",
      "Choose training period for the models",
      "Click 'Run SPO' to compare traditional vs SPO approaches"
    ]
  }
};

// ============================================
// RL HEDGING MODULE
// ============================================
export const rlHedgingTooltips = {
  // Inputs
  S0: "Current stock price. The underlying asset price at time zero.",
  K: "Strike price. The price at which the option can be exercised.",
  T: "Time to expiry in years (e.g., 0.25 = 3 months).",
  sigma: "Volatility of the underlying asset (annualized). Higher volatility = more hedging needed.",
  r: "Risk-free interest rate. Used for discounting and in the Black-Scholes formula.",
  transactionCost: "Cost per dollar traded. Higher costs make frequent rebalancing expensive, affecting optimal hedge strategy.",
  episodes: "Number of training episodes. More episodes = better learning but slower training.",

  // RL Concepts
  qLearning: "A reinforcement learning algorithm that learns action values Q(s,a) through trial and error on simulated paths.",
  state: "The current market situation: moneyness (S/K), time to expiry, and current delta. Discretized into buckets.",
  action: "The hedging decision: under-hedge (0.8× delta), delta-hedge (1.0× delta), or over-hedge (1.2× delta).",
  reward: "Negative of hedging error plus transaction costs. Agent learns to minimize total hedging cost.",
  qTable: "Lookup table of learned action values. Maps each state to expected future rewards for each action.",

  // Outputs
  meanAbsError: "Average absolute hedging error across test paths. Lower is better.",
  stdError: "Standard deviation of hedging error. Lower = more consistent hedging performance.",
  maeReduction: "Percentage improvement in mean absolute error compared to Black-Scholes delta hedging.",
  learningCurve: "Shows how hedging error decreases as the agent learns. Steep initial drop = fast learning.",
  histogram: "Distribution of hedging P&L across test paths. Tighter distribution = more reliable hedging.",

  // Tutorial
  tutorial: {
    title: "How to Use RL Derivative Hedging",
    description: "Train a Q-learning agent to learn adaptive delta hedging strategies.",
    steps: [
      "Set option parameters (spot, strike, time to expiry, volatility)",
      "Adjust transaction cost to see its impact on optimal hedging",
      "Choose number of training episodes (more = better but slower)",
      "Click 'Train Agent' to run Q-learning and compare vs BS delta hedge"
    ]
  }
};

// ============================================
// REGIME DETECTION MODULE
// ============================================
export const regimeDetectionTooltips = {
  // Inputs
  ticker: "The stock or index to analyze. SPY and QQQ are good for market-wide regime detection.",
  nStates: "Number of hidden states (regimes) in the HMM. 2 = bull/bear, 3 adds a neutral/transition state, 4 captures high/low volatility separately.",
  period: "Historical data period for training. Longer periods capture more regime transitions but may include outdated patterns.",

  // HMM Concepts
  hmm: "Hidden Markov Model - assumes the market transitions between unobservable 'regimes' that influence observable returns.",
  baumWelch: "Expectation-Maximization algorithm that estimates HMM parameters (means, variances, transition probabilities) from data.",
  viterbi: "Dynamic programming algorithm that finds the most likely sequence of hidden states given the observations.",
  forwardBackward: "Algorithm that computes the probability of being in each state at each time step. Used in Baum-Welch.",
  emissionProb: "Probability of observing a return given the current regime. Modeled as Gaussian with regime-specific mean and variance.",
  transitionMatrix: "Probability of moving from one regime to another. High diagonal = regimes are 'sticky' (persistent).",

  // Outputs
  currentRegime: "The most likely market regime right now, based on Viterbi decoding of recent returns.",
  regimeStatistics: "Average return and volatility for each detected regime. Helps label regimes as bull/bear/high-vol/low-vol.",
  avgDuration: "Average number of days spent in a regime before transitioning. Longer duration = more stable regimes.",
  transitions: "Total number of regime changes detected. Frequent transitions suggest an unstable market environment.",

  // Tutorial
  tutorial: {
    title: "How to Use HMM Regime Detection",
    description: "Detect hidden market regimes (bull, bear, high-volatility) using Hidden Markov Models with Baum-Welch EM algorithm.",
    steps: [
      "Enter a ticker (SPY for market-wide analysis)",
      "Choose number of regimes (2-4)",
      "Select historical period for training",
      "Click 'Detect Regimes' to run HMM and visualize regime switches"
    ]
  }
};

// ============================================
// STOCK CLUSTERING MODULE
// ============================================
export const stockClusteringTooltips = {
  // Inputs
  tickers: "Comma-separated stock symbols to cluster. Include stocks from different sectors for meaningful groupings.",
  nClusters: "Number of clusters (K in K-Means). 3-5 clusters typically work well for diversified portfolios.",
  features: "Characteristics used for clustering: returns, volatility, momentum, beta. Select features relevant to your investment strategy.",
  period: "Historical period for calculating features. 1-2 years captures recent behavior.",

  // K-Means Concepts
  kmeans: "Unsupervised learning algorithm that groups stocks based on behavioral similarity. Stocks in the same cluster have similar characteristics.",
  kmeanspp: "K-Means++ initialization - smart starting centroids that improve convergence and avoid poor local minima.",
  centroid: "The center of each cluster, representing 'typical' values for that group's features.",
  silhouette: "Cluster quality score from -1 to 1. Higher = better-defined clusters. Above 0.5 is good, above 0.7 is excellent.",
  inertia: "Within-cluster sum of squared distances. Lower = tighter clusters, but decreases with more clusters (use silhouette instead).",

  // Outputs
  clusterAssignments: "Which cluster each stock belongs to. Stocks in the same cluster behave similarly.",
  pcaVisualization: "2D scatter plot using Principal Component Analysis. Shows how stocks are grouped in reduced feature space.",
  clusterPortfolios: "Equal-weight portfolios built from each cluster. Use for sector-style diversification or factor exposure.",
  clusterCharacteristics: "Average return, volatility, and momentum for each cluster. Helps label clusters (growth, defensive, etc.).",

  // Tutorial
  tutorial: {
    title: "How to Use Stock Clustering",
    description: "Group stocks by behavioral patterns using K-Means clustering. Build diversified portfolios from each cluster.",
    steps: [
      "Enter 10-30 stock tickers (mix of sectors works best)",
      "Choose number of clusters (3-6)",
      "Select features for clustering (returns, volatility, momentum, beta)",
      "Click 'Run Clustering' to see groups and build cluster portfolios"
    ]
  }
};

// ============================================
// ANOMALY DETECTION MODULE
// ============================================
export const anomalyDetectionTooltips = {
  // Inputs
  ticker: "The stock or index to monitor for anomalies. SPY is good for market-wide unusual conditions.",
  contamination: "Expected proportion of anomalies (0.01-0.15). Lower = fewer but more extreme anomalies. 5% is typical.",
  period: "Historical period to analyze. Longer periods provide more context for what's 'normal' vs 'abnormal'.",

  // Isolation Forest Concepts
  isolationForest: "Unsupervised algorithm that identifies anomalies by how easily they can be 'isolated' from normal data using random splits.",
  pathLength: "Average number of splits needed to isolate a point. Anomalies are isolated quickly (short paths), normal points take longer.",
  anomalyScore: "Score from 0 to 1 indicating how anomalous each observation is. Higher = more unusual. Score > threshold = anomaly.",
  threshold: "The score cutoff for flagging anomalies. Determined by the contamination rate you set.",
  nTrees: "Number of isolation trees in the forest. More trees = more stable scores (100 is typical).",

  // Features Analyzed
  featureReturn: "Daily price return - large positive or negative moves are often anomalous.",
  featureVolume: "Volume spike relative to moving average - unusual trading activity may signal anomalies.",
  featureVolatility: "Short-term vs long-term volatility - sudden volatility changes are often anomalous.",
  featureGap: "Overnight price gap - large gaps between close and next open indicate unusual events.",
  featureRange: "Intraday range (high-low)/close - unusually wide ranges suggest market stress.",

  // Outputs
  anomalyCount: "Total number of detected anomalies in the period. Compare to expected count (contamination × data points).",
  detectedCrises: "Known market events (COVID crash, etc.) that were successfully identified as anomalies.",
  featureImportance: "Which features contribute most to anomaly detection. Helps understand what makes an observation unusual.",

  // Tutorial
  tutorial: {
    title: "How to Use Anomaly Detection",
    description: "Detect unusual market conditions using Isolation Forest, an unsupervised ML algorithm for outlier detection.",
    steps: [
      "Enter a ticker (SPY for market-wide analysis)",
      "Adjust contamination rate (expected % of anomalies)",
      "Select historical period to analyze",
      "Click 'Detect Anomalies' to identify unusual market conditions"
    ]
  }
};

// ============================================
// RL REBALANCING MODULE
// ============================================
export const rlRebalancingTooltips = {
  // Inputs
  tickers: "Comma-separated tickers for the portfolio (e.g., SPY,TLT for 60/40 stocks/bonds).",
  weights: "Target portfolio weights as percentages (must sum to 100). E.g., '60,40' for 60% SPY, 40% TLT.",
  transactionCost: "Cost per dollar traded (in basis points). Higher costs make the RL agent more reluctant to rebalance.",
  rebalanceThreshold: "For calendar rebalancing comparison: maximum drift allowed before forced rebalance.",
  episodes: "Number of Q-learning training episodes. More episodes = better policy but slower training.",

  // RL Concepts
  qLearning: "Reinforcement learning algorithm that learns optimal actions by exploring different scenarios and updating value estimates.",
  state: "Current portfolio situation: (drift level, volatility regime, days since last rebalance). Discretized into buckets.",
  action: "Binary decision: rebalance now or wait. RL agent learns when rebalancing benefits outweigh transaction costs.",
  reward: "Negative of tracking error minus transaction costs. Agent maximizes cumulative reward over time.",
  trackingError: "Deviation of actual portfolio weights from target weights. Accumulates over time without rebalancing.",

  // Comparison Strategies
  rlPolicy: "Learned policy from Q-learning. Dynamically decides when to rebalance based on current state.",
  monthlyRebalance: "Fixed calendar strategy: rebalance on the first trading day of each month regardless of drift.",
  quarterlyRebalance: "Fixed calendar strategy: rebalance on the first trading day of each quarter.",
  thresholdRebalance: "Rule-based: rebalance only when any weight drifts beyond a fixed percentage threshold.",

  // Outputs
  trackingErrorComparison: "Compares cumulative tracking error across strategies. Lower = better alignment with target.",
  transactionCostSavings: "How much the RL policy saves in transaction costs vs calendar rebalancing.",
  rebalanceFrequency: "How often each strategy triggers rebalancing. RL should be more efficient (fewer trades, similar tracking).",
  policyVisualization: "Heatmap of Q-values showing what action the RL agent prefers in each state.",

  // Tutorial
  tutorial: {
    title: "How to Use RL Portfolio Rebalancing",
    description: "Learn when to rebalance a portfolio using Q-learning. Minimizes tracking error while controlling transaction costs.",
    steps: [
      "Enter portfolio tickers and target weights (e.g., SPY,TLT at 60,40)",
      "Set transaction cost (higher = less frequent optimal rebalancing)",
      "Choose number of training episodes",
      "Click 'Train Agent' to learn optimal rebalancing policy and compare vs calendar strategies"
    ]
  }
};

// ============================================
// COMMON/SHARED TOOLTIPS
// ============================================
export const commonTooltips = {
  ticker: "Stock symbol (e.g., AAPL for Apple, MSFT for Microsoft). Must be a valid ticker on major US exchanges.",
  calculate: "Run the calculation with current inputs.",
  reset: "Clear all inputs and results, returning to default values.",
  period: "Amount of historical data to use. More data provides more context but may include outdated market conditions.",
  loading: "Calculation in progress. Complex models may take a few seconds.",
};
