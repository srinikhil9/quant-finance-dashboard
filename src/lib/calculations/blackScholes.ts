/**
 * Black-Scholes Option Pricing Model
 * TypeScript port of the Python implementation
 */

import jstat from 'jstat';

export type OptionType = 'call' | 'put';

export interface BlackScholesParams {
  S: number;      // Current stock price
  K: number;      // Strike price
  T: number;      // Time to maturity (in years)
  r: number;      // Risk-free rate (annual, decimal)
  sigma: number;  // Volatility (annual, decimal)
  optionType: OptionType;
}

export interface GreeksResult {
  delta: number;
  gamma: number;
  vega: number;
  theta: number;  // per day
  rho: number;
}

export interface BlackScholesResult {
  price: number;
  greeks: GreeksResult;
  d1: number;
  d2: number;
}

/**
 * Standard normal cumulative distribution function
 */
function normalCDF(x: number): number {
  return jstat.normal.cdf(x, 0, 1);
}

/**
 * Standard normal probability density function
 */
function normalPDF(x: number): number {
  return jstat.normal.pdf(x, 0, 1);
}

/**
 * Calculate d1 parameter for Black-Scholes
 */
export function calculateD1(S: number, K: number, T: number, r: number, sigma: number): number {
  return (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
}

/**
 * Calculate d2 parameter for Black-Scholes
 */
export function calculateD2(d1: number, sigma: number, T: number): number {
  return d1 - sigma * Math.sqrt(T);
}

/**
 * Calculate Black-Scholes option price
 */
export function calculatePrice(params: BlackScholesParams): number {
  const { S, K, T, r, sigma, optionType } = params;

  if (T <= 0) return Math.max(0, optionType === 'call' ? S - K : K - S);

  const d1 = calculateD1(S, K, T, r, sigma);
  const d2 = calculateD2(d1, sigma, T);

  if (optionType === 'call') {
    return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
  } else {
    return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
  }
}

/**
 * Calculate Delta (sensitivity to stock price)
 */
export function calculateDelta(params: BlackScholesParams): number {
  const { S, K, T, r, sigma, optionType } = params;

  if (T <= 0) return optionType === 'call' ? (S > K ? 1 : 0) : (S < K ? -1 : 0);

  const d1 = calculateD1(S, K, T, r, sigma);

  if (optionType === 'call') {
    return normalCDF(d1);
  } else {
    return normalCDF(d1) - 1;
  }
}

/**
 * Calculate Gamma (sensitivity of delta to stock price)
 */
export function calculateGamma(params: BlackScholesParams): number {
  const { S, K, T, r, sigma } = params;

  if (T <= 0) return 0;

  const d1 = calculateD1(S, K, T, r, sigma);
  return normalPDF(d1) / (S * sigma * Math.sqrt(T));
}

/**
 * Calculate Vega (sensitivity to volatility)
 */
export function calculateVega(params: BlackScholesParams): number {
  const { S, K, T, r, sigma } = params;

  if (T <= 0) return 0;

  const d1 = calculateD1(S, K, T, r, sigma);
  return S * normalPDF(d1) * Math.sqrt(T);
}

/**
 * Calculate Theta (sensitivity to time decay) - returns per day
 */
export function calculateTheta(params: BlackScholesParams): number {
  const { S, K, T, r, sigma, optionType } = params;

  if (T <= 0) return 0;

  const d1 = calculateD1(S, K, T, r, sigma);
  const d2 = calculateD2(d1, sigma, T);

  const firstTerm = -(S * normalPDF(d1) * sigma) / (2 * Math.sqrt(T));

  let theta: number;
  if (optionType === 'call') {
    theta = firstTerm - r * K * Math.exp(-r * T) * normalCDF(d2);
  } else {
    theta = firstTerm + r * K * Math.exp(-r * T) * normalCDF(-d2);
  }

  return theta / 365; // Convert to per day
}

/**
 * Calculate Rho (sensitivity to interest rate)
 */
export function calculateRho(params: BlackScholesParams): number {
  const { S, K, T, r, sigma, optionType } = params;

  if (T <= 0) return 0;

  const d1 = calculateD1(S, K, T, r, sigma);
  const d2 = calculateD2(d1, sigma, T);

  if (optionType === 'call') {
    return K * T * Math.exp(-r * T) * normalCDF(d2);
  } else {
    return -K * T * Math.exp(-r * T) * normalCDF(-d2);
  }
}

/**
 * Calculate all Greeks
 */
export function calculateGreeks(params: BlackScholesParams): GreeksResult {
  return {
    delta: calculateDelta(params),
    gamma: calculateGamma(params),
    vega: calculateVega(params),
    theta: calculateTheta(params),
    rho: calculateRho(params),
  };
}

/**
 * Calculate complete Black-Scholes result
 */
export function calculateBlackScholes(params: BlackScholesParams): BlackScholesResult {
  const { S, K, T, r, sigma } = params;

  const d1 = T > 0 ? calculateD1(S, K, T, r, sigma) : 0;
  const d2 = T > 0 ? calculateD2(d1, sigma, T) : 0;

  return {
    price: calculatePrice(params),
    greeks: calculateGreeks(params),
    d1,
    d2,
  };
}

/**
 * Calculate implied volatility using Newton-Raphson method
 */
export function calculateImpliedVolatility(
  marketPrice: number,
  S: number,
  K: number,
  T: number,
  r: number,
  optionType: OptionType,
  maxIterations: number = 100,
  tolerance: number = 1e-6
): number | null {
  // Initial guess
  let sigma = 0.3;

  for (let i = 0; i < maxIterations; i++) {
    const params: BlackScholesParams = { S, K, T, r, sigma, optionType };
    const price = calculatePrice(params);
    const priceDiff = price - marketPrice;

    if (Math.abs(priceDiff) < tolerance) {
      return sigma;
    }

    // Newton-Raphson update
    const vega = calculateVega(params);
    if (vega < 1e-10) {
      return null; // Avoid division by zero
    }

    sigma = sigma - priceDiff / vega;

    // Ensure sigma stays positive
    if (sigma <= 0) {
      sigma = 0.01;
    }

    // Cap sigma at reasonable maximum
    if (sigma > 5) {
      sigma = 5;
    }
  }

  return null; // Did not converge
}

/**
 * Generate price data for charting (price vs stock price)
 */
export function generatePriceVsStock(
  K: number,
  T: number,
  r: number,
  sigma: number,
  optionType: OptionType,
  minS: number,
  maxS: number,
  steps: number = 50
): { stockPrice: number; optionPrice: number }[] {
  const data: { stockPrice: number; optionPrice: number }[] = [];
  const stepSize = (maxS - minS) / steps;

  for (let i = 0; i <= steps; i++) {
    const S = minS + i * stepSize;
    const params: BlackScholesParams = { S, K, T, r, sigma, optionType };
    data.push({
      stockPrice: S,
      optionPrice: calculatePrice(params),
    });
  }

  return data;
}

/**
 * Generate Greeks data for charting (Greeks vs stock price)
 */
export function generateGreeksVsStock(
  K: number,
  T: number,
  r: number,
  sigma: number,
  optionType: OptionType,
  minS: number,
  maxS: number,
  steps: number = 50
): { stockPrice: number; delta: number; gamma: number; vega: number; theta: number; rho: number }[] {
  const data: { stockPrice: number; delta: number; gamma: number; vega: number; theta: number; rho: number }[] = [];
  const stepSize = (maxS - minS) / steps;

  for (let i = 0; i <= steps; i++) {
    const S = minS + i * stepSize;
    const params: BlackScholesParams = { S, K, T, r, sigma, optionType };
    const greeks = calculateGreeks(params);
    data.push({
      stockPrice: S,
      ...greeks,
    });
  }

  return data;
}
