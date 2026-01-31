"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TutorialCard } from "@/components/ui/tooltip";
import { PlotlyChart, chartColors } from "@/components/charts";
import { ResultInterpretation, type InterpretationData, interpretSharpeRatio } from "@/components/ui/result-interpretation";
import { pairsTradingTooltips } from "@/lib/tooltips";
import { formatNumber, formatPercent } from "@/lib/utils/formatters";
import { GitCompare, RefreshCw, Play, Loader2, CheckCircle, XCircle } from "lucide-react";
import { trackCalculation } from "@/lib/analytics";

function getPairsTradingInterpretation(result: PairsTradingResult): InterpretationData {
  const isCointegrated = result.cointegration.is_cointegrated;
  const pValue = result.cointegration.p_value;
  const sharpe = result.backtest.sharpe_ratio;
  const sharpeRating = interpretSharpeRatio(sharpe);

  // Determine status
  let status: InterpretationData["status"];
  if (isCointegrated && sharpe > 1) {
    status = "positive";
  } else if (isCointegrated && sharpe > 0) {
    status = "neutral";
  } else if (!isCointegrated) {
    status = "warning";
  } else {
    status = "negative";
  }

  const points: string[] = [];

  // Cointegration explanation
  if (isCointegrated) {
    points.push(`Good news! These stocks are cointegrated (p-value: ${pValue.toFixed(4)} < 0.05) - their prices move together in a predictable way`);
    points.push(`The hedge ratio is ${result.cointegration.hedge_ratio.toFixed(4)}: for every share of ${result.ticker1}, trade ${Math.abs(result.cointegration.hedge_ratio).toFixed(2)} shares of ${result.ticker2}`);
  } else {
    points.push(`Warning: These stocks are NOT cointegrated (p-value: ${pValue.toFixed(4)} > 0.05) - pairs trading may not work reliably`);
    points.push(`Without cointegration, the spread may not revert to its mean, making the strategy risky`);
  }

  // Backtest results
  points.push(`Backtest returned ${result.backtest.total_return >= 0 ? '+' : ''}${result.backtest.total_return.toFixed(2)}% with ${result.backtest.n_trades} trades`);
  points.push(`Sharpe Ratio: ${sharpe.toFixed(2)} (${sharpeRating.label}) - ${sharpeRating.description}`);
  points.push(`Maximum Drawdown: ${result.backtest.max_drawdown.toFixed(2)}% - the worst peak-to-trough decline during the period`);

  let advice: string;
  if (!isCointegrated) {
    advice = "Without cointegration, this pair is NOT recommended for pairs trading. Look for stocks in the same industry that are economically linked.";
  } else if (sharpe < 0.5) {
    advice = "While cointegrated, the risk-adjusted returns are poor. Consider tighter entry thresholds or a different pair.";
  } else if (sharpe > 1.5) {
    advice = "Strong cointegration and good returns. Consider paper trading first, then start with small position sizes.";
  } else {
    advice = "Moderate opportunity. Monitor the spread closely and be prepared to exit if the relationship breaks down.";
  }

  return {
    status,
    summary: isCointegrated
      ? `${result.ticker1}/${result.ticker2} shows a stable statistical relationship suitable for pairs trading.`
      : `${result.ticker1}/${result.ticker2} does NOT show cointegration - pairs trading is risky for this pair.`,
    points,
    advice,
  };
}

interface PairsTradingResult {
  ticker1: string;
  ticker2: string;
  period: string;
  data_points: number;
  cointegration: {
    adf_statistic: number;
    p_value: number;
    is_cointegrated: boolean;
    hedge_ratio: number;
    intercept: number;
    r_squared: number;
  };
  thresholds: {
    entry: number;
    exit: number;
  };
  backtest: {
    cumulative_returns: number[];
    total_return: number;
    sharpe_ratio: number;
    max_drawdown: number;
    n_trades: number;
  };
  time_series: {
    dates: string[];
    prices1: number[];
    prices2: number[];
    spread: number[];
    zscore: number[];
    signals: number[];
  };
}

