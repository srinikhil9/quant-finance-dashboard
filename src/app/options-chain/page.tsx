"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable, formatTableNumber, formatTablePercent } from "@/components/ui/data-table";
import { MetricCard, MetricGrid } from "@/components/ui/metric-card";
import { PlotlyChart, chartColors } from "@/components/charts";
import { ResultInterpretation, type InterpretationData } from "@/components/ui/result-interpretation";
import { trackCalculation } from "@/lib/analytics";
import { formatCurrency } from "@/lib/utils/formatters";
import {
  BarChart3,
  Search,
  Loader2,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Calendar
} from "lucide-react";

interface OptionData {
  strike: number;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  openInterest: number;
  iv: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  [key: string]: unknown;
}

interface ChainData {
  expiration: string;
  daysToExpiration: number;
  calls: OptionData[];
  puts: OptionData[];
}

interface OptionsChainResult {
  ticker: string;
  currentPrice: number;
  expirations: string[];
  chains: ChainData[];
  ivSurface: Array<{ strike: number; expiration: number; iv: number; type: string }>;
  timestamp: string;
  error?: string;
}

function getOptionsInterpretation(result: OptionsChainResult): InterpretationData {
  const chain = result.chains[0];
  if (!chain) {
    return {
      status: "neutral",
      summary: "No options data available",
      points: [],
      advice: "Try a different ticker or check if the market is open."
    };
  }

  // Find ATM options (closest to current price)
  const atmCall = chain.calls.reduce((prev, curr) =>
    Math.abs(curr.strike - result.currentPrice) < Math.abs(prev.strike - result.currentPrice) ? curr : prev
  );
  const atmPut = chain.puts.reduce((prev, curr) =>
    Math.abs(curr.strike - result.currentPrice) < Math.abs(prev.strike - result.currentPrice) ? curr : prev
  );

  // Calculate put/call ratio
  const totalCallOI = chain.calls.reduce((sum, c) => sum + c.openInterest, 0);
  const totalPutOI = chain.puts.reduce((sum, p) => sum + p.openInterest, 0);
  const pcRatio = totalPutOI / (totalCallOI || 1);

  // Determine market sentiment
  let status: InterpretationData["status"] = "neutral";
  let sentiment = "neutral";
  if (pcRatio > 1.2) {
    status = "negative";
    sentiment = "bearish";
  } else if (pcRatio < 0.8) {
    status = "positive";
    sentiment = "bullish";
  }

  const points = [
    `ATM Call IV: ${atmCall.iv.toFixed(1)}% | ATM Put IV: ${atmPut.iv.toFixed(1)}%`,
    `Put/Call Ratio: ${pcRatio.toFixed(2)} (${pcRatio > 1 ? 'More puts than calls - hedging activity' : 'More calls than puts - bullish sentiment'})`,
    `Total Call Open Interest: ${totalCallOI.toLocaleString()} contracts`,
    `Total Put Open Interest: ${totalPutOI.toLocaleString()} contracts`,
    `Days to nearest expiration: ${chain.daysToExpiration}`,
  ];

  // Check for IV skew
  const otmPuts = chain.puts.filter(p => p.strike < result.currentPrice * 0.95);
  const otmCalls = chain.calls.filter(c => c.strike > result.currentPrice * 1.05);
  const avgOtmPutIV = otmPuts.length > 0 ? otmPuts.reduce((s, p) => s + p.iv, 0) / otmPuts.length : 0;
  const avgOtmCallIV = otmCalls.length > 0 ? otmCalls.reduce((s, c) => s + c.iv, 0) / otmCalls.length : 0;

  if (avgOtmPutIV > avgOtmCallIV * 1.2) {
    points.push(`IV Skew: OTM puts trading at higher IV (${avgOtmPutIV.toFixed(1)}%) than OTM calls (${avgOtmCallIV.toFixed(1)}%) - fear premium present`);
  }

  let advice: string;
  if (atmCall.iv > 50) {
    advice = "High implied volatility - options are expensive. Consider selling premium strategies (iron condors, credit spreads).";
  } else if (atmCall.iv < 20) {
    advice = "Low implied volatility - options are cheap. Consider buying strategies (straddles, strangles) if you expect movement.";
  } else {
    advice = `Moderate IV environment. Market sentiment appears ${sentiment}. Consider directional strategies aligned with the put/call ratio signal.`;
  }

  return {
    status,
    summary: `${result.ticker} options show ${sentiment} sentiment with ${atmCall.iv.toFixed(1)}% ATM implied volatility.`,
    points,
    advice,
  };
}

