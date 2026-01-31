'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { useHotkeys } from 'react-hotkeys-hook';
import {
  Calculator,
  BarChart3,
  TrendingUp,
  Activity,
  Brain,
  GitCompare,
  Landmark,
  ShoppingBasket,
  Target,
  Bot,
  Layers,
  Fingerprint,
  AlertTriangle,
  Search,
  Command as CommandIcon,
  ArrowRight,
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
  href: string;
  category: string;
  keywords: string[];
}

const commands: CommandItem[] = [
  // Pricing
  {
    id: 'black-scholes',
    label: 'Black-Scholes Options',
    shortcut: '1',
    icon: <Calculator className="w-4 h-4" />,
    href: '/black-scholes',
    category: 'Pricing',
    keywords: ['options', 'greeks', 'call', 'put', 'delta', 'gamma', 'theta', 'vega'],
  },
  {
    id: 'fixed-income',
    label: 'Bond Pricing',
    shortcut: '2',
    icon: <Landmark className="w-4 h-4" />,
    href: '/fixed-income',
    category: 'Pricing',
    keywords: ['bonds', 'yield', 'duration', 'convexity', 'fixed income', 'ytm'],
  },
  // Risk
  {
    id: 'monte-carlo',
    label: 'Monte Carlo Simulation',
    shortcut: '3',
    icon: <BarChart3 className="w-4 h-4" />,
    href: '/monte-carlo',
    category: 'Risk',
    keywords: ['simulation', 'gbm', 'paths', 'probability', 'portfolio'],
  },
  {
    id: 'var',
    label: 'Value at Risk (VaR)',
    shortcut: '4',
    icon: <TrendingUp className="w-4 h-4" />,
    href: '/var',
    category: 'Risk',
    keywords: ['risk', 'var', 'cvar', 'expected shortfall', 'confidence'],
  },
  {
    id: 'volatility',
    label: 'Volatility Modeling',
    shortcut: '5',
    icon: <Activity className="w-4 h-4" />,
    href: '/volatility',
    category: 'Risk',
    keywords: ['ewma', 'garch', 'volatility', 'forecast'],
  },
  // ML & Trading
  {
    id: 'ml-prediction',
    label: 'ML Stock Prediction',
    shortcut: '6',
    icon: <Brain className="w-4 h-4" />,
    href: '/ml-prediction',
    category: 'ML & Trading',
    keywords: ['machine learning', 'prediction', 'forecast', 'random forest', 'ai'],
  },
  {
    id: 'pairs-trading',
    label: 'Pairs Trading',
    shortcut: '7',
    icon: <GitCompare className="w-4 h-4" />,
    href: '/pairs-trading',
    category: 'ML & Trading',
    keywords: ['cointegration', 'spread', 'statistical arbitrage', 'hedge ratio'],
  },
  {
    id: 'basket-trading',
    label: 'Basket Optimization',
    shortcut: '8',
    icon: <ShoppingBasket className="w-4 h-4" />,
    href: '/basket-trading',
    category: 'ML & Trading',
    keywords: ['portfolio', 'optimization', 'markowitz', 'efficient frontier'],
  },
  // Advanced
  {
    id: 'spo-portfolio',
    label: 'SPO Portfolio',
    shortcut: '9',
    icon: <Target className="w-4 h-4" />,
    href: '/spo-portfolio',
    category: 'Advanced',
    keywords: ['stochastic', 'portfolio optimization', 'sample'],
  },
  {
    id: 'rl-hedging',
    label: 'RL Hedging',
    icon: <Bot className="w-4 h-4" />,
    href: '/rl-hedging',
    category: 'Advanced',
    keywords: ['reinforcement learning', 'agent', 'hedging', 'q-learning'],
  },
  {
    id: 'regime-detection',
    label: 'Regime Detection',
    icon: <Layers className="w-4 h-4" />,
    href: '/regime-detection',
    category: 'Advanced',
    keywords: ['hmm', 'hidden markov', 'regime', 'bull', 'bear'],
  },
  {
    id: 'stock-clustering',
    label: 'Stock Clustering',
    icon: <Fingerprint className="w-4 h-4" />,
    href: '/stock-clustering',
    category: 'Advanced',
    keywords: ['k-means', 'cluster', 'grouping', 'similarity'],
  },
  {
    id: 'anomaly-detection',
    label: 'Anomaly Detection',
    icon: <AlertTriangle className="w-4 h-4" />,
    href: '/anomaly-detection',
    category: 'Advanced',
    keywords: ['isolation forest', 'outlier', 'anomaly', 'unusual'],
  },
];

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const router = useRouter();

  // Toggle with Ctrl/Cmd + K
  useHotkeys('mod+k', (e) => {
    e.preventDefault();
    setOpen((open) => !open);
  }, { enableOnFormTags: true });

  // Close with Escape
  useHotkeys('escape', () => {
    if (open) setOpen(false);
  }, { enabled: open });

  // Number shortcuts for quick navigation (when palette is closed)
  useHotkeys('1', () => router.push('/black-scholes'), { enabled: !open });
  useHotkeys('2', () => router.push('/fixed-income'), { enabled: !open });
  useHotkeys('3', () => router.push('/monte-carlo'), { enabled: !open });
  useHotkeys('4', () => router.push('/var'), { enabled: !open });
  useHotkeys('5', () => router.push('/volatility'), { enabled: !open });
  useHotkeys('6', () => router.push('/ml-prediction'), { enabled: !open });
  useHotkeys('7', () => router.push('/pairs-trading'), { enabled: !open });
  useHotkeys('8', () => router.push('/basket-trading'), { enabled: !open });
  useHotkeys('9', () => router.push('/spo-portfolio'), { enabled: !open });

  // Question mark for help
  useHotkeys('shift+/', () => setOpen(true), { enabled: !open });

  const handleSelect = (href: string) => {
    setOpen(false);
    setSearch('');
    router.push(href);
  };

  // Group commands by category
  const groupedCommands = commands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = [];
    }
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Command Dialog */}
      <div className="absolute left-1/2 top-[20%] -translate-x-1/2 w-full max-w-xl">
        <Command
          className="rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden"
          shouldFilter={true}
        >
          {/* Search Input */}
          <div className="flex items-center border-b border-zinc-700 px-3">
            <Search className="w-4 h-4 text-zinc-400 mr-2" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search modules, tickers, or type a command..."
              className="w-full bg-transparent py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none"
              autoFocus
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
              <span className="text-xs">esc</span>
            </kbd>
          </div>

          {/* Command List */}
          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-zinc-500">
              No results found.
            </Command.Empty>

            {Object.entries(groupedCommands).map(([category, items]) => (
              <Command.Group
                key={category}
                heading={category}
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-zinc-500"
              >
                {items.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`${item.label} ${item.keywords.join(' ')}`}
                    onSelect={() => handleSelect(item.href)}
                    className="flex items-center gap-3 px-2 py-2 text-sm text-zinc-300 rounded-md cursor-pointer aria-selected:bg-zinc-800 aria-selected:text-white hover:bg-zinc-800/50"
                  >
                    <span className="text-zinc-500">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.shortcut && (
                      <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-500">
                        {item.shortcut}
                      </kbd>
                    )}
                    <ArrowRight className="w-3 h-3 text-zinc-600" />
                  </Command.Item>
                ))}
              </Command.Group>
            ))}

            {/* Keyboard shortcuts help */}
            <Command.Group
              heading="Keyboard Shortcuts"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-zinc-500"
            >
              <div className="px-2 py-2 text-xs text-zinc-500 space-y-1">
                <div className="flex justify-between">
                  <span>Open command palette</span>
                  <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5">Ctrl+K</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Quick navigate (1-9)</span>
                  <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5">1-9</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Show shortcuts</span>
                  <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5">?</kbd>
                </div>
              </div>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

export default CommandPalette;
