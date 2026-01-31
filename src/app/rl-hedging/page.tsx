"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TutorialCard } from "@/components/ui/tooltip";
import { PlotlyChart, chartColors } from "@/components/charts";
import { formatNumber, formatPercent } from "@/lib/utils/formatters";
import { Bot, RefreshCw, Play, Loader2, Download, Zap } from "lucide-react";
import { trackCalculation } from "@/lib/analytics";

interface RLHedgingResult {
  parameters: {
    S0: number;
    K: number;
    T: number;
    sigma: number;
    r: number;
    transaction_cost: number;
    n_episodes: number;
    n_test_paths: number;
  };
  training: {
    final_episode_error: number;
    learning_curve: number[];
    learning_curve_x: number[];
  };
  evaluation: {
    rl: {
      mean_abs_error: number;
      std_error: number;
      mean_error: number;
    };
    bs_delta: {
      mean_abs_error: number;
      std_error: number;
      mean_error: number;
    };
    improvement: {
      mae_reduction: number;
      std_reduction: number;
    };
  };
  histogram: {
    bins: number[];
    rl_counts: number[];
    bs_counts: number[];
  };
  sample_path: {
    prices: number[];
    rl_hedges: number[];
    bs_hedges: number[];
    time_steps: number[];
  };
  q_table_sample: Record<string, number[]>;
  actions: Record<string, string>;
}

const rlHedgingTooltips = {
  tutorial: {
    title: "RL Derivative Hedging",
    description: "Train a Q-learning agent to learn optimal delta hedging strategies that adapt to market conditions and transaction costs.",
    steps: [
      "Set option parameters (spot, strike, time to expiry, volatility)",
      "Adjust transaction cost to see its impact on optimal hedging",
      "Click 'Train Agent' to run Q-learning on simulated paths",
      "Compare RL hedging performance vs standard Black-Scholes delta hedge"
    ]
  },
  S0: "Current stock price. The underlying asset price at time zero.",
  K: "Strike price. The price at which the option can be exercised.",
  T: "Time to expiry in years (e.g., 0.25 = 3 months).",
  sigma: "Volatility of the underlying asset (annualized).",
  tc: "Transaction cost per dollar traded. Higher costs make frequent rebalancing expensive.",
  episodes: "Number of training episodes. More episodes = better learning but slower."
};

