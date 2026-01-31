"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TutorialCard } from "@/components/ui/tooltip";
import { PlotlyChart, chartColors } from "@/components/charts";
import { AlertTriangle, RefreshCw, Play, Loader2, ShieldAlert } from "lucide-react";
import { trackCalculation } from "@/lib/analytics";

interface AnomalyResult {
  ticker: string;
  period: string;
  data_points: number;
  n_trees: number;
  contamination: number;
  threshold: number;
  summary: {
    n_anomalies: number;
    anomaly_rate: number;
    avg_score: number;
    max_score: number;
  };
  detected_crises: Array<{
    date: string;
    event: string;
    anomaly_index: number;
  }>;
  feature_importance: Array<{
    feature: string;
    importance: number;
    anomaly_mean: number;
    normal_mean: number;
  }>;
  anomalies: Array<{
    date: string;
    price: number;
    score: number;
    features: Record<string, number>;
  }>;
  time_series: {
    dates: string[];
    prices: number[];
    scores: number[];
    is_anomaly: number[];
  };
}

const anomalyTooltips = {
  tutorial: {
    title: "Anomaly Detection with Isolation Forest",
    description: "Detect unusual market conditions using Isolation Forest, an unsupervised machine learning algorithm that identifies outliers by how easily they can be isolated from normal data.",
    steps: [
      "Enter a ticker symbol (SPY for market-wide analysis)",
      "Adjust contamination rate (expected % of anomalies)",
      "Click 'Detect Anomalies' to run Isolation Forest",
      "Review detected anomalies and feature importance"
    ]
  },
  contamination: "Expected proportion of anomalies in the data. Lower = fewer but more extreme anomalies detected. 5% is typical.",
  score: "Anomaly score from 0 to 1. Higher scores indicate more anomalous observations. Score > threshold = anomaly.",
  isolation_forest: "Works by randomly partitioning data. Anomalies require fewer partitions to isolate, giving them shorter path lengths."
};

