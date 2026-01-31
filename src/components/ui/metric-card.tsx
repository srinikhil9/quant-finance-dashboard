import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  status?: "positive" | "negative" | "neutral" | "warning";
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Compact metric display card - Bloomberg Terminal style
 * Dense information display with color-coded status
 */
export function MetricCard({
  label,
  value,
  subValue,
  change,
  changeLabel,
  icon,
  status = "neutral",
  size = "md",
  className,
}: MetricCardProps) {
  const statusColors = {
    positive: "text-green-500",
    negative: "text-red-500",
    neutral: "text-zinc-400",
    warning: "text-yellow-500",
  };

  const statusBgColors = {
    positive: "bg-green-500/10 border-green-500/20",
    negative: "bg-red-500/10 border-red-500/20",
    neutral: "bg-zinc-800/50 border-zinc-700",
    warning: "bg-yellow-500/10 border-yellow-500/20",
  };

  const sizeClasses = {
    sm: "p-2",
    md: "p-3",
    lg: "p-4",
  };

  const valueSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  const TrendIcon = change !== undefined
    ? change > 0
      ? TrendingUp
      : change < 0
        ? TrendingDown
        : Minus
    : null;

  return (
    <div
      className={cn(
        "rounded-lg border",
        statusBgColors[status],
        sizeClasses[size],
        className
      )}
    >
      {/* Header with label and icon */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          {label}
        </span>
        {icon && <span className="text-zinc-500">{icon}</span>}
      </div>

      {/* Main value */}
      <div className={cn("font-mono font-bold", valueSizes[size], statusColors[status])}>
        {value}
      </div>

      {/* Sub value and change */}
      <div className="flex items-center justify-between mt-1">
        {subValue && (
          <span className="text-xs text-zinc-500">{subValue}</span>
        )}
        {change !== undefined && TrendIcon && (
          <div className={cn("flex items-center gap-1 text-xs", statusColors[status])}>
            <TrendIcon className="w-3 h-3" />
            <span>
              {change > 0 ? "+" : ""}
              {typeof change === "number" ? change.toFixed(2) : change}
              {changeLabel && ` ${changeLabel}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Grid container for metric cards
 */
export function MetricGrid({
  children,
  columns = 4,
  className,
}: {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}) {
  const colClasses = {
    2: "grid-cols-2",
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
    5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
    6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
  };

  return (
    <div className={cn("grid gap-2", colClasses[columns], className)}>
      {children}
    </div>
  );
}

export default MetricCard;
