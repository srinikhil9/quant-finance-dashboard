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
          <div className="text-sm text-muted-foreground">7 Interactive Modules</div>
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
                    <div>
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {module.title}
                      </CardTitle>
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
            <div className="text-2xl font-bold text-green-500">7</div>
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
            <div className="text-2xl font-bold text-purple-500">4</div>
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
    </div>
  );
}
