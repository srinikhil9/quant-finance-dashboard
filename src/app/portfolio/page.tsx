"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable, formatTableNumber, formatTablePercent, formatTableCurrency } from "@/components/ui/data-table";
import { MetricCard, MetricGrid } from "@/components/ui/metric-card";
import { PlotlyChart, chartColors } from "@/components/charts";
import { ResultInterpretation, type InterpretationData } from "@/components/ui/result-interpretation";
import { trackCalculation } from "@/lib/analytics";
import { formatCurrency, formatPercent } from "@/lib/utils/formatters";
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  PieChart,
  Activity,
  Target,
  Shield,
  Plus,
  Trash2,
  Loader2
} from "lucide-react";

interface Holding {
  ticker: string;
  name: string;
  shares: number;
  costBasis: number;
  currentPrice: number;
  positionValue: number;
  positionCost: number;
  pnl: number;
  pnlPercent: number;
  sector: string;
  weight: number;
  [key: string]: unknown;
}

interface PortfolioResult {
  holdings: Holding[];
  summary: {
    totalValue: number;
    totalCost: number;
    totalPnl: number;
    totalPnlPercent: number;
    numPositions: number;
  };
  metrics: {
    annualizedReturn: number;
    annualizedVolatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    beta: number;
    var95: number;
  };
  sectorAllocation: Array<{ sector: string; weight: number }>;
  correlationMatrix: {
    tickers: string[];
    matrix: number[][];
  };
  performance: {
    dates: string[];
    cumulativeReturns: number[];
  };
  timestamp: string;
  error?: string;
}

interface PositionInput {
  ticker: string;
  shares: string;
  costBasis: string;
}

function getPortfolioInterpretation(result: PortfolioResult): InterpretationData {
  const { summary, metrics } = result;
  const pnlStatus = summary.totalPnlPercent >= 0 ? 'positive' : 'negative';
  const sharpeStatus = metrics.sharpeRatio >= 1 ? 'positive' : metrics.sharpeRatio >= 0.5 ? 'neutral' : 'warning';

  const points: string[] = [
    `Total portfolio value: ${formatCurrency(summary.totalValue)} (${summary.numPositions} positions)`,
    summary.totalPnl >= 0
      ? `Unrealized gain of ${formatCurrency(summary.totalPnl)} (+${summary.totalPnlPercent.toFixed(1)}%)`
      : `Unrealized loss of ${formatCurrency(Math.abs(summary.totalPnl))} (${summary.totalPnlPercent.toFixed(1)}%)`,
    `Annualized return: ${metrics.annualizedReturn >= 0 ? '+' : ''}${metrics.annualizedReturn.toFixed(1)}% with ${metrics.annualizedVolatility.toFixed(1)}% volatility`,
    `Sharpe Ratio: ${metrics.sharpeRatio.toFixed(2)} (${metrics.sharpeRatio >= 1 ? 'good' : metrics.sharpeRatio >= 0.5 ? 'acceptable' : 'needs improvement'})`,
    `Maximum drawdown: ${Math.abs(metrics.maxDrawdown).toFixed(1)}%`,
    `Portfolio beta: ${metrics.beta.toFixed(2)} (${metrics.beta > 1.2 ? 'aggressive' : metrics.beta < 0.8 ? 'defensive' : 'market-neutral'})`,
    `95% VaR: ${formatCurrency(Math.abs(metrics.var95))} daily potential loss`
  ];

  let advice: string;
  if (metrics.sharpeRatio < 0.5) {
    advice = "Consider rebalancing to improve risk-adjusted returns. The current Sharpe ratio suggests room for optimization.";
  } else if (Math.abs(metrics.maxDrawdown) > 20) {
    advice = "High maximum drawdown detected. Consider diversifying or adding defensive positions to reduce downside risk.";
  } else if (metrics.beta > 1.3) {
    advice = "Portfolio is more volatile than the market. If this is intentional, ensure you can handle the swings.";
  } else {
    advice = "Portfolio metrics look healthy. Continue monitoring and rebalance periodically to maintain target allocations.";
  }

  return {
    status: pnlStatus === 'positive' && sharpeStatus !== 'warning' ? 'positive' : pnlStatus === 'negative' ? 'negative' : 'neutral',
    summary: summary.totalPnl >= 0
      ? `Your portfolio is up ${formatCurrency(summary.totalPnl)} (${summary.totalPnlPercent.toFixed(1)}%)`
      : `Your portfolio is down ${formatCurrency(Math.abs(summary.totalPnl))} (${Math.abs(summary.totalPnlPercent).toFixed(1)}%)`,
    points,
    advice
  };
}

