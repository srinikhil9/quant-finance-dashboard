/**
 * Fixed Income Bond Pricing and Analytics
 * TypeScript port of the Python implementation
 */

export interface BondParams {
  faceValue: number;         // Par/face value of the bond
  couponRate: number;        // Annual coupon rate (decimal, e.g., 0.05 for 5%)
  yearsToMaturity: number;   // Years until maturity
  couponFrequency: number;   // Payments per year (1=annual, 2=semi-annual, 4=quarterly)
}

export interface BondSummary {
  faceValue: number;
  couponRate: number;
  yearsToMaturity: number;
  couponFrequency: number;
  ytm: number;
  price: number;
  macaulayDuration: number;
  modifiedDuration: number;
  convexity: number;
  dv01: number;
}

export interface CashFlow {
  period: number;
  timeYears: number;
  cashFlow: number;
}

export interface PriceChangeEstimate {
  currentPrice: number;
  durationEffectPct: number;
  convexityEffectPct: number;
  estimatedChangePct: number;
  estimatedPrice: number;
  actualPrice: number;
  actualChangePct: number;
  estimationErrorPct: number;
}

/**
 * Calculate bond price given yield to maturity
 * Price = Sum(C/(1+y)^t) + F/(1+y)^n
 */
export function calculateBondPrice(params: BondParams, ytm: number): number {
  const { faceValue, couponRate, yearsToMaturity, couponFrequency } = params;

  const totalPeriods = Math.floor(yearsToMaturity * couponFrequency);
  const couponPayment = (faceValue * couponRate) / couponFrequency;
  const periodicYtm = ytm / couponFrequency;

  if (totalPeriods <= 0) return faceValue;

  // Present value of coupons
  let pvCoupons = 0;
  for (let t = 1; t <= totalPeriods; t++) {
    pvCoupons += couponPayment / Math.pow(1 + periodicYtm, t);
  }

  // Present value of face value
  const pvFace = faceValue / Math.pow(1 + periodicYtm, totalPeriods);

  return pvCoupons + pvFace;
}

/**
 * Calculate yield to maturity given market price
 * Uses bisection method for numerical optimization
 */