export default function AnomalyDetectionPage() {
  const [ticker, setTicker] = useState("SPY");
  const [contamination, setContamination] = useState(0.05);
  const [period, setPeriod] = useState("2y");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnomalyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const detectAnomalies = async () => {
    setLoading(true);
    setError(null);
    const startTime = performance.now();

    const inputParams = {
      ticker,
      contamination,
      period,
    };

    try {
      const params = new URLSearchParams({
        ticker,
        contamination: contamination.toString(),
        period,
      });

      const response = await fetch(`/api/anomaly-detection?${params}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);

      // Track successful anomaly detection
      trackCalculation('anomaly-detection', inputParams, data, Math.round(performance.now() - startTime));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Detection failed");

      // Track failed anomaly detection
      trackCalculation('anomaly-detection', inputParams, { error: err instanceof Error ? err.message : 'Unknown error' }, Math.round(performance.now() - startTime));
    } finally {
      setLoading(false);
    }
  };

  // Price chart with anomaly markers
  const priceChartData = result ? [
    {
      x: result.time_series.dates,
      y: result.time_series.prices,
      type: "scatter" as const,
      mode: "lines" as const,
      name: "Price",
      line: { color: chartColors.primary, width: 1 },
    },
    {
      x: result.time_series.dates.filter((_, i) => result.time_series.is_anomaly[i] === 1),
      y: result.time_series.prices.filter((_, i) => result.time_series.is_anomaly[i] === 1),
      type: "scatter" as const,
      mode: "markers" as const,
      name: "Anomalies",
      marker: { color: chartColors.loss, size: 10, symbol: "circle" },
    },
  ] : [];

  // Anomaly score time series
  const scoreChartData = result ? [
    {
      x: result.time_series.dates,
      y: result.time_series.scores,
      type: "scatter" as const,
      mode: "lines" as const,
      name: "Anomaly Score",
      line: { color: chartColors.warning, width: 1 },
      fill: "tozeroy" as const,
    },
  ] : [];

  // Feature importance bar chart
  const importanceChartData = result ? [
    {
      x: result.feature_importance.map(f => f.importance),
      y: result.feature_importance.map(f => f.feature),
      type: "bar" as const,
      orientation: "h" as const,
      marker: {
        color: result.feature_importance.map((_, i) =>
          i === 0 ? chartColors.loss : chartColors.primary
        ),
      },
    },
  ] : [];

  // Score distribution histogram
  const scoreHistogramData = result ? [
    {
      x: result.time_series.scores,
      type: "histogram" as const,
      name: "Score Distribution",
      marker: { color: chartColors.primary },
      nbinsx: 30,
    },
  ] : [];

  const resetToDefaults = () => {
    setTicker("SPY");
    setContamination(0.05);
    setPeriod("2y");
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Anomaly Detection</h1>
          <p className="text-muted-foreground mt-1">
            Detect unusual market conditions with Isolation Forest
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
        title={anomalyTooltips.tutorial.title}
        description={anomalyTooltips.tutorial.description}
        steps={anomalyTooltips.tutorial.steps}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Input Parameters */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Detection Parameters
            </CardTitle>
            <CardDescription>Configure the anomaly detector</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Ticker Symbol</label>
              <Input
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="SPY"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use SPY or QQQ for market-wide analysis
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <label className="text-sm font-medium">Contamination Rate</label>
                <Tooltip content={anomalyTooltips.contamination} side="right" />
              </div>
              <Slider
                value={[contamination]}
                onValueChange={([v]) => setContamination(v)}
                min={0.01}
                max={0.15}
                step={0.01}
                formatValue={(v) => `${(v * 100).toFixed(0)}%`}
              />
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

            <Button onClick={detectAnomalies} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Detecting...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Detect Anomalies
                </>
              )}
            </Button>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="p-4 rounded-lg bg-secondary/50 text-sm">
              <p className="font-medium mb-2">Features Analyzed:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Daily returns</li>
                <li>• Volume spikes</li>
                <li>• 5d & 20d volatility</li>
                <li>• Price gaps</li>
                <li>• Intraday range</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Detection Results</CardTitle>
            <CardDescription>
              {result
                ? `${result.data_points} trading days analyzed`
                : "Configure parameters and click 'Detect Anomalies'"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <>
                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                  <div className="p-3 rounded-lg bg-secondary text-center">
                    <div className="text-2xl font-bold text-red-500">{result.summary.n_anomalies}</div>
                    <div className="text-xs text-muted-foreground">Anomalies</div>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary text-center">
                    <div className="text-2xl font-bold">{result.summary.anomaly_rate}%</div>
                    <div className="text-xs text-muted-foreground">Anomaly Rate</div>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary text-center">
                    <div className="text-2xl font-bold">{result.threshold.toFixed(3)}</div>
                    <div className="text-xs text-muted-foreground">Threshold</div>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary text-center">
                    <div className="text-2xl font-bold">{result.summary.max_score.toFixed(3)}</div>
                    <div className="text-xs text-muted-foreground">Max Score</div>
                  </div>
                </div>

                {/* Detected Crisis Events */}
                {result.detected_crises.length > 0 && (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <span className="font-semibold">Known Crisis Events Detected</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.detected_crises.map((crisis, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-300"
                        >
                          {crisis.event} ({crisis.date})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Anomalies List */}
                <div className="rounded-lg border overflow-hidden">
                  <div className="bg-secondary px-3 py-2 font-medium text-sm">
                    Top Anomalies (by score)
                  </div>
                  <div className="max-h-[200px] overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-secondary/50 sticky top-0">
                        <tr>
                          <th className="px-3 py-1.5 text-left">Date</th>
                          <th className="px-3 py-1.5 text-right">Price</th>
                          <th className="px-3 py-1.5 text-right">Score</th>
                          <th className="px-3 py-1.5 text-right">Return</th>
                          <th className="px-3 py-1.5 text-right">Vol Spike</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.anomalies.slice(0, 15).map((anomaly, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-3 py-1.5">{anomaly.date}</td>
                            <td className="px-3 py-1.5 text-right font-mono">${anomaly.price}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-red-500">
                              {anomaly.score.toFixed(3)}
                            </td>
                            <td className={`px-3 py-1.5 text-right font-mono ${
                              anomaly.features['Daily Return'] >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {(anomaly.features['Daily Return'] * 100).toFixed(2)}%
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono">
                              {anomaly.features['Volume Spike'].toFixed(1)}x
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                Enter a ticker and click &quot;Detect Anomalies&quot; to identify unusual market conditions
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
              <CardTitle>Price Chart with Anomalies</CardTitle>
              <CardDescription>Red markers indicate detected anomalies</CardDescription>
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
              <CardTitle>Anomaly Score Over Time</CardTitle>
              <CardDescription>
                <span className="flex items-center gap-1">
                  Score &gt; {result.threshold.toFixed(3)} = Anomaly
                  <Tooltip content={anomalyTooltips.score} side="right" />
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={scoreChartData}
                layout={{
                  xaxis: { title: "Date" },
                  yaxis: { title: "Anomaly Score" },
                  height: 350,
                  shapes: [{
                    type: "line",
                    y0: result.threshold,
                    y1: result.threshold,
                    x0: 0,
                    x1: 1,
                    xref: "paper",
                    line: { color: chartColors.loss, dash: "dash", width: 2 }
                  }],
                }}
                className="w-full h-[350px]"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Feature Importance</CardTitle>
              <CardDescription>Which features contribute most to anomalies</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={importanceChartData}
                layout={{
                  xaxis: { title: "Importance (Anomaly/Normal ratio)" },
                  yaxis: { automargin: true },
                  height: 350,
                  margin: { l: 120 },
                }}
                className="w-full h-[350px]"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Score Distribution</CardTitle>
              <CardDescription>Histogram of anomaly scores</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={scoreHistogramData}
                layout={{
                  xaxis: { title: "Anomaly Score" },
                  yaxis: { title: "Frequency" },
                  height: 350,
                  shapes: [{
                    type: "line",
                    x0: result.threshold,
                    x1: result.threshold,
                    y0: 0,
                    y1: 1,
                    yref: "paper",
                    line: { color: chartColors.loss, dash: "dash", width: 2 }
                  }],
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
