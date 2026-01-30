"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlotlyChart, chartColors } from "@/components/charts";
import { formatNumber, formatPercent } from "@/lib/utils/formatters";
import { Activity, RefreshCw, Play, Loader2 } from "lucide-react";

interface VolatilityResult {
  ticker: string;
  lambda: number;
  period: string;
  data_points: number;
  statistics: {
    realized_volatility: number;
    current_ewma_volatility: number;
    current_rolling_volatility: number;
    mean_daily_return: number;
  };
  time_series: {
    dates: string[];
    ewma: number[];
    rolling_20d: number[];
  };
  forecast: {
    horizon: number;
    ewma_forecast: number[];
  };
}

export default function VolatilityPage() {
  const [ticker, setTicker] = useState("AAPL");
  const [lambdaParam, setLambdaParam] = useState(0.94);
  const [period, setPeriod] = useState("1y");
  const [forecastHorizon, setForecastHorizon] = useState(5);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VolatilityResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculateVolatility = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        ticker,
        lambda: lambdaParam.toString(),
        period,
        forecast_horizon: forecastHorizon.toString(),
      });

      const response = await fetch(`/api/volatility?${params}`);
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

  const volatilityChartData = result ? [
    {
      x: result.time_series.dates,
      y: result.time_series.ewma,
      type: "scatter" as const,
      mode: "lines" as const,
      name: "EWMA Volatility",
      line: { color: chartColors.primary, width: 2 },
    },
    {
      x: result.time_series.dates,
      y: result.time_series.rolling_20d,
      type: "scatter" as const,
      mode: "lines" as const,
      name: "Rolling 20D",
      line: { color: chartColors.secondary, width: 2 },
    },
  ] : [];

  const forecastChartData = result ? [
    {
      x: Array.from({ length: result.forecast.horizon }, (_, i) => `Day ${i + 1}`),
      y: result.forecast.ewma_forecast,
      type: "scatter" as const,
      mode: "lines+markers" as const,
      name: "EWMA Forecast",
      line: { color: chartColors.purple, width: 2 },
      marker: { size: 8 },
    },
  ] : [];

  const resetToDefaults = () => {
    setTicker("AAPL");
    setLambdaParam(0.94);
    setPeriod("1y");
    setForecastHorizon(5);
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Volatility Modeling</h1>
          <p className="text-muted-foreground mt-1">
            Model and forecast volatility with EWMA
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
              <Activity className="h-5 w-5" />
              Model Parameters
            </CardTitle>
            <CardDescription>Configure volatility model</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Input
              label="Stock Ticker"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="AAPL"
            />

            <Slider
              label="Lambda (decay factor)"
              value={[lambdaParam]}
              onValueChange={([v]) => setLambdaParam(v)}
              min={0.8}
              max={0.99}
              step={0.01}
              formatValue={(v) => v.toFixed(2)}
            />

            <div className="text-xs text-muted-foreground -mt-2">
              Higher lambda = more weight on historical data (smoother)
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
              label="Forecast Horizon"
              value={[forecastHorizon]}
              onValueChange={([v]) => setForecastHorizon(v)}
              min={1}
              max={20}
              step={1}
              formatValue={(v) => `${v} days`}
            />

            <Button onClick={calculateVolatility} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Calculate Volatility
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
            <CardTitle>Volatility Analysis</CardTitle>
            <CardDescription>
              {result
                ? `${result.ticker} - ${result.data_points} data points`
                : "Calculate volatility to see results"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <>
                {/* Key Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20">
                    <div className="text-xs text-muted-foreground uppercase">Realized Vol</div>
                    <div className="text-xl font-bold font-mono-numbers text-green-500">
                      {result.statistics.realized_volatility.toFixed(2)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Annualized</div>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20">
                    <div className="text-xs text-muted-foreground uppercase">Current EWMA</div>
                    <div className="text-xl font-bold font-mono-numbers text-blue-500">
                      {result.statistics.current_ewma_volatility.toFixed(2)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Annualized</div>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20">
                    <div className="text-xs text-muted-foreground uppercase">Rolling 20D</div>
                    <div className="text-xl font-bold font-mono-numbers text-purple-500">
                      {result.statistics.current_rolling_volatility.toFixed(2)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Annualized</div>
                  </div>

                  <div className="p-4 rounded-lg bg-secondary">
                    <div className="text-xs text-muted-foreground uppercase">Mean Return</div>
                    <div className={`text-xl font-bold font-mono-numbers ${result.statistics.mean_daily_return >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {result.statistics.mean_daily_return.toFixed(4)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Daily</div>
                  </div>
                </div>

                {/* Model Info */}
                <div className="p-4 rounded-lg bg-secondary">
                  <h4 className="font-medium mb-2">EWMA Model</h4>
                  <p className="text-sm text-muted-foreground">
                    The Exponentially Weighted Moving Average (EWMA) model with lambda = {lambdaParam} gives
                    {lambdaParam > 0.9 ? " more " : " less "} weight to historical observations.
                    RiskMetrics standard uses lambda = 0.94 for daily data.
                  </p>
                  <div className="mt-2 text-xs font-mono-numbers text-muted-foreground">
                    σ²_t = λ × σ²_(t-1) + (1-λ) × r²_(t-1)
                  </div>
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                Enter parameters and click "Calculate Volatility" to analyze
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
              <CardTitle>Historical Volatility</CardTitle>
              <CardDescription>EWMA vs Rolling volatility over time</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={volatilityChartData}
                layout={{
                  xaxis: { title: "Date" },
                  yaxis: { title: "Volatility (% Annualized)" },
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
              <CardTitle>Volatility Forecast</CardTitle>
              <CardDescription>EWMA forecast for next {forecastHorizon} days</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={forecastChartData}
                layout={{
                  xaxis: { title: "Forecast Horizon" },
                  yaxis: { title: "Volatility (% Annualized)" },
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
