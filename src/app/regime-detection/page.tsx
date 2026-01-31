"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TutorialCard } from "@/components/ui/tooltip";
import { PlotlyChart, chartColors } from "@/components/charts";
import { Eye, RefreshCw, Play, Loader2, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { trackCalculation } from "@/lib/analytics";

interface RegimeResult {
  ticker: string;
  period: string;
  n_states: number;
  data_points: number;
  current_regime: {
    state: number;
    label: string;
    description: string;
  };
  total_transitions: number;
  avg_regime_duration: number;
  regime_statistics: Array<{
    state: number;
    days: number;
    pct_time: number;
    avg_return_annualized: number;
    volatility_annualized: number;
    sharpe_ratio: number;
  }>;
  regime_labels: Array<{
    state: number;
    label: string;
    description: string;
  }>;
  hmm_parameters: {
    means: number[];
    volatilities: number[];
    transition_matrix: number[][];
  };
  convergence: {
    iterations: number;
    final_log_likelihood: number;
    log_likelihoods: number[];
  };
  time_series: {
    dates: string[];
    prices: number[];
    states: number[];
    returns: number[];
  };
}

const regimeColors = [
  "#ef4444", // Red - Bear/Crisis
  "#f97316", // Orange - Volatile
  "#22c55e", // Green - Bull
  "#3b82f6", // Blue - Low Vol
];

const regimeTooltips = {
  tutorial: {
    title: "HMM Regime Detection",
    description: "Use Hidden Markov Models to automatically detect market regimes (bull, bear, high/low volatility) from historical price data.",
    steps: [
      "Enter a ticker symbol (SPY, QQQ, or individual stocks)",
      "Select number of regimes to detect (2-4)",
      "Choose historical period for analysis",
      "Click 'Detect Regimes' to run the HMM algorithm"
    ]
  },
  n_states: "Number of hidden states (regimes) to detect. 2 = bull/bear, 3 = adds neutral, 4 = adds high/low volatility distinction.",
  transition_matrix: "Probability of moving from one regime to another. High diagonal values mean regimes are 'sticky'.",
  current_regime: "The most likely regime for the most recent data point based on the Viterbi algorithm."
};

export default function RegimeDetectionPage() {
  const [ticker, setTicker] = useState("SPY");
  const [nStates, setNStates] = useState("3");
  const [period, setPeriod] = useState("2y");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RegimeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const detectRegimes = async () => {
    setLoading(true);
    setError(null);
    const startTime = performance.now();

    const inputParams = {
      ticker,
      n_states: nStates,
      period,
    };

    try {
      const params = new URLSearchParams({
        ticker,
        n_states: nStates,
        period,
      });

      const response = await fetch(`/api/regime-detection?${params}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);

      // Track successful regime detection
      trackCalculation('regime-detection', inputParams, data, Math.round(performance.now() - startTime));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Detection failed");

      // Track failed regime detection
      trackCalculation('regime-detection', inputParams, { error: err instanceof Error ? err.message : 'Unknown error' }, Math.round(performance.now() - startTime));
    } finally {
      setLoading(false);
    }
  };

  // Price chart colored by regime
  const priceChartData = result ? result.regime_labels.map((regime, idx) => {
    const mask = result.time_series.states.map(s => s === regime.state);
    const x = result.time_series.dates.filter((_, i) => mask[i]);
    const y = result.time_series.prices.filter((_, i) => mask[i]);

    return {
      x,
      y,
      type: "scatter" as const,
      mode: "markers" as const,
      name: regime.label,
      marker: { color: regimeColors[idx % regimeColors.length], size: 4 },
    };
  }) : [];

  // Transition matrix heatmap
  const transitionHeatmapData = result ? [{
    z: result.hmm_parameters.transition_matrix,
    x: result.regime_labels.map(r => r.label),
    y: result.regime_labels.map(r => r.label),
    type: "heatmap" as const,
    colorscale: "Viridis",
    showscale: true,
  }] : [];

  // Returns distribution by regime
  const returnsDistributionData = result ? result.regime_labels.map((regime, idx) => {
    const mask = result.time_series.states.map(s => s === regime.state);
    const returns = result.time_series.returns.filter((_, i) => mask[i]);

    return {
      x: returns,
      type: "histogram" as const,
      name: regime.label,
      opacity: 0.7,
      marker: { color: regimeColors[idx % regimeColors.length] },
    };
  }) : [];

  // Convergence chart
  const convergenceData = result ? [{
    y: result.convergence.log_likelihoods,
    type: "scatter" as const,
    mode: "lines+markers" as const,
    name: "Log Likelihood",
    line: { color: chartColors.primary },
  }] : [];

  const resetToDefaults = () => {
    setTicker("SPY");
    setNStates("3");
    setPeriod("2y");
    setResult(null);
    setError(null);
  };

  const getCurrentRegimeIcon = () => {
    if (!result) return <Activity className="h-5 w-5" />;
    const label = result.current_regime.label.toLowerCase();
    if (label.includes("bull")) return <TrendingUp className="h-5 w-5 text-green-500" />;
    if (label.includes("bear") || label.includes("crisis")) return <TrendingDown className="h-5 w-5 text-red-500" />;
    return <Activity className="h-5 w-5 text-yellow-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">HMM Regime Detection</h1>
          <p className="text-muted-foreground mt-1">
            Detect market regimes using Hidden Markov Models
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
        title={regimeTooltips.tutorial.title}
        description={regimeTooltips.tutorial.description}
        steps={regimeTooltips.tutorial.steps}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Input Parameters */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Detection Parameters
            </CardTitle>
            <CardDescription>Configure the HMM regime detector</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Ticker Symbol</label>
              <Input
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="SPY"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <label className="text-sm font-medium">Number of Regimes</label>
                <Tooltip content={regimeTooltips.n_states} side="right" />
              </div>
              <Select value={nStates} onValueChange={setNStates}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Regimes (Bull/Bear)</SelectItem>
                  <SelectItem value="3">3 Regimes (+ Neutral)</SelectItem>
                  <SelectItem value="4">4 Regimes (+ Volatility)</SelectItem>
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
                  <SelectItem value="1y">1 Year</SelectItem>
                  <SelectItem value="2y">2 Years</SelectItem>
                  <SelectItem value="5y">5 Years</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={detectRegimes} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Detecting...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Detect Regimes
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
                <li>1. Model returns as Gaussian emissions</li>
                <li>2. Use Baum-Welch (EM) to fit parameters</li>
                <li>3. Viterbi decode most likely state sequence</li>
                <li>4. Each state = a distinct market regime</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Regime Analysis</CardTitle>
            <CardDescription>
              {result
                ? `${result.ticker} - ${result.data_points} trading days analyzed`
                : "Configure parameters and click 'Detect Regimes'"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <>
                {/* Current Regime Highlight */}
                <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 mb-6">
                  <div className="flex items-center gap-3">
                    {getCurrentRegimeIcon()}
                    <div>
                      <div className="font-semibold">
                        Current Regime: {result.current_regime.label}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {result.current_regime.description}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-3 rounded-lg bg-secondary text-center">
                    <div className="text-2xl font-bold">{result.total_transitions}</div>
                    <div className="text-xs text-muted-foreground">Regime Transitions</div>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary text-center">
                    <div className="text-2xl font-bold">{result.avg_regime_duration.toFixed(0)}</div>
                    <div className="text-xs text-muted-foreground">Avg Days per Regime</div>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary text-center">
                    <div className="text-2xl font-bold">{result.convergence.iterations}</div>
                    <div className="text-xs text-muted-foreground">EM Iterations</div>
                  </div>
                </div>

                {/* Regime Statistics Table */}
                <div className="rounded-lg border overflow-hidden mb-4">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary">
                      <tr>
                        <th className="px-3 py-2 text-left">Regime</th>
                        <th className="px-3 py-2 text-right">Days</th>
                        <th className="px-3 py-2 text-right">% Time</th>
                        <th className="px-3 py-2 text-right">Avg Return</th>
                        <th className="px-3 py-2 text-right">Volatility</th>
                        <th className="px-3 py-2 text-right">Sharpe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.regime_statistics.map((stat, idx) => {
                        const label = result.regime_labels.find(l => l.state === stat.state);
                        return (
                          <tr key={stat.state} className="border-t">
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: regimeColors[idx % regimeColors.length] }}
                                />
                                {label?.label || `State ${stat.state}`}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right font-mono">{stat.days}</td>
                            <td className="px-3 py-2 text-right font-mono">{stat.pct_time}%</td>
                            <td className={`px-3 py-2 text-right font-mono ${stat.avg_return_annualized >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {stat.avg_return_annualized >= 0 ? '+' : ''}{stat.avg_return_annualized}%
                            </td>
                            <td className="px-3 py-2 text-right font-mono">{stat.volatility_annualized}%</td>
                            <td className={`px-3 py-2 text-right font-mono ${stat.sharpe_ratio >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {stat.sharpe_ratio.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                Enter a ticker and click &quot;Detect Regimes&quot; to analyze market states
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
              <CardTitle>Price Chart by Regime</CardTitle>
              <CardDescription>Historical prices colored by detected regime</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={priceChartData}
                layout={{
                  xaxis: { title: "Date" },
                  yaxis: { title: "Price ($)" },
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
              <CardTitle>Transition Matrix</CardTitle>
              <CardDescription>
                <span className="flex items-center gap-1">
                  Probability of regime transitions
                  <Tooltip content={regimeTooltips.transition_matrix} side="right" />
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={transitionHeatmapData}
                layout={{
                  xaxis: { title: "To Regime" },
                  yaxis: { title: "From Regime", automargin: true },
                  height: 350,
                }}
                className="w-full h-[350px]"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Return Distribution by Regime</CardTitle>
              <CardDescription>Daily returns histogram for each regime</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={returnsDistributionData}
                layout={{
                  xaxis: { title: "Daily Return (%)" },
                  yaxis: { title: "Frequency" },
                  height: 350,
                  barmode: "overlay" as const,
                  showlegend: true,
                  legend: { x: 0, y: 1.1, orientation: "h" as const },
                }}
                className="w-full h-[350px]"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>EM Convergence</CardTitle>
              <CardDescription>Log likelihood over Baum-Welch iterations</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={convergenceData}
                layout={{
                  xaxis: { title: "Iteration" },
                  yaxis: { title: "Log Likelihood" },
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
