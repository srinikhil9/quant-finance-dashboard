"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlotlyChart, chartColors } from "@/components/charts";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils/formatters";
import { LineChart, RefreshCw, Play, Loader2, AlertTriangle } from "lucide-react";

interface VaRResult {
  ticker: string;
  confidence_level: number;
  portfolio_value: number;
  period: string;
  data_points: number;
  statistics: {
    mean_daily_return: number;
    std_daily_return: number;
    annualized_return: number;
    annualized_volatility: number;
  };
  var_percentages: {
    historical: number;
    parametric: number;
    monte_carlo: number;
    cvar: number;
  };
  var_dollar: {
    historical: number;
    parametric: number;
    monte_carlo: number;
    cvar: number;
  };
  returns_histogram: number[];
}

export default function VaRPage() {
  const [ticker, setTicker] = useState("AAPL");
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);
  const [portfolioValue, setPortfolioValue] = useState(1000000);
  const [period, setPeriod] = useState("1y");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VaRResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculateVaR = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        ticker,
        confidence: confidenceLevel.toString(),
        portfolio_value: portfolioValue.toString(),
        period,
      });

      const response = await fetch(`/api/var-calculator?${params}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Calculation failed");
    } finally {
      setLoading(false);
    }
  };

  const histogramData = result ? [{
    x: result.returns_histogram,
    type: "histogram" as const,
    name: "Daily Returns",
    marker: { color: chartColors.secondary, opacity: 0.7 },
    nbinsx: 50,
  }] : [];

  const varComparisonData = result ? [{
    x: ["Historical", "Parametric", "Monte Carlo", "CVaR"],
    y: [
      result.var_dollar.historical,
      result.var_dollar.parametric,
      result.var_dollar.monte_carlo,
      result.var_dollar.cvar,
    ],
    type: "bar" as const,
    marker: {
      color: [chartColors.primary, chartColors.secondary, chartColors.purple, chartColors.loss],
    },
  }] : [];

  const resetToDefaults = () => {
    setTicker("AAPL");
    setConfidenceLevel(0.95);
    setPortfolioValue(1000000);
    setPeriod("1y");
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Value at Risk (VaR)</h1>
          <p className="text-muted-foreground mt-1">
            Estimate portfolio risk using multiple VaR methodologies
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
              <LineChart className="h-5 w-5" />
              Risk Parameters
            </CardTitle>
            <CardDescription>Configure VaR calculation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Input
              label="Stock Ticker"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="AAPL"
            />

            <Input
              label="Portfolio Value ($)"
              type="number"
              value={portfolioValue}
              onChange={(e) => setPortfolioValue(parseFloat(e.target.value) || 0)}
              min={0}
              step={100000}
            />

            <Slider
              label="Confidence Level"
              value={[confidenceLevel]}
              onValueChange={([v]) => setConfidenceLevel(v)}
              min={0.90}
              max={0.99}
              step={0.01}
              formatValue={(v) => `${(v * 100).toFixed(0)}%`}
            />

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
                  <SelectItem value="5y">5 Years</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={calculateVaR} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Calculate VaR
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
            <CardTitle>VaR Results</CardTitle>
            <CardDescription>
              {result
                ? `${result.ticker} - ${formatPercent(result.confidence_level)} confidence`
                : "Calculate VaR to see results"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <>
                {/* VaR Values */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20">
                    <div className="text-xs text-muted-foreground uppercase">Historical VaR</div>
                    <div className="text-xl font-bold font-mono-numbers text-green-500">
                      {formatCurrency(result.var_dollar.historical)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatNumber(Math.abs(result.var_percentages.historical), 2)}%
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20">
                    <div className="text-xs text-muted-foreground uppercase">Parametric VaR</div>
                    <div className="text-xl font-bold font-mono-numbers text-blue-500">
                      {formatCurrency(result.var_dollar.parametric)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatNumber(Math.abs(result.var_percentages.parametric), 2)}%
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20">
                    <div className="text-xs text-muted-foreground uppercase">Monte Carlo VaR</div>
                    <div className="text-xl font-bold font-mono-numbers text-purple-500">
                      {formatCurrency(result.var_dollar.monte_carlo)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatNumber(Math.abs(result.var_percentages.monte_carlo), 2)}%
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20">
                    <div className="text-xs text-muted-foreground uppercase flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      CVaR (ES)
                    </div>
                    <div className="text-xl font-bold font-mono-numbers text-red-500">
                      {formatCurrency(result.var_dollar.cvar)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatNumber(Math.abs(result.var_percentages.cvar), 2)}%
                    </div>
                  </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg bg-secondary">
                    <div className="text-xs text-muted-foreground">Ann. Return</div>
                    <div className={`font-mono-numbers font-bold ${result.statistics.annualized_return >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {result.statistics.annualized_return.toFixed(2)}%
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary">
                    <div className="text-xs text-muted-foreground">Ann. Volatility</div>
                    <div className="font-mono-numbers font-bold">
                      {result.statistics.annualized_volatility.toFixed(2)}%
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary">
                    <div className="text-xs text-muted-foreground">Daily Mean</div>
                    <div className="font-mono-numbers font-bold">
                      {(result.statistics.mean_daily_return * 100).toFixed(4)}%
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary">
                    <div className="text-xs text-muted-foreground">Data Points</div>
                    <div className="font-mono-numbers font-bold">
                      {result.data_points}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                Enter parameters and click "Calculate VaR" to estimate portfolio risk
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
              <CardTitle>VaR Comparison</CardTitle>
              <CardDescription>Dollar VaR by methodology</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={varComparisonData}
                layout={{
                  xaxis: { title: "Methodology" },
                  yaxis: { title: "VaR ($)" },
                  height: 350,
                  showlegend: false,
                }}
                className="w-full h-[350px]"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Returns Distribution</CardTitle>
              <CardDescription>Historical daily returns (%)</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={histogramData}
                layout={{
                  xaxis: { title: "Daily Return (%)" },
                  yaxis: { title: "Frequency" },
                  height: 350,
                  bargap: 0.05,
                  shapes: [
                    {
                      type: "line",
                      x0: result.var_percentages.historical,
                      x1: result.var_percentages.historical,
                      y0: 0,
                      y1: 1,
                      yref: "paper",
                      line: { color: chartColors.loss, width: 2, dash: "dash" },
                    },
                  ],
                  annotations: [
                    {
                      x: result.var_percentages.historical,
                      y: 0.95,
                      yref: "paper",
                      text: `VaR (${formatPercent(confidenceLevel)})`,
                      showarrow: true,
                      arrowhead: 2,
                      font: { color: chartColors.loss },
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
