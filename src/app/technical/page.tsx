"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MetricCard, MetricGrid } from "@/components/ui/metric-card";
import { PlotlyChart, chartColors } from "@/components/charts";
import { ResultInterpretation, type InterpretationData } from "@/components/ui/result-interpretation";
import { trackCalculation } from "@/lib/analytics";
import { formatCurrency, formatPercent } from "@/lib/utils/formatters";
import {
  Activity,
  Search,
  Loader2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Gauge,
  ArrowUpCircle,
  ArrowDownCircle,
  MinusCircle
} from "lucide-react";

interface Signal {
  indicator: string;
  signal: string;
  value: string | number;
}

interface TechnicalResult {
  ticker: string;
  period: string;
  signals: Signal[];
  current: {
    price: number;
    change: number;
    changePercent: number;
    sma20: number | null;
    sma50: number | null;
    rsi: number | null;
    macd: number | null;
    macdSignal: number | null;
    bbUpper: number | null;
    bbLower: number | null;
    atr: number | null;
    volumeRatio: number | null;
  };
  chartData: {
    dates: string[];
    ohlc: { open: number[]; high: number[]; low: number[]; close: number[] };
    volume: number[];
    indicators: {
      sma20: number[];
      sma50: number[];
      ema12: number[];
      ema26: number[];
      rsi: number[];
      macd: number[];
      macdSignal: number[];
      macdHistogram: number[];
      bbUpper: number[];
      bbMiddle: number[];
      bbLower: number[];
      stochK: number[];
      stochD: number[];
      atr: number[];
    };
  };
  timestamp: string;
  error?: string;
}

function getTechnicalInterpretation(result: TechnicalResult): InterpretationData {
  const { current, signals } = result;

  // Count bullish vs bearish signals
  const bullishSignals = signals.filter(s =>
    s.signal.includes('BULLISH') || s.signal === 'OVERSOLD'
  );
  const bearishSignals = signals.filter(s =>
    s.signal.includes('BEARISH') || s.signal === 'OVERBOUGHT'
  );

  let status: InterpretationData["status"] = "neutral";
  let sentiment = "mixed";

  if (bullishSignals.length > bearishSignals.length) {
    status = "positive";
    sentiment = "bullish";
  } else if (bearishSignals.length > bullishSignals.length) {
    status = "negative";
    sentiment = "bearish";
  }

  const points: string[] = [];

  // RSI interpretation
  if (current.rsi !== null) {
    if (current.rsi > 70) {
      points.push(`RSI at ${current.rsi.toFixed(1)} - OVERBOUGHT territory. Potential pullback ahead.`);
    } else if (current.rsi < 30) {
      points.push(`RSI at ${current.rsi.toFixed(1)} - OVERSOLD territory. Potential bounce ahead.`);
    } else {
      points.push(`RSI at ${current.rsi.toFixed(1)} - Neutral momentum range.`);
    }
  }

  // MACD interpretation
  if (current.macd !== null && current.macdSignal !== null) {
    if (current.macd > current.macdSignal) {
      points.push(`MACD (${current.macd.toFixed(4)}) above signal line - Bullish momentum.`);
    } else {
      points.push(`MACD (${current.macd.toFixed(4)}) below signal line - Bearish momentum.`);
    }
  }

  // Moving averages
  if (current.sma20 !== null && current.sma50 !== null) {
    if (current.sma20 > current.sma50) {
      points.push(`SMA20 ($${current.sma20}) above SMA50 ($${current.sma50}) - Short-term uptrend.`);
    } else {
      points.push(`SMA20 ($${current.sma20}) below SMA50 ($${current.sma50}) - Short-term downtrend.`);
    }
  }

  // Bollinger Bands
  if (current.bbUpper !== null && current.bbLower !== null) {
    if (current.price > current.bbUpper) {
      points.push(`Price above upper Bollinger Band ($${current.bbUpper}) - Potentially overextended.`);
    } else if (current.price < current.bbLower) {
      points.push(`Price below lower Bollinger Band ($${current.bbLower}) - Potentially oversold.`);
    } else {
      points.push(`Price within Bollinger Bands ($${current.bbLower} - $${current.bbUpper}).`);
    }
  }

  // Volume
  if (current.volumeRatio !== null) {
    if (current.volumeRatio > 1.5) {
      points.push(`Volume ${current.volumeRatio.toFixed(1)}x above average - High interest.`);
    } else if (current.volumeRatio < 0.5) {
      points.push(`Volume ${current.volumeRatio.toFixed(1)}x below average - Low conviction.`);
    }
  }

  let advice: string;
  if (status === "positive") {
    advice = "Technical indicators lean bullish. Consider long entries on pullbacks to support levels.";
  } else if (status === "negative") {
    advice = "Technical indicators lean bearish. Consider short entries on rallies to resistance or staying defensive.";
  } else {
    advice = "Mixed signals suggest consolidation. Wait for clearer direction before taking positions.";
  }

  return {
    status,
    summary: `${result.ticker} shows ${sentiment} technical signals with RSI at ${current.rsi?.toFixed(1) || 'N/A'}.`,
    points,
    advice,
  };
}

