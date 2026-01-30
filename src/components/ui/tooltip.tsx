"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { HelpCircle, Info, X } from "lucide-react";

interface TooltipProps {
  content: string | React.ReactNode;
  children?: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  icon?: "help" | "info" | "none";
  className?: string;
}

export function Tooltip({
  content,
  children,
  side = "top",
  icon = "help",
  className,
}: TooltipProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const tooltipRef = React.useRef<HTMLDivElement>(null);

  // Close on click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-zinc-800 border-x-transparent border-b-transparent",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-zinc-800 border-x-transparent border-t-transparent",
    left: "left-full top-1/2 -translate-y-1/2 border-l-zinc-800 border-y-transparent border-r-transparent",
    right: "right-full top-1/2 -translate-y-1/2 border-r-zinc-800 border-y-transparent border-l-transparent",
  };

  const IconComponent = icon === "help" ? HelpCircle : icon === "info" ? Info : null;

  return (
    <div ref={tooltipRef} className={cn("relative inline-flex items-center", className)}>
      {children}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="ml-1 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
        aria-label="Show help"
      >
        {IconComponent && <IconComponent className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute z-50 w-64 p-3 text-sm bg-zinc-800 text-zinc-100 rounded-lg shadow-xl border border-zinc-700",
            "animate-in fade-in-0 zoom-in-95 duration-200",
            positionClasses[side]
          )}
        >
          {/* Arrow */}
          <div
            className={cn(
              "absolute w-0 h-0 border-[6px]",
              arrowClasses[side]
            )}
          />
          {content}
        </div>
      )}
    </div>
  );
}

// Wrapper component for labels with tooltips
interface LabelWithTooltipProps {
  label: string;
  tooltip: string;
  htmlFor?: string;
  className?: string;
}

export function LabelWithTooltip({ label, tooltip, htmlFor, className }: LabelWithTooltipProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      <Tooltip content={tooltip} side="right" />
    </div>
  );
}

// Tutorial card component for module introductions
interface TutorialCardProps {
  title: string;
  description: string;
  steps?: string[];
  onDismiss?: () => void;
  className?: string;
}

export function TutorialCard({ title, description, steps, onDismiss, className }: TutorialCardProps) {
  const [isDismissed, setIsDismissed] = React.useState(false);

  // Check localStorage on mount
  React.useEffect(() => {
    const dismissed = localStorage.getItem(`tutorial-dismissed-${title}`);
    if (dismissed === "true") {
      setIsDismissed(true);
    }
  }, [title]);

  const handleDismiss = () => {
    localStorage.setItem(`tutorial-dismissed-${title}`, "true");
    setIsDismissed(true);
    onDismiss?.();
  };

  if (isDismissed) return null;

  return (
    <div
      className={cn(
        "relative p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20",
        className
      )}
    >
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary transition-colors"
        aria-label="Dismiss tutorial"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-blue-500/20">
          <Info className="h-5 w-5 text-blue-400" />
        </div>
        <div className="flex-1 pr-6">
          <h3 className="font-semibold text-sm mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground mb-2">{description}</p>
          {steps && steps.length > 0 && (
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              {steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

// Term definition component for inline explanations
interface TermProps {
  term: string;
  definition: string;
  className?: string;
}

export function Term({ term, definition, className }: TermProps) {
  return (
    <Tooltip content={definition} side="top">
      <span
        className={cn(
          "border-b border-dotted border-muted-foreground cursor-help",
          className
        )}
      >
        {term}
      </span>
    </Tooltip>
  );
}
