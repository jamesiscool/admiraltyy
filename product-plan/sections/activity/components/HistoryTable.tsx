import type { HistoryItem, HistoryStatus } from "@/../product/sections/activity/types";
import {
  CheckCircle,
  AlertCircle,
  Trash2,
  RotateCcw,
  Search,
  X,
  History,
} from "lucide-react";
import { useState, useMemo } from "react";

interface HistoryTableProps {
  items: HistoryItem[];
  onRetry?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClear?: () => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: HistoryStatus }) {
  switch (status) {
    case "completed":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
          <CheckCircle className="w-3 h-3" />
          Completed
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
          <AlertCircle className="w-3 h-3" />
          Failed
        </span>
      );
    case "removed":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          <Trash2 className="w-3 h-3" />
          Removed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {status}
        </span>
      );
  }
}

export function HistoryTable({
  items,
  onRetry,
  onDelete,
  onClear,
}: HistoryTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<HistoryStatus | "all">("all");

  const filteredItems = useMemo(() => {
    let result = [...items];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) =>
        item.title.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((item) => item.status === statusFilter);
    }

    return result;
  }, [items, searchQuery, statusFilter]);

  return (
    <div>
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-sm text-sm font-medium transition-all ${
              statusFilter === "all"
                ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800"
                : "bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter("completed")}
            className={`px-3 py-1.5 rounded-sm text-sm font-medium transition-all ${
              statusFilter === "completed"
                ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                : "bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setStatusFilter("failed")}
            className={`px-3 py-1.5 rounded-sm text-sm font-medium transition-all ${
              statusFilter === "failed"
                ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800"
                : "bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            Failed
          </button>
          <button
            onClick={() => setStatusFilter("removed")}
            className={`px-3 py-1.5 rounded-sm text-sm font-medium transition-all ${
              statusFilter === "removed"
                ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
                : "bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            Removed
          </button>
        </div>

        {/* Search and Clear History */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:flex-initial sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 rounded-sm bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:border-blue-500/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Clear History */}
          {items.length > 0 && (
            <button
              onClick={() => onClear?.()}
              className="px-4 py-1.5 rounded-sm border border-slate-300 dark:border-slate-700/50 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all whitespace-nowrap"
            >
              Clear History
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-slate-900/50 rounded-sm border border-slate-200 dark:border-slate-800">
          <div className="p-4 rounded-sm bg-slate-100 dark:bg-slate-800/30 mb-4">
            <History className="w-10 h-10 text-slate-400 dark:text-slate-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {items.length === 0 ? "No history yet" : "No results found"}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-500 max-w-sm">
            {items.length === 0
              ? "Completed downloads will appear here."
              : `No items match "${searchQuery}". Try a different search term.`}
          </p>
          {(searchQuery || statusFilter !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="mt-4 px-4 py-2 rounded-sm bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900/50 rounded-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                  <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-400 px-4 py-3">
                    Title
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-400 px-4 py-3 hidden sm:table-cell">
                    Date
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-400 px-4 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-400 px-4 py-3 hidden md:table-cell">
                    Size
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-400 px-4 py-3 hidden lg:table-cell">
                    Quality
                  </th>
                  <th className="text-right text-xs font-semibold text-slate-600 dark:text-slate-400 px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                      index !== filteredItems.length - 1
                        ? "border-b border-slate-200 dark:border-slate-800"
                        : ""
                    }`}
                  >
                    {/* Title */}
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {item.title}
                      </div>
                      {item.status === "failed" && item.errorMessage && (
                        <div className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                          {item.errorMessage}
                        </div>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {formatDate(item.timestamp)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>

                    {/* Size */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {item.size}
                      </span>
                    </td>

                    {/* Quality */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {item.quality.split(" ")[0]}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {item.status === "failed" && (
                          <button
                            onClick={() => onRetry?.(item.id)}
                            className="p-1.5 rounded-sm text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                            title="Retry"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onDelete?.(item.id)}
                          className="p-1.5 rounded-sm text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

