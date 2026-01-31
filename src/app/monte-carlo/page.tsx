"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TutorialCard } from "@/components/ui/tooltip";
import { PlotlyChart, chartColors } from "@/components/charts";
import { ResultInterpretation, type InterpretationData, formatInterpretationCurrency } from "@/components/ui/result-interpretation";
import { monteCarloTooltips } from "@/lib/tooltips";
import { formatCurrency, formatPercent } from "@/lib/utils/formatters";
import { BarChart3, RefreshCw, Play, Loader2 } from "lucide-react";
import { trackCalculation } from "@/lib/analytics";

function getMonteCarloInterpretation(result: SimulationResult): InterpretationData {
  const gainLoss = result.statistics.expected_value - result.initial_investment;
  const pctReturn = (gainLoss / result.initial_investment) * 100;
  const probProfit = result.statistics.probability_of_profit;

  // Determine status
  let status: InterpretationData["status"];
  if (probProfit >= 60 && pctReturn > 0) {
    status = "positive";
  } else if (probProfit >= 40) {
    status = "neutral";
  } else {
    status = "negative";
  }

  // Calculate potential loss in worst case
  const worstCaseLoss = result.initial_investment - result.statistics.percentile_5;
  const bestCaseGain = result.statistics.percentile_95 - result.initial_investment;

  const points: string[] = [
    `Your ${formatInterpretationCurrency(result.initial_investment)} investment is expected to ${gainLoss >= 0 ? 'grow to' : 'decline to'} ${formatInterpretationCurrency(result.statistics.expected_value)} (${pctReturn >= 0 ? '+' : ''}${pctReturn.toFixed(1)}%)`,
    `${probProfit.toFixed(0)}% of simulations ended profitably - that's ${probProfit >= 50 ? 'better than' : 'worse than'} a coin flip`,
    `Worst case (5th percentile): You could lose ${formatInterpretationCurrency(worstCaseLoss)} (${((worstCaseLoss / result.initial_investment) * 100).toFixed(1)}% of your investment)`,
    `Best case (95th percentile): You could gain ${formatInterpretationCurrency(bestCaseGain)} (${((bestCaseGain / result.initial_investment) * 100).toFixed(1)}% return)`,
    `The simulation used ${result.parameters.annualized_return.toFixed(1)}% expected annual return and ${result.parameters.annualized_volatility.toFixed(1)}% volatility from historical data`,
  ];

  let advice: string;
  if (probProfit < 40) {
    advice = "Low probability of profit. Consider diversifying, reducing position size, or choosing a less volatile investment.";
  } else if (result.parameters.annualized_volatility > 40) {
    advice = "High volatility detected. While potential returns are high, so are potential losses. Consider if this matches your risk tolerance.";
  } else if (probProfit >= 70) {
    advice = "Historical patterns suggest favorable odds. Remember that past performance doesn't guarantee future results.";
  } else {
    advice = "Moderate risk/reward profile. Consider your investment timeline and whether you can tolerate the potential downside.";
  }

  return {
    status,
    summary: `Based on ${result.n_simulations.toLocaleString()} simulations over ${result.time_horizon_years} year(s), your investment is ${probProfit >= 50 ? 'more likely to profit than lose' : 'at risk of loss'}.`,
    points,
    advice,
  };
}

interface SimulationResult {
  ticker: string;
  initial_investment: number;
  n_simulations: number;
  time_horizon_years: number;
  current_price: number;
  parameters: {
    annualized_return: number;
    annualized_volatility: number;
  };
  statistics: {
    expected_value: number;
    median_value: number;
    std_deviation: number;
    percentile_5: number;
    percentile_25: number;
    percentile_75: number;
    percentile_95: number;
    probability_of_profit: number;
    probability_of_loss: number;
  };
  sample_paths: number[][];
  final_values_histogram: number[];
}

