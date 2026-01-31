"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TutorialCard } from "@/components/ui/tooltip";
import { PlotlyChart, chartColors } from "@/components/charts";
import { Grid3X3, RefreshCw, Play, Loader2 } from "lucide-react";
import { trackCalculation } from "@/lib/analytics";

interface ClusteringResult {
  n_stocks: number;
  n_clusters: number;
  period: string;
  silhouette_score: number;
  inertia: number;
  feature_names: string[];
  cluster_statistics: Array<{
    cluster: number;
    n_stocks: number;
    avg_return: number;
    avg_volatility: number;
    avg_beta: number;
    tickers: string[];
  }>;
  portfolios: Array<{
    cluster: number;
    tickers: string[];
    n_stocks: number;
    total_return: number;
    volatility: number;
    sharpe_ratio: number;
    cumulative_returns: number[];
  }>;
  stocks: Array<{
    ticker: string;
    cluster: number;
    features: {
      return: number;
      volatility: number;
      momentum_20d: number;
      momentum_60d: number;
      beta: number;
    };
    pca: {
      x: number;
      y: number;
    };
  }>;
  centroids: {
    features: number[][];
    pca: Array<{ x: number; y: number }>;
  };
}

const clusterColors = [
  "#ef4444", // Red
  "#3b82f6", // Blue
  "#22c55e", // Green
  "#f97316", // Orange
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
];

const clusteringTooltips = {
  tutorial: {
    title: "K-Means Stock Clustering",
    description: "Group stocks by behavior patterns (returns, volatility, momentum, beta) to build diversified portfolios from each cluster.",
    steps: [
      "Enter a list of stock tickers (10-30 recommended)",
      "Select number of clusters (3-6)",
      "Click 'Cluster Stocks' to run K-means algorithm",
      "View cluster compositions and portfolio performance"
    ]
  },
  silhouette: "Silhouette score measures clustering quality. Range: -1 to 1. Higher is better (>0.5 is good, >0.7 is excellent).",
  features: "Features used: Avg Return, Volatility, 20d Momentum, 60d Momentum, Beta vs SPY."
};

const defaultTickers = "AAPL,MSFT,GOOGL,AMZN,META,NVDA,JPM,BAC,XOM,CVX,JNJ,PFE,WMT,HD,DIS,NFLX,TSLA,AMD,INTC,CRM";

