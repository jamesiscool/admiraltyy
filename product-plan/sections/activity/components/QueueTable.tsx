import type { QueueItem } from "@/../product/sections/activity/types";
import {
  Pause,
  Play,
  X,
  ChevronUp,
  ChevronDown,
  Download,
  Clock,
  Package,
  CheckCircle2,
  ListOrdered,
  Zap,
  GripVertical,
} from "lucide-react";

interface QueueTableProps {
  items: QueueItem[];
  speed?: string;
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
  onCancel?: (id: string) => void;
  onReorder?: (id: string, direction: "up" | "down") => void;
  onForceStart?: (id: string) => void;
}

function StatusBadge({ status }: { status: QueueItem["status"] }) {
  switch (status) {
    case "downloading":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
          <Download className="w-3 h-3" />
          Downloading
        </span>
      );
    case "paused":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          <Pause className="w-3 h-3" />
          Paused
        </span>
      );
    case "queued":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          <Clock className="w-3 h-3" />
          Queued
        </span>
      );
    case "unpacking":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
          <Package className="w-3 h-3" />
          Unpacking
        </span>
      );
    case "verifying":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
          <CheckCircle2 className="w-3 h-3" />
          Verifying
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

export function QueueTable({
  items,
  onPause,
  onResume,
  onCancel,
  onReorder,
  onForceStart,
}: QueueTableProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 rounded-sm bg-slate-100 dark:bg-slate-800/30 mb-4">
          <ListOrdered className="w-10 h-10 text-slate-400 dark:text-slate-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Queue is empty
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-500 max-w-sm">
          No active downloads. Add movies or TV shows to start downloading.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
            <th className="w-10 px-2 py-3"></th>
            <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-400 px-4 py-3">
              Title
            </th>
            <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-400 px-4 py-3 hidden sm:table-cell">
              Progress
            </th>
            <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-400 px-4 py-3 hidden lg:table-cell">
              ETA
            </th>
            <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-400 px-4 py-3 hidden lg:table-cell">
              Size
            </th>
            <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-400 px-4 py-3 hidden lg:table-cell">
              Quality
            </th>
            <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-400 px-4 py-3">
              Status
            </th>
            <th className="text-center text-xs font-semibold text-slate-600 dark:text-slate-400 px-2 py-3 w-16">
              Order
            </th>
            <th className="text-right text-xs font-semibold text-slate-600 dark:text-slate-400 px-4 py-3">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr
              key={item.id}
              className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                index !== items.length - 1
                  ? "border-b border-slate-200 dark:border-slate-800"
                  : ""
              }`}
            >
              {/* Drag Handle */}
              <td className="px-2 py-3">
                <div className="text-slate-400 dark:text-slate-600 cursor-grab active:cursor-grabbing">
                  <GripVertical className="w-4 h-4" />
                </div>
              </td>

              {/* Title */}
              <td className="px-4 py-3">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {item.title}
                </div>
              </td>

              {/* Progress */}
              <td className="px-4 py-3 hidden sm:table-cell">
                <div className="flex items-center gap-3">
                  <div className="w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        item.status === "paused"
                          ? "bg-slate-400 dark:bg-slate-500"
                          : "bg-blue-600 dark:bg-blue-500"
                      }`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                    {item.progress.toFixed(1)}%
                  </span>
                </div>
              </td>

              {/* ETA */}
              <td className="px-4 py-3 hidden lg:table-cell">
                <span className="text-sm text-slate-700 dark:text-slate-300 tabular-nums">
                  {item.eta}
                </span>
              </td>

              {/* Size */}
              <td className="px-4 py-3 hidden lg:table-cell">
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

              {/* Status */}
              <td className="px-4 py-3">
                <StatusBadge status={item.status} />
              </td>

              {/* Order */}
              <td className="px-2 py-3">
                <div className="flex items-center justify-center gap-0.5">
                  <button
                    onClick={() => onReorder?.(item.id, "up")}
                    disabled={index === 0}
                    className="p-1 rounded-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Move up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onReorder?.(item.id, "down")}
                    disabled={index === items.length - 1}
                    className="p-1 rounded-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Move down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </td>

              {/* Actions */}
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  {/* Pause/Resume */}
                  {item.status === "paused" ? (
                    <button
                      onClick={() => onResume?.(item.id)}
                      className="p-1.5 rounded-sm text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                      title="Resume"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  ) : item.status === "downloading" ? (
                    <button
                      onClick={() => onPause?.(item.id)}
                      className="p-1.5 rounded-sm text-slate-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors"
                      title="Pause"
                    >
                      <Pause className="w-4 h-4" />
                    </button>
                  ) : null}

                  {/* Force Start (for queued items) */}
                  {item.status === "queued" && (
                    <button
                      onClick={() => onForceStart?.(item.id)}
                      className="p-1.5 rounded-sm text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                      title="Force start"
                    >
                      <Zap className="w-4 h-4" />
                    </button>
                  )}

                  {/* Cancel */}
                  <button
                    onClick={() => onCancel?.(item.id)}
                    className="p-1.5 rounded-sm text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