export default function OptionsChainPage() {
  const [ticker, setTicker] = useState("AAPL");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptionsChainResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedExpiration, setSelectedExpiration] = useState<string | null>(null);

  const fetchOptionsChain = async () => {
    setLoading(true);
    setError(null);
    const startTime = performance.now();

    const inputParams = { ticker };

    try {
      const response = await fetch(`/api/market-analysis?action=options-chain&ticker=${ticker}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
      setSelectedExpiration(data.expirations[0] || null);

      // Track successful calculation
      trackCalculation('options-chain', inputParams, data, Math.round(performance.now() - startTime));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to fetch options chain";
      setError(errorMsg);
      trackCalculation('options-chain', inputParams, { error: errorMsg }, Math.round(performance.now() - startTime));
    } finally {
      setLoading(false);
    }
  };

  const selectedChain = result?.chains.find(c => c.expiration === selectedExpiration);

  const optionsColumns = [
    { key: 'strike', header: 'Strike', align: 'right' as const, sortable: true },
    {
      key: 'bid',
      header: 'Bid',
      align: 'right' as const,
      render: (v: unknown) => formatTableNumber(v as number, { decimals: 2, prefix: '$' })
    },
    {
      key: 'ask',
      header: 'Ask',
      align: 'right' as const,
      render: (v: unknown) => formatTableNumber(v as number, { decimals: 2, prefix: '$' })
    },
    {
      key: 'last',
      header: 'Last',
      align: 'right' as const,
      render: (v: unknown) => formatTableNumber(v as number, { decimals: 2, prefix: '$' })
    },
    { key: 'volume', header: 'Vol', align: 'right' as const, sortable: true },
    { key: 'openInterest', header: 'OI', align: 'right' as const, sortable: true },
    {
      key: 'iv',
      header: 'IV%',
      align: 'right' as const,
      sortable: true,
      render: (v: unknown) => formatTablePercent(v as number, false)
    },
    {
      key: 'delta',
      header: 'Delta',
      align: 'right' as const,
      render: (v: unknown) => formatTableNumber(v as number, { decimals: 3 })
    },
    {
      key: 'gamma',
      header: 'Gamma',
      align: 'right' as const,
      render: (v: unknown) => formatTableNumber(v as number, { decimals: 4 })
    },
    {
      key: 'theta',
      header: 'Theta',
      align: 'right' as const,
      render: (v: unknown) => formatTableNumber(v as number, { decimals: 3, colorCode: true })
    },
  ];

  // IV Surface chart data
  const ivSurfaceData = result?.ivSurface ? [
    {
      x: result.ivSurface.filter(d => d.type === 'call').map(d => d.strike),
      y: result.ivSurface.filter(d => d.type === 'call').map(d => d.expiration),
      z: result.ivSurface.filter(d => d.type === 'call').map(d => d.iv),
      type: 'scatter3d' as const,
      mode: 'markers' as const,
      name: 'Calls IV',
      marker: { color: chartColors.profit, size: 4 },
    },
    {
      x: result.ivSurface.filter(d => d.type === 'put').map(d => d.strike),
      y: result.ivSurface.filter(d => d.type === 'put').map(d => d.expiration),
      z: result.ivSurface.filter(d => d.type === 'put').map(d => d.iv),
      type: 'scatter3d' as const,
      mode: 'markers' as const,
      name: 'Puts IV',
      marker: { color: chartColors.loss, size: 4 },
    }
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Options Chain Analysis
          </h1>
          <p className="text-muted-foreground mt-1">
            Full options chains with Greeks, IV surface, and market sentiment analysis
          </p>
        </div>
      </div>

      {/* Input Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1 max-w-xs">
              <label className="text-sm font-medium mb-2 block">Ticker Symbol</label>
              <Input
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="AAPL"
                className="font-mono"
              />
            </div>
            <Button onClick={fetchOptionsChain} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Fetch Options Chain
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
          <MetricGrid columns={5}>
            <MetricCard
              label="Current Price"
              value={formatCurrency(result.currentPrice)}
              icon={<Target className="w-4 h-4" />}
              status="neutral"
            />
            <MetricCard
              label="Expirations"
              value={result.expirations.length}
              subValue="Available dates"
              icon={<Calendar className="w-4 h-4" />}
              status="neutral"
            />
            {selectedChain && (
              <>
                <MetricCard
                  label="Call Contracts"
                  value={selectedChain.calls.length}
                  icon={<TrendingUp className="w-4 h-4" />}
                  status="positive"
                />
                <MetricCard
                  label="Put Contracts"
                  value={selectedChain.puts.length}
                  icon={<TrendingDown className="w-4 h-4" />}
                  status="negative"
                />
                <MetricCard
                  label="Days to Exp"
                  value={selectedChain.daysToExpiration}
                  icon={<Activity className="w-4 h-4" />}
                  status={selectedChain.daysToExpiration < 7 ? "warning" : "neutral"}
                />
              </>
            )}
          </MetricGrid>

          {/* Interpretation */}
          <ResultInterpretation data={getOptionsInterpretation(result)} />

          {/* Expiration Selection */}
          {result.expirations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Select Expiration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.expirations.slice(0, 5).map((exp) => (
                    <Button
                      key={exp}
                      variant={selectedExpiration === exp ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedExpiration(exp)}
                    >
                      {exp}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Options Chain Tables */}
          {selectedChain && (
            <Tabs defaultValue="calls">
              <TabsList>
                <TabsTrigger value="calls">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Calls ({selectedChain.calls.length})
                </TabsTrigger>
                <TabsTrigger value="puts">
                  <TrendingDown className="w-4 h-4 mr-1" />
                  Puts ({selectedChain.puts.length})
                </TabsTrigger>
                <TabsTrigger value="iv-surface">
                  <Activity className="w-4 h-4 mr-1" />
                  IV Surface
                </TabsTrigger>
              </TabsList>

              <TabsContent value="calls" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Call Options - {selectedExpiration}</CardTitle>
                    <CardDescription>
                      Sorted by strike price. Current stock price: {formatCurrency(result.currentPrice)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DataTable
                      data={selectedChain.calls}
                      columns={optionsColumns}
                      compact
                      stickyHeader
                      maxHeight="400px"
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="puts" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Put Options - {selectedExpiration}</CardTitle>
                    <CardDescription>
                      Sorted by strike price. Current stock price: {formatCurrency(result.currentPrice)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DataTable
                      data={selectedChain.puts}
                      columns={optionsColumns}
                      compact
                      stickyHeader
                      maxHeight="400px"
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="iv-surface" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Implied Volatility Surface</CardTitle>
                    <CardDescription>
                      3D visualization of IV across strikes and expirations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PlotlyChart
                      data={ivSurfaceData}
                      layout={{
                        scene: {
                          xaxis: { title: 'Strike Price' },
                          yaxis: { title: 'Days to Expiration' },
                          zaxis: { title: 'Implied Volatility (%)' },
                        },
                        height: 500,
                      }}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </>
      )}
    </div>
  );
}
