"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TutorialCard } from "@/components/ui/tooltip";
import { PlotlyChart, chartColors } from "@/components/charts";
import { formatNumber, formatPercent } from "@/lib/utils/formatters";
import { Sparkles, RefreshCw, Play, Loader2, TrendingUp, TrendingDown, Download } from "lucide-react";
import { trackCalculation } from "@/lib/analytics";

interface BasketResult {
  tickers: string[];
  period: string;
  data_points: number;
  optimization_metric: string;
  baseline: {
    weights: Record<string, number>;
    performance: {
      sharpe_ratio: number;
      total_return: number;
      max_drawdown: number;
      n_trades: number;
    };
  };
  optimized: {
    weights: Record<string, number>;
    performance: {
      sharpe_ratio: number;
      total_return: number;
      max_drawdown: number;
      n_trades: number;
    };
  };
  improvement: {
    sharpe_delta: number;
    return_delta: number;
  };
  convergence: {
    iterations: number[];
    objectives: number[];
    best_objective: number[];
  };
  time_series: {
    dates: string[];
    baseline_spread: number[];
    optimized_spread: number[];
    baseline_zscore: number[];
    optimized_zscore: number[];
    baseline_cumulative: number[];
    optimized_cumulative: number[];
  };
}

const basketTradingTooltips = {
  tutorial: {
    title: "Bayesian Optimization Basket Trading",
    description: "Optimize cointegration weights across a basket of assets to maximize risk-adjusted returns using differential evolution.",
    steps: [
      "Enter 3-6 ticker symbols (ETFs work well: SPY, QQQ, GLD, TLT, IWM)",
      "Select optimization target: Sharpe Ratio, Total Return, or Minimum Drawdown",
      "Click 'Optimize Basket' to find optimal weights",
      "Compare baseline (regression-based) vs optimized weights performance"
    ]
  },
  tickers: "Enter comma-separated ticker symbols. Diverse assets (stocks, bonds, commodities) often show better cointegration opportunities.",
  metric: "Optimization target: Sharpe maximizes risk-adjusted return, Return maximizes total profit, Min DD minimizes worst peak-to-trough decline.",
  entry: "Z-score threshold to enter a trade. Higher values = fewer but higher conviction trades.",
  exit: "Z-score threshold to exit a trade. Lower values = hold positions longer waiting for mean reversion."
};