export default function PortfolioPage() {
  const [positions, setPositions] = useState<PositionInput[]>([
    { ticker: "AAPL", shares: "10", costBasis: "150" },
    { ticker: "MSFT", shares: "5", costBasis: "350" },
    { ticker: "GOOGL", shares: "3", costBasis: "140" }
  ]);
  const [period, setPeriod] = useState("1y");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PortfolioResult | null>(null);

  const addPosition = () => {
    if (positions.length < 10) {
      setPositions([...positions, { ticker: "", shares: "", costBasis: "" }]);
    }
  };

  const removePosition = (index: number) => {
    if (positions.length > 1) {
      setPositions(positions.filter((_, i) => i !== index));
    }
  };

  const updatePosition = (index: number, field: keyof PositionInput, value: string) => {
    const updated = [...positions];
    updated[index][field] = value;
    setPositions(updated);
  };

  const analyzePortfolio = async () => {
    setLoading(true);
    setError(null);
    const startTime = performance.now();

    // Validate inputs
    const validPositions = positions.filter(p => p.ticker && p.shares && p.costBasis);
    if (validPositions.length === 0) {
      setError("Please add at least one valid position");
      setLoading(false);
      return;
    }

    const inputParams = {
      tickers: validPositions.map(p => p.ticker).join(','),
      shares: validPositions.map(p => p.shares).join(','),
      costBasis: validPositions.map(p => p.costBasis).join(','),
      period
    };

    try {
      const params = new URLSearchParams({
        action: 'portfolio',
        tickers: inputParams.tickers,
        shares: inputParams.shares,
        costBasis: inputParams.costBasis,
        period
      });

      const response = await fetch(`/api/market-analysis?${params}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
      trackCalculation('portfolio', inputParams, data, Math.round(performance.now() - startTime));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      trackCalculation('portfolio', inputParams, { error: err instanceof Error ? err.message : 'Unknown error' }, Math.round(performance.now() - startTime));
    } finally {
      setLoading(false);
    }
  };

  // Define columns for holdings table
  const holdingsColumns = [
    { key: 'ticker' as const, header: 'Ticker', sortable: true },
    { key: 'shares' as const, header: 'Shares', sortable: true, render: (v: unknown) => formatTableNumber(v as number) },
    { key: 'costBasis' as const, header: 'Cost Basis', sortable: true, render: (v: unknown) => formatTableCurrency(v as number) },
    { key: 'currentPrice' as const, header: 'Price', sortable: true, render: (v: unknown) => formatTableCurrency(v as number) },
    { key: 'positionValue' as const, header: 'Value', sortable: true, render: (v: unknown) => formatTableCurrency(v as number) },
    { key: 'pnl' as const, header: 'P&L', sortable: true, render: (v: unknown) => {
      const val = v as number;
      return (
        <span className={val >= 0 ? 'text-green-500' : 'text-red-500'}>
          {val >= 0 ? '+' : ''}{formatTableCurrency(val)}
        </span>
      );
    }},
    { key: 'pnlPercent' as const, header: 'P&L %', sortable: true, render: (v: unknown) => {
      const val = v as number;
      return (
        <span className={val >= 0 ? 'text-green-500' : 'text-red-500'}>
          {val >= 0 ? '+' : ''}{val.toFixed(1)}%
        </span>
      );
    }},
    { key: 'weight' as const, header: 'Weight', sortable: true, render: (v: unknown) => `${(v as number).toFixed(1)}%` },
    { key: 'sector' as const, header: 'Sector', sortable: true }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Briefcase className="h-8 w-8 text-primary" />
          Portfolio Analytics
        </h1>
        <p className="text-muted-foreground mt-2">
          Track your positions, analyze performance, and measure risk metrics
        </p>
      </div>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Positions</CardTitle>
          <CardDescription>Enter your holdings (max 10 positions)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Position inputs */}
          <div className="space-y-3">
            {positions.map((pos, idx) => (
              <div key={idx} className="flex gap-3 items-center">
                <div className="flex-1">
                  <Input
                    placeholder="Ticker (e.g., AAPL)"
                    value={pos.ticker}
                    onChange={(e) => updatePosition(idx, 'ticker', e.target.value.toUpperCase())}
                    className="font-mono"
                  />
                </div>
                <div className="w-28">
                  <Input
                    placeholder="Shares"
                    type="number"
                    value={pos.shares}
                    onChange={(e) => updatePosition(idx, 'shares', e.target.value)}
                  />
                </div>
                <div className="w-32">
                  <Input
                    placeholder="Cost Basis"
                    type="number"
                    step="0.01"
                    value={pos.costBasis}
                    onChange={(e) => updatePosition(idx, 'costBasis', e.target.value)}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removePosition(idx)}
                  disabled={positions.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-4 items-center">
            <Button
              variant="outline"
              onClick={addPosition}
              disabled={positions.length >= 10}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Position
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Analysis Period:</span>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3mo">3 Months</SelectItem>
                  <SelectItem value="6mo">6 Months</SelectItem>
                  <SelectItem value="1y">1 Year</SelectItem>
                  <SelectItem value="2y">2 Years</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={analyzePortfolio}
              disabled={loading}
              className="ml-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4 mr-2" />
                  Analyze Portfolio
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Summary Metrics */}
          <MetricGrid>
            <MetricCard
              label="Total Value"
              value={formatCurrency(result.summary.totalValue)}
              icon={<Briefcase className="h-4 w-4" />}
              status="neutral"
            />
            <MetricCard
              label="Total P&L"
              value={formatCurrency(result.summary.totalPnl)}
              subValue={`${result.summary.totalPnlPercent >= 0 ? '+' : ''}${result.summary.totalPnlPercent.toFixed(1)}%`}
              icon={result.summary.totalPnl >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              status={result.summary.totalPnl >= 0 ? 'positive' : 'negative'}
            />
            <MetricCard
              label="Ann. Return"
              value={`${result.metrics.annualizedReturn >= 0 ? '+' : ''}${result.metrics.annualizedReturn.toFixed(1)}%`}
              icon={<TrendingUp className="h-4 w-4" />}
              status={result.metrics.annualizedReturn >= 0 ? 'positive' : 'negative'}
            />
            <MetricCard
              label="Volatility"
              value={`${result.metrics.annualizedVolatility.toFixed(1)}%`}
              icon={<Activity className="h-4 w-4" />}
              status={result.metrics.annualizedVolatility > 25 ? 'warning' : 'neutral'}
            />
            <MetricCard
              label="Sharpe Ratio"
              value={result.metrics.sharpeRatio.toFixed(2)}
              icon={<Target className="h-4 w-4" />}
              status={result.metrics.sharpeRatio >= 1 ? 'positive' : result.metrics.sharpeRatio >= 0.5 ? 'neutral' : 'warning'}
            />
            <MetricCard
              label="Max Drawdown"
              value={`${Math.abs(result.metrics.maxDrawdown).toFixed(1)}%`}
              icon={<TrendingDown className="h-4 w-4" />}
              status={Math.abs(result.metrics.maxDrawdown) > 20 ? 'negative' : 'neutral'}
            />
            <MetricCard
              label="Beta"
              value={result.metrics.beta.toFixed(2)}
              icon={<Activity className="h-4 w-4" />}
              status={Math.abs(result.metrics.beta - 1) < 0.2 ? 'neutral' : 'warning'}
            />
            <MetricCard
              label="95% VaR"
              value={formatCurrency(Math.abs(result.metrics.var95))}
              subValue="Daily"
              icon={<Shield className="h-4 w-4" />}
              status="warning"
            />
          </MetricGrid>

          {/* Interpretation */}
          <ResultInterpretation data={getPortfolioInterpretation(result)} />

          {/* Holdings Table */}
          <Card>
            <CardHeader>
              <CardTitle>Holdings</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={result.holdings}
                columns={holdingsColumns}
                compact
                stickyHeader
              />
            </CardContent>
          </Card>

          {/* Charts */}
          <Tabs defaultValue="performance">
            <TabsList>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="allocation">Allocation</TabsTrigger>
              <TabsTrigger value="correlation">Correlation</TabsTrigger>
            </TabsList>

            <TabsContent value="performance" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Portfolio Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <PlotlyChart
                    data={[
                      {
                        x: result.performance.dates,
                        y: result.performance.cumulativeReturns.map(r => (r - 1) * 100),
                        type: 'scatter',
                        mode: 'lines',
                        name: 'Portfolio Return',
                        fill: 'tozeroy',
                        line: { color: chartColors.primary, width: 2 },
                        fillcolor: `${chartColors.primary}20`
                      }
                    ]}
                    layout={{
                      title: 'Cumulative Return (%)',
                      xaxis: { title: 'Date' },
                      yaxis: { title: 'Return (%)', ticksuffix: '%' },
                      hovermode: 'x unified'
                    }}
                    config={{ responsive: true }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="allocation" className="mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Position Weights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PlotlyChart
                      data={[
                        {
                          values: result.holdings.map(h => h.weight),
                          labels: result.holdings.map(h => h.ticker),
                          type: 'pie',
                          hole: 0.4,
                          marker: {
                            colors: [
                              chartColors.primary,
                              chartColors.secondary,
                              chartColors.profit,
                              chartColors.warning,
                              chartColors.loss,
                              chartColors.purple,
                              chartColors.cyan,
                              chartColors.orange,
                              '#f97316',
                              '#6366f1'
                            ]
                          },
                          textinfo: 'label+percent',
                          textposition: 'outside'
                        }
                      ]}
                      layout={{
                        showlegend: false,
                        margin: { t: 20, b: 20, l: 20, r: 20 }
                      }}
                      config={{ responsive: true }}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Sector Allocation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PlotlyChart
                      data={[
                        {
                          x: result.sectorAllocation.map(s => s.weight),
                          y: result.sectorAllocation.map(s => s.sector),
                          type: 'bar',
                          orientation: 'h',
                          marker: { color: chartColors.primary },
                          text: result.sectorAllocation.map(s => `${s.weight.toFixed(1)}%`),
                          textposition: 'outside'
                        }
                      ]}
                      layout={{
                        xaxis: { title: 'Weight (%)', ticksuffix: '%' },
                        yaxis: { title: '' },
                        margin: { l: 120 }
                      }}
                      config={{ responsive: true }}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="correlation" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Correlation Matrix</CardTitle>
                  <CardDescription>Lower correlations indicate better diversification</CardDescription>
                </CardHeader>
                <CardContent>
                  <PlotlyChart
                    data={[
                      {
                        z: result.correlationMatrix.matrix,
                        x: result.correlationMatrix.tickers,
                        y: result.correlationMatrix.tickers,
                        type: 'heatmap',
                        colorscale: [
                          [0, chartColors.profit],
                          [0.5, '#1e293b'],
                          [1, chartColors.loss]
                        ],
                        zmin: -1,
                        zmax: 1,
                        text: result.correlationMatrix.matrix.map(row => row.map(v => v.toFixed(2))),
                        texttemplate: '%{text}',
                        hovertemplate: '%{x} vs %{y}: %{z:.3f}<extra></extra>'
                      }
                    ]}
                    layout={{
                      xaxis: { side: 'bottom' },
                      yaxis: { autorange: 'reversed' }
                    }}
                    config={{ responsive: true }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
