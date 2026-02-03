"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { MetricCard, MetricGrid } from "@/components/ui/metric-card";
import { PlotlyChart, chartColors } from "@/components/charts";
import { supabase } from "@/lib/supabase/client";
import {
  BarChart3,
  Users,
  Activity,
  TrendingUp,
  Clock,
  Target,
  RefreshCw,
  AlertTriangle,
  Database,
  Globe,
  MapPin,
  Monitor,
  Route
} from "lucide-react";

interface CalculationRecord {
  id: string;
  session_id: string;
  module: string;
  input_params: Record<string, unknown>;
  results: Record<string, unknown> | null;
  execution_time_ms: number;
  created_at: string;
  ip_address?: string;
  country?: string;
  city?: string;
  [key: string]: unknown;
}

interface SessionRecord {
  id: string;
  session_id: string;
  first_seen: string;
  last_seen: string;
  ip_address?: string;
  country?: string;
  country_code?: string;
  city?: string;
  region?: string;
  isp?: string;
  browser?: string;
  os?: string;
  device_type?: string;
  total_pageviews?: number;
  total_calculations?: number;
  modules_used?: string[];
  tickers_analyzed?: string[];
  landing_page?: string;
  last_page?: string;
  session_duration_seconds?: number;
  [key: string]: unknown;
}

interface ModuleStats {
  module: string;
  count: number;
}

interface TickerStats {
  ticker: string;
  count: number;
}

interface DailyStats {
  date: string;
  count: number;
  uniqueSessions: number;
}

interface CountryStats {
  country: string;
  countryCode: string;
  count: number;
}

interface CityStats {
  city: string;
  country: string;
  count: number;
}

