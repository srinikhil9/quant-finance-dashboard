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
import { Target, RefreshCw, Play, Loader2, ArrowRight, Download } from "lucide-react";
import { trackCalculation } from "@/lib/analytics";

interface SPOResult {
  tickers: string[];
  period: string;
  data_points: number;
  train_size: number;
  test_size: number;
  risk_aversion: number;
  traditional: {
    weights: Record<string, number>;
    performance: {
      total_return: number;
      sharpe_ratio: number;
      max_drawdown: number;
      volatility: number;
    };
  };
  spo: {
    weights: Record<string, number>;
    performance: {
      total_return: number;
      sharpe_ratio: number;
      max_drawdown: number;
      volatility: number;
    };
  };
  improvement: {
    return_delta: number;
    sharpe_delta: number;
  };
  error_analysis: {
    prediction_mse: number;
    traditional_decision_error: number;
    spo_decision_error: number;
  };
  efficient_frontier: {
    returns: number[];
    volatilities: number[];
  };
  time_series: {
    dates: string[];
    traditional_cumulative: number[];
    spo_cumulative: number[];
  };
}

const spoTooltips = {
  tutorial: {
    title: "Smart Predict-then-Optimize (SPO) Portfolio",
    description: "Traditional portfolio optimization predicts returns, then optimizes. SPO trains the prediction model to minimize portfolio decision error, not just prediction error.",
    steps: [
      "Select 4-10 stock tickers for your portfolio universe",
      "Adjust risk aversion (higher = more conservative)",
      "Click 'Run SPO' to compare traditional vs SPO approaches",
      "Analyze how decision-focused learning improves portfolio outcomes"
    ]
  },
  tickers: "Enter comma-separated stock tickers. Diversified portfolios work best (mix sectors).",
  risk_aversion: "Controls the return-risk tradeoff. Higher values prioritize lower volatility over higher returns.",
  decision_error: "SPO minimizes decision error (actual portfolio loss) rather than prediction error (return forecast accuracy)."
};

