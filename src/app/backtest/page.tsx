"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable, formatTableCurrency } from "@/components/ui/data-table";
import { MetricCard, MetricGrid } from "@/components/ui/metric-card";
import { PlotlyChart, chartColors } from "@/components/charts";
import { ResultInterpretation, type InterpretationData } from "@/components/ui/result-interpretation";
import { trackCalculation } from "@/lib/analytics";
import { formatCurrency, formatPercent } from "@/lib/utils/formatters";
import {
  FlaskConical,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Trophy,
  BarChart3,
  Loader2,
  Play
} from "lucide-react";

interface Trade {
  date: string;
  type: string;
  price: number;
  exitDate?: string;
  exitPrice?: number;
  pnl?: number;
  pnlPercent?: number;
  [key: string]: unknown;
}

interface BacktestResult {
  ticker: string;
  strategy: string;
  period: string;
  parameters: {
    shortWindow: number;
    longWindow: number;
    rsiOversold: number;
    rsiOverbought: number;
    initialCapital: number;
  };
  performance: {
    totalReturn: number;
    buyholdReturn: number;
    annualizedReturn: number;
    annualizedVolatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
    numTrades: number;
    finalEquity: number;
  };
  trades: Trade[];
  chartData: {
    dates: string[];
    prices: number[];
    strategyEquity: number[];
    buyholdEquity: number[];
    signals: number[];
    drawdown: number[];
  };
  timestamp: string;
  error?: string;
}

const strategies = [
  { id: 'ma_crossover', name: 'Moving Average Crossover', description: 'Buy when short MA crosses above long MA' },
  { id: 'rsi', name: 'RSI Overbought/Oversold', description: 'Buy when oversold, sell when overbought' },
  { id: 'bollinger', name: 'Bollinger Band Breakout', description: 'Buy below lower band, sell above upper band' },
  { id: 'buy_hold', name: 'Buy & Hold', description: 'Simple benchmark - buy and hold' }
];

function getBacktestInterpretation(result: BacktestResult): InterpretationData {
  const { performance, strategy } = result;
  const strategyName = strategies.find(s => s.id === strategy)?.name || strategy;
  const beatsBuyhold = performance.totalReturn > performance.buyholdReturn;

  const points: string[] = [
    `Strategy: ${strategyName}`,
    `Total Return: ${performance.totalReturn >= 0 ? '+' : ''}${performance.totalReturn.toFixed(1)}% vs Buy & Hold: ${performance.buyholdReturn >= 0 ? '+' : ''}${performance.buyholdReturn.toFixed(1)}%`,
    beatsBuyhold
      ? `Strategy outperformed buy & hold by ${(performance.totalReturn - performance.buyholdReturn).toFixed(1)} percentage points`
      : `Strategy underperformed buy & hold by ${(performance.buyholdReturn - performance.totalReturn).toFixed(1)} percentage points`,
    `Win Rate: ${performance.winRate.toFixed(0)}% (${performance.numTrades} trades)`,
    `Average Win: +${performance.avgWin.toFixed(1)}% | Average Loss: ${performance.avgLoss.toFixed(1)}%`,
    `Sharpe Ratio: ${performance.sharpeRatio.toFixed(2)} | Max Drawdown: ${Math.abs(performance.maxDrawdown).toFixed(1)}%`,
    `Profit Factor: ${performance.profitFactor.toFixed(2)} (${performance.profitFactor >= 1.5 ? 'good' : performance.profitFactor >= 1 ? 'marginal' : 'needs work'})`
  ];

  let advice: string;
  if (performance.sharpeRatio >= 1 && beatsBuyhold && performance.winRate >= 50) {
    advice = "Strong backtest results. Consider paper trading before live deployment. Remember: past performance doesn't guarantee future results.";
  } else if (performance.sharpeRatio >= 0.5 || performance.profitFactor >= 1.2) {
    advice = "Moderate backtest results. Consider optimizing parameters or combining with other indicators before live trading.";
  } else {
    advice = "Weak backtest results. The strategy may need significant modifications or may not be suitable for this asset.";
  }

  return {
    status: beatsBuyhold && performance.sharpeRatio >= 0.5 ? 'positive' : performance.totalReturn > 0 ? 'neutral' : 'negative',
    summary: beatsBuyhold
      ? `Strategy beat buy & hold by ${(performance.totalReturn - performance.buyholdReturn).toFixed(1)}% with ${performance.numTrades} trades`
      : `Strategy returned ${performance.totalReturn.toFixed(1)}% (buy & hold: ${performance.buyholdReturn.toFixed(1)}%)`,
    points,
    advice
  };
}

