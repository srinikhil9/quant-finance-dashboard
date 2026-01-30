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
// COMMON/SHARED TOOLTIPS
// ============================================
export const commonTooltips = {
  ticker: "Stock symbol (e.g., AAPL for Apple, MSFT for Microsoft). Must be a valid ticker on major US exchanges.",
  calculate: "Run the calculation with current inputs.",
  reset: "Clear all inputs and results, returning to default values.",
  period: "Amount of historical data to use. More data provides more context but may include outdated market conditions.",
  loading: "Calculation in progress. Complex models may take a few seconds.",
};