export default function SPOPortfolioPage() {
  const [tickers, setTickers] = useState("AAPL,MSFT,GOOGL,AMZN,NVDA,JPM,XOM,JNJ");
  const [period, setPeriod] = useState("2y");
  const [riskAversion, setRiskAversion] = useState(1.0);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SPOResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runSPO = async () => {
    setLoading(true);
    setError(null);
    const startTime = performance.now();

    const inputParams = {
      tickers,
      period,
      risk_aversion: riskAversion,
    };

    try {
      const params = new URLSearchParams({
        tickers,
        period,
        risk_aversion: riskAversion.toString(),
      });

      const response = await fetch(`/api/spo-portfolio?${params}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);

      // Track successful SPO optimization
      trackCalculation('spo-portfolio', inputParams, data, Math.round(performance.now() - startTime));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Optimization failed");

      // Track failed SPO optimization
      trackCalculation('spo-portfolio', inputParams, { error: err instanceof Error ? err.message : 'Unknown error' }, Math.round(performance.now() - startTime));
    } finally {
      setLoading(false);
    }
  };

  const frontierChartData = result ? [
    {
      x: result.efficient_frontier.volatilities,
      y: result.efficient_frontier.returns,
      type: "scatter" as const,
      mode: "lines" as const,
      name: "Efficient Frontier",
      line: { color: chartColors.muted, width: 2 },
    },
    {
      x: [result.traditional.performance.volatility],
      y: [result.traditional.performance.total_return / (result.test_size / 252)],
      type: "scatter" as const,
      mode: "markers" as const,
      name: "Traditional",
      marker: { color: chartColors.secondary, size: 14, symbol: "circle" },
    },
    {
      x: [result.spo.performance.volatility],
      y: [result.spo.performance.total_return / (result.test_size / 252)],
      type: "scatter" as const,
      mode: "markers" as const,
      name: "SPO",
      marker: { color: chartColors.primary, size: 14, symbol: "star" },
    },
  ] : [];

  const cumulativeChartData = result ? [
    {
      x: result.time_series.dates,
      y: result.time_series.traditional_cumulative,
      type: "scatter" as const,
      mode: "lines" as const,
      name: "Traditional Two-Stage",
      line: { color: chartColors.muted, width: 2 },
    },
    {
      x: result.time_series.dates,
      y: result.time_series.spo_cumulative,
      type: "scatter" as const,
      mode: "lines" as const,
      name: "SPO Portfolio",
      line: { color: chartColors.primary, width: 2 },
    },
  ] : [];

  const weightsComparisonData = result ? [
    {
      x: result.tickers,
      y: result.tickers.map(t => (result.traditional.weights[t] || 0) * 100),
      type: "bar" as const,
      name: "Traditional",
      marker: { color: chartColors.muted },
    },
    {
      x: result.tickers,
      y: result.tickers.map(t => (result.spo.weights[t] || 0) * 100),
      type: "bar" as const,
      name: "SPO",
      marker: { color: chartColors.primary },
    },
  ] : [];

  const errorComparisonData = result ? [
    {
      x: ["Prediction MSE (×10⁴)", "Traditional Decision Error", "SPO Decision Error"],
      y: [
        result.error_analysis.prediction_mse,
        result.error_analysis.traditional_decision_error,
        result.error_analysis.spo_decision_error
      ],
      type: "bar" as const,
      marker: {
        color: [chartColors.warning, chartColors.secondary, chartColors.primary]
      },
    },
  ] : [];

  const resetToDefaults = () => {
    setTickers("AAPL,MSFT,GOOGL,AMZN,NVDA,JPM,XOM,JNJ");
    setPeriod("2y");
    setRiskAversion(1.0);
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SPO Portfolio Optimization</h1>
          <p className="text-muted-foreground mt-1">
            End-to-end decision-focused portfolio learning
          </p>
        </div>
        <div className="flex gap-2">
          <Tooltip content="Download full PyTorch notebook with cvxpylayers">
            <Button variant="outline" asChild>
              <a href="/notebooks/spo-portfolio-pytorch.ipynb" download>
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
        title={spoTooltips.tutorial.title}
        description={spoTooltips.tutorial.description}
        steps={spoTooltips.tutorial.steps}
      />

      {/* Concept Explanation */}
      <Card className="bg-gradient-to-r from-purple-500/5 to-blue-500/5 border-purple-500/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <div className="px-3 py-1.5 rounded bg-secondary">Predict Returns</div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="px-3 py-1.5 rounded bg-secondary">Optimize Portfolio</div>
            </div>
            <div className="text-muted-foreground">=</div>
            <div className="text-sm text-muted-foreground">Traditional Two-Stage</div>
          </div>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-2 text-sm">
              <div className="px-3 py-1.5 rounded bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30">
                Train to Minimize Portfolio Loss
              </div>
            </div>
            <div className="text-muted-foreground">=</div>
            <div className="text-sm font-medium text-purple-400">SPO (Decision-Focused)</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Input Parameters */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Portfolio Configuration
            </CardTitle>
            <CardDescription>Select assets and optimization parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <label className="text-sm font-medium">Stock Universe</label>
                <Tooltip content={spoTooltips.tickers} side="right" />
              </div>
              <Input
                value={tickers}
                onChange={(e) => setTickers(e.target.value.toUpperCase())}
                placeholder="AAPL,MSFT,GOOGL..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                4-10 comma-separated tickers
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Historical Period</label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1y">1 Year</SelectItem>
                  <SelectItem value="2y">2 Years</SelectItem>
                  <SelectItem value="5y">5 Years</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Slider
              label="Risk Aversion (λ)"
              value={[riskAversion]}
              onValueChange={([v]) => setRiskAversion(v)}
              min={0.1}
              max={3}
              step={0.1}
              formatValue={(v) => v.toFixed(1)}
            />
            <div className="text-xs text-muted-foreground -mt-2">
              Higher λ = more conservative (lower volatility preference)
            </div>

            <Button onClick={runSPO} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run SPO
                </>
              )}
            </Button>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="p-4 rounded-lg bg-secondary/50 text-sm">
              <p className="font-medium mb-2">Key Insight:</p>
              <p className="text-xs text-muted-foreground">
                Traditional methods optimize prediction accuracy (MSE), but what matters is{" "}
                <span className="text-foreground">portfolio performance</span>. SPO trains the
                predictor to minimize downstream decision loss.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Optimization Results</CardTitle>
            <CardDescription>
              {result
                ? `${result.tickers.length} assets • Train: ${result.train_size} days • Test: ${result.test_size} days`
                : "Configure portfolio and click 'Run SPO'"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <>
                {/* Performance Comparison */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {/* Traditional */}
                  <div className="p-4 rounded-lg bg-secondary">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-zinc-500" />
                      <span className="font-medium">Traditional Two-Stage</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Return</div>
                        <div className={`font-mono-numbers font-bold ${result.traditional.performance.total_return >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {result.traditional.performance.total_return >= 0 ? '+' : ''}{result.traditional.performance.total_return.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Sharpe</div>
                        <div className="font-mono-numbers font-bold">
                          {result.traditional.performance.sharpe_ratio.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Volatility</div>
                        <div className="font-mono-numbers">
                          {result.traditional.performance.volatility.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Max DD</div>
                        <div className="font-mono-numbers text-red-500">
                          -{result.traditional.performance.max_drawdown.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SPO */}
                  <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="h-4 w-4 text-purple-500" />
                      <span className="font-medium">SPO (Decision-Focused)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Return</div>
                        <div className={`font-mono-numbers font-bold ${result.spo.performance.total_return >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {result.spo.performance.total_return >= 0 ? '+' : ''}{result.spo.performance.total_return.toFixed(1)}%
                          {result.improvement.return_delta > 0 && (
                            <span className="text-xs text-green-500 ml-1">
                              +{result.improvement.return_delta.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Sharpe</div>
                        <div className="font-mono-numbers font-bold text-purple-500">
                          {result.spo.performance.sharpe_ratio.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Volatility</div>
                        <div className="font-mono-numbers">
                          {result.spo.performance.volatility.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Max DD</div>
                        <div className="font-mono-numbers text-red-500">
                          -{result.spo.performance.max_drawdown.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Error Analysis */}
                <div className="p-4 rounded-lg bg-secondary mb-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Tooltip content={spoTooltips.decision_error} side="right" />
                    Error Analysis
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Prediction MSE</div>
                      <div className="font-mono-numbers text-yellow-500">
                        {result.error_analysis.prediction_mse.toFixed(4)}
                      </div>
                      <div className="text-xs text-muted-foreground">×10⁻⁴</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Traditional Decision Error</div>
                      <div className="font-mono-numbers">
                        {result.error_analysis.traditional_decision_error.toFixed(4)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">SPO Decision Error</div>
                      <div className={`font-mono-numbers ${
                        result.error_analysis.spo_decision_error < result.error_analysis.traditional_decision_error
                          ? 'text-green-500'
                          : 'text-red-500'
                      }`}>
                        {result.error_analysis.spo_decision_error.toFixed(4)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Takeaway */}
                <div className={`p-4 rounded-lg ${
                  result.improvement.sharpe_delta > 0
                    ? "bg-gradient-to-r from-green-500/10 to-transparent border border-green-500/20"
                    : "bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/20"
                }`}>
                  <p className="text-sm">
                    <span className="font-medium">Key Insight: </span>
                    {result.improvement.sharpe_delta > 0
                      ? `SPO improved Sharpe ratio by ${result.improvement.sharpe_delta.toFixed(2)} by focusing on decision quality over prediction accuracy.`
                      : "In this case, traditional approach performed similarly. SPO shines with noisier predictions or non-quadratic objectives."}
                  </p>
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                Select stocks and click "Run SPO" to compare optimization approaches
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
              <CardTitle>Efficient Frontier</CardTitle>
              <CardDescription>Portfolio positions on risk-return tradeoff</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={frontierChartData}
                layout={{
                  xaxis: { title: "Volatility (% Annualized)" },
                  yaxis: { title: "Expected Return (% Annualized)" },
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
              <CardDescription>Out-of-sample performance comparison</CardDescription>
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
              <CardTitle>Portfolio Weights</CardTitle>
              <CardDescription>Average allocation comparison</CardDescription>
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
              <CardTitle>Error Comparison</CardTitle>
              <CardDescription>Prediction error vs decision error</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={errorComparisonData}
                layout={{
                  xaxis: { title: "" },
                  yaxis: { title: "Error" },
                  height: 350,
                  showlegend: false,
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
