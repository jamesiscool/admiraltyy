import type { ActivityProps } from "@/../product/sections/activity/types";
import { AlertBanner } from "./AlertBanner";
import { QueueTable } from "./QueueTable";
import { HistoryTable } from "./HistoryTable";

export function Activity({
  alerts,
  queue,
  history,
  onDismissAlert,
  onPause,
  onResume,
  onCancel,
  onReorder,
  onRetry,
  onDeleteHistory,
  onClearHistory,
}: ActivityProps) {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-950">
      <div className="flex-1 max-w-[1400px] mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-4">
          Activity
        </h1>

        {/* Alert Banner */}
        {alerts.length > 0 && (
          <div className="mb-6">
            <AlertBanner alerts={alerts} onDismiss={onDismissAlert} />
          </div>
        )}

        {/* Queue Section */}
        <section className="mb-8 sm:mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Queue
            </h2>
            {(() => {
              const downloadingItems = queue.filter((q) => q.status === "downloading");
              if (downloadingItems.length === 0) return null;
              
              const totalSpeed = downloadingItems.reduce((total, item) => {
                const speedValue = parseFloat(item.speed.replace(/[^\d.]/g, ""));
                return total + (isNaN(speedValue) ? 0 : speedValue);
              }, 0);

              // Mock histogram data (simulating last 36 speed samples)
              const histogramBars = [
                25, 30, 35, 42, 48, 55, 52, 58, 65, 68, 72, 70,
                65, 70, 75, 78, 82, 85, 80, 78, 82, 88, 85, 90,
                88, 92, 95, 90, 88, 92, 95, 98, 95, 92, 95, 98
              ];
              
              return (
                <div className="flex items-center gap-3">
                  {/* Speed Histogram */}
                  <div className="flex items-end h-5 rounded-b-xs overflow-hidden">
                    {histogramBars.map((height, i) => (
                      <div
                        key={i}
                        className="w-[2px] bg-blue-500 dark:bg-blue-400"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                  <div className="text-lg text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {totalSpeed.toFixed(1)} MB/s
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="bg-white dark:bg-slate-900/50 rounded-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <QueueTable
              items={queue}
              onPause={onPause}
              onResume={onResume}
              onCancel={onCancel}
              onReorder={onReorder}
            />
          </div>


        </section>

        {/* History Section */}
        <section>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-3">
            History
          </h2>

          <HistoryTable
            items={history}
            onRetry={onRetry}
            onDelete={onDeleteHistory}
            onClear={onClearHistory}
          />
        </section>
      </div>
    </div>
  );
}