export default function BacktestPage() {
  const [ticker, setTicker] = useState("AAPL");
  const [strategy, setStrategy] = useState("ma_crossover");
  const [period, setPeriod] = useState("2y");
  const [shortWindow, setShortWindow] = useState("20");
  const [longWindow, setLongWindow] = useState("50");
  const [rsiOversold, setRsiOversold] = useState("30");
  const [rsiOverbought, setRsiOverbought] = useState("70");
  const [capital, setCapital] = useState("10000");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const runBacktest = async () => {
    setLoading(true);
    setError(null);
    const startTime = performance.now();

    const inputParams = {
      ticker,
      strategy,
      period,
      shortWindow,
      longWindow,
      rsiOversold,
      rsiOverbought,
      capital
    };

    try {
      const params = new URLSearchParams({
        action: 'backtest',
        ticker,
        strategy,
        period,
        shortWindow,
        longWindow,
        rsiOversold,
        rsiOverbought,
        capital
      });

      const response = await fetch(`/api/market-analysis?${params}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
      trackCalculation('backtest', inputParams, data, Math.round(performance.now() - startTime));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Backtest failed");
      trackCalculation('backtest', inputParams, { error: err instanceof Error ? err.message : 'Unknown error' }, Math.round(performance.now() - startTime));
    } finally {
      setLoading(false);
    }
  };

  const selectedStrategy = strategies.find(s => s.id === strategy);

  // Trade columns
  const tradeColumns = [
    { key: 'date' as const, header: 'Entry Date', sortable: true },
    { key: 'type' as const, header: 'Type', sortable: true },
    { key: 'price' as const, header: 'Entry Price', sortable: true, render: (v: unknown) => formatTableCurrency(v as number) },
    { key: 'exitDate' as const, header: 'Exit Date', sortable: true, render: (v: unknown) => (v as string) || '-' },
    { key: 'exitPrice' as const, header: 'Exit Price', sortable: true, render: (v: unknown) => v ? formatTableCurrency(v as number) : '-' },
    { key: 'pnl' as const, header: 'P&L', sortable: true, render: (v: unknown) => {
      if (!v) return '-';
      const val = v as number;
      return (
        <span className={val >= 0 ? 'text-green-500' : 'text-red-500'}>
          {val >= 0 ? '+' : ''}{formatTableCurrency(val)}
        </span>
      );
    }},
    { key: 'pnlPercent' as const, header: 'P&L %', sortable: true, render: (v: unknown) => {
      if (!v) return '-';
      const val = v as number;
      return (
        <span className={val >= 0 ? 'text-green-500' : 'text-red-500'}>
          {val >= 0 ? '+' : ''}{val.toFixed(1)}%
        </span>
      );
    }}
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FlaskConical className="h-8 w-8 text-primary" />
          Backtesting Engine
        </h1>
        <p className="text-muted-foreground mt-2">
          Test trading strategies on historical data before risking real capital
        </p>
      </div>

      {/* Input Section */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Strategy Selection</CardTitle>
            <CardDescription>Choose a trading strategy to backtest</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm text-muted-foreground mb-2 block">Ticker Symbol</span>
              <Input
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="AAPL"
                className="font-mono"
              />
            </div>

            <div>
              <span className="text-sm text-muted-foreground mb-2 block">Strategy</span>
              <Select value={strategy} onValueChange={setStrategy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {strategies.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedStrategy && (
                <p className="text-xs text-muted-foreground mt-1">{selectedStrategy.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground mb-2 block">Period</span>
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
              <div>
                <span className="text-sm text-muted-foreground mb-2 block">Initial Capital</span>
                <Input
                  type="number"
                  value={capital}
                  onChange={(e) => setCapital(e.target.value)}
                  placeholder="10000"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Strategy Parameters</CardTitle>
            <CardDescription>Adjust the parameters for your selected strategy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(strategy === 'ma_crossover' || strategy === 'bollinger') && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground mb-2 block">Short Window</span>
                  <Input
                    type="number"
                    value={shortWindow}
                    onChange={(e) => setShortWindow(e.target.value)}
                    placeholder="20"
                  />
                </div>
                <div>
                  <span className="text-sm text-muted-foreground mb-2 block">Long Window</span>
                  <Input
                    type="number"
                    value={longWindow}
                    onChange={(e) => setLongWindow(e.target.value)}
                    placeholder="50"
                  />
                </div>
              </div>
            )}

            {strategy === 'rsi' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground mb-2 block">RSI Oversold</span>
                  <Input
                    type="number"
                    value={rsiOversold}
                    onChange={(e) => setRsiOversold(e.target.value)}
                    placeholder="30"
                  />
                </div>
                <div>
                  <span className="text-sm text-muted-foreground mb-2 block">RSI Overbought</span>
                  <Input
                    type="number"
                    value={rsiOverbought}
                    onChange={(e) => setRsiOverbought(e.target.value)}
                    placeholder="70"
                  />
                </div>
              </div>
            )}

            {strategy === 'buy_hold' && (
              <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Buy & Hold has no parameters. It simply buys at the start and holds until the end.
                  Use this as a benchmark to compare other strategies.
                </p>
              </div>
            )}

            <Button
              onClick={runBacktest}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running Backtest...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Backtest
                </>
              )}
            </Button>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                {error}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Performance Metrics */}
          <MetricGrid>
            <MetricCard
              label="Total Return"
              value={`${result.performance.totalReturn >= 0 ? '+' : ''}${result.performance.totalReturn.toFixed(1)}%`}
              icon={result.performance.totalReturn >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              status={result.performance.totalReturn >= 0 ? 'positive' : 'negative'}
            />
            <MetricCard
              label="Buy & Hold"
              value={`${result.performance.buyholdReturn >= 0 ? '+' : ''}${result.performance.buyholdReturn.toFixed(1)}%`}
              icon={<BarChart3 className="h-4 w-4" />}
              status={result.performance.buyholdReturn >= 0 ? 'positive' : 'negative'}
            />
            <MetricCard
              label="Final Equity"
              value={formatCurrency(result.performance.finalEquity)}
              subValue={`from ${formatCurrency(result.parameters.initialCapital)}`}
              icon={<TrendingUp className="h-4 w-4" />}
              status={result.performance.finalEquity > result.parameters.initialCapital ? 'positive' : 'negative'}
            />
            <MetricCard
              label="Sharpe Ratio"
              value={result.performance.sharpeRatio.toFixed(2)}
              icon={<Target className="h-4 w-4" />}
              status={result.performance.sharpeRatio >= 1 ? 'positive' : result.performance.sharpeRatio >= 0.5 ? 'neutral' : 'warning'}
            />
            <MetricCard
              label="Win Rate"
              value={`${result.performance.winRate.toFixed(0)}%`}
              subValue={`${result.performance.numTrades} trades`}
              icon={<Trophy className="h-4 w-4" />}
              status={result.performance.winRate >= 50 ? 'positive' : 'warning'}
            />
            <MetricCard
              label="Max Drawdown"
              value={`${Math.abs(result.performance.maxDrawdown).toFixed(1)}%`}
              icon={<TrendingDown className="h-4 w-4" />}
              status={Math.abs(result.performance.maxDrawdown) < 20 ? 'neutral' : 'negative'}
            />
            <MetricCard
              label="Profit Factor"
              value={result.performance.profitFactor.toFixed(2)}
              icon={<Activity className="h-4 w-4" />}
              status={result.performance.profitFactor >= 1.5 ? 'positive' : result.performance.profitFactor >= 1 ? 'neutral' : 'negative'}
            />
            <MetricCard
              label="Volatility"
              value={`${result.performance.annualizedVolatility.toFixed(1)}%`}
              icon={<Activity className="h-4 w-4" />}
              status={result.performance.annualizedVolatility < 25 ? 'neutral' : 'warning'}
            />
          </MetricGrid>

          {/* Interpretation */}
          <ResultInterpretation data={getBacktestInterpretation(result)} />

          {/* Charts */}
          <Tabs defaultValue="equity">
            <TabsList>
              <TabsTrigger value="equity">Equity Curve</TabsTrigger>
              <TabsTrigger value="drawdown">Drawdown</TabsTrigger>
              <TabsTrigger value="trades">Trade Log</TabsTrigger>
            </TabsList>

            <TabsContent value="equity" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Equity Curve: Strategy vs Buy & Hold</CardTitle>
                </CardHeader>
                <CardContent>
                  <PlotlyChart
                    data={[
                      {
                        x: result.chartData.dates,
                        y: result.chartData.strategyEquity,
                        type: 'scatter',
                        mode: 'lines',
                        name: 'Strategy',
                        line: { color: chartColors.primary, width: 2 }
                      },
                      {
                        x: result.chartData.dates,
                        y: result.chartData.buyholdEquity,
                        type: 'scatter',
                        mode: 'lines',
                        name: 'Buy & Hold',
                        line: { color: chartColors.secondary, width: 2, dash: 'dot' }
                      }
                    ]}
                    layout={{
                      xaxis: { title: 'Date' },
                      yaxis: { title: 'Equity ($)', tickprefix: '$' },
                      hovermode: 'x unified',
                      legend: { x: 0, y: 1.1, orientation: 'h' }
                    }}
                    config={{ responsive: true }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="drawdown" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Drawdown Chart</CardTitle>
                  <CardDescription>Shows how much the strategy has declined from peak equity</CardDescription>
                </CardHeader>
                <CardContent>
                  <PlotlyChart
                    data={[
                      {
                        x: result.chartData.dates,
                        y: result.chartData.drawdown,
                        type: 'scatter',
                        mode: 'lines',
                        fill: 'tozeroy',
                        name: 'Drawdown',
                        line: { color: chartColors.loss, width: 1 },
                        fillcolor: `${chartColors.loss}30`
                      }
                    ]}
                    layout={{
                      xaxis: { title: 'Date' },
                      yaxis: { title: 'Drawdown (%)', ticksuffix: '%' },
                      hovermode: 'x unified'
                    }}
                    config={{ responsive: true }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trades" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Trade Log</CardTitle>
                  <CardDescription>Last 20 trades executed by the strategy</CardDescription>
                </CardHeader>
                <CardContent>
                  {result.trades.length > 0 ? (
                    <DataTable
                      data={result.trades}
                      columns={tradeColumns}
                      compact
                      stickyHeader
                    />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No completed trades in this period
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
