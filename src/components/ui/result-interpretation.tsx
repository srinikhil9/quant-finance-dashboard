"use client";

import { Lightbulb, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type InterpretationStatus = "positive" | "neutral" | "negative" | "warning";

export interface InterpretationData {
  status: InterpretationStatus;
  summary: string;
  points: string[];
  advice?: string;
}

interface ResultInterpretationProps {
  data: InterpretationData;
  className?: string;
}

const statusConfig = {
  positive: {
    icon: TrendingUp,
    bgClass: "bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20",
    iconClass: "text-green-500",
    headerClass: "text-green-500",
  },
  neutral: {
    icon: Info,
    bgClass: "bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20",
    iconClass: "text-blue-500",
    headerClass: "text-blue-500",
  },
  negative: {
    icon: TrendingDown,
    bgClass: "bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20",
    iconClass: "text-red-500",
    headerClass: "text-red-500",
  },
  warning: {
    icon: AlertTriangle,
    bgClass: "bg-gradient-to-br from-yellow-500/10 to-transparent border-yellow-500/20",
    iconClass: "text-yellow-500",
    headerClass: "text-yellow-500",
  },
};

export function ResultInterpretation({ data, className }: ResultInterpretationProps) {
  const config = statusConfig[data.status];
  const StatusIcon = config.icon;

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        config.bgClass,
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className={cn("p-1.5 rounded-lg bg-background/50", config.iconClass)}>
          <Lightbulb className="h-4 w-4" />
        </div>
        <h4 className="font-semibold text-sm">What does this mean?</h4>
        <StatusIcon className={cn("h-4 w-4 ml-auto", config.iconClass)} />
      </div>

      {/* Summary */}
      <p className="text-sm font-medium mb-3">{data.summary}</p>

      {/* Bullet Points */}
      <ul className="space-y-1.5 mb-3">
        {data.points.map((point, index) => (
          <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>{point}</span>
          </li>
        ))}
      </ul>

      {/* Advice */}
      {data.advice && (
        <div className="flex items-start gap-2 pt-3 border-t border-border/50">
          <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Tip: </span>
            {data.advice}
          </p>
        </div>
      )}
    </div>
  );
}

// Helper function to format currency for interpretations
export function formatInterpretationCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(2)}`;
}

// Helper function to get qualitative rating
export function getQualitativeRating(
  value: number,
  thresholds: { excellent: number; good: number; poor: number },
  higherIsBetter: boolean = true
): "excellent" | "good" | "fair" | "poor" {
  if (higherIsBetter) {
    if (value >= thresholds.excellent) return "excellent";
    if (value >= thresholds.good) return "good";
    if (value >= thresholds.poor) return "fair";
    return "poor";
  } else {
    if (value <= thresholds.excellent) return "excellent";
    if (value <= thresholds.good) return "good";
    if (value <= thresholds.poor) return "fair";
    return "poor";
  }
}

// Sharpe ratio interpretation helper
export function interpretSharpeRatio(sharpe: number): { label: string; description: string } {
  if (sharpe >= 2) return { label: "Excellent", description: "Outstanding risk-adjusted returns" };
  if (sharpe >= 1) return { label: "Good", description: "Returns compensate well for risk" };
  if (sharpe >= 0.5) return { label: "Acceptable", description: "Moderate risk-adjusted returns" };
  if (sharpe >= 0) return { label: "Poor", description: "Returns barely compensate for risk" };
  return { label: "Negative", description: "Returns do not compensate for risk taken" };
}
