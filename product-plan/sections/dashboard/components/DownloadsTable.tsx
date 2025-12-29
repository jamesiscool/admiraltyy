import type { RecentDownload } from "@/../product/sections/dashboard/types";
import { Film, Tv, Download, AlertCircle, HardDrive } from "lucide-react";

interface DownloadsTableProps {
  downloads: RecentDownload[];
  onDownloadClick?: (download: RecentDownload) => void;
}

/**
 * Format bytes to a human-readable size.
 */
function formatSize(bytes: number): string {
  if (bytes === 0) return "—";
  const gb = bytes / 1_000_000_000;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / 1_000_000;
  return `${mb.toFixed(0)} MB`;
}

/**
 * Format date to relative or short format.
 */
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

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Get status badge component matching Activity view style.
 */
function StatusBadge({ status }: { status: RecentDownload["status"] }) {
  switch (status) {
    case "downloading":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
          <Download className="w-3 h-3" />
          Downloading
        </span>
      );
    case "importing":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
          <Download className="w-3 h-3" />
          Importing
        </span>
      );
    case "completed":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
          <HardDrive className="w-3 h-3" />
          Complete
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
          <AlertCircle className="w-3 h-3" />
          Failed
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

export function DownloadsTable({
  downloads,
  onDownloadClick,
}: DownloadsTableProps) {
  if (downloads.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
        No recent downloads
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
            <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-400 pl-10 pr-4 py-3">
              Title
            </th>
            <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-400 px-4 py-3 hidden sm:table-cell">
              Progress
            </th>
            <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-400 px-4 py-3 hidden md:table-cell">
              Quality
            </th>
            <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-400 px-4 py-3 hidden lg:table-cell">
              Size
            </th>
            <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-400 px-4 py-3 hidden xl:table-cell">
              Date
            </th>
            <th className="text-right text-xs font-semibold text-slate-600 dark:text-slate-400 px-4 py-3">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {downloads.slice(0, 10).map((download, index) => (
            <tr
              key={download.id}
              onClick={() => onDownloadClick?.(download)}
              className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                index !== downloads.slice(0, 10).length - 1
                  ? "border-b border-slate-200 dark:border-slate-800"
                  : ""
              }`}
            >
              {/* Title with Icon */}
              <td className="pl-3 pr-4 py-3">
                <div className="flex items-center gap-3">
                  {download.type === "movie" ? (
                    <Film className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400" />
                  ) : (
                    <Tv className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400" />
                  )}
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {download.title}
                  </span>
                </div>
              </td>

              {/* Progress */}
              <td className="px-4 py-3 hidden sm:table-cell">
                {download.status === "downloading" ? (
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
                        style={{ width: `${download.progress}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                      {download.progress.toFixed(1)}%
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-slate-500 dark:text-slate-500">—</span>
                )}
              </td>

              {/* Quality */}
              <td className="px-4 py-3 hidden md:table-cell">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {download.quality}
                </span>
              </td>

              {/* Size */}
              <td className="px-4 py-3 hidden lg:table-cell">
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {formatSize(download.size)}
                </span>
              </td>

              {/* Date */}
              <td className="px-4 py-3 hidden xl:table-cell">
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {formatDate(download.dateDownloaded)}
                </span>
              </td>

              {/* Status */}
              <td className="px-4 py-3">
                <div className="flex justify-end">
                  <StatusBadge status={download.status} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
