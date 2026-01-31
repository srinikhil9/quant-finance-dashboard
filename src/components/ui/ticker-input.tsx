'use client';

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Search, X, Loader2, TrendingUp, TrendingDown } from "lucide-react";

// Common stock tickers for autocomplete
const POPULAR_TICKERS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "META", name: "Meta Platforms Inc." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "BRK.B", name: "Berkshire Hathaway" },
  { symbol: "JPM", name: "JPMorgan Chase & Co." },
  { symbol: "V", name: "Visa Inc." },
  { symbol: "JNJ", name: "Johnson & Johnson" },
  { symbol: "WMT", name: "Walmart Inc." },
  { symbol: "PG", name: "Procter & Gamble" },
  { symbol: "MA", name: "Mastercard Inc." },
  { symbol: "UNH", name: "UnitedHealth Group" },
  { symbol: "HD", name: "Home Depot Inc." },
  { symbol: "DIS", name: "Walt Disney Co." },
  { symbol: "BAC", name: "Bank of America" },
  { symbol: "XOM", name: "Exxon Mobil Corp." },
  { symbol: "PFE", name: "Pfizer Inc." },
  { symbol: "SPY", name: "SPDR S&P 500 ETF" },
  { symbol: "QQQ", name: "Invesco QQQ Trust" },
  { symbol: "IWM", name: "iShares Russell 2000" },
  { symbol: "GLD", name: "SPDR Gold Shares" },
  { symbol: "TLT", name: "iShares 20+ Year Treasury" },
];

interface TickerInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (ticker: { symbol: string; name: string }) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  showPrice?: boolean;
  price?: number;
  priceChange?: number;
}

/**
 * Smart ticker input with autocomplete - Bloomberg Terminal style
 */
export function TickerInput({
  value,
  onChange,
  onSelect,
  placeholder = "Enter ticker symbol...",
  className,
  disabled = false,
  loading = false,
  showPrice = false,
  price,
  priceChange,
}: TickerInputProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<typeof POPULAR_TICKERS>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Filter suggestions based on input
  React.useEffect(() => {
    if (value.length === 0) {
      setSuggestions(POPULAR_TICKERS.slice(0, 8));
    } else {
      const filtered = POPULAR_TICKERS.filter(
        (t) =>
          t.symbol.toLowerCase().includes(value.toLowerCase()) ||
          t.name.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 8);
      setSuggestions(filtered);
    }
  }, [value]);

  const handleSelect = (ticker: typeof POPULAR_TICKERS[0]) => {
    onChange(ticker.symbol);
    onSelect?.(ticker);
    setIsFocused(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    onChange("");
    inputRef.current?.focus();
  };

  const showSuggestions = isFocused && suggestions.length > 0;

  return (
    <div className={cn("relative", className)}>
      {/* Input container */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border bg-zinc-900 transition-colors",
          isFocused ? "border-primary ring-1 ring-primary" : "border-zinc-700",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
        ) : (
          <Search className="w-4 h-4 text-zinc-500" />
        )}

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "flex-1 bg-transparent text-sm font-mono text-white placeholder:text-zinc-500 focus:outline-none",
            disabled && "cursor-not-allowed"
          )}
        />

        {/* Price display */}
        {showPrice && price !== undefined && (
          <div className="flex items-center gap-2 pl-2 border-l border-zinc-700">
            <span className="text-sm font-mono text-zinc-300">
              ${price.toFixed(2)}
            </span>
            {priceChange !== undefined && (
              <span
                className={cn(
                  "flex items-center text-xs font-mono",
                  priceChange > 0 ? "text-green-500" : priceChange < 0 ? "text-red-500" : "text-zinc-500"
                )}
              >
                {priceChange > 0 ? (
                  <TrendingUp className="w-3 h-3 mr-0.5" />
                ) : priceChange < 0 ? (
                  <TrendingDown className="w-3 h-3 mr-0.5" />
                ) : null}
                {priceChange > 0 ? "+" : ""}
                {priceChange.toFixed(2)}%
              </span>
            )}
          </div>
        )}

        {/* Clear button */}
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 rounded hover:bg-zinc-800"
          >
            <X className="w-3 h-3 text-zinc-500" />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && (
        <div className="absolute z-50 w-full mt-1 py-1 rounded-lg border border-zinc-700 bg-zinc-900 shadow-lg max-h-64 overflow-y-auto">
          {suggestions.map((ticker) => (
            <button
              key={ticker.symbol}
              type="button"
              onClick={() => handleSelect(ticker)}
              className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-zinc-800 transition-colors"
            >
              <span className="text-sm font-mono font-medium text-white w-16">
                {ticker.symbol}
              </span>
              <span className="text-xs text-zinc-500 truncate">
                {ticker.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default TickerInput;
