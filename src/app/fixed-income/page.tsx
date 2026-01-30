"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TutorialCard } from "@/components/ui/tooltip";
import { PlotlyChart, chartColors } from "@/components/charts";
import { fixedIncomeTooltips } from "@/lib/tooltips";
import {
  calculateBondSummary,
  calculateYTM,
  generateCashFlowSchedule,
  generatePriceVsYield,
  generateDurationVsYield,
  estimatePriceChange,
  sampleYieldCurve,
  calculateForwardRate,
  type BondParams,
} from "@/lib/calculations/bondPricing";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils/formatters";
import { Landmark, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";

export default function FixedIncomePage() {
  // Bond parameters
  const [faceValue, setFaceValue] = useState(1000);
  const [couponRate, setCouponRate] = useState(0.05); // 5%
  const [yearsToMaturity, setYearsToMaturity] = useState(10);
  const [couponFrequency, setCouponFrequency] = useState(2); // Semi-annual
  const [ytm, setYtm] = useState(0.06); // 6%

  // YTM Calculator
  const [marketPrice, setMarketPrice] = useState(950);

  // Price change scenario
  const [yieldChange, setYieldChange] = useState(0.01); // 1%

  const bondParams: BondParams = useMemo(() => ({
    faceValue,
    couponRate,
    yearsToMaturity,
    couponFrequency,
  }), [faceValue, couponRate, yearsToMaturity, couponFrequency]);

  // Calculate bond summary
  const summary = useMemo(() => {
    return calculateBondSummary(bondParams, ytm);
  }, [bondParams, ytm]);

  // Calculate YTM from market price
  const calculatedYtm = useMemo(() => {
    return calculateYTM(bondParams, marketPrice);
  }, [bondParams, marketPrice]);

  // Cash flow schedule
  const cashFlows = useMemo(() => {
    return generateCashFlowSchedule(bondParams);
  }, [bondParams]);

  // Price change estimate
  const priceChangeEstimate = useMemo(() => {
    return estimatePriceChange(bondParams, ytm, yieldChange);
  }, [bondParams, ytm, yieldChange]);

  // Chart data
  const priceYieldData = useMemo(() => {
    const data = generatePriceVsYield(bondParams, 0.01, 0.15, 50);
    return [
      {
        x: data.map(d => d.ytm * 100),
        y: data.map(d => d.price),
        type: "scatter" as const,
        mode: "lines" as const,
        name: "Bond Price",
        line: { color: chartColors.primary, width: 2 },
      },
      {
        x: [ytm * 100],
        y: [summary.price],
        type: "scatter" as const,
        mode: "markers" as const,
        name: "Current",
        marker: { color: chartColors.warning, size: 12, symbol: "diamond" },
      },
      {
        x: [0, 15],
        y: [faceValue, faceValue],
        type: "scatter" as const,
        mode: "lines" as const,
        name: "Par Value",
        line: { color: chartColors.loss, width: 1, dash: "dash" },
      },
    ];
  }, [bondParams, ytm, summary.price, faceValue]);

  const durationYieldData = useMemo(() => {
    const data = generateDurationVsYield(bondParams, 0.01, 0.15, 50);
    return [
      {
        x: data.map(d => d.ytm * 100),
        y: data.map(d => d.duration),
        type: "scatter" as const,
        mode: "lines" as const,
        name: "Duration",
        line: { color: chartColors.secondary, width: 2 },
      },
    ];
  }, [bondParams]);

  const cashFlowChartData = useMemo(() => {
    return [
      {
        x: cashFlows.map(cf => cf.timeYears),
        y: cashFlows.map(cf => cf.cashFlow),
        type: "bar" as const,
        name: "Cash Flow",
        marker: { color: chartColors.primary, opacity: 0.7 },
      },
    ];
  }, [cashFlows]);

  const yieldCurveData = useMemo(() => {
    const fineMaturities = [];
    for (let m = 0.25; m <= 30; m += 0.25) {
      fineMaturities.push(m);
    }

    return [
      {
        x: sampleYieldCurve.maturities,
        y: sampleYieldCurve.yields.map(y => y * 100),
        type: "scatter" as const,
        mode: "markers" as const,
        name: "Market Yields",
        marker: { color: chartColors.loss, size: 10 },
      },
      {
        x: fineMaturities,
        y: fineMaturities.map(m => {
          // Simple linear interpolation
          const { maturities, yields } = sampleYieldCurve;
          if (m <= maturities[0]) return yields[0] * 100;
          if (m >= maturities[maturities.length - 1]) return yields[yields.length - 1] * 100;
          let i = 0;
          while (i < maturities.length - 1 && maturities[i + 1] < m) i++;
          const t1 = maturities[i], t2 = maturities[i + 1];
          const y1 = yields[i], y2 = yields[i + 1];
          return (y1 + (y2 - y1) * (m - t1) / (t2 - t1)) * 100;
        }),
        type: "scatter" as const,
        mode: "lines" as const,
        name: "Interpolated Curve",
        line: { color: chartColors.primary, width: 2 },
      },
    ];
  }, []);

  const resetToDefaults = () => {
    setFaceValue(1000);
    setCouponRate(0.05);
    setYearsToMaturity(10);
    setCouponFrequency(2);
    setYtm(0.06);
    setMarketPrice(950);
    setYieldChange(0.01);
  };

  const isPremium = summary.price > faceValue;
  const isDiscount = summary.price < faceValue;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fixed Income - Bond Pricing</h1>
          <p className="text-muted-foreground mt-1">
            Price bonds and analyze duration, convexity, and yield curves
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
        title={fixedIncomeTooltips.tutorial.title}
        description={fixedIncomeTooltips.tutorial.description}
        steps={fixedIncomeTooltips.tutorial.steps}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Input Parameters */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5" />
              Bond Parameters
            </CardTitle>
            <CardDescription>Configure bond characteristics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <label className="text-sm font-medium">Face Value ($)</label>
                <Tooltip content={fixedIncomeTooltips.faceValue} side="right" />
              </div>
              <Input
                type="number"
                value={faceValue}
                onChange={(e) => setFaceValue(parseFloat(e.target.value) || 0)}
                min={0}
                step={100}
              />
            </div>

            <Slider
              label="Coupon Rate"
              value={[couponRate]}
              onValueChange={([v]) => setCouponRate(v)}
              min={0}
              max={0.15}
              step={0.005}
              formatValue={(v) => `${(v * 100).toFixed(2)}%`}
            />

            <Slider
              label="Years to Maturity"
              value={[yearsToMaturity]}
              onValueChange={([v]) => setYearsToMaturity(v)}
              min={1}
              max={30}
              step={1}
              formatValue={(v) => `${v} years`}
            />

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Coupon Frequency</label>
              <Select
                value={couponFrequency.toString()}
                onValueChange={(v) => setCouponFrequency(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Annual</SelectItem>
                  <SelectItem value="2">Semi-Annual</SelectItem>
                  <SelectItem value="4">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Slider
              label="Yield to Maturity"
              value={[ytm]}
              onValueChange={([v]) => setYtm(v)}
              min={0.01}
              max={0.15}
              step={0.005}
              formatValue={(v) => `${(v * 100).toFixed(2)}%`}
            />
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Bond Analytics</CardTitle>
            <CardDescription>
              {couponFrequency === 1 ? "Annual" : couponFrequency === 2 ? "Semi-annual" : "Quarterly"} coupon bond
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Price Display */}
            <div className={`mb-6 p-6 rounded-xl bg-gradient-to-br border ${
              isPremium
                ? "from-green-500/10 to-transparent border-green-500/20"
                : isDiscount
                  ? "from-red-500/10 to-transparent border-red-500/20"
                  : "from-primary/10 to-transparent border-primary/20"
            }`}>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                Bond Price
                {isPremium && <span className="text-green-500">(Premium)</span>}
                {isDiscount && <span className="text-red-500">(Discount)</span>}
                {!isPremium && !isDiscount && <span>(Par)</span>}
              </div>
              <div className={`text-4xl font-bold font-mono-numbers ${
                isPremium ? "text-green-500" : isDiscount ? "text-red-500" : "text-primary"
              }`}>
                {formatCurrency(summary.price)}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                Coupon: {formatCurrency((faceValue * couponRate) / couponFrequency)} per period
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-secondary">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Macaulay Duration</div>
                <div className="text-xl font-bold font-mono-numbers text-blue-500">
                  {formatNumber(summary.macaulayDuration, 4)}
                </div>
                <div className="text-xs text-muted-foreground">years</div>
              </div>

              <div className="p-4 rounded-lg bg-secondary">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Modified Duration</div>
                <div className="text-xl font-bold font-mono-numbers text-purple-500">
                  {formatNumber(summary.modifiedDuration, 4)}
                </div>
                <div className="text-xs text-muted-foreground">%/% yield change</div>
              </div>

              <div className="p-4 rounded-lg bg-secondary">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Convexity</div>
                <div className="text-xl font-bold font-mono-numbers text-orange-500">
                  {formatNumber(summary.convexity, 2)}
                </div>
                <div className="text-xs text-muted-foreground">curvature</div>
              </div>

              <div className="p-4 rounded-lg bg-secondary">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">DV01</div>
                <div className="text-xl font-bold font-mono-numbers text-cyan-500">
                  {formatCurrency(summary.dv01)}
                </div>
                <div className="text-xs text-muted-foreground">per 1bp</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analysis */}
      <Tabs defaultValue="price">
        <TabsList>
          <TabsTrigger value="price">Price vs Yield</TabsTrigger>
          <TabsTrigger value="duration">Duration</TabsTrigger>
          <TabsTrigger value="cashflows">Cash Flows</TabsTrigger>
          <TabsTrigger value="scenario">Scenario Analysis</TabsTrigger>
          <TabsTrigger value="ytm">YTM Calculator</TabsTrigger>
          <TabsTrigger value="yieldcurve">Yield Curve</TabsTrigger>
        </TabsList>

        <TabsContent value="price">
          <Card>
            <CardHeader>
              <CardTitle>Price-Yield Relationship</CardTitle>
              <CardDescription>Bond price decreases as yield increases (convex relationship)</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={priceYieldData}
                layout={{
                  xaxis: { title: "Yield to Maturity (%)", autorange: "reversed" },
                  yaxis: { title: "Bond Price ($)" },
                  height: 400,
                  showlegend: true,
                }}
                className="w-full h-[400px]"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="duration">
          <Card>
            <CardHeader>
              <CardTitle>Duration vs Yield</CardTitle>
              <CardDescription>Macaulay duration decreases as yield increases</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={durationYieldData}
                layout={{
                  xaxis: { title: "Yield to Maturity (%)" },
                  yaxis: { title: "Duration (Years)" },
                  height: 400,
                }}
                className="w-full h-[400px]"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cashflows">
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Schedule</CardTitle>
              <CardDescription>
                {cashFlows.length} payments over {yearsToMaturity} years
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={cashFlowChartData}
                layout={{
                  xaxis: { title: "Time (Years)" },
                  yaxis: { title: "Cash Flow ($)" },
                  height: 400,
                  bargap: 0.3,
                }}
                className="w-full h-[400px]"
              />
              <div className="mt-4 max-h-48 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border">
                      <th className="text-left p-2">Period</th>
                      <th className="text-left p-2">Time (Years)</th>
                      <th className="text-right p-2">Cash Flow</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashFlows.slice(0, 10).map((cf) => (
                      <tr key={cf.period} className="border-b border-border/50">
                        <td className="p-2">{cf.period}</td>
                        <td className="p-2 font-mono-numbers">{cf.timeYears.toFixed(2)}</td>
                        <td className="p-2 text-right font-mono-numbers">{formatCurrency(cf.cashFlow)}</td>
                      </tr>
                    ))}
                    {cashFlows.length > 10 && (
                      <tr>
                        <td colSpan={3} className="p-2 text-center text-muted-foreground">
                          ... and {cashFlows.length - 10} more payments
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scenario">
          <Card>
            <CardHeader>
              <CardTitle>Price Change Scenario</CardTitle>
              <CardDescription>Estimate price change using duration and convexity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Slider
                    label="Yield Change"
                    value={[yieldChange]}
                    onValueChange={([v]) => setYieldChange(v)}
                    min={-0.03}
                    max={0.03}
                    step={0.001}
                    formatValue={(v) => `${(v * 100).toFixed(2)}%`}
                  />
                  <div className="flex items-center gap-2 text-sm">
                    <span>Current YTM: {formatPercent(ytm)}</span>
                    <span>→</span>
                    <span>New YTM: {formatPercent(ytm + yieldChange)}</span>
                    {yieldChange > 0 ? (
                      <TrendingUp className="h-4 w-4 text-red-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-secondary">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration Effect:</span>
                      <span className={`font-mono-numbers ${priceChangeEstimate.durationEffectPct > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {priceChangeEstimate.durationEffectPct > 0 ? '+' : ''}{formatNumber(priceChangeEstimate.durationEffectPct, 4)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Convexity Effect:</span>
                      <span className="font-mono-numbers text-green-500">
                        +{formatNumber(priceChangeEstimate.convexityEffectPct, 4)}%
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2 mt-2">
                      <span className="font-medium">Estimated Change:</span>
                      <span className={`font-mono-numbers font-bold ${priceChangeEstimate.estimatedChangePct > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {priceChangeEstimate.estimatedChangePct > 0 ? '+' : ''}{formatNumber(priceChangeEstimate.estimatedChangePct, 4)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Actual Change:</span>
                      <span className={`font-mono-numbers ${priceChangeEstimate.actualChangePct > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {priceChangeEstimate.actualChangePct > 0 ? '+' : ''}{formatNumber(priceChangeEstimate.actualChangePct, 4)}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <div className="text-xs text-muted-foreground">Estimated Price</div>
                      <div className="font-mono-numbers font-bold">
                        {formatCurrency(priceChangeEstimate.estimatedPrice)}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <div className="text-xs text-muted-foreground">Actual Price</div>
                      <div className="font-mono-numbers font-bold">
                        {formatCurrency(priceChangeEstimate.actualPrice)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ytm">
          <Card>
            <CardHeader>
              <CardTitle>YTM Calculator</CardTitle>
              <CardDescription>Calculate yield to maturity from market price</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Input
                    label="Market Price ($)"
                    type="number"
                    value={marketPrice}
                    onChange={(e) => setMarketPrice(parseFloat(e.target.value) || 0)}
                    min={0}
                    step={10}
                  />
                  <p className="text-sm text-muted-foreground">
                    Enter the observed market price to calculate the yield that
                    would produce this price given the bond parameters.
                  </p>
                </div>
                <div className="p-6 rounded-xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20">
                  <div className="text-sm text-muted-foreground mb-1">Calculated YTM</div>
                  <div className="text-4xl font-bold font-mono-numbers text-blue-500">
                    {formatPercent(calculatedYtm)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Using numerical optimization (bisection method)
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="yieldcurve">
          <Card>
            <CardHeader>
              <CardTitle>Treasury Yield Curve</CardTitle>
              <CardDescription>Sample yield curve with interpolation</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={yieldCurveData}
                layout={{
                  xaxis: { title: "Maturity (Years)" },
                  yaxis: { title: "Yield (%)" },
                  height: 400,
                  showlegend: true,
                }}
                className="w-full h-[400px]"
              />
              <div className="mt-4 grid md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-secondary">
                  <div className="text-xs text-muted-foreground uppercase">1Y → 2Y Forward</div>
                  <div className="text-lg font-bold font-mono-numbers">
                    {formatPercent(calculateForwardRate(sampleYieldCurve, 1, 2))}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-secondary">
                  <div className="text-xs text-muted-foreground uppercase">3Y → 5Y Forward</div>
                  <div className="text-lg font-bold font-mono-numbers">
                    {formatPercent(calculateForwardRate(sampleYieldCurve, 3, 5))}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-secondary">
                  <div className="text-xs text-muted-foreground uppercase">5Y → 10Y Forward</div>
                  <div className="text-lg font-bold font-mono-numbers">
                    {formatPercent(calculateForwardRate(sampleYieldCurve, 5, 10))}
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