export default function PairsTradingPage() {
  const [ticker1, setTicker1] = useState("AAPL");
  const [ticker2, setTicker2] = useState("MSFT");
  const [period, setPeriod] = useState("1y");
  const [entryThreshold, setEntryThreshold] = useState(2.0);
  const [exitThreshold, setExitThreshold] = useState(0.5);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PairsTradingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzePair = async () => {
    setLoading(true);
    setError(null);
    const startTime = performance.now();

    const inputParams = {
      ticker1,
      ticker2,
      period,
      entry: entryThreshold,
      exit: exitThreshold,
    };

    try {
      const params = new URLSearchParams({
        ticker1,
        ticker2,
        period,
        entry: entryThreshold.toString(),
        exit: exitThreshold.toString(),
      });

      const response = await fetch(`/api/cointegration?${params}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);

      // Track successful analysis
      trackCalculation('pairs-trading', inputParams, data, Math.round(performance.now() - startTime));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");

      // Track failed analysis
      trackCalculation('pairs-trading', inputParams, { error: err instanceof Error ? err.message : 'Unknown error' }, Math.round(performance.now() - startTime));
    } finally {
      setLoading(false);
    }
  };

  const pricesChartData = result ? [
    {
      x: result.time_series.dates,
      y: result.time_series.prices1,
      type: "scatter" as const,
      mode: "lines" as const,
      name: result.ticker1,
      line: { color: chartColors.primary, width: 2 },
      yaxis: "y",
    },
    {
      x: result.time_series.dates,
      y: result.time_series.prices2,
      type: "scatter" as const,
      mode: "lines" as const,
      name: result.ticker2,
      line: { color: chartColors.secondary, width: 2 },
      yaxis: "y2",
    },
  ] : [];

  const spreadChartData = result ? [
    {
      x: result.time_series.dates,
      y: result.time_series.spread,
      type: "scatter" as const,
      mode: "lines" as const,
      name: "Spread",
      line: { color: chartColors.purple, width: 2 },
    },
  ] : [];

  const zscoreChartData = result ? [
    {
      x: result.time_series.dates,
      y: result.time_series.zscore.map(z => z ?? 0),
      type: "scatter" as const,
      mode: "lines" as const,
      name: "Z-Score",
      line: { color: chartColors.primary, width: 2 },
    },
  ] : [];

  const signalsChartData = result ? [
    {
      x: result.time_series.dates,
      y: result.time_series.signals,
      type: "scatter" as const,
      mode: "lines" as const,
      name: "Signal",
      line: { color: chartColors.warning, width: 2 },
      fill: "tozeroy",
    },
  ] : [];

  const resetToDefaults = () => {
    setTicker1("AAPL");
    setTicker2("MSFT");
    setPeriod("1y");
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
          <h1 className="text-3xl font-bold">Pairs Trading Analysis</h1>
          <p className="text-muted-foreground mt-1">
            Statistical arbitrage with cointegration analysis
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
        title={pairsTradingTooltips.tutorial.title}
        description={pairsTradingTooltips.tutorial.description}
        steps={pairsTradingTooltips.tutorial.steps}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Input Parameters */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              Pair Configuration
            </CardTitle>
            <CardDescription>Select and configure trading pair</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <label className="text-sm font-medium">Stock 1</label>
                <Tooltip content={pairsTradingTooltips.ticker1} side="right" />
              </div>
              <Input
                value={ticker1}
                onChange={(e) => setTicker1(e.target.value.toUpperCase())}
                placeholder="AAPL"
              />
            </div>

            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <label className="text-sm font-medium">Stock 2</label>
                <Tooltip content={pairsTradingTooltips.ticker2} side="right" />
              </div>
              <Input
                value={ticker2}
                onChange={(e) => setTicker2(e.target.value.toUpperCase())}
                placeholder="MSFT"
              />
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

            <Button onClick={analyzePair} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Analyze Pair
                </>
              )}
            </Button>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>
              {result
                ? `${result.ticker1} / ${result.ticker2} - ${result.data_points} data points`
                : "Analyze a pair to see results"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <>
                {/* Cointegration Status */}
                <div className={`p-4 rounded-lg mb-6 ${
                  result.cointegration.is_cointegrated
                    ? "bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20"
                    : "bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20"
                }`}>
                  <div className="flex items-center gap-2">
                    {result.cointegration.is_cointegrated ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="font-medium">
                      {result.cointegration.is_cointegrated
                        ? "Pair is Cointegrated"
                        : "Pair is NOT Cointegrated"}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">ADF Statistic:</span>
                      <span className="ml-2 font-mono-numbers">
                        {result.cointegration.adf_statistic.toFixed(4)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">P-Value:</span>
                      <span className="ml-2 font-mono-numbers">
                        {result.cointegration.p_value.toFixed(4)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Hedge Ratio:</span>
                      <span className="ml-2 font-mono-numbers">
                        {result.cointegration.hedge_ratio.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20">
                    <div className="text-xs text-muted-foreground uppercase">Total Return</div>
                    <div className={`text-xl font-bold font-mono-numbers ${result.backtest.total_return >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {result.backtest.total_return > 0 ? '+' : ''}{result.backtest.total_return.toFixed(2)}%
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-secondary">
                    <div className="text-xs text-muted-foreground uppercase">Sharpe Ratio</div>
                    <div className="text-xl font-bold font-mono-numbers">
                      {result.backtest.sharpe_ratio.toFixed(2)}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20">
                    <div className="text-xs text-muted-foreground uppercase">Max Drawdown</div>
                    <div className="text-xl font-bold font-mono-numbers text-red-500">
                      {result.backtest.max_drawdown.toFixed(2)}%
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-secondary">
                    <div className="text-xs text-muted-foreground uppercase"># Trades</div>
                    <div className="text-xl font-bold font-mono-numbers">
                      {result.backtest.n_trades}
                    </div>
                  </div>
                </div>

                {/* Additional Stats */}
                <div className="mt-4 p-4 rounded-lg bg-secondary/50 border border-border">
                  <div className="text-sm font-medium mb-2">Regression Statistics</div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">R-Squared:</span>
                      <span className="ml-2 font-mono-numbers">{result.cointegration.r_squared.toFixed(4)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Intercept:</span>
                      <span className="ml-2 font-mono-numbers">{result.cointegration.intercept.toFixed(4)}</span>
                    </div>
                  </div>
                </div>

                {/* Result Interpretation */}
                <div className="mt-4">
                  <ResultInterpretation data={getPairsTradingInterpretation(result)} />
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                Enter two tickers and click "Analyze Pair" to test cointegration
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
              <CardTitle>Price Comparison</CardTitle>
              <CardDescription>{result.ticker1} vs {result.ticker2}</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={pricesChartData}
                layout={{
                  xaxis: { title: "Date" },
                  yaxis: { title: result.ticker1, side: "left" },
                  yaxis2: {
                    title: result.ticker2,
                    overlaying: "y",
                    side: "right",
                  },
                  height: 350,
                  showlegend: true,
                  legend: { x: 0, y: 1.1, orientation: "h" },
                }}
                className="w-full h-[350px]"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Spread</CardTitle>
              <CardDescription>{result.ticker1} - {result.cointegration.hedge_ratio.toFixed(2)} x {result.ticker2}</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={spreadChartData}
                layout={{
                  xaxis: { title: "Date" },
                  yaxis: { title: "Spread" },
                  height: 350,
                }}
                className="w-full h-[350px]"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Z-Score</CardTitle>
              <CardDescription>Entry at |Z| {">"} {entryThreshold}, Exit at |Z| {"<"} {exitThreshold}</CardDescription>
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
                    { type: "line", y0: exitThreshold, y1: exitThreshold, x0: 0, x1: 1, xref: "paper", line: { color: chartColors.muted, dash: "dot" } },
                    { type: "line", y0: -exitThreshold, y1: -exitThreshold, x0: 0, x1: 1, xref: "paper", line: { color: chartColors.muted, dash: "dot" } },
                  ],
                }}
                className="w-full h-[350px]"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trading Signals</CardTitle>
              <CardDescription>1 = Long Spread, -1 = Short Spread, 0 = Flat</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={signalsChartData}
                layout={{
                  xaxis: { title: "Date" },
                  yaxis: { title: "Position", tickvals: [-1, 0, 1], ticktext: ["Short", "Flat", "Long"] },
                  height: 350,
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
