"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TutorialCard } from "@/components/ui/tooltip";
import { PlotlyChart, chartColors } from "@/components/charts";
import { ResultInterpretation, type InterpretationData } from "@/components/ui/result-interpretation";
import {
  calculateBlackScholes,
  calculateImpliedVolatility,
  generatePriceVsStock,
  generateGreeksVsStock,
  type OptionType,
  type BlackScholesResult,
} from "@/lib/calculations/blackScholes";
import { blackScholesTooltips } from "@/lib/tooltips";
import { formatCurrency, formatNumber, formatPercent, getProfitLossColor } from "@/lib/utils/formatters";
import { TrendingUp, TrendingDown, Calculator, RefreshCw, Search, Loader2, CheckCircle } from "lucide-react";
import { trackCalculation } from "@/lib/analytics";

interface StockQuote {
  ticker: string;
  name: string;
  price: number;
  volatility: number;
  volatility_percent: number;
  timestamp: string;
}

function getBlackScholesInterpretation(
  result: BlackScholesResult,
  stockPrice: number,
  strikePrice: number,
  optionType: OptionType
): InterpretationData {
  const intrinsicValue = optionType === "call"
    ? Math.max(0, stockPrice - strikePrice)
    : Math.max(0, strikePrice - stockPrice);
  const timeValue = result.price - intrinsicValue;
  const premiumPct = (result.price / stockPrice) * 100;

  // Determine moneyness
  let moneyness: string;
  let moneynessDesc: string;
  const pctFromStrike = ((stockPrice - strikePrice) / strikePrice) * 100;

  if (optionType === "call") {
    if (stockPrice > strikePrice * 1.02) {
      moneyness = "In-the-Money (ITM)";
      moneynessDesc = `The stock is ${pctFromStrike.toFixed(1)}% above the strike price - this option has intrinsic value`;
    } else if (stockPrice < strikePrice * 0.98) {
      moneyness = "Out-of-the-Money (OTM)";
      moneynessDesc = `The stock is ${Math.abs(pctFromStrike).toFixed(1)}% below the strike price - currently worthless if exercised`;
    } else {
      moneyness = "At-the-Money (ATM)";
      moneynessDesc = "The stock price is near the strike price - high time value";
    }
  } else {
    if (stockPrice < strikePrice * 0.98) {
      moneyness = "In-the-Money (ITM)";
      moneynessDesc = `The stock is ${Math.abs(pctFromStrike).toFixed(1)}% below the strike price - this option has intrinsic value`;
    } else if (stockPrice > strikePrice * 1.02) {
      moneyness = "Out-of-the-Money (OTM)";
      moneynessDesc = `The stock is ${pctFromStrike.toFixed(1)}% above the strike price - currently worthless if exercised`;
    } else {
      moneyness = "At-the-Money (ATM)";
      moneynessDesc = "The stock price is near the strike price - high time value";
    }
  }

  // Determine status based on delta and theta
  const deltaQuality = Math.abs(result.greeks.delta);
  let status: InterpretationData["status"] = "neutral";
  if (deltaQuality > 0.7) status = "positive";
  else if (deltaQuality < 0.3) status = "negative";

  const points: string[] = [
    `${moneyness}: ${moneynessDesc}`,
    `Option cost is ${premiumPct.toFixed(2)}% of the stock price (${formatCurrency(result.price)} per share)`,
    `Delta = ${result.greeks.delta.toFixed(3)}: For every $1 the stock moves, this option moves ~${formatCurrency(Math.abs(result.greeks.delta))}`,
    `Theta = ${result.greeks.theta.toFixed(4)}: You're losing ${formatCurrency(Math.abs(result.greeks.theta))} per day to time decay`,
  ];

  if (timeValue > 0) {
    points.push(`Time value: ${formatCurrency(timeValue)} (${((timeValue / result.price) * 100).toFixed(1)}% of premium) - erodes as expiration approaches`);
  }

  let advice: string;
  if (Math.abs(result.greeks.theta) > 0.1) {
    advice = "High time decay! Consider shorter holding periods or selling options instead of buying.";
  } else if (deltaQuality < 0.2) {
    advice = "Low delta means low probability of profit. These are high-risk lottery tickets.";
  } else if (deltaQuality > 0.8) {
    advice = "High delta behaves almost like owning the stock. Consider if the leverage is worth the premium.";
  } else {
    advice = "Moderate risk profile. Monitor delta and adjust position size based on your conviction.";
  }

  return {
    status,
    summary: `This ${optionType} option is ${moneyness} and costs ${formatCurrency(result.price)} per share.`,
    points,
    advice,
  };
}