export default function MonteCarloPage() {
  const [initialInvestment, setInitialInvestment] = useState(10000);
  const [ticker, setTicker] = useState("AAPL");
  const [timeHorizon, setTimeHorizon] = useState(1); // 1 year
  const [numSimulations, setNumSimulations] = useState(1000);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    const startTime = performance.now();

    const inputParams = {
      ticker,
      investment: initialInvestment,
      horizon: timeHorizon,
      simulations: numSimulations,
    };

    try {
      const params = new URLSearchParams({
        ticker,
        investment: initialInvestment.toString(),
        horizon: timeHorizon.toString(),
        simulations: numSimulations.toString(),
      });

      const response = await fetch(`/api/monte-carlo?${params}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);

      // Track successful calculation
      const executionTime = Math.round(performance.now() - startTime);
      trackCalculation('monte-carlo', inputParams, data, executionTime);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed");

      // Track failed calculation
      const executionTime = Math.round(performance.now() - startTime);
      trackCalculation('monte-carlo', inputParams, { error: err instanceof Error ? err.message : 'Unknown error' }, executionTime);
    } finally {
      setLoading(false);
    }
  };

  const pathsChartData = result ? result.sample_paths.slice(0, 30).map((path, i) => ({
    y: path,
    type: "scatter" as const,
    mode: "lines" as const,
    name: `Path ${i + 1}`,
    line: { width: 0.5, color: `hsla(${(i * 12) % 360}, 70%, 50%, 0.5)` },
    showlegend: false,
  })) : [];

  const histogramData = result ? [{
    x: result.final_values_histogram,
    type: "histogram" as const,
    name: "Final Values",
    marker: { color: chartColors.primary, opacity: 0.7 },
    nbinsx: 50,
  }] : [];

  const resetToDefaults = () => {
    setInitialInvestment(10000);
    setTicker("AAPL");
    setTimeHorizon(1);
    setNumSimulations(1000);
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monte Carlo Simulation</h1>
          <p className="text-muted-foreground mt-1">
            Simulate portfolio paths using Geometric Brownian Motion
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
        title={monteCarloTooltips.tutorial.title}
        description={monteCarloTooltips.tutorial.description}
        steps={monteCarloTooltips.tutorial.steps}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Input Parameters */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Simulation Parameters
            </CardTitle>
            <CardDescription>Configure the GBM simulation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Input
              label="Ticker Symbol"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="AAPL"
            />

            <Input
              label="Initial Investment ($)"
              type="number"
              value={initialInvestment}
              onChange={(e) => setInitialInvestment(parseFloat(e.target.value) || 0)}
              min={0}
              step={1000}
            />

            <Slider
              label="Time Horizon"
              value={[timeHorizon]}
              onValueChange={([v]) => setTimeHorizon(v)}
              min={0.25}
              max={5}
              step={0.25}
              formatValue={(v) => `${v} year${v !== 1 ? 's' : ''}`}
            />

            <Slider
              label="Number of Simulations"
              value={[numSimulations]}
              onValueChange={([v]) => setNumSimulations(v)}
              min={100}
              max={2000}
              step={100}
              formatValue={(v) => v.toLocaleString()}
            />

            <Button onClick={runSimulation} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running Simulation...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Simulation
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
            <CardTitle>Simulation Results</CardTitle>
            <CardDescription>
              {result
                ? `${result.ticker} - ${result.n_simulations.toLocaleString()} paths over ${result.time_horizon_years} year(s)`
                : "Run a simulation to see results"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <>
                {/* Key Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20">
                    <div className="text-xs text-muted-foreground uppercase">Expected Value</div>
                    <div className="text-xl font-bold font-mono-numbers text-green-500">
                      {formatCurrency(result.statistics.expected_value)}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-secondary">
                    <div className="text-xs text-muted-foreground uppercase">Std Deviation</div>
                    <div className="text-xl font-bold font-mono-numbers">
                      {formatCurrency(result.statistics.std_deviation)}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20">
                    <div className="text-xs text-muted-foreground uppercase">Prob. of Profit</div>
                    <div className="text-xl font-bold font-mono-numbers text-blue-500">
                      {result.statistics.probability_of_profit.toFixed(1)}%
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-secondary">
                    <div className="text-xs text-muted-foreground uppercase">Median Value</div>
                    <div className="text-xl font-bold font-mono-numbers">
                      {formatCurrency(result.statistics.median_value)}
                    </div>
                  </div>
                </div>

                {/* Percentile Distribution */}
                <div className="p-4 rounded-lg bg-secondary mb-6">
                  <div className="text-sm font-medium mb-3">Value Distribution (Percentiles)</div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-red-500 font-mono-numbers">{formatCurrency(result.statistics.percentile_5)}</span>
                    <div className="flex-1 h-2 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 relative">
                      <div className="absolute left-[5%] w-0.5 h-4 bg-foreground -top-1" title="5th percentile" />
                      <div className="absolute left-[25%] w-0.5 h-3 bg-foreground/70 -top-0.5" title="25th percentile" />
                      <div className="absolute left-[50%] w-0.5 h-4 bg-foreground -top-1" title="50th percentile" />
                      <div className="absolute left-[75%] w-0.5 h-3 bg-foreground/70 -top-0.5" title="75th percentile" />
                      <div className="absolute left-[95%] w-0.5 h-4 bg-foreground -top-1" title="95th percentile" />
                    </div>
                    <span className="text-green-500 font-mono-numbers">{formatCurrency(result.statistics.percentile_95)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>5th</span>
                    <span>25th: {formatCurrency(result.statistics.percentile_25)}</span>
                    <span>50th: {formatCurrency(result.statistics.median_value)}</span>
                    <span>75th: {formatCurrency(result.statistics.percentile_75)}</span>
                    <span>95th</span>
                  </div>
                </div>

                {/* Parameters Used */}
                <div className="p-4 rounded-lg bg-secondary/50 border border-border mb-6">
                  <div className="text-sm font-medium mb-2">Historical Parameters Used</div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Annualized Return:</span>
                      <span className="ml-2 font-mono-numbers">{result.parameters.annualized_return.toFixed(2)}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Annualized Volatility:</span>
                      <span className="ml-2 font-mono-numbers">{result.parameters.annualized_volatility.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>

                {/* Result Interpretation */}
                <ResultInterpretation data={getMonteCarloInterpretation(result)} />
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                Configure parameters and click "Run Simulation" to generate results
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
              <CardTitle>Simulated Portfolio Paths</CardTitle>
              <CardDescription>Sample of {Math.min(30, result.sample_paths.length)} paths</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={pathsChartData}
                layout={{
                  xaxis: { title: "Time Step (Trading Days)" },
                  yaxis: { title: "Portfolio Value ($)" },
                  height: 350,
                  showlegend: false,
                }}
                className="w-full h-[350px]"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Final Value Distribution</CardTitle>
              <CardDescription>Histogram of ending portfolio values</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={histogramData}
                layout={{
                  xaxis: { title: "Final Value ($)" },
                  yaxis: { title: "Frequency" },
                  height: 350,
                  bargap: 0.05,
                  shapes: [
                    {
                      type: "line",
                      x0: result.initial_investment,
                      x1: result.initial_investment,
                      y0: 0,
                      y1: 1,
                      yref: "paper",
                      line: { color: chartColors.warning, width: 2, dash: "dash" },
                    },
                  ],
                  annotations: [
                    {
                      x: result.initial_investment,
                      y: 1,
                      yref: "paper",
                      text: "Initial",
                      showarrow: false,
                      font: { color: chartColors.warning },
                    },
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
