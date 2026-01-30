"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { PlotlyChart, chartColors } from "@/components/charts";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils/formatters";
import { BarChart3, RefreshCw, Play, Loader2 } from "lucide-react";

interface SimulationResult {
  parameters: {
    S0: number;
    mu: number;
    sigma: number;
    T: number;
    n_simulations: number;
    n_steps: number;
  };
  statistics: {
    mean: number;
    std: number;
    min: number;
    max: number;
    percentile_5: number;
    percentile_25: number;
    percentile_50: number;
    percentile_75: number;
    percentile_95: number;
    prob_profit: number;
  };
  sample_paths: number[][];
  final_prices: number[];
}

export default function MonteCarloPage() {
  const [initialPrice, setInitialPrice] = useState(100);
  const [expectedReturn, setExpectedReturn] = useState(0.10); // 10%
  const [volatility, setVolatility] = useState(0.20); // 20%
  const [timeHorizon, setTimeHorizon] = useState(1); // 1 year
  const [numSimulations, setNumSimulations] = useState(1000);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        S0: initialPrice.toString(),
        mu: expectedReturn.toString(),
        sigma: volatility.toString(),
        T: timeHorizon.toString(),
        n_simulations: numSimulations.toString(),
      });

      const response = await fetch(`/api/monte-carlo?${params}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed");
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
    x: result.final_prices,
    type: "histogram" as const,
    name: "Final Prices",
    marker: { color: chartColors.primary, opacity: 0.7 },
    nbinsx: 50,
  }] : [];

  const resetToDefaults = () => {
    setInitialPrice(100);
    setExpectedReturn(0.10);
    setVolatility(0.20);
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
              <BarChart3 className="h-5 w-5" />
              Simulation Parameters
            </CardTitle>
            <CardDescription>Configure the GBM simulation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Input
              label="Initial Price ($)"
              type="number"
              value={initialPrice}
              onChange={(e) => setInitialPrice(parseFloat(e.target.value) || 0)}
              min={0}
              step={10}
            />

            <Slider
              label="Expected Annual Return"
              value={[expectedReturn]}
              onValueChange={([v]) => setExpectedReturn(v)}
              min={-0.2}
              max={0.5}
              step={0.01}
              formatValue={(v) => `${(v * 100).toFixed(0)}%`}
            />

            <Slider
              label="Annual Volatility"
              value={[volatility]}
              onValueChange={([v]) => setVolatility(v)}
              min={0.05}
              max={1}
              step={0.01}
              formatValue={(v) => `${(v * 100).toFixed(0)}%`}
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
                ? `${result.parameters.n_simulations.toLocaleString()} paths over ${result.parameters.T} year(s)`
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
                      {formatCurrency(result.statistics.mean)}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-secondary">
                    <div className="text-xs text-muted-foreground uppercase">Std Deviation</div>
                    <div className="text-xl font-bold font-mono-numbers">
                      {formatCurrency(result.statistics.std)}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20">
                    <div className="text-xs text-muted-foreground uppercase">Prob. of Profit</div>
                    <div className="text-xl font-bold font-mono-numbers text-blue-500">
                      {formatPercent(result.statistics.prob_profit)}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-secondary">
                    <div className="text-xs text-muted-foreground uppercase">Range</div>
                    <div className="text-lg font-bold font-mono-numbers">
                      <span className="text-red-500">{formatCurrency(result.statistics.min)}</span>
                      {" - "}
                      <span className="text-green-500">{formatCurrency(result.statistics.max)}</span>
                    </div>
                  </div>
                </div>

                {/* Percentile Distribution */}
                <div className="p-4 rounded-lg bg-secondary mb-6">
                  <div className="text-sm font-medium mb-3">Price Distribution (Percentiles)</div>
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
                    <span>50th: {formatCurrency(result.statistics.percentile_50)}</span>
                    <span>75th: {formatCurrency(result.statistics.percentile_75)}</span>
                    <span>95th</span>
                  </div>
                </div>
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
              <CardTitle>Simulated Price Paths</CardTitle>
              <CardDescription>Sample of {Math.min(30, result.sample_paths.length)} paths</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={pathsChartData}
                layout={{
                  xaxis: { title: "Time Step" },
                  yaxis: { title: "Price ($)" },
                  height: 350,
                  showlegend: false,
                }}
                className="w-full h-[350px]"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Final Price Distribution</CardTitle>
              <CardDescription>Histogram of ending prices</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={histogramData}
                layout={{
                  xaxis: { title: "Final Price ($)" },
                  yaxis: { title: "Frequency" },
                  height: 350,
                  bargap: 0.05,
                  shapes: [
                    {
                      type: "line",
                      x0: initialPrice,
                      x1: initialPrice,
                      y0: 0,
                      y1: 1,
                      yref: "paper",
                      line: { color: chartColors.warning, width: 2, dash: "dash" },
                    },
                  ],
                  annotations: [
                    {
                      x: initialPrice,
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