export default function TechnicalAnalysisPage() {
  const [ticker, setTicker] = useState("AAPL");
  const [period, setPeriod] = useState("6mo");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TechnicalResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTechnicalAnalysis = async () => {
    setLoading(true);
    setError(null);
    const startTime = performance.now();

    const inputParams = { ticker, period };

    try {
      const response = await fetch(`/api/market-analysis?action=technical&ticker=${ticker}&period=${period}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
      trackCalculation('technical', inputParams, data, Math.round(performance.now() - startTime));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to fetch technical analysis";
      setError(errorMsg);
      trackCalculation('technical', inputParams, { error: errorMsg }, Math.round(performance.now() - startTime));
    } finally {
      setLoading(false);
    }
  };

  // Price chart with moving averages
  const priceChartData = result ? [
    {
      x: result.chartData.dates,
      open: result.chartData.ohlc.open,
      high: result.chartData.ohlc.high,
      low: result.chartData.ohlc.low,
      close: result.chartData.ohlc.close,
      type: 'candlestick' as const,
      name: 'Price',
      increasing: { line: { color: chartColors.profit } },
      decreasing: { line: { color: chartColors.loss } },
    },
    {
      x: result.chartData.dates,
      y: result.chartData.indicators.sma20,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'SMA 20',
      line: { color: '#3b82f6', width: 1 },
    },
    {
      x: result.chartData.dates,
      y: result.chartData.indicators.sma50,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'SMA 50',
      line: { color: '#f59e0b', width: 1 },
    },
    {
      x: result.chartData.dates,
      y: result.chartData.indicators.bbUpper,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'BB Upper',
      line: { color: '#8b5cf6', width: 1, dash: 'dot' },
    },
    {
      x: result.chartData.dates,
      y: result.chartData.indicators.bbLower,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'BB Lower',
      line: { color: '#8b5cf6', width: 1, dash: 'dot' },
      fill: 'tonexty',
      fillcolor: 'rgba(139, 92, 246, 0.1)',
    },
  ] : [];

  // RSI chart
  const rsiChartData = result ? [
    {
      x: result.chartData.dates,
      y: result.chartData.indicators.rsi,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'RSI',
      line: { color: chartColors.primary, width: 2 },
      fill: 'tozeroy',
      fillcolor: 'rgba(34, 197, 94, 0.1)',
    },
    {
      x: result.chartData.dates,
      y: Array(result.chartData.dates.length).fill(70),
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Overbought',
      line: { color: chartColors.loss, width: 1, dash: 'dash' },
    },
    {
      x: result.chartData.dates,
      y: Array(result.chartData.dates.length).fill(30),
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Oversold',
      line: { color: chartColors.profit, width: 1, dash: 'dash' },
    },
  ] : [];

  // MACD chart
  const macdChartData = result ? [
    {
      x: result.chartData.dates,
      y: result.chartData.indicators.macd,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'MACD',
      line: { color: '#3b82f6', width: 2 },
    },
    {
      x: result.chartData.dates,
      y: result.chartData.indicators.macdSignal,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Signal',
      line: { color: '#f59e0b', width: 2 },
    },
    {
      x: result.chartData.dates,
      y: result.chartData.indicators.macdHistogram,
      type: 'bar' as const,
      name: 'Histogram',
      marker: {
        color: result.chartData.indicators.macdHistogram.map(v => v >= 0 ? chartColors.profit : chartColors.loss),
      },
    },
  ] : [];

  const getSignalIcon = (signal: string) => {
    if (signal.includes('BULLISH') || signal === 'OVERSOLD') {
      return <ArrowUpCircle className="w-4 h-4 text-green-500" />;
    } else if (signal.includes('BEARISH') || signal === 'OVERBOUGHT') {
      return <ArrowDownCircle className="w-4 h-4 text-red-500" />;
    }
    return <MinusCircle className="w-4 h-4 text-zinc-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            Technical Analysis
          </h1>
          <p className="text-muted-foreground mt-1">
            RSI, MACD, Bollinger Bands, Moving Averages, and trading signals
          </p>
        </div>
      </div>

      {/* Input Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-[150px] max-w-xs">
              <label className="text-sm font-medium mb-2 block">Ticker Symbol</label>
              <Input
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="AAPL"
                className="font-mono"
              />
            </div>
            <div className="w-40">
              <label className="text-sm font-medium mb-2 block">Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="1mo">1 Month</option>
                <option value="3mo">3 Months</option>
                <option value="6mo">6 Months</option>
                <option value="1y">1 Year</option>
                <option value="2y">2 Years</option>
              </select>
            </div>
            <Button onClick={fetchTechnicalAnalysis} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Analyze
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-500/50 bg-red-500/10">
          <CardContent className="pt-6">
            <p className="text-red-500">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          {/* Quick Stats */}
          <MetricGrid columns={6}>
            <MetricCard
              label="Price"
              value={formatCurrency(result.current.price)}
              change={result.current.changePercent}
              changeLabel="%"
              status={result.current.changePercent > 0 ? "positive" : result.current.changePercent < 0 ? "negative" : "neutral"}
            />
            <MetricCard
              label="RSI (14)"
              value={result.current.rsi?.toFixed(1) || "N/A"}
              icon={<Gauge className="w-4 h-4" />}
              status={
                result.current.rsi && result.current.rsi > 70 ? "negative" :
                  result.current.rsi && result.current.rsi < 30 ? "positive" : "neutral"
              }
            />
            <MetricCard
              label="MACD"
              value={result.current.macd?.toFixed(4) || "N/A"}
              status={
                result.current.macd && result.current.macdSignal &&
                  result.current.macd > result.current.macdSignal ? "positive" : "negative"
              }
            />
            <MetricCard
              label="SMA 20"
              value={result.current.sma20 ? formatCurrency(result.current.sma20) : "N/A"}
              status={result.current.price > (result.current.sma20 || 0) ? "positive" : "negative"}
            />
            <MetricCard
              label="SMA 50"
              value={result.current.sma50 ? formatCurrency(result.current.sma50) : "N/A"}
              status={result.current.price > (result.current.sma50 || 0) ? "positive" : "negative"}
            />
            <MetricCard
              label="ATR (14)"
              value={result.current.atr ? formatCurrency(result.current.atr) : "N/A"}
              subValue="Volatility"
              icon={<BarChart3 className="w-4 h-4" />}
              status="neutral"
            />
          </MetricGrid>

          {/* Signals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Trading Signals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {result.signals.map((signal, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700"
                  >
                    {getSignalIcon(signal.signal)}
                    <div>
                      <div className="text-sm font-medium">{signal.indicator}</div>
                      <div className="text-xs text-zinc-400">{signal.signal}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Interpretation */}
          <ResultInterpretation data={getTechnicalInterpretation(result)} />

          {/* Charts */}
          <Tabs defaultValue="price">
            <TabsList>
              <TabsTrigger value="price">Price & MAs</TabsTrigger>
              <TabsTrigger value="rsi">RSI</TabsTrigger>
              <TabsTrigger value="macd">MACD</TabsTrigger>
            </TabsList>

            <TabsContent value="price" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Price Chart with Moving Averages & Bollinger Bands</CardTitle>
                </CardHeader>
                <CardContent>
                  <PlotlyChart
                    data={priceChartData}
                    layout={{
                      height: 500,
                      xaxis: { title: 'Date', rangeslider: { visible: false } },
                      yaxis: { title: 'Price ($)' },
                      legend: { orientation: 'h', y: -0.2 },
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rsi" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Relative Strength Index (RSI)</CardTitle>
                  <CardDescription>
                    Above 70 = Overbought, Below 30 = Oversold
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PlotlyChart
                    data={rsiChartData}
                    layout={{
                      height: 300,
                      xaxis: { title: 'Date' },
                      yaxis: { title: 'RSI', range: [0, 100] },
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="macd" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>MACD (Moving Average Convergence Divergence)</CardTitle>
                  <CardDescription>
                    MACD crossing above signal = Bullish, below = Bearish
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PlotlyChart
                    data={macdChartData}
                    layout={{
                      height: 300,
                      xaxis: { title: 'Date' },
                      yaxis: { title: 'MACD' },
                      barmode: 'relative',
                    }}
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
