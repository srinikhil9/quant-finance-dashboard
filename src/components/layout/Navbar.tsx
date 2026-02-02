"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  TrendingUp,
  Activity,
  BarChart3,
  LineChart,
  Brain,
  GitCompare,
  Landmark,
  Sparkles,
  Target,
  Bot,
  Eye,
  Grid3X3,
  ShieldAlert,
  Menu,
  X,
  ChevronDown,
  Search,
  Command,
  Table2,
  CandlestickChart,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useState, useRef, useEffect } from "react";
import { useHotkeys } from "react-hotkeys-hook";

// Types for navigation
type NavItem = { href: string; label: string; icon: React.ElementType };
type NavDropdown = { label: string; icon: React.ElementType; items: NavItem[] };
type NavGroup = NavItem | NavDropdown;

// Navigation structure with dropdown groups
const navGroups: NavGroup[] = [
  { href: "/", label: "Overview", icon: Activity },
  {
    label: "Pricing",
    icon: TrendingUp,
    items: [
      { href: "/black-scholes", label: "Options", icon: TrendingUp },
      { href: "/options-chain", label: "Options Chain", icon: Table2 },
      { href: "/fixed-income", label: "Bonds", icon: Landmark },
    ],
  },
  {
    label: "Risk",
    icon: LineChart,
    items: [
      { href: "/var", label: "VaR Calculator", icon: LineChart },
      { href: "/volatility", label: "Volatility", icon: Activity },
      { href: "/monte-carlo", label: "Monte Carlo", icon: BarChart3 },
      { href: "/technical", label: "Technical Analysis", icon: CandlestickChart },
      { href: "/portfolio", label: "Portfolio Analytics", icon: Briefcase },
    ],
  },
  {
    label: "ML & Trading",
    icon: Brain,
    items: [
      { href: "/ml-prediction", label: "ML Predict", icon: Brain },
      { href: "/pairs-trading", label: "Pairs Trading", icon: GitCompare },
      { href: "/basket-trading", label: "Basket", icon: Sparkles },
    ],
  },
  {
    label: "Advanced",
    icon: Target,
    items: [
      { href: "/spo-portfolio", label: "SPO Portfolio", icon: Target },
      { href: "/rl-hedging", label: "RL Hedging", icon: Bot },
      { href: "/regime-detection", label: "Regime Detection", icon: Eye },
      { href: "/stock-clustering", label: "Stock Clustering", icon: Grid3X3 },
      { href: "/anomaly-detection", label: "Anomaly Detection", icon: ShieldAlert },
    ],
  },
];

// Flat list for mobile
const allNavItems = [
  { href: "/", label: "Overview", icon: Activity },
  { href: "/black-scholes", label: "Options", icon: TrendingUp },
  { href: "/options-chain", label: "Options Chain", icon: Table2 },
  { href: "/monte-carlo", label: "Monte Carlo", icon: BarChart3 },
  { href: "/var", label: "VaR", icon: LineChart },
  { href: "/volatility", label: "Volatility", icon: Activity },
  { href: "/technical", label: "Technical", icon: CandlestickChart },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/ml-prediction", label: "ML Predict", icon: Brain },
  { href: "/pairs-trading", label: "Pairs", icon: GitCompare },
  { href: "/fixed-income", label: "Bonds", icon: Landmark },
  { href: "/basket-trading", label: "Basket", icon: Sparkles },
  { href: "/spo-portfolio", label: "SPO", icon: Target },
  { href: "/rl-hedging", label: "RL Hedge", icon: Bot },
  { href: "/regime-detection", label: "Regimes", icon: Eye },
  { href: "/stock-clustering", label: "Cluster", icon: Grid3X3 },
  { href: "/anomaly-detection", label: "Anomaly", icon: ShieldAlert },
];

function DropdownMenu({
  group,
  pathname
}: {
  group: NavDropdown;
  pathname: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const Icon = group.icon;

  const isActiveGroup = group.items.some(item => pathname === item.href);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          isActiveGroup
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        )}
      >
        <Icon className="h-4 w-4" />
        <span>{group.label}</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 py-2 w-48 rounded-lg border border-border bg-background shadow-lg z-50">
          {group.items.map((item) => {
            const ItemIcon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center space-x-2 px-4 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <ItemIcon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="hidden font-bold text-lg sm:block">
              Quant<span className="text-primary">Finance</span>
            </span>
          </Link>

          {/* Desktop Navigation with Dropdowns */}
          <div className="hidden md:flex items-center space-x-1">
            {/* Command Palette Trigger */}
            <button
              onClick={() => {
                // Dispatch Ctrl+K event to open command palette
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
              }}
              className="flex items-center gap-2 px-3 py-1.5 mr-2 text-sm text-zinc-400 bg-zinc-800/50 border border-zinc-700 rounded-md hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Search</span>
              <kbd className="hidden lg:inline ml-1 px-1.5 py-0.5 text-xs bg-zinc-900 border border-zinc-600 rounded font-mono">
                ⌘K
              </kbd>
            </button>

            {navGroups.map((group) => {
              if ('href' in group) {
                // Single item (Overview)
                const navItem = group as NavItem;
                const Icon = navItem.icon;
                const isActive = pathname === navItem.href;
                return (
                  <Link
                    key={navItem.href}
                    href={navItem.href}
                    className={cn(
                      "flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{navItem.label}</span>
                  </Link>
                );
              } else {
                // Dropdown group
                const dropdown = group as NavDropdown;
                return (
                  <DropdownMenu
                    key={dropdown.label}
                    group={dropdown}
                    pathname={pathname}
                  />
                );
              }
            })}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-secondary"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-1 border-t border-border max-h-[70vh] overflow-y-auto">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