export default function RLHedgingPage() {
  const [S0, setS0] = useState(100);
  const [K, setK] = useState(100);
  const [T, setT] = useState(0.25);
  const [sigma, setSigma] = useState(0.2);
  const [r, setR] = useState(0.05);
  const [transactionCost, setTransactionCost] = useState(0.001);
  const [episodes, setEpisodes] = useState(200);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RLHedgingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trainAgent = async () => {
    setLoading(true);
    setError(null);
    const startTime = performance.now();

    const inputParams = {
      S: S0,
      K,
      T,
      sigma,
      r,
      tc: transactionCost,
      episodes,
    };

    try {
      const params = new URLSearchParams({
        S: S0.toString(),
        K: K.toString(),
        T: T.toString(),
        sigma: sigma.toString(),
        r: r.toString(),
        tc: transactionCost.toString(),
        episodes: episodes.toString(),
      });

      const response = await fetch(`/api/rl-hedging?${params}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);

      // Track successful RL training
      trackCalculation('rl-hedging', inputParams, data, Math.round(performance.now() - startTime));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Training failed");

      // Track failed RL training
      trackCalculation('rl-hedging', inputParams, { error: err instanceof Error ? err.message : 'Unknown error' }, Math.round(performance.now() - startTime));
    } finally {
      setLoading(false);
    }
  };

  const learningCurveData = result ? [
    {
      x: result.training.learning_curve_x,
      y: result.training.learning_curve,
      type: "scatter" as const,
      mode: "lines+markers" as const,
      name: "Avg Hedging Error",
      line: { color: chartColors.primary, width: 2 },
      marker: { size: 4 },
    },
  ] : [];

  const histogramData = result ? [
    {
      x: result.histogram.bins,
      y: result.histogram.bs_counts,
      type: "bar" as const,
      name: "BS Delta Hedge",
      marker: { color: chartColors.muted, opacity: 0.7 },
    },
    {
      x: result.histogram.bins,
      y: result.histogram.rl_counts,
      type: "bar" as const,
      name: "RL Hedge",
      marker: { color: chartColors.primary, opacity: 0.7 },
    },
  ] : [];

  const samplePathData = result ? [
    {
      x: result.sample_path.time_steps,
      y: result.sample_path.prices.slice(0, -1),
      type: "scatter" as const,
      mode: "lines" as const,
      name: "Stock Price",
      line: { color: chartColors.secondary, width: 2 },
      yaxis: "y",
    },
  ] : [];

  const hedgeComparisonData = result ? [
    {
      x: result.sample_path.time_steps,
      y: result.sample_path.bs_hedges,
      type: "scatter" as const,
      mode: "lines" as const,
      name: "BS Delta",
      line: { color: chartColors.muted, width: 2 },
    },
    {
      x: result.sample_path.time_steps,
      y: result.sample_path.rl_hedges,
      type: "scatter" as const,
      mode: "lines" as const,
      name: "RL Hedge",
      line: { color: chartColors.primary, width: 2 },
    },
  ] : [];

  // Format Q-table for heatmap
  const qTableHeatmapData = result ? (() => {
    const entries = Object.entries(result.q_table_sample).slice(0, 25);
    const states = entries.map(([k]) => k.replace(/[()]/g, '').substring(0, 10));
    const values = entries.map(([, v]) => v);

    return [{
      z: values,
      x: ["Under-hedge", "Delta", "Over-hedge"],
      y: states,
      type: "heatmap" as const,
      colorscale: "Viridis",
      showscale: true,
    }];
  })() : [];

  const resetToDefaults = () => {
    setS0(100);
    setK(100);
    setT(0.25);
    setSigma(0.2);
    setR(0.05);
    setTransactionCost(0.001);
    setEpisodes(200);
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">RL Derivative Hedging</h1>
          <p className="text-muted-foreground mt-1">
            Adaptive delta hedging with tabular Q-learning
          </p>
        </div>
        <div className="flex gap-2">
          <Tooltip content="Download full DQN/PPO notebook with stable-baselines3">
            <Button variant="outline" asChild>
              <a href="/notebooks/rl-hedging-dqn.ipynb" download>
                <Download className="h-4 w-4 mr-2" />
                Notebook
              </a>
            </Button>
          </Tooltip>
          <Tooltip content="Clear all inputs and return to default values">
            <Button variant="outline" onClick={resetToDefaults}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Tutorial Card */}
      <TutorialCard
        title={rlHedgingTooltips.tutorial.title}
        description={rlHedgingTooltips.tutorial.description}
        steps={rlHedgingTooltips.tutorial.steps}
      />

      {/* RL Concept */}
      <Card className="bg-gradient-to-r from-green-500/5 to-blue-500/5 border-green-500/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Bot className="h-5 w-5 text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Q-Learning for Hedging</h3>
              <p className="text-sm text-muted-foreground">
                The agent learns a policy π(s) → a that maps market states (moneyness, time, delta) to
                hedge actions (under-hedge, delta-hedge, over-hedge). It optimizes for minimal hedging
                error while accounting for transaction costs.
              </p>
              <div className="mt-2 text-xs font-mono text-muted-foreground">
                Q(s,a) ← Q(s,a) + α[r + γ·max_a&apos;Q(s&apos;,a&apos;) - Q(s,a)]
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Input Parameters */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Option & Training Parameters
            </CardTitle>
            <CardDescription>Configure the hedging environment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Slider
              label="Spot Price (S₀)"
              value={[S0]}
              onValueChange={([v]) => setS0(v)}
              min={50}
              max={150}
              step={5}
              formatValue={(v) => `$${v}`}
            />

            <Slider
              label="Strike Price (K)"
              value={[K]}
              onValueChange={([v]) => setK(v)}
              min={50}
              max={150}
              step={5}
              formatValue={(v) => `$${v}`}
            />

            <Slider
              label="Time to Expiry (T)"
              value={[T]}
              onValueChange={([v]) => setT(v)}
              min={0.1}
              max={1}
              step={0.05}
              formatValue={(v) => `${(v * 12).toFixed(1)} months`}
            />

            <Slider
              label="Volatility (σ)"
              value={[sigma]}
              onValueChange={([v]) => setSigma(v)}
              min={0.1}
              max={0.5}
              step={0.05}
              formatValue={(v) => `${(v * 100).toFixed(0)}%`}
            />

            <Slider
              label="Transaction Cost"
              value={[transactionCost]}
              onValueChange={([v]) => setTransactionCost(v)}
              min={0}
              max={0.01}
              step={0.0005}
              formatValue={(v) => `${(v * 100).toFixed(2)}%`}
            />

            <Slider
              label="Training Episodes"
              value={[episodes]}
              onValueChange={([v]) => setEpisodes(v)}
              min={50}
              max={500}
              step={50}
              formatValue={(v) => v.toString()}
            />

            <Button onClick={trainAgent} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Training Agent...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Train Agent
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
            <CardTitle>Evaluation Results</CardTitle>
            <CardDescription>
              {result
                ? `Trained on ${result.parameters.n_episodes} episodes, tested on ${result.parameters.n_test_paths} paths`
                : "Configure parameters and click 'Train Agent'"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <>
                {/* Performance Comparison */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {/* BS Delta */}
                  <div className="p-4 rounded-lg bg-secondary">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-zinc-500" />
                      <span className="font-medium">Black-Scholes Delta</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Mean Abs Error</div>
                        <div className="font-mono-numbers font-bold">
                          ${result.evaluation.bs_delta.mean_abs_error.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Std Error</div>
                        <div className="font-mono-numbers">
                          ${result.evaluation.bs_delta.std_error.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RL */}
                  <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Bot className="h-4 w-4 text-green-500" />
                      <span className="font-medium">RL Q-Learning</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Mean Abs Error</div>
                        <div className="font-mono-numbers font-bold text-green-500">
                          ${result.evaluation.rl.mean_abs_error.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Std Error</div>
                        <div className="font-mono-numbers">
                          ${result.evaluation.rl.std_error.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Improvement */}
                <div className={`p-4 rounded-lg mb-6 ${
                  result.evaluation.improvement.mae_reduction > 0
                    ? "bg-gradient-to-r from-green-500/10 to-transparent border border-green-500/20"
                    : "bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/20"
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">MAE Reduction: </span>
                      <span className={`font-mono-numbers ${
                        result.evaluation.improvement.mae_reduction > 0 ? 'text-green-500' : 'text-yellow-500'
                      }`}>
                        {result.evaluation.improvement.mae_reduction > 0 ? '+' : ''}
                        {result.evaluation.improvement.mae_reduction.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Std Reduction: </span>
                      <span className={`font-mono-numbers ${
                        result.evaluation.improvement.std_reduction > 0 ? 'text-green-500' : 'text-yellow-500'
                      }`}>
                        {result.evaluation.improvement.std_reduction > 0 ? '+' : ''}
                        {result.evaluation.improvement.std_reduction.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Legend */}
                <div className="p-4 rounded-lg bg-secondary">
                  <h4 className="font-medium mb-2">Action Space</h4>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {Object.entries(result.actions).map(([key, desc]) => (
                      <div key={key} className="px-2 py-1 rounded bg-background border">
                        <span className="font-mono">{key}</span>: {desc}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                Set option parameters and click &quot;Train Agent&quot; to learn optimal hedging
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
              <CardTitle>Learning Curve</CardTitle>
              <CardDescription>Average hedging error over training episodes</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={learningCurveData}
                layout={{
                  xaxis: { title: "Episode" },
                  yaxis: { title: "Avg Hedging Error ($)" },
                  height: 350,
                }}
                className="w-full h-[350px]"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hedging Error Distribution</CardTitle>
              <CardDescription>P&L distribution across test paths</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={histogramData}
                layout={{
                  xaxis: { title: "Hedging Error ($)" },
                  yaxis: { title: "Count" },
                  height: 350,
                  barmode: "overlay" as const,
                  showlegend: true,
                  legend: { x: 0, y: 1.1, orientation: "h" as const },
                }}
                className="w-full h-[350px]"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sample Path: Hedge Positions</CardTitle>
              <CardDescription>RL vs BS delta hedge on one simulated path</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={hedgeComparisonData}
                layout={{
                  xaxis: { title: "Time Step" },
                  yaxis: { title: "Hedge Position (Delta)" },
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
              <CardTitle>Q-Table Heatmap</CardTitle>
              <CardDescription>Learned Q-values for state-action pairs</CardDescription>
            </CardHeader>
            <CardContent>
              <PlotlyChart
                data={qTableHeatmapData}
                layout={{
                  xaxis: { title: "Action" },
                  yaxis: { title: "State", automargin: true },
                  height: 350,
                  margin: { l: 100 },
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
