import Link from "next/link";
import {
  TrendingUp,
  BarChart3,
  LineChart,
  Activity,
  Brain,
  GitCompare,
  Landmark,
  ArrowRight,
  Sparkles,
  Target,
  Bot,
  Eye,
  Grid3X3,
  ShieldAlert,
  Download,
  FileCode,
  Cpu,
  Network,
  MessageSquare,
  Layers,
  Table2,
  CandlestickChart,
  Briefcase,
  FlaskConical,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const modules = [
  {
    href: "/black-scholes",
    title: "Black-Scholes Options",
    description: "Calculate option prices and Greeks using the Black-Scholes model",
    icon: TrendingUp,
    color: "text-green-500",
    features: ["Call/Put Pricing", "Greeks (Delta, Gamma, Vega, Theta, Rho)", "Implied Volatility"],
  },
  {
    href: "/options-chain",
    title: "Options Chain Analysis",
    description: "Full options chain data with Greeks across all strikes and expirations",
    icon: Table2,
    color: "text-lime-500",
    badge: "New",
    features: ["Calls & Puts Tables", "IV Surface Visualization", "Put/Call Ratio Analysis"],
  },
  {
    href: "/monte-carlo",
    title: "Monte Carlo Simulation",
    description: "Simulate portfolio paths using Geometric Brownian Motion",
    icon: BarChart3,
    color: "text-blue-500",
    features: ["1000+ Path Simulations", "Distribution Analysis", "Probability of Profit"],
  },
  {
    href: "/var",
    title: "Value at Risk (VaR)",
    description: "Estimate portfolio risk using multiple VaR methodologies",
    icon: LineChart,
    color: "text-red-500",
    features: ["Historical VaR", "Parametric VaR", "Monte Carlo VaR", "CVaR"],
  },
  {
    href: "/volatility",
    title: "Volatility Modeling",
    description: "Model and forecast volatility with EWMA and GARCH",
    icon: Activity,
    color: "text-yellow-500",
    features: ["EWMA Volatility", "GARCH(1,1)", "Volatility Forecasting"],
  },
  {
    href: "/technical",
    title: "Technical Analysis",
    description: "Chart patterns and indicators with buy/sell signals",
    icon: CandlestickChart,
    color: "text-cyan-500",
    badge: "New",
    features: ["RSI, MACD, Bollinger Bands", "Moving Averages", "Trading Signals"],
  },
  {
    href: "/portfolio",
    title: "Portfolio Analytics",
    description: "Track positions, analyze performance, and measure risk metrics",
    icon: Briefcase,
    color: "text-violet-500",
    badge: "New",
    features: ["P&L Tracking", "Correlation Matrix", "Sharpe, Beta, VaR"],
  },
  {
    href: "/ml-prediction",
    title: "ML Stock Prediction",
    description: "Predict stock returns using machine learning models",
    icon: Brain,
    color: "text-purple-500",
    features: ["30+ Technical Indicators", "Multiple ML Models", "Feature Importance"],
  },
  {
    href: "/pairs-trading",
    title: "Pairs Trading",
    description: "Statistical arbitrage with cointegration analysis",
    icon: GitCompare,
    color: "text-cyan-500",
    features: ["Cointegration Tests", "Z-Score Signals", "Backtest Results"],
  },
  {
    href: "/fixed-income",
    title: "Bond Pricing",
    description: "Price bonds and analyze fixed income securities",
    icon: Landmark,
    color: "text-orange-500",
    features: ["Bond Valuation", "Duration & Convexity", "Yield Curve Analysis"],
  },
  {
    href: "/basket-trading",
    title: "Basket Optimization",
    description: "Optimize cointegration weights using Bayesian optimization",
    icon: Sparkles,
    color: "text-pink-500",
    features: ["Differential Evolution", "Multi-Asset Baskets", "Sharpe Maximization"],
  },
  {
    href: "/backtest",
    title: "Backtesting Engine",
    description: "Test trading strategies on historical data",
    icon: FlaskConical,
    color: "text-sky-500",
    badge: "New",
    features: ["MA Crossover, RSI, Bollinger", "Win Rate & Profit Factor", "Equity Curve Analysis"],
  },
  {
    href: "/spo-portfolio",
    title: "SPO Portfolio",
    description: "End-to-end decision-focused portfolio optimization",
    icon: Target,
    color: "text-indigo-500",
    badge: "New",
    features: ["Decision-Focused Learning", "Mean-Variance Optimization", "Prediction vs Decision Error"],
  },
  {
    href: "/rl-hedging",
    title: "RL Hedging",
    description: "Adaptive delta hedging with reinforcement learning",
    icon: Bot,
    color: "text-emerald-500",
    badge: "New",
    features: ["Q-Learning Agent", "Transaction Cost Aware", "Dynamic Hedging Policy"],
  },
  {
    href: "/regime-detection",
    title: "Regime Detection",
    description: "Detect market regimes using Hidden Markov Models",
    icon: Eye,
    color: "text-rose-500",
    badge: "New",
    features: ["Baum-Welch EM Algorithm", "Viterbi Decoding", "Regime Statistics"],
  },
  {
    href: "/stock-clustering",
    title: "Stock Clustering",
    description: "Group stocks by behavior patterns with K-Means",
    icon: Grid3X3,
    color: "text-teal-500",
    badge: "New",
    features: ["K-Means++", "PCA Visualization", "Cluster Portfolios"],
  },
  {
    href: "/anomaly-detection",
    title: "Anomaly Detection",
    description: "Detect unusual market conditions with Isolation Forest",
    icon: ShieldAlert,
    color: "text-amber-500",
    badge: "New",
    features: ["Isolation Forest", "Crisis Detection", "Feature Importance"],
  },
];

export default function Home() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="text-center py-12 space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold">
          Quantitative Finance
          <span className="text-primary"> Dashboard</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          A comprehensive toolkit for quantitative analysis featuring options pricing,
          risk management, volatility modeling, machine learning predictions, and more.
        </p>
        <div className="flex items-center justify-center gap-4 pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span>Live Market Data via yFinance</span>
          </div>
          <div className="text-sm text-muted-foreground">|</div>
          <div className="text-sm text-muted-foreground">17 Interactive Modules</div>
        </div>
      </section>

      {/* Module Cards Grid */}
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Link key={module.href} href={module.href}>
              <Card className="h-full card-hover cursor-pointer group border-border hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-secondary ${module.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">
                          {module.title}
                        </CardTitle>
                        {"badge" in module && module.badge && (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded bg-primary/20 text-primary">
                            {module.badge}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <CardDescription className="mt-2">
                    {module.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {module.features.map((feature) => (
                      <li
                        key={feature}
                        className="text-sm text-muted-foreground flex items-center gap-2"
                      >
                        <span className="h-1 w-1 rounded-full bg-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex items-center text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Open Calculator</span>
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      {/* Quick Stats Section */}
      <section className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">17</div>
            <div className="text-sm text-muted-foreground">Financial Models</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-500">30+</div>
            <div className="text-sm text-muted-foreground">Technical Indicators</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-500">6</div>
            <div className="text-sm text-muted-foreground">ML Algorithms</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-transparent border-orange-500/20">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-500">Real-time</div>
            <div className="text-sm text-muted-foreground">Market Data</div>
          </CardContent>
        </Card>
      </section>

      {/* Deep Learning Notebooks Section */}
      <section className="space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Deep Learning Notebooks</h2>
          <p className="text-muted-foreground mt-1">
            Advanced ML projects requiring PyTorch/TensorFlow - download and run locally
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Neural Black-Scholes",
              description: "Physics-informed neural networks for option pricing with automatic Greeks via autodiff",
              icon: Cpu,
              color: "text-violet-500",
              href: "/notebooks/neural-black-scholes.ipynb",
              libs: ["PyTorch", "SciPy"],
            },
            {
              title: "LSTM/Transformer HFT",
              description: "Sequence models for high-frequency trading prediction with attention mechanisms",
              icon: Layers,
              color: "text-sky-500",
              href: "/notebooks/lstm-hft-prediction.ipynb",
              libs: ["PyTorch", "sklearn"],
            },
            {
              title: "VAE Factor Discovery",
              description: "Variational autoencoders for discovering latent factors in stock returns",
              icon: Brain,
              color: "text-fuchsia-500",
              href: "/notebooks/autoencoder-factors.ipynb",
              libs: ["PyTorch", "sklearn"],
            },
            {
              title: "DQN Portfolio",
              description: "Deep Q-Network for portfolio allocation with experience replay and dueling architecture",
              icon: Bot,
              color: "text-emerald-500",
              href: "/notebooks/rl-portfolio-dqn.ipynb",
              libs: ["PyTorch", "Gym"],
            },
            {
              title: "NLP Earnings Sentiment",
              description: "FinBERT transformer for analyzing earnings call transcripts and generating signals",
              icon: MessageSquare,
              color: "text-amber-500",
              href: "/notebooks/nlp-earnings-sentiment.ipynb",
              libs: ["Transformers", "PyTorch"],
            },
            {
              title: "GNN Stock Network",
              description: "Graph neural networks for modeling stock relationships and network effects",
              icon: Network,
              color: "text-rose-500",
              href: "/notebooks/gnn-stock-network.ipynb",
              libs: ["PyTorch Geometric", "NetworkX"],
            },
          ].map((notebook) => {
            const Icon = notebook.icon;
            return (
              <a
                key={notebook.href}
                href={notebook.href}
                download
                className="block"
              >
                <Card className="h-full card-hover cursor-pointer group border-border hover:border-primary/50 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg bg-secondary ${notebook.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                            {notebook.title}
                          </h3>
                          <FileCode className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notebook.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {notebook.libs.map((lib) => (
                            <span
                              key={lib}
                              className="px-1.5 py-0.5 text-[10px] rounded bg-secondary text-muted-foreground"
                            >
                              {lib}
                            </span>
                          ))}
                        </div>
                        <div className="mt-3 flex items-center text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          <Download className="h-3 w-3 mr-1" />
                          <span>Download .ipynb</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </a>
            );
          })}
        </div>
      </section>
    </div>
  );
}