export function calculateYTM(params: BondParams, marketPrice: number): number {
  let low = 0.0001;
  let high = 0.5;
  const tolerance = 1e-6;
  const maxIterations = 100;

  for (let i = 0; i < maxIterations; i++) {
    const mid = (low + high) / 2;
    const price = calculateBondPrice(params, mid);

    if (Math.abs(price - marketPrice) < tolerance) {
      return mid;
    }

    if (price > marketPrice) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}

/**
 * Calculate Macaulay Duration
 * D_Mac = Sum(t * PV(CF_t)) / Price
 */
export function calculateMacaulayDuration(params: BondParams, ytm: number): number {
  const { faceValue, couponRate, yearsToMaturity, couponFrequency } = params;

  const totalPeriods = Math.floor(yearsToMaturity * couponFrequency);
  const couponPayment = (faceValue * couponRate) / couponFrequency;
  const periodicYtm = ytm / couponFrequency;
  const bondPrice = calculateBondPrice(params, ytm);

  if (totalPeriods <= 0) return 0;

  let weightedCf = 0;
  for (let t = 1; t <= totalPeriods; t++) {
    const cashFlow = t < totalPeriods ? couponPayment : couponPayment + faceValue;
    const pvCf = cashFlow / Math.pow(1 + periodicYtm, t);
    weightedCf += t * pvCf;
  }

  const durationPeriods = weightedCf / bondPrice;
  const durationYears = durationPeriods / couponFrequency;

  return durationYears;
}

/**
 * Calculate Modified Duration
 * D_Mod = D_Mac / (1 + y/m)
 */
export function calculateModifiedDuration(params: BondParams, ytm: number): number {
  const macDuration = calculateMacaulayDuration(params, ytm);
  return macDuration / (1 + ytm / params.couponFrequency);
}

/**
 * Calculate Bond Convexity
 */
export function calculateConvexity(params: BondParams, ytm: number): number {
  const { faceValue, couponRate, yearsToMaturity, couponFrequency } = params;

  const totalPeriods = Math.floor(yearsToMaturity * couponFrequency);
  const couponPayment = (faceValue * couponRate) / couponFrequency;
  const periodicYtm = ytm / couponFrequency;
  const bondPrice = calculateBondPrice(params, ytm);

  if (totalPeriods <= 0) return 0;

  let convexitySum = 0;
  for (let t = 1; t <= totalPeriods; t++) {
    const cashFlow = t < totalPeriods ? couponPayment : couponPayment + faceValue;
    const pvCf = cashFlow / Math.pow(1 + periodicYtm, t);
    convexitySum += t * (t + 1) * pvCf;
  }

  let convexity = convexitySum / (bondPrice * Math.pow(1 + periodicYtm, 2));
  convexity = convexity / Math.pow(couponFrequency, 2);

  return convexity;
}

/**
 * Calculate DV01 (Dollar Value of 1 basis point)
 * DV01 = ModDuration * Price * 0.0001
 */
export function calculateDV01(params: BondParams, ytm: number): number {
  const modDuration = calculateModifiedDuration(params, ytm);
  const price = calculateBondPrice(params, ytm);
  return modDuration * price * 0.0001;
}

/**
 * Generate complete bond summary
 */
export function calculateBondSummary(params: BondParams, ytm: number): BondSummary {
  return {
    faceValue: params.faceValue,
    couponRate: params.couponRate,
    yearsToMaturity: params.yearsToMaturity,
    couponFrequency: params.couponFrequency,
    ytm,
    price: calculateBondPrice(params, ytm),
    macaulayDuration: calculateMacaulayDuration(params, ytm),
    modifiedDuration: calculateModifiedDuration(params, ytm),
    convexity: calculateConvexity(params, ytm),
    dv01: calculateDV01(params, ytm),
  };
}

/**
 * Generate cash flow schedule
 */
export function generateCashFlowSchedule(params: BondParams): CashFlow[] {
  const { faceValue, couponRate, yearsToMaturity, couponFrequency } = params;

  const totalPeriods = Math.floor(yearsToMaturity * couponFrequency);
  const couponPayment = (faceValue * couponRate) / couponFrequency;

  const schedule: CashFlow[] = [];

  for (let t = 1; t <= totalPeriods; t++) {
    const cashFlow = t < totalPeriods ? couponPayment : couponPayment + faceValue;
    schedule.push({
      period: t,
      timeYears: t / couponFrequency,
      cashFlow,
    });
  }

  return schedule;
}

/**
 * Estimate price change for yield change
 */
export function estimatePriceChange(
  params: BondParams,
  ytm: number,
  yieldChange: number,
  useConvexity: boolean = true
): PriceChangeEstimate {
  const currentPrice = calculateBondPrice(params, ytm);
  const modDuration = calculateModifiedDuration(params, ytm);

  // Duration-only estimate
  const durationEffect = -modDuration * yieldChange;

  let convexityEffect = 0;
  if (useConvexity) {
    const convexity = calculateConvexity(params, ytm);
    convexityEffect = 0.5 * convexity * Math.pow(yieldChange, 2);
  }

  const totalEffect = durationEffect + convexityEffect;
  const estimatedPricePct = totalEffect * 100;
  const estimatedPrice = currentPrice * (1 + totalEffect);

  // Actual price for comparison
  const actualPrice = calculateBondPrice(params, ytm + yieldChange);
  const actualChangePct = ((actualPrice - currentPrice) / currentPrice) * 100;

  return {
    currentPrice,
    durationEffectPct: durationEffect * 100,
    convexityEffectPct: convexityEffect * 100,
    estimatedChangePct: estimatedPricePct,
    estimatedPrice,
    actualPrice,
    actualChangePct,
    estimationErrorPct: estimatedPricePct - actualChangePct,
  };
}

/**
 * Generate price vs yield data for charting
 */
export function generatePriceVsYield(
  params: BondParams,
  minYtm: number,
  maxYtm: number,
  steps: number = 50
): { ytm: number; price: number }[] {
  const data: { ytm: number; price: number }[] = [];
  const stepSize = (maxYtm - minYtm) / steps;

  for (let i = 0; i <= steps; i++) {
    const ytm = minYtm + i * stepSize;
    data.push({
      ytm,
      price: calculateBondPrice(params, ytm),
    });
  }

  return data;
}

/**
 * Generate duration vs yield data for charting
 */
export function generateDurationVsYield(
  params: BondParams,
  minYtm: number,
  maxYtm: number,
  steps: number = 50
): { ytm: number; duration: number }[] {
  const data: { ytm: number; duration: number }[] = [];
  const stepSize = (maxYtm - minYtm) / steps;

  for (let i = 0; i <= steps; i++) {
    const ytm = minYtm + i * stepSize;
    data.push({
      ytm,
      duration: calculateMacaulayDuration(params, ytm),
    });
  }

  return data;
}

// ========== Yield Curve Functions ==========

export interface YieldCurveData {
  maturities: number[];
  yields: number[];
}

/**
 * Linear interpolation for yield curve
 */
export function interpolateYield(curve: YieldCurveData, maturity: number): number {
  const { maturities, yields } = curve;

  if (maturity <= maturities[0]) return yields[0];
  if (maturity >= maturities[maturities.length - 1]) return yields[yields.length - 1];

  // Find surrounding points
  let i = 0;
  while (i < maturities.length - 1 && maturities[i + 1] < maturity) {
    i++;
  }

  // Linear interpolation
  const t1 = maturities[i];
  const t2 = maturities[i + 1];
  const y1 = yields[i];
  const y2 = yields[i + 1];

  return y1 + (y2 - y1) * (maturity - t1) / (t2 - t1);
}

/**
 * Calculate forward rate between two periods
 * f(t1,t2) = [(1+y_t2)^t2 / (1+y_t1)^t1]^(1/(t2-t1)) - 1
 */
export function calculateForwardRate(curve: YieldCurveData, t1: number, t2: number): number {
  const y1 = interpolateYield(curve, t1);
  const y2 = interpolateYield(curve, t2);

  const forward = Math.pow(
    Math.pow(1 + y2, t2) / Math.pow(1 + y1, t1),
    1 / (t2 - t1)
  ) - 1;

  return forward;
}

/**
 * Sample Treasury yield curve data
 */
export const sampleYieldCurve: YieldCurveData = {
  maturities: [0.25, 0.5, 1, 2, 3, 5, 7, 10, 20, 30],
  yields: [0.04, 0.042, 0.045, 0.048, 0.050, 0.053, 0.055, 0.057, 0.060, 0.062],
};
