import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface Column<T> {
  key: keyof T | string;
  header: string;
  align?: "left" | "center" | "right";
  width?: string;
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField?: keyof T;
  className?: string;
  compact?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  stickyHeader?: boolean;
  maxHeight?: string;
  onRowClick?: (row: T, index: number) => void;
  emptyMessage?: string;
}

type SortDirection = "asc" | "desc" | null;

/**
 * Professional data table component - Bloomberg Terminal style
 * Dense, monospace numbers, sortable columns
 */
export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  keyField,
  className,
  compact = true,
  striped = true,
  hoverable = true,
  stickyHeader = false,
  maxHeight,
  onRowClick,
  emptyMessage = "No data available",
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(null);

  const handleSort = (column: Column<T>) => {
    if (!column.sortable) return;

    const key = String(column.key);
    if (sortColumn === key) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortColumn(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortColumn(key);
      setSortDirection("asc");
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortColumn || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [data, sortColumn, sortDirection]);

  const getValue = (row: T, key: string): unknown => {
    if (key.includes(".")) {
      return key.split(".").reduce((obj: unknown, k: string) => {
        if (obj && typeof obj === "object") {
          return (obj as Record<string, unknown>)[k];
        }
        return undefined;
      }, row);
    }
    return row[key];
  };

  const cellPadding = compact ? "px-2 py-1.5" : "px-3 py-2";
  const fontSize = compact ? "text-xs" : "text-sm";

  return (
    <div
      className={cn(
        "relative overflow-auto rounded-lg border border-zinc-800",
        className
      )}
      style={{ maxHeight }}
    >
      <table className="w-full border-collapse">
        <thead
          className={cn(
            "bg-zinc-900",
            stickyHeader && "sticky top-0 z-10"
          )}
        >
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={cn(
                  cellPadding,
                  fontSize,
                  "font-medium text-zinc-400 uppercase tracking-wider border-b border-zinc-800",
                  column.align === "center" && "text-center",
                  column.align === "right" && "text-right",
                  column.sortable && "cursor-pointer select-none hover:text-zinc-200",
                  column.className
                )}
                style={{ width: column.width }}
                onClick={() => handleSort(column)}
              >
                <div className={cn(
                  "flex items-center gap-1",
                  column.align === "center" && "justify-center",
                  column.align === "right" && "justify-end"
                )}>
                  {column.header}
                  {column.sortable && (
                    <span className="text-zinc-600">
                      {sortColumn === String(column.key) ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="w-3 h-3" />
                        ) : (
                          <ArrowDown className="w-3 h-3" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3" />
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className={cn(cellPadding, fontSize, "text-center text-zinc-500 py-8")}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((row, rowIndex) => (
              <tr
                key={keyField ? String(row[keyField]) : rowIndex}
                className={cn(
                  striped && rowIndex % 2 === 1 && "bg-zinc-900/50",
                  hoverable && "hover:bg-zinc-800/50 transition-colors",
                  onRowClick && "cursor-pointer"
                )}
                onClick={() => onRowClick?.(row, rowIndex)}
              >
                {columns.map((column) => {
                  const value = getValue(row, String(column.key));
                  return (
                    <td
                      key={String(column.key)}
                      className={cn(
                        cellPadding,
                        fontSize,
                        "text-zinc-300 border-b border-zinc-800/50",
                        column.align === "center" && "text-center",
                        column.align === "right" && "text-right",
                        // Numbers get monospace font
                        typeof value === "number" && "font-mono",
                        column.className
                      )}
                    >
                      {column.render
                        ? column.render(value, row, rowIndex)
                        : String(value ?? "-")}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Utility function to format numbers for display
 */
export function formatTableNumber(
  value: number | null | undefined,
  options: {
    decimals?: number;
    prefix?: string;
    suffix?: string;
    colorCode?: boolean;
  } = {}
): React.ReactNode {
  if (value === null || value === undefined) return "-";

  const { decimals = 2, prefix = "", suffix = "", colorCode = false } = options;
  const formatted = `${prefix}${value.toFixed(decimals)}${suffix}`;

  if (colorCode) {
    const color = value > 0 ? "text-green-500" : value < 0 ? "text-red-500" : "text-zinc-400";
    return <span className={color}>{formatted}</span>;
  }

  return formatted;
}

/**
 * Utility function to format percentages
 */
export function formatTablePercent(
  value: number | null | undefined,
  colorCode = true
): React.ReactNode {
  return formatTableNumber(value, {
    decimals: 2,
    suffix: "%",
    colorCode,
  });
}

/**
 * Utility function to format currency
 */
export function formatTableCurrency(
  value: number | null | undefined,
  currency = "$"
): React.ReactNode {
  if (value === null || value === undefined) return "-";

  const absValue = Math.abs(value);
  let formatted: string;

  if (absValue >= 1_000_000_000) {
    formatted = `${currency}${(value / 1_000_000_000).toFixed(2)}B`;
  } else if (absValue >= 1_000_000) {
    formatted = `${currency}${(value / 1_000_000).toFixed(2)}M`;
  } else if (absValue >= 1_000) {
    formatted = `${currency}${(value / 1_000).toFixed(2)}K`;
  } else {
    formatted = `${currency}${value.toFixed(2)}`;
  }

  const color = value > 0 ? "text-green-500" : value < 0 ? "text-red-500" : "text-zinc-400";
  return <span className={color}>{formatted}</span>;
}

export default DataTable;