export default function BasketTradingPage() {
  const [tickers, setTickers] = useState("SPY,QQQ,IWM,GLD,TLT");
  const [period, setPeriod] = useState("1y");
  const [metric, setMetric] = useState("sharpe");
  const [entryThreshold, setEntryThreshold] = useState(2.0);
  const [exitThreshold, setExitThreshold] = useState(0.5);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BasketResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const optimizeBasket = async () => {
    setLoading(true);
    setError(null);
    const startTime = performance.now();

    const inputParams = {
      tickers,
      period,
      metric,
      entry: entryThreshold,
      exit: exitThreshold,
    };

    try {
      const params = new URLSearchParams({
        tickers,
        period,
        metric,
        entry: entryThreshold.toString(),
        exit: exitThreshold.toString(),
      });

      const response = await fetch(`/api/basket-optimizer?${params}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);

      // Track successful optimization
      trackCalculation('basket-trading', inputParams, data, Math.round(performance.now() - startTime));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Optimization failed");

      // Track failed optimization
      trackCalculation('basket-trading', inputParams, { error: err instanceof Error ? err.message : 'Unknown error' }, Math.round(performance.now() - startTime));
    } finally {
      setLoading(false);
    }
  };

  const convergenceChartData = result ? [
    {
      x: result.convergence.iterations,
      y: result.convergence.objectives,
      type: "scatter" as const,
      mode: "lines+markers" as const,
      name: "Current Objective",
      line: { color: chartColors.secondary, width: 1 },
      marker: { size: 4 },
    },
    {
      x: result.convergence.iterations,
      y: result.convergence.best_objective,
      type: "scatter" as const,
      mode: "lines" as const,
      name: "Best So Far",
      line: { color: chartColors.primary, width: 2 },
    },
  ] : [];

  const cumulativeChartData = result ? [
    {
      x: result.time_series.dates,
      y: result.time_series.baseline_cumulative,
      type: "scatter" as const,
      mode: "lines" as const,
      name: "Baseline Strategy",
      line: { color: chartColors.muted, width: 2 },
    },
    {
      x: result.time_series.dates,
      y: result.time_series.optimized_cumulative,
      type: "scatter" as const,
      mode: "lines" as const,
      name: "Optimized Strategy",
      line: { color: chartColors.primary, width: 2 },
    },
  ] : [];

  const weightsComparisonData = result ? [
    {
      x: result.tickers,
      y: result.tickers.map(t => result.baseline.weights[t] * 100),
      type: "bar" as const,
      name: "Baseline",
      marker: { color: chartColors.muted },
    },
    {
      x: result.tickers,
      y: result.tickers.map(t => result.optimized.weights[t] * 100),
      type: "bar" as const,
      name: "Optimized",
      marker: { color: chartColors.primary },
    },
  ] : [];

  const zscoreChartData = result ? [
    {
      x: result.time_series.dates,
      y: result.time_series.optimized_zscore,
      type: "scatter" as const,
      mode: "lines" as const,
      name: "Optimized Z-Score",
      line: { color: chartColors.primary, width: 2 },
    },
  ] : [];

  const resetToDefaults = () => {
    setTickers("SPY,QQQ,IWM,GLD,TLT");
    setPeriod("1y");
    setMetric("sharpe");
    setEntryThreshold(2.0);
    setExitThreshold(0.5);
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bayesian Optimization Basket Trading</h1>
          <p className="text-muted-foreground mt-1">
            Optimize cointegration weights using differential evolution
          </p>
        </div>
        <div className="flex gap-2">
          <Tooltip content="Download full Jupyter notebook with Optuna/GPyOpt implementation">
            <Button variant="outline" asChild>
              <a href="/notebooks/bayesian-optimization-basket.ipynb" download>
                <Download className="h-4 w-4 mr-2" />
                Notebook
              </a>
            </Button>
          </Tooltip>
          <Tooltip content="Clear all inputs and return to default values">
            <Button variant="outline" onClick={resetToDefaults}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Tutorial Card */}
      <TutorialCard
        title={basketTradingTooltips.tutorial.title}
        description={basketTradingTooltips.tutorial.description}
        steps={basketTradingTooltips.tutorial.steps}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Input Parameters */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Optimization Settings
            </CardTitle>
            <CardDescription>Configure basket and optimization parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <label className="text-sm font-medium">Basket Tickers</label>
                <Tooltip content={basketTradingTooltips.tickers} side="right" />
              </div>
              <Input
                value={tickers}
                onChange={(e) => setTickers(e.target.value.toUpperCase())}
                placeholder="SPY,QQQ,IWM,GLD,TLT"
              />
              <p className="text-xs text-muted-foreground mt-1">
                3-6 comma-separated tickers
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <label className="text-sm font-medium">Optimization Target</label>
                <Tooltip content={basketTradingTooltips.metric} side="right" />
              </div>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sharpe">Maximize Sharpe Ratio</SelectItem>
                  <SelectItem value="return">Maximize Total Return</SelectItem>
                  <SelectItem value="min_dd">Minimize Max Drawdown</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Historical Period</label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6mo">6 Months</SelectItem>
                  <SelectItem value="1y">1 Year</SelectItem>
                  <SelectItem value="2y">2 Years</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Slider
              label="Entry Threshold (Z-score)"
              value={[entryThreshold]}
              onValueChange={([v]) => setEntryThreshold(v)}
              min={1}
              max={3}
              step={0.1}
              formatValue={(v) => `|Z| > ${v.toFixed(1)}`}
            />

            <Slider
              label="Exit Threshold (Z-score)"
              value={[exitThreshold]}
              onValueChange={([v]) => setExitThreshold(v)}
              min={0}
              max={1}
              step={0.1}
              formatValue={(v) => `|Z| < ${v.toFixed(1)}`}
            />

            <Button onClick={optimizeBasket} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Optimize Basket
                </>
              )}
            </Button>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="p-4 rounded-lg bg-secondary/50 text-sm">
              <p className="font-medium mb-2">How It Works:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>1. Fetches historical prices for all assets</li>
                <li>2. Computes baseline weights via regression</li>
                <li>3. Runs differential evolution to optimize</li>
                <li>4. Backtests both strategies with mean reversion</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Optimization Results</CardTitle>
            <CardDescription>
              {result
                ? `${result.tickers.join(", ")} - ${result.data_points} data points`
                : "Configure parameters and click 'Optimize Basket'"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <>
                {/* Performance Comparison */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {/* Baseline */}
                  <div className="p-4 rounded-lg bg-secondary">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-zinc-500" />
                      <span className="font-medium">Baseline (Regression)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Sharpe</div>
                        <div className="font-mono-numbers font-bold">
                          {result.baseline.performance.sharpe_ratio.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Return</div>
                        <div className={`font-mono-numbers font-bold ${result.baseline.performance.total_return >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {result.baseline.performance.total_return >= 0 ? '+' : ''}{result.baseline.performance.total_return.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Max DD</div>
                        <div className="font-mono-numbers text-red-500">
                          -{result.baseline.performance.max_drawdown.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Trades</div>
                        <div className="font-mono-numbers">
                          {result.baseline.performance.n_trades}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Optimized */}
                  <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">Optimized (DE)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Sharpe</div>
                        <div className="font-mono-numbers font-bold text-blue-500">
                          {result.optimized.performance.sharpe_ratio.toFixed(2)}
                          {result.improvement.sharpe_delta > 0 && (
                            <span className="text-xs text-green-500 ml-1">
                              +{result.improvement.sharpe_delta.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Return</div>
                        <div className={`font-mono-numbers font-bold ${result.optimized.performance.total_return >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {result.optimized.performance.total_return >= 0 ? '+' : ''}{result.optimized.performance.total_return.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Max DD</div>
                        <div className="font-mono-numbers text-red-500">
                          -{result.optimized.performance.max_drawdown.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Trades</div>
                        <div className="font-mono-numbers">
                          {result.optimized.performance.n_trades}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Improvement Summary */}
                <div className={`p-4 rounded-lg mb-6 ${
                  result.improvement.sharpe_delta > 0
                    ? "bg-gradient-to-r from-green-500/10 to-transparent border border-green-500/20"
                    : "bg-gradient-to-r from-red-500/10 to-transparent border border-red-500/20"
                }`}>
                  <div className="flex items-center gap-2">
                    {result.improvement.sharpe_delta > 0 ? (
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-500" />
                    )}
                    <span className="font-medium">
                      Optimization {result.improvement.sharpe_delta > 0 ? "improved" : "did not improve"} Sharpe by{" "}
                      <span className="font-mono-numbers">
                        {Math.abs(result.improvement.sharpe_delta).toFixed(2)}
                      </span>
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Return delta: {result.improvement.return_delta >= 0 ? '+' : ''}{result.improvement.return_delta.toFixed(1)}%
                  </p>
                </div>

                {/* Optimized Weights */}
                <div className="p-4 rounded-lg bg-secondary">
                  <h4 className="font-medium mb-2">Optimized Portfolio Weights</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.tickers.map((ticker) => (
                      <div key={ticker} className="px-3 py-1.5 rounded-lg bg-background border">
                        <span className="font-medium">{ticker}:</span>
                        <span className={`ml-2 font-mono-numbers ${
                          result.optimized.weights[ticker] >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {(result.optimized.weights[ticker] * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                Enter basket tickers and click "Optimize Basket" to find optimal weights
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {result && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Optimization Convergence</CardTitle>
              <CardDescription>Objective value over iterations</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={convergenceChartData}
                layout={{
                  xaxis: { title: "Iteration" },
                  yaxis: { title: metric === "sharpe" ? "Sharpe Ratio" : metric === "return" ? "Return (%)" : "Neg. Drawdown" },
                  height: 350,
                  showlegend: true,
                  legend: { x: 0, y: 1.1, orientation: "h" as const },
                }}
                className="w-full h-[350px]"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cumulative Returns</CardTitle>
              <CardDescription>Baseline vs Optimized strategy performance</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={cumulativeChartData}
                layout={{
                  xaxis: { title: "Date" },
                  yaxis: { title: "Cumulative Return (%)" },
                  height: 350,
                  showlegend: true,
                  legend: { x: 0, y: 1.1, orientation: "h" as const },
                }}
                className="w-full h-[350px]"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Weight Comparison</CardTitle>
              <CardDescription>Baseline vs Optimized weights by asset</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={weightsComparisonData}
                layout={{
                  xaxis: { title: "Asset" },
                  yaxis: { title: "Weight (%)" },
                  height: 350,
                  barmode: "group" as const,
                  showlegend: true,
                  legend: { x: 0, y: 1.1, orientation: "h" as const },
                }}
                className="w-full h-[350px]"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Spread Z-Score</CardTitle>
              <CardDescription>Optimized spread mean reversion signal</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={zscoreChartData}
                layout={{
                  xaxis: { title: "Date" },
                  yaxis: { title: "Z-Score" },
                  height: 350,
                  shapes: [
                    { type: "line", y0: entryThreshold, y1: entryThreshold, x0: 0, x1: 1, xref: "paper", line: { color: chartColors.loss, dash: "dash" } },
                    { type: "line", y0: -entryThreshold, y1: -entryThreshold, x0: 0, x1: 1, xref: "paper", line: { color: chartColors.profit, dash: "dash" } },
                    { type: "line", y0: 0, y1: 0, x0: 0, x1: 1, xref: "paper", line: { color: chartColors.muted, dash: "dot" } },
                  ],
                }}
                className="w-full h-[350px]"
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