interface DeviceStats {
  type: string;
  count: number;
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calculations, setCalculations] = useState<CalculationRecord[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [moduleStats, setModuleStats] = useState<ModuleStats[]>([]);
  const [tickerStats, setTickerStats] = useState<TickerStats[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [countryStats, setCountryStats] = useState<CountryStats[]>([]);
  const [cityStats, setCityStats] = useState<CityStats[]>([]);
  const [deviceStats, setDeviceStats] = useState<DeviceStats[]>([]);
  const [totalCalculations, setTotalCalculations] = useState(0);
  const [uniqueSessions, setUniqueSessions] = useState(0);
  const [avgExecutionTime, setAvgExecutionTime] = useState(0);
  const [totalCountries, setTotalCountries] = useState(0);

  const fetchAnalytics = async () => {
    if (!supabase) {
      setError("Supabase not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to Vercel environment variables.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch recent calculations
      const { data: calcData, error: calcError } = await supabase
        .from('calculations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (calcError) throw calcError;
      setCalculations(calcData || []);

      // Fetch sessions data
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .order('last_seen', { ascending: false })
        .limit(100);

      if (!sessionError && sessionData) {
        setSessions(sessionData);

        // Calculate country stats from sessions
        const countryCounts: Record<string, { count: number; code: string }> = {};
        sessionData.forEach(s => {
          if (s.country) {
            if (!countryCounts[s.country]) {
              countryCounts[s.country] = { count: 0, code: s.country_code || '' };
            }
            countryCounts[s.country].count++;
          }
        });
        const countryStatsArr = Object.entries(countryCounts)
          .map(([country, data]) => ({
            country,
            countryCode: data.code,
            count: data.count
          }))
          .sort((a, b) => b.count - a.count);
        setCountryStats(countryStatsArr);
        setTotalCountries(countryStatsArr.length);

        // Calculate city stats
        const cityCounts: Record<string, { count: number; country: string }> = {};
        sessionData.forEach(s => {
          if (s.city) {
            const key = `${s.city}, ${s.country || 'Unknown'}`;
            if (!cityCounts[key]) {
              cityCounts[key] = { count: 0, country: s.country || 'Unknown' };
            }
            cityCounts[key].count++;
          }
        });
        const cityStatsArr = Object.entries(cityCounts)
          .map(([city, data]) => ({
            city: city.split(', ')[0],
            country: data.country,
            count: data.count
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        setCityStats(cityStatsArr);

        // Calculate device stats
        const deviceCounts: Record<string, number> = {};
        sessionData.forEach(s => {
          const type = s.device_type || 'unknown';
          deviceCounts[type] = (deviceCounts[type] || 0) + 1;
        });
        const deviceStatsArr = Object.entries(deviceCounts)
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count);
        setDeviceStats(deviceStatsArr);
      }

      // Calculate stats from fetched data
      if (calcData && calcData.length > 0) {
        // Total calculations
        setTotalCalculations(calcData.length);

        // Unique sessions
        const sessionsSet = new Set(calcData.map(c => c.session_id));
        setUniqueSessions(sessionsSet.size);

        // Average execution time
        const avgTime = calcData.reduce((sum, c) => sum + (c.execution_time_ms || 0), 0) / calcData.length;
        setAvgExecutionTime(Math.round(avgTime));

        // Module stats
        const moduleCounts: Record<string, number> = {};
        calcData.forEach(c => {
          moduleCounts[c.module] = (moduleCounts[c.module] || 0) + 1;
        });
        const moduleStatsArr = Object.entries(moduleCounts)
          .map(([module, count]) => ({ module, count }))
          .sort((a, b) => b.count - a.count);
        setModuleStats(moduleStatsArr);

        // Ticker stats
        const tickerCounts: Record<string, number> = {};
        calcData.forEach(c => {
          const ticker = (c.input_params as Record<string, unknown>)?.ticker as string;
          if (ticker) {
            tickerCounts[ticker] = (tickerCounts[ticker] || 0) + 1;
          }
        });
        const tickerStatsArr = Object.entries(tickerCounts)
          .map(([ticker, count]) => ({ ticker, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        setTickerStats(tickerStatsArr);

        // Daily stats
        const dailyCounts: Record<string, { count: number; sessions: Set<string> }> = {};
        calcData.forEach(c => {
          const date = c.created_at.split('T')[0];
          if (!dailyCounts[date]) {
            dailyCounts[date] = { count: 0, sessions: new Set() };
          }
          dailyCounts[date].count++;
          dailyCounts[date].sessions.add(c.session_id);
        });
        const dailyStatsArr = Object.entries(dailyCounts)
          .map(([date, data]) => ({
            date,
            count: data.count,
            uniqueSessions: data.sessions.size
          }))
          .sort((a, b) => a.date.localeCompare(b.date));
        setDailyStats(dailyStatsArr);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Table columns for calculations
  const calcColumns = [
    { key: 'created_at' as const, header: 'Time', sortable: true, render: (v: unknown) => {
      const date = new Date(v as string);
      return date.toLocaleString();
    }},
    { key: 'module' as const, header: 'Module', sortable: true },
    { key: 'session_id' as const, header: 'Session', sortable: true, render: (v: unknown) => (v as string).slice(0, 8) + '...' },
    { key: 'country' as const, header: 'Country', sortable: true, render: (v: unknown) => (v as string) || '-' },
    { key: 'input_params' as const, header: 'Ticker', sortable: false, render: (v: unknown) => {
      const params = v as Record<string, unknown>;
      return (params?.ticker as string) || (params?.tickers as string) || '-';
    }},
    { key: 'execution_time_ms' as const, header: 'Time (ms)', sortable: true, render: (v: unknown) => `${v}ms` }
  ];

  // Table columns for sessions
  const sessionColumns = [
    { key: 'last_seen' as const, header: 'Last Active', sortable: true, render: (v: unknown) => {
      const date = new Date(v as string);
      return date.toLocaleString();
    }},
    { key: 'session_id' as const, header: 'Session', sortable: true, render: (v: unknown) => (v as string).slice(0, 8) + '...' },
    { key: 'ip_address' as const, header: 'IP', sortable: true, render: (v: unknown) => (v as string) || '-' },
    { key: 'country' as const, header: 'Location', sortable: true, render: (v: unknown, row: unknown) => {
      const r = row as SessionRecord;
      if (r.city && r.country) return `${r.city}, ${r.country}`;
      return (v as string) || '-';
    }},
    { key: 'device_type' as const, header: 'Device', sortable: true, render: (v: unknown) => (v as string) || '-' },
    { key: 'browser' as const, header: 'Browser', sortable: true, render: (v: unknown) => (v as string) || '-' },
    { key: 'total_pageviews' as const, header: 'Pages', sortable: true, render: (v: unknown) => String(v || 0) },
    { key: 'modules_used' as const, header: 'Modules', sortable: false, render: (v: unknown) => {
      const modules = v as string[] | undefined;
      return modules?.length || 0;
    }},
    { key: 'session_duration_seconds' as const, header: 'Duration', sortable: true, render: (v: unknown) => {
      const seconds = v as number;
      if (!seconds) return '-';
      if (seconds < 60) return `${seconds}s`;
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
      return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    }}
  ];

  if (!supabase) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Database className="h-8 w-8 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            View analytics and user calculation patterns
          </p>
        </div>

        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-yellow-500 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-yellow-500">Supabase Not Connected</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  To view analytics, you need to connect Supabase:
                </p>
                <ol className="list-decimal list-inside text-sm text-muted-foreground mt-2 space-y-1">
                  <li>Create a free Supabase project at <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">supabase.com</a></li>
                  <li>Run the SQL schema from <code className="bg-secondary px-1 rounded">supabase-schema.sql</code></li>
                  <li>Run enhanced schema from <code className="bg-secondary px-1 rounded">supabase-schema-v2.sql</code></li>
                  <li>Add environment variables to Vercel:
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li><code className="bg-secondary px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code></li>
                      <li><code className="bg-secondary px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>
                    </ul>
                  </li>
                  <li>Redeploy the project</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Database className="h-8 w-8 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            View analytics, user sessions, and geographic distribution
          </p>
        </div>
        <Button onClick={fetchAnalytics} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-red-500/50 bg-red-500/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Metrics */}
      <MetricGrid>
        <MetricCard
          label="Total Calculations"
          value={totalCalculations.toLocaleString()}
          icon={<BarChart3 className="h-4 w-4" />}
          status="neutral"
        />
        <MetricCard
          label="Unique Sessions"
          value={uniqueSessions.toLocaleString()}
          icon={<Users className="h-4 w-4" />}
          status="neutral"
        />
        <MetricCard
          label="Countries"
          value={totalCountries.toLocaleString()}
          icon={<Globe className="h-4 w-4" />}
          status="neutral"
        />
        <MetricCard
          label="Avg Execution Time"
          value={`${avgExecutionTime}ms`}
          icon={<Clock className="h-4 w-4" />}
          status={avgExecutionTime < 5000 ? 'positive' : 'warning'}
        />
      </MetricGrid>

      {/* Charts & Tables */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="geography">
            <Globe className="h-4 w-4 mr-1" />
            Geography
          </TabsTrigger>
          <TabsTrigger value="sessions">
            <Users className="h-4 w-4 mr-1" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="modules">By Module</TabsTrigger>
          <TabsTrigger value="tickers">By Ticker</TabsTrigger>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Calculations Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                {dailyStats.length > 0 ? (
                  <PlotlyChart
                    data={[
                      {
                        x: dailyStats.map(d => d.date),
                        y: dailyStats.map(d => d.count),
                        type: 'bar',
                        name: 'Calculations',
                        marker: { color: chartColors.primary }
                      }
                    ]}
                    layout={{
                      xaxis: { title: 'Date' },
                      yaxis: { title: 'Calculations' },
                      margin: { t: 20 }
                    }}
                    config={{ responsive: true }}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No data available yet
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Unique Sessions Per Day</CardTitle>
              </CardHeader>
              <CardContent>
                {dailyStats.length > 0 ? (
                  <PlotlyChart
                    data={[
                      {
                        x: dailyStats.map(d => d.date),
                        y: dailyStats.map(d => d.uniqueSessions),
                        type: 'scatter',
                        mode: 'lines+markers',
                        name: 'Users',
                        line: { color: chartColors.secondary, width: 2 },
                        marker: { size: 8 }
                      }
                    ]}
                    layout={{
                      xaxis: { title: 'Date' },
                      yaxis: { title: 'Unique Sessions' },
                      margin: { t: 20 }
                    }}
                    config={{ responsive: true }}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No data available yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="geography" className="mt-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Visitors by Country
                </CardTitle>
                <CardDescription>Geographic distribution of users</CardDescription>
              </CardHeader>
              <CardContent>
                {countryStats.length > 0 ? (
                  <PlotlyChart
                    data={[
                      {
                        type: 'choropleth',
                        locationmode: 'country names',
                        locations: countryStats.map(c => c.country),
                        z: countryStats.map(c => c.count),
                        colorscale: [
                          [0, '#1e293b'],
                          [0.5, '#3b82f6'],
                          [1, '#22d3ee']
                        ],
                        colorbar: {
                          title: 'Visitors',
                          thickness: 15
                        }
                      }
                    ]}
                    layout={{
                      geo: {
                        showframe: false,
                        showcoastlines: true,
                        projection: { type: 'natural earth' },
                        bgcolor: 'rgba(0,0,0,0)',
                        landcolor: '#1e293b',
                        coastlinecolor: '#475569'
                      },
                      margin: { t: 10, b: 10, l: 10, r: 10 },
                      paper_bgcolor: 'rgba(0,0,0,0)',
                      plot_bgcolor: 'rgba(0,0,0,0)'
                    }}
                    config={{ responsive: true }}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No geographic data available yet
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Top Countries
                </CardTitle>
              </CardHeader>
              <CardContent>
                {countryStats.length > 0 ? (
                  <PlotlyChart
                    data={[
                      {
                        x: countryStats.slice(0, 10).map(c => c.count),
                        y: countryStats.slice(0, 10).map(c => c.country),
                        type: 'bar',
                        orientation: 'h',
                        marker: {
                          color: countryStats.slice(0, 10).map((_, i) =>
                            [chartColors.primary, chartColors.secondary, chartColors.profit, chartColors.warning, chartColors.purple, chartColors.cyan][i % 6]
                          )
                        },
                        text: countryStats.slice(0, 10).map(c => c.count.toString()),
                        textposition: 'outside'
                      }
                    ]}
                    layout={{
                      xaxis: { title: 'Visitors' },
                      yaxis: { title: '', automargin: true },
                      margin: { l: 100, t: 20, r: 50 }
                    }}
                    config={{ responsive: true }}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No country data available yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Top Cities
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cityStats.length > 0 ? (
                  <div className="space-y-2">
                    {cityStats.map((city, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div>
                          <span className="font-medium">{city.city}</span>
                          <span className="text-muted-foreground text-sm ml-2">{city.country}</span>
                        </div>
                        <span className="text-primary font-mono">{city.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No city data available yet
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Device Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                {deviceStats.length > 0 ? (
                  <PlotlyChart
                    data={[
                      {
                        values: deviceStats.map(d => d.count),
                        labels: deviceStats.map(d => d.type.charAt(0).toUpperCase() + d.type.slice(1)),
                        type: 'pie',
                        hole: 0.4,
                        marker: {
                          colors: [
                            chartColors.primary,
                            chartColors.secondary,
                            chartColors.profit,
                            chartColors.warning
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
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No device data available yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5" />
                User Sessions
              </CardTitle>
              <CardDescription>
                Full session details including IP, location, device, and activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sessions.length > 0 ? (
                <DataTable
                  data={sessions}
                  columns={sessionColumns}
                  compact
                  stickyHeader
                />
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No sessions recorded yet. Sessions will appear after users visit the site.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Calculations by Module</CardTitle>
              <CardDescription>Which modules are users using most?</CardDescription>
            </CardHeader>
            <CardContent>
              {moduleStats.length > 0 ? (
                <PlotlyChart
                  data={[
                    {
                      x: moduleStats.map(m => m.count),
                      y: moduleStats.map(m => m.module),
                      type: 'bar',
                      orientation: 'h',
                      marker: {
                        color: moduleStats.map((_, i) =>
                          [chartColors.primary, chartColors.secondary, chartColors.profit, chartColors.warning, chartColors.purple, chartColors.cyan][i % 6]
                        )
                      },
                      text: moduleStats.map(m => m.count.toString()),
                      textposition: 'outside'
                    }
                  ]}
                  layout={{
                    xaxis: { title: 'Number of Calculations' },
                    yaxis: { title: '' },
                    margin: { l: 150, t: 20 }
                  }}
                  config={{ responsive: true }}
                />
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No data available yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickers" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Most Analyzed Tickers</CardTitle>
              <CardDescription>Top 10 tickers users are analyzing</CardDescription>
            </CardHeader>
            <CardContent>
              {tickerStats.length > 0 ? (
                <PlotlyChart
                  data={[
                    {
                      values: tickerStats.map(t => t.count),
                      labels: tickerStats.map(t => t.ticker),
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
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No ticker data available yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Calculations</CardTitle>
              <CardDescription>Last 100 calculations across all users (with location)</CardDescription>
            </CardHeader>
            <CardContent>
              {calculations.length > 0 ? (
                <DataTable
                  data={calculations}
                  columns={calcColumns}
                  compact
                  stickyHeader
                />
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No calculations recorded yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
