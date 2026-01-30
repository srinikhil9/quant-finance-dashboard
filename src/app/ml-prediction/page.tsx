"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlotlyChart, chartColors } from "@/components/charts";
import { formatNumber, formatPercent } from "@/lib/utils/formatters";
import { Brain, RefreshCw, Play, Loader2 } from "lucide-react";

interface MLResult {
  ticker: string;
  model: string;
  data_points: number;
  features_used: number;
  metrics: {
    train_r2: number;
    test_r2: number;
    test_rmse: number;
    test_mae: number;
    directional_accuracy: number;
  };
  feature_importance: Record<string, number>;
  predictions: {
    dates: string[];
    actual: number[];
    predicted: number[];
  };
}

export default function MLPredictionPage() {
  const [ticker, setTicker] = useState("AAPL");
  const [period, setPeriod] = useState("2y");
  const [modelType, setModelType] = useState("ridge");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MLResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runPrediction = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        ticker,
        period,
        model: modelType,
      });

      const response = await fetch(`/api/ml-predict?${params}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prediction failed");
    } finally {
      setLoading(false);
    }
  };

  const predictionChartData = result ? [
    {
      x: result.predictions.dates,
      y: result.predictions.actual,
      type: "scatter" as const,
      mode: "lines" as const,
      name: "Actual",
      line: { color: chartColors.primary, width: 2 },
    },
    {
      x: result.predictions.dates,
      y: result.predictions.predicted,
      type: "scatter" as const,
      mode: "lines" as const,
      name: "Predicted",
      line: { color: chartColors.secondary, width: 2, dash: "dash" },
    },
  ] : [];

  const featureImportanceData = result ? [{
    x: Object.values(result.feature_importance),
    y: Object.keys(result.feature_importance),
    type: "bar" as const,
    orientation: "h" as const,
    marker: { color: chartColors.purple },
  }] : [];

  const scatterData = result ? [{
    x: result.predictions.actual,
    y: result.predictions.predicted,
    type: "scatter" as const,
    mode: "markers" as const,
    name: "Actual vs Predicted",
    marker: { color: chartColors.primary, size: 8, opacity: 0.7 },
  }] : [];

  const resetToDefaults = () => {
    setTicker("AAPL");
    setPeriod("2y");
    setModelType("ridge");
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ML Stock Prediction</h1>
          <p className="text-muted-foreground mt-1">
            Predict stock returns using machine learning models
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
              <Brain className="h-5 w-5" />
              Model Configuration
            </CardTitle>
            <CardDescription>Train ML model on-demand</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Input
              label="Stock Ticker"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="AAPL"
            />

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Training Period</label>
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

            <div className="space-y-1.5">
              <label className="text-sm font-medium">ML Model</label>
              <Select value={modelType} onValueChange={setModelType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Linear Regression</SelectItem>
                  <SelectItem value="ridge">Ridge Regression</SelectItem>
                  <SelectItem value="lasso">Lasso Regression</SelectItem>
                  <SelectItem value="random_forest">Random Forest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={runPrediction} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Training Model...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Train & Predict
                </>
              )}
            </Button>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="p-4 rounded-lg bg-secondary/50 text-sm">
              <p className="font-medium mb-2">Features Used:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>Returns (1d, 5d, 20d)</li>
                <li>Moving Averages (SMA 5/20/50)</li>
                <li>RSI, MACD, Bollinger Bands</li>
                <li>Volatility metrics</li>
                <li>Lag features</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Model Performance</CardTitle>
            <CardDescription>
              {result
                ? `${result.ticker} - ${result.model.toUpperCase()} model with ${result.features_used} features`
                : "Train a model to see results"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <>
                {/* Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20">
                    <div className="text-xs text-muted-foreground uppercase">Test R²</div>
                    <div className="text-xl font-bold font-mono-numbers text-green-500">
                      {formatNumber(result.metrics.test_r2, 4)}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-secondary">
                    <div className="text-xs text-muted-foreground uppercase">Train R²</div>
                    <div className="text-xl font-bold font-mono-numbers">
                      {formatNumber(result.metrics.train_r2, 4)}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20">
                    <div className="text-xs text-muted-foreground uppercase">Direction Acc.</div>
                    <div className="text-xl font-bold font-mono-numbers text-blue-500">
                      {formatPercent(result.metrics.directional_accuracy)}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-secondary">
                    <div className="text-xs text-muted-foreground uppercase">RMSE</div>
                    <div className="text-xl font-bold font-mono-numbers">
                      {formatNumber(result.metrics.test_rmse, 4)}%
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-secondary">
                    <div className="text-xs text-muted-foreground uppercase">MAE</div>
                    <div className="text-xl font-bold font-mono-numbers">
                      {formatNumber(result.metrics.test_mae, 4)}%
                    </div>
                  </div>
                </div>

                {/* Model Info */}
                <div className="p-4 rounded-lg bg-secondary">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Data Points:</span>
                      <span className="ml-2 font-mono-numbers">{result.data_points}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Features:</span>
                      <span className="ml-2 font-mono-numbers">{result.features_used}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Test Size:</span>
                      <span className="ml-2 font-mono-numbers">20%</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                Configure model parameters and click "Train & Predict"
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
              <CardTitle>Actual vs Predicted Returns</CardTitle>
              <CardDescription>Last 30 days of test data (%)</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={predictionChartData}
                layout={{
                  xaxis: { title: "Date" },
                  yaxis: { title: "Return (%)" },
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
              <CardTitle>Prediction Scatter</CardTitle>
              <CardDescription>Actual vs Predicted correlation</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={scatterData}
                layout={{
                  xaxis: { title: "Actual Return (%)" },
                  yaxis: { title: "Predicted Return (%)" },
                  height: 350,
                  shapes: [
                    {
                      type: "line",
                      x0: Math.min(...result.predictions.actual),
                      x1: Math.max(...result.predictions.actual),
                      y0: Math.min(...result.predictions.actual),
                      y1: Math.max(...result.predictions.actual),
                      line: { color: chartColors.muted, width: 1, dash: "dash" },
                    },
                  ],
                }}
                className="w-full h-[350px]"
              />
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Feature Importance</CardTitle>
              <CardDescription>Top 10 most important features</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={featureImportanceData}
                layout={{
                  xaxis: { title: "Importance" },
                  yaxis: { automargin: true },
                  height: 400,
                  margin: { l: 150 },
                }}
                className="w-full h-[400px]"
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
