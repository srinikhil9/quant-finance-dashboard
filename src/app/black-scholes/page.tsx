"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { PlotlyChart, chartColors } from "@/components/charts";
import {
  calculateBlackScholes,
  calculateImpliedVolatility,
  generatePriceVsStock,
  generateGreeksVsStock,
  type OptionType,
  type BlackScholesResult,
} from "@/lib/calculations/blackScholes";
import { formatCurrency, formatNumber, formatPercent, getProfitLossColor } from "@/lib/utils/formatters";
import { TrendingUp, TrendingDown, Calculator, RefreshCw } from "lucide-react";

export default function BlackScholesPage() {
  // Input parameters
  const [stockPrice, setStockPrice] = useState(100);
  const [strikePrice, setStrikePrice] = useState(105);
  const [timeToMaturity, setTimeToMaturity] = useState(0.25); // 3 months
  const [riskFreeRate, setRiskFreeRate] = useState(0.05); // 5%
  const [volatility, setVolatility] = useState(0.2); // 20%
  const [optionType, setOptionType] = useState<OptionType>("call");

  // Implied volatility inputs
  const [marketPrice, setMarketPrice] = useState(3.5);

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
        <Button variant="outline" onClick={resetToDefaults}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>

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
            {/* Option Type Toggle */}
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

            <Input
              label="Stock Price (S)"
              type="number"
              value={stockPrice}
              onChange={(e) => setStockPrice(parseFloat(e.target.value) || 0)}
              min={0}
              step={1}
            />

            <Input
              label="Strike Price (K)"
              type="number"
              value={strikePrice}
              onChange={(e) => setStrikePrice(parseFloat(e.target.value) || 0)}
              min={0}
              step={1}
            />

            <Slider
              label="Time to Maturity (Years)"
              value={[timeToMaturity]}
              onValueChange={([v]) => setTimeToMaturity(v)}
              min={0.01}
              max={2}
              step={0.01}
              formatValue={(v) => `${(v * 12).toFixed(1)} months`}
            />

            <Slider
              label="Risk-Free Rate"
              value={[riskFreeRate]}
              onValueChange={([v]) => setRiskFreeRate(v)}
              min={0}
              max={0.15}
              step={0.005}
              formatValue={(v) => `${(v * 100).toFixed(1)}%`}
            />

            <Slider
              label="Volatility (sigma)"
              value={[volatility]}
              onValueChange={([v]) => setVolatility(v)}
              min={0.05}
              max={1}
              step={0.01}
              formatValue={(v) => `${(v * 100).toFixed(0)}%`}
            />
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
              <div className="text-sm text-muted-foreground mb-1">Option Price</div>
              <div className="text-4xl font-bold font-mono-numbers text-primary">
                {formatCurrency(result.price)}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                d1 = {formatNumber(result.d1, 4)} | d2 = {formatNumber(result.d2, 4)}
              </div>
            </div>

            {/* Greeks Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 rounded-lg bg-secondary">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Delta</div>
                <div className={`text-xl font-bold font-mono-numbers ${getProfitLossColor(result.greeks.delta)}`}>
                  {formatNumber(result.greeks.delta, 4)}
                </div>
                <div className="text-xs text-muted-foreground">Price sensitivity</div>
              </div>

              <div className="p-4 rounded-lg bg-secondary">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Gamma</div>
                <div className="text-xl font-bold font-mono-numbers text-blue-500">
                  {formatNumber(result.greeks.gamma, 4)}
                </div>
                <div className="text-xs text-muted-foreground">Delta sensitivity</div>
              </div>

              <div className="p-4 rounded-lg bg-secondary">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Vega</div>
                <div className="text-xl font-bold font-mono-numbers text-purple-500">
                  {formatNumber(result.greeks.vega, 4)}
                </div>
                <div className="text-xs text-muted-foreground">Vol sensitivity</div>
              </div>

              <div className="p-4 rounded-lg bg-secondary">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Theta</div>
                <div className={`text-xl font-bold font-mono-numbers ${getProfitLossColor(result.greeks.theta)}`}>
                  {formatNumber(result.greeks.theta, 4)}
                </div>
                <div className="text-xs text-muted-foreground">Time decay/day</div>
              </div>

              <div className="p-4 rounded-lg bg-secondary">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Rho</div>
                <div className={`text-xl font-bold font-mono-numbers ${getProfitLossColor(result.greeks.rho)}`}>
                  {formatNumber(result.greeks.rho, 4)}
                </div>
                <div className="text-xs text-muted-foreground">Rate sensitivity</div>
              </div>
            </div>
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