export default function BlackScholesPage() {
  // Input parameters
  const [stockPrice, setStockPrice] = useState(100);
  const [strikePrice, setStrikePrice] = useState(105);
  const [timeToMaturity, setTimeToMaturity] = useState(0.25); // 3 months
  const [riskFreeRate, setRiskFreeRate] = useState(0.05); // 5%
  const [volatility, setVolatility] = useState(0.2); // 20%
  const [optionType, setOptionType] = useState<OptionType>("call");

  // Ticker lookup state
  const [lookupTicker, setLookupTicker] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [stockQuote, setStockQuote] = useState<StockQuote | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Implied volatility inputs
  const [marketPrice, setMarketPrice] = useState(3.5);

  // Fetch stock quote using Monte Carlo API (which uses yfinance)
  // We request a minimal simulation just to get the price and volatility
  const fetchStockQuote = async () => {
    if (!lookupTicker.trim()) return;

    setLookupLoading(true);
    setLookupError(null);
    const startTime = performance.now();

    const inputParams = {
      ticker: lookupTicker.toUpperCase(),
    };

    try {
      // Use Monte Carlo API with minimal settings to get stock data
      const params = new URLSearchParams({
        ticker: lookupTicker.toUpperCase(),
        investment: "1000",
        horizon: "0.25",
        simulations: "100",  // Minimal simulations just to get the data
      });

      const response = await fetch(`/api/monte-carlo?${params}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Extract price and volatility from Monte Carlo response
      const quote: StockQuote = {
        ticker: data.ticker,
        name: data.ticker, // Monte Carlo doesn't return company name
        price: data.current_price,
        volatility: data.parameters.annualized_volatility / 100, // Convert from percentage
        volatility_percent: data.parameters.annualized_volatility,
        timestamp: new Date().toISOString(),
      };

      setStockQuote(quote);
      // Auto-fill the form
      setStockPrice(quote.price);
      setVolatility(quote.volatility);

      // Track successful stock lookup
      trackCalculation('black-scholes', inputParams, quote as unknown as Record<string, unknown>, Math.round(performance.now() - startTime));
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : "Failed to fetch stock data");
      setStockQuote(null);

      // Track failed stock lookup
      trackCalculation('black-scholes', inputParams, { error: err instanceof Error ? err.message : 'Unknown error' }, Math.round(performance.now() - startTime));
    } finally {
      setLookupLoading(false);
    }
  };

  // Calculate results
  const result: BlackScholesResult = useMemo(() => {
    return calculateBlackScholes({
      S: stockPrice,
      K: strikePrice,
      T: timeToMaturity,
      r: riskFreeRate,
      sigma: volatility,
      optionType,
    });
  }, [stockPrice, strikePrice, timeToMaturity, riskFreeRate, volatility, optionType]);

  // Generate interpretation
  const interpretation = useMemo(() => {
    return getBlackScholesInterpretation(result, stockPrice, strikePrice, optionType);
  }, [result, stockPrice, strikePrice, optionType]);

  // Calculate implied volatility
  const impliedVol = useMemo(() => {
    return calculateImpliedVolatility(
      marketPrice,
      stockPrice,
      strikePrice,
      timeToMaturity,
      riskFreeRate,
      optionType
    );
  }, [marketPrice, stockPrice, strikePrice, timeToMaturity, riskFreeRate, optionType]);

  // Generate chart data
  const priceChartData = useMemo(() => {
    const minS = strikePrice * 0.5;
    const maxS = strikePrice * 1.5;
    const callData = generatePriceVsStock(strikePrice, timeToMaturity, riskFreeRate, volatility, "call", minS, maxS);
    const putData = generatePriceVsStock(strikePrice, timeToMaturity, riskFreeRate, volatility, "put", minS, maxS);

    return [
      {
        x: callData.map((d) => d.stockPrice),
        y: callData.map((d) => d.optionPrice),
        type: "scatter" as const,
        mode: "lines" as const,
        name: "Call",
        line: { color: chartColors.profit, width: 2 },
      },
      {
        x: putData.map((d) => d.stockPrice),
        y: putData.map((d) => d.optionPrice),
        type: "scatter" as const,
        mode: "lines" as const,
        name: "Put",
        line: { color: chartColors.loss, width: 2 },
      },
      {
        x: [stockPrice],
        y: [result.price],
        type: "scatter" as const,
        mode: "markers" as const,
        name: "Current",
        marker: { color: chartColors.warning, size: 12, symbol: "diamond" },
      },
    ];
  }, [strikePrice, timeToMaturity, riskFreeRate, volatility, stockPrice, result.price]);

  const greeksChartData = useMemo(() => {
    const minS = strikePrice * 0.5;
    const maxS = strikePrice * 1.5;
    const data = generateGreeksVsStock(strikePrice, timeToMaturity, riskFreeRate, volatility, optionType, minS, maxS);

    return {
      delta: [
        {
          x: data.map((d) => d.stockPrice),
          y: data.map((d) => d.delta),
          type: "scatter" as const,
          mode: "lines" as const,
          name: "Delta",
          line: { color: chartColors.primary, width: 2 },
        },
      ],
      gamma: [
        {
          x: data.map((d) => d.stockPrice),
          y: data.map((d) => d.gamma),
          type: "scatter" as const,
          mode: "lines" as const,
          name: "Gamma",
          line: { color: chartColors.secondary, width: 2 },
        },
      ],
      vega: [
        {
          x: data.map((d) => d.stockPrice),
          y: data.map((d) => d.vega),
          type: "scatter" as const,
          mode: "lines" as const,
          name: "Vega",
          line: { color: chartColors.purple, width: 2 },
        },
      ],
      theta: [
        {
          x: data.map((d) => d.stockPrice),
          y: data.map((d) => d.theta),
          type: "scatter" as const,
          mode: "lines" as const,
          name: "Theta",
          line: { color: chartColors.orange, width: 2 },
        },
      ],
    };
  }, [strikePrice, timeToMaturity, riskFreeRate, volatility, optionType]);

  const resetToDefaults = () => {
    setStockPrice(100);
    setStrikePrice(105);
    setTimeToMaturity(0.25);
    setRiskFreeRate(0.05);
    setVolatility(0.2);
    setOptionType("call");
    setMarketPrice(3.5);
    setStockQuote(null);
    setLookupTicker("");
    setLookupError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Black-Scholes Option Pricing</h1>
          <p className="text-muted-foreground mt-1">
            Calculate option prices and Greeks using the Black-Scholes model
          </p>
        </div>
        <Tooltip content="Clear all inputs and return to default values">
          <Button variant="outline" onClick={resetToDefaults}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </Tooltip>
      </div>

      {/* Tutorial Card */}
      <TutorialCard
        title={blackScholesTooltips.tutorial.title}
        description={blackScholesTooltips.tutorial.description}
        steps={blackScholesTooltips.tutorial.steps}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Input Parameters */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Parameters
            </CardTitle>
            <CardDescription>Adjust option parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stock Lookup Section */}
            <div className="p-4 rounded-lg bg-secondary/50 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Quick Stock Lookup</span>
                <span className="text-xs text-muted-foreground">(Optional)</span>
              </div>
              <div className="flex gap-2">
                <Input
                  value={lookupTicker}
                  onChange={(e) => setLookupTicker(e.target.value.toUpperCase())}
                  placeholder="AAPL"
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && fetchStockQuote()}
                />
                <Button
                  variant="outline"
                  onClick={fetchStockQuote}
                  disabled={lookupLoading || !lookupTicker.trim()}
                >
                  {lookupLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Fetch"
                  )}
                </Button>
              </div>
              {stockQuote && (
                <div className="mt-3 p-2 rounded bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{stockQuote.ticker}</span>
                    <span className="text-muted-foreground">{stockQuote.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Price: <span className="font-mono">${stockQuote.price.toFixed(2)}</span> |
                    Volatility: <span className="font-mono">{stockQuote.volatility_percent.toFixed(1)}%</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    (Auto-filled below - edit as needed)
                  </div>
                </div>
              )}
              {lookupError && (
                <div className="mt-2 text-xs text-red-500">{lookupError}</div>
              )}
            </div>

            {/* Option Type Toggle */}
            <div>
              <div className="flex items-center gap-1 mb-2">
                <span className="text-sm font-medium">Option Type</span>
                <Tooltip content={blackScholesTooltips.optionType} side="right" />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={optionType === "call" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setOptionType("call")}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Call
                </Button>
                <Button
                  variant={optionType === "put" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setOptionType("put")}
                >
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Put
                </Button>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <label className="text-sm font-medium">Stock Price (S)</label>
                <Tooltip content={blackScholesTooltips.stockPrice} side="right" />
              </div>
              <Input
                type="number"
                value={stockPrice}
                onChange={(e) => setStockPrice(parseFloat(e.target.value) || 0)}
                min={0}
                step={1}
              />
            </div>

            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <label className="text-sm font-medium">Strike Price (K)</label>
                <Tooltip content={blackScholesTooltips.strikePrice} side="right" />
              </div>
              <Input
                type="number"
                value={strikePrice}
                onChange={(e) => setStrikePrice(parseFloat(e.target.value) || 0)}
                min={0}
                step={1}
              />
            </div>

            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <label className="text-sm font-medium">Time to Maturity</label>
                <Tooltip content={blackScholesTooltips.timeToMaturity} side="right" />
              </div>
              <Slider
                value={[timeToMaturity]}
                onValueChange={([v]) => setTimeToMaturity(v)}
                min={0.01}
                max={2}
                step={0.01}
                formatValue={(v) => `${(v * 12).toFixed(1)} months`}
                showValue
              />
            </div>

            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <label className="text-sm font-medium">Risk-Free Rate</label>
                <Tooltip content={blackScholesTooltips.riskFreeRate} side="right" />
              </div>
              <Slider
                value={[riskFreeRate]}
                onValueChange={([v]) => setRiskFreeRate(v)}
                min={0}
                max={0.15}
                step={0.005}
                formatValue={(v) => `${(v * 100).toFixed(1)}%`}
                showValue
              />
            </div>

            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <label className="text-sm font-medium">Volatility (σ)</label>
                <Tooltip content={blackScholesTooltips.volatility} side="right" />
              </div>
              <Slider
                value={[volatility]}
                onValueChange={([v]) => setVolatility(v)}
                min={0.05}
                max={1}
                step={0.01}
                formatValue={(v) => `${(v * 100).toFixed(0)}%`}
                showValue
              />
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Option Pricing Results</CardTitle>
            <CardDescription>
              {optionType === "call" ? "Call" : "Put"} option with strike {formatCurrency(strikePrice)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Price Display */}
            <div className="mb-6 p-6 rounded-xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20">
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                <span>Option Price</span>
                <Tooltip content={optionType === "call" ? blackScholesTooltips.callPrice : blackScholesTooltips.putPrice} side="right" />
              </div>
              <div className="text-4xl font-bold font-mono-numbers text-primary">
                {formatCurrency(result.price)}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                d1 = {formatNumber(result.d1, 4)} | d2 = {formatNumber(result.d2, 4)}
              </div>
            </div>

            {/* Greeks Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-secondary">
                <div className="flex items-center gap-1 text-xs text-muted-foreground uppercase tracking-wide">
                  <span>Delta</span>
                  <Tooltip content={blackScholesTooltips.delta} side="top" />
                </div>
                <div className={`text-xl font-bold font-mono-numbers ${getProfitLossColor(result.greeks.delta)}`}>
                  {formatNumber(result.greeks.delta, 4)}
                </div>
                <div className="text-xs text-muted-foreground">Price sensitivity</div>
              </div>

              <div className="p-4 rounded-lg bg-secondary">
                <div className="flex items-center gap-1 text-xs text-muted-foreground uppercase tracking-wide">
                  <span>Gamma</span>
                  <Tooltip content={blackScholesTooltips.gamma} side="top" />
                </div>
                <div className="text-xl font-bold font-mono-numbers text-blue-500">
                  {formatNumber(result.greeks.gamma, 4)}
                </div>
                <div className="text-xs text-muted-foreground">Delta sensitivity</div>
              </div>

              <div className="p-4 rounded-lg bg-secondary">
                <div className="flex items-center gap-1 text-xs text-muted-foreground uppercase tracking-wide">
                  <span>Vega</span>
                  <Tooltip content={blackScholesTooltips.vega} side="top" />
                </div>
                <div className="text-xl font-bold font-mono-numbers text-purple-500">
                  {formatNumber(result.greeks.vega, 4)}
                </div>
                <div className="text-xs text-muted-foreground">Vol sensitivity</div>
              </div>

              <div className="p-4 rounded-lg bg-secondary">
                <div className="flex items-center gap-1 text-xs text-muted-foreground uppercase tracking-wide">
                  <span>Theta</span>
                  <Tooltip content={blackScholesTooltips.theta} side="top" />
                </div>
                <div className={`text-xl font-bold font-mono-numbers ${getProfitLossColor(result.greeks.theta)}`}>
                  {formatNumber(result.greeks.theta, 4)}
                </div>
                <div className="text-xs text-muted-foreground">Time decay/day</div>
              </div>

              <div className="p-4 rounded-lg bg-secondary">
                <div className="flex items-center gap-1 text-xs text-muted-foreground uppercase tracking-wide">
                  <span>Rho</span>
                  <Tooltip content={blackScholesTooltips.rho} side="top" />
                </div>
                <div className={`text-xl font-bold font-mono-numbers ${getProfitLossColor(result.greeks.rho)}`}>
                  {formatNumber(result.greeks.rho, 4)}
                </div>
                <div className="text-xs text-muted-foreground">Rate sensitivity</div>
              </div>
            </div>

            {/* Result Interpretation */}
            <ResultInterpretation data={interpretation} />
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="price">
        <TabsList>
          <TabsTrigger value="price">Option Price</TabsTrigger>
          <TabsTrigger value="delta">Delta</TabsTrigger>
          <TabsTrigger value="gamma">Gamma</TabsTrigger>
          <TabsTrigger value="vega">Vega</TabsTrigger>
          <TabsTrigger value="theta">Theta</TabsTrigger>
          <TabsTrigger value="iv">Implied Vol</TabsTrigger>
        </TabsList>

        <TabsContent value="price">
          <Card>
            <CardHeader>
              <CardTitle>Option Price vs Stock Price</CardTitle>
              <CardDescription>Call and Put option values across different stock prices</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={priceChartData}
                layout={{
                  xaxis: { title: "Stock Price ($)" },
                  yaxis: { title: "Option Price ($)" },
                  height: 400,
                  showlegend: true,
                }}
                className="w-full h-[400px]"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delta">
          <Card>
            <CardHeader>
              <CardTitle>Delta vs Stock Price</CardTitle>
              <CardDescription>Option price sensitivity to underlying stock price changes</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={greeksChartData.delta}
                layout={{
                  xaxis: { title: "Stock Price ($)" },
                  yaxis: { title: "Delta" },
                  height: 400,
                }}
                className="w-full h-[400px]"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gamma">
          <Card>
            <CardHeader>
              <CardTitle>Gamma vs Stock Price</CardTitle>
              <CardDescription>Rate of change in Delta</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={greeksChartData.gamma}
                layout={{
                  xaxis: { title: "Stock Price ($)" },
                  yaxis: { title: "Gamma" },
                  height: 400,
                }}
                className="w-full h-[400px]"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vega">
          <Card>
            <CardHeader>
              <CardTitle>Vega vs Stock Price</CardTitle>
              <CardDescription>Option price sensitivity to volatility changes</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={greeksChartData.vega}
                layout={{
                  xaxis: { title: "Stock Price ($)" },
                  yaxis: { title: "Vega" },
                  height: 400,
                }}
                className="w-full h-[400px]"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theta">
          <Card>
            <CardHeader>
              <CardTitle>Theta vs Stock Price</CardTitle>
              <CardDescription>Time decay per day</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={greeksChartData.theta}
                layout={{
                  xaxis: { title: "Stock Price ($)" },
                  yaxis: { title: "Theta (per day)" },
                  height: 400,
                }}
                className="w-full h-[400px]"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="iv">
          <Card>
            <CardHeader>
              <CardTitle>Implied Volatility Calculator</CardTitle>
              <CardDescription>Calculate IV from observed market price</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Input
                    label="Market Price"
                    type="number"
                    value={marketPrice}
                    onChange={(e) => setMarketPrice(parseFloat(e.target.value) || 0)}
                    min={0}
                    step={0.1}
                  />
                  <p className="text-sm text-muted-foreground">
                    Enter the observed market price to calculate the implied volatility
                    that would produce this price given the other parameters.
                  </p>
                </div>
                <div className="p-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20">
                  <div className="text-sm text-muted-foreground mb-1">Implied Volatility</div>
                  <div className="text-4xl font-bold font-mono-numbers text-purple-500">
                    {impliedVol !== null ? formatPercent(impliedVol) : "N/A"}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    {impliedVol !== null
                      ? `Calculated using Newton-Raphson method`
                      : "Could not converge - check inputs"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