export default function StockClusteringPage() {
  const [tickers, setTickers] = useState(defaultTickers);
  const [nClusters, setNClusters] = useState("4");
  const [period, setPeriod] = useState("1y");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClusteringResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clusterStocks = async () => {
    setLoading(true);
    setError(null);
    const startTime = performance.now();

    const inputParams = {
      tickers,
      n_clusters: nClusters,
      period,
    };

    try {
      const params = new URLSearchParams({
        tickers,
        n_clusters: nClusters,
        period,
      });

      const response = await fetch(`/api/stock-clustering?${params}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);

      // Track successful clustering
      trackCalculation('stock-clustering', inputParams, data, Math.round(performance.now() - startTime));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clustering failed");

      // Track failed clustering
      trackCalculation('stock-clustering', inputParams, { error: err instanceof Error ? err.message : 'Unknown error' }, Math.round(performance.now() - startTime));
    } finally {
      setLoading(false);
    }
  };

  // PCA scatter plot with clusters
  const pcaScatterData = result ? Array.from({ length: result.n_clusters }, (_, cluster) => {
    const clusterStocks = result.stocks.filter(s => s.cluster === cluster);
    return {
      x: clusterStocks.map(s => s.pca.x),
      y: clusterStocks.map(s => s.pca.y),
      text: clusterStocks.map(s => s.ticker),
      type: "scatter" as const,
      mode: "markers+text" as const,
      name: `Cluster ${cluster + 1}`,
      marker: { color: clusterColors[cluster], size: 12 },
      textposition: "top center" as const,
      textfont: { size: 10 },
    };
  }) : [];

  // Add centroids to scatter plot
  if (result) {
    pcaScatterData.push({
      x: result.centroids.pca.map(c => c.x),
      y: result.centroids.pca.map(c => c.y),
      text: result.centroids.pca.map((_, i) => `C${i + 1}`),
      type: "scatter" as const,
      mode: "markers+text" as const,
      name: "Centroids",
      marker: { color: "#fff", size: 16 },
      textposition: "top center" as const,
      textfont: { size: 10 },
    });
  }

  // Portfolio performance comparison
  const portfolioPerformanceData = result ? result.portfolios.map((p, idx) => ({
    x: Array.from({ length: p.cumulative_returns.length }, (_, i) => i),
    y: p.cumulative_returns,
    type: "scatter" as const,
    mode: "lines" as const,
    name: `Cluster ${p.cluster + 1} (${p.n_stocks} stocks)`,
    line: { color: clusterColors[idx % clusterColors.length], width: 2 },
  })) : [];

  // Cluster comparison bar chart
  const clusterComparisonData = result ? [
    {
      x: result.cluster_statistics.map(c => `Cluster ${c.cluster + 1}`),
      y: result.cluster_statistics.map(c => c.avg_return),
      type: "bar" as const,
      name: "Avg Return (%)",
      marker: { color: chartColors.profit },
    },
    {
      x: result.cluster_statistics.map(c => `Cluster ${c.cluster + 1}`),
      y: result.cluster_statistics.map(c => c.avg_volatility),
      type: "bar" as const,
      name: "Avg Volatility (%)",
      marker: { color: chartColors.loss },
    },
  ] : [];

  const resetToDefaults = () => {
    setTickers(defaultTickers);
    setNClusters("4");
    setPeriod("1y");
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">K-Means Stock Clustering</h1>
          <p className="text-muted-foreground mt-1">
            Group stocks by behavior patterns for diversified portfolios
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
        title={clusteringTooltips.tutorial.title}
        description={clusteringTooltips.tutorial.description}
        steps={clusteringTooltips.tutorial.steps}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Input Parameters */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5" />
              Clustering Parameters
            </CardTitle>
            <CardDescription>Configure the stock clustering</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Stock Tickers</label>
              <Input
                value={tickers}
                onChange={(e) => setTickers(e.target.value.toUpperCase())}
                placeholder="AAPL,MSFT,GOOGL..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                10-30 comma-separated tickers
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Number of Clusters</label>
              <Select value={nClusters} onValueChange={setNClusters}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 Clusters</SelectItem>
                  <SelectItem value="4">4 Clusters</SelectItem>
                  <SelectItem value="5">5 Clusters</SelectItem>
                  <SelectItem value="6">6 Clusters</SelectItem>
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

            <Button onClick={clusterStocks} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Clustering...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Cluster Stocks
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
                <li>• Avg Daily Return (annualized)</li>
                <li>• Volatility (annualized)</li>
                <li>• 20-day & 60-day Momentum</li>
                <li>• Beta vs SPY</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Clustering Results</CardTitle>
            <CardDescription>
              {result
                ? `${result.n_stocks} stocks grouped into ${result.n_clusters} clusters`
                : "Configure parameters and click 'Cluster Stocks'"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <>
                {/* Quality Metrics */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-secondary">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Silhouette Score</span>
                      <Tooltip content={clusteringTooltips.silhouette} side="right" />
                    </div>
                    <div className={`text-2xl font-bold ${
                      result.silhouette_score > 0.5 ? 'text-green-500' :
                      result.silhouette_score > 0.25 ? 'text-yellow-500' : 'text-red-500'
                    }`}>
                      {result.silhouette_score.toFixed(3)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {result.silhouette_score > 0.5 ? 'Good separation' :
                       result.silhouette_score > 0.25 ? 'Moderate separation' : 'Weak separation'}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary">
                    <div className="text-sm text-muted-foreground">Inertia</div>
                    <div className="text-2xl font-bold">{result.inertia.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">Sum of squared distances</div>
                  </div>
                </div>

                {/* Cluster Summary Cards */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {result.cluster_statistics.map((cluster, idx) => (
                    <div
                      key={cluster.cluster}
                      className="p-3 rounded-lg border"
                      style={{ borderColor: clusterColors[idx % clusterColors.length] + '40' }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: clusterColors[idx % clusterColors.length] }}
                        />
                        <span className="font-semibold">Cluster {cluster.cluster + 1}</span>
                        <span className="text-xs text-muted-foreground">({cluster.n_stocks} stocks)</span>
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Return:</span>
                          <span className={cluster.avg_return >= 0 ? 'text-green-500' : 'text-red-500'}>
                            {cluster.avg_return >= 0 ? '+' : ''}{cluster.avg_return}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Vol:</span>
                          <span>{cluster.avg_volatility}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Beta:</span>
                          <span>{cluster.avg_beta.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {cluster.tickers.slice(0, 5).map(t => (
                          <span key={t} className="px-1.5 py-0.5 text-[10px] rounded bg-secondary">
                            {t}
                          </span>
                        ))}
                        {cluster.tickers.length > 5 && (
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-secondary text-muted-foreground">
                            +{cluster.tickers.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                Enter stock tickers and click &quot;Cluster Stocks&quot; to group by behavior
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
              <CardTitle>PCA Cluster Visualization</CardTitle>
              <CardDescription>Stocks projected to 2D using PCA</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={pcaScatterData}
                layout={{
                  xaxis: { title: "PC1", zeroline: false },
                  yaxis: { title: "PC2", zeroline: false },
                  height: 400,
                  showlegend: true,
                  legend: { x: 0, y: 1.15, orientation: "h" as const },
                }}
                className="w-full h-[400px]"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Portfolio Performance by Cluster</CardTitle>
              <CardDescription>Equal-weight portfolio cumulative returns</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={portfolioPerformanceData}
                layout={{
                  xaxis: { title: "Trading Days" },
                  yaxis: { title: "Cumulative Return (%)" },
                  height: 400,
                  showlegend: true,
                  legend: { x: 0, y: 1.15, orientation: "h" as const },
                }}
                className="w-full h-[400px]"
              />
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Cluster Characteristics Comparison</CardTitle>
              <CardDescription>Average return and volatility by cluster</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={clusterComparisonData}
                layout={{
                  xaxis: { title: "" },
                  yaxis: { title: "Percentage (%)" },
                  height: 350,
                  barmode: "group" as const,
                  showlegend: true,
                  legend: { x: 0, y: 1.1, orientation: "h" as const },
                }}
                className="w-full h-[350px]"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stock Details Table */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Stock Details</CardTitle>
            <CardDescription>Individual stock features and cluster assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-auto max-h-[400px]">
              <table className="w-full text-sm">
                <thead className="bg-secondary sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Ticker</th>
                    <th className="px-3 py-2 text-left">Cluster</th>
                    <th className="px-3 py-2 text-right">Return</th>
                    <th className="px-3 py-2 text-right">Volatility</th>
                    <th className="px-3 py-2 text-right">Mom 20d</th>
                    <th className="px-3 py-2 text-right">Mom 60d</th>
                    <th className="px-3 py-2 text-right">Beta</th>
                  </tr>
                </thead>
                <tbody>
                  {result.stocks.map((stock) => (
                    <tr key={stock.ticker} className="border-t hover:bg-secondary/50">
                      <td className="px-3 py-2 font-medium">{stock.ticker}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: clusterColors[stock.cluster % clusterColors.length] }}
                          />
                          {stock.cluster + 1}
                        </div>
                      </td>
                      <td className={`px-3 py-2 text-right font-mono ${stock.features.return >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {stock.features.return >= 0 ? '+' : ''}{stock.features.return}%
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{stock.features.volatility}%</td>
                      <td className={`px-3 py-2 text-right font-mono ${stock.features.momentum_20d >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {stock.features.momentum_20d >= 0 ? '+' : ''}{stock.features.momentum_20d}%
                      </td>
                      <td className={`px-3 py-2 text-right font-mono ${stock.features.momentum_60d >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {stock.features.momentum_60d >= 0 ? '+' : ''}{stock.features.momentum_60d}%
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{stock.features.beta.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
