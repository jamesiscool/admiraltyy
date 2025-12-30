import type { ActivityProps } from '@/../product/sections/activity/types'
import { AlertBanner } from './AlertBanner'
import { HistoryTable } from './HistoryTable'
import { QueueTable } from './QueueTable'

export function Activity({ alerts, queue, history, onDismissAlert, onPause, onResume, onCancel, onReorder, onRetry, onDeleteHistory, onClearHistory }: ActivityProps) {
	return (
		<div className="flex min-h-screen flex-col bg-white dark:bg-slate-950">
			<div className="mx-auto w-full max-w-content flex-1 px-4 py-6 sm:px-6 sm:py-8">
				{/* Header */}
				<h1 className="mb-4 font-bold text-2xl text-slate-900 tracking-tight dark:text-white">Activity</h1>

				{/* Alert Banner */}
				{alerts.length > 0 && (
					<div className="mb-6">
						<AlertBanner
							alerts={alerts}
							onDismiss={onDismissAlert}
						/>
					</div>
				)}

				{/* Queue Section */}
				<section className="mb-8 sm:mb-12">
					<div className="mb-4 flex items-center justify-between">
						<h2 className="font-bold text-lg text-slate-900 tracking-tight sm:text-xl dark:text-white">Queue</h2>
						{(() => {
							const downloadingItems = queue.filter((q) => q.status === 'downloading')
							if (downloadingItems.length === 0) return null

							const totalSpeed = downloadingItems.reduce((total, item) => {
								const speedValue = parseFloat(item.speed.replace(/[^\d.]/g, ''))
								return total + (isNaN(speedValue) ? 0 : speedValue)
							}, 0)

							// Mock histogram data (simulating last 36 speed samples)
							const histogramBars = [25, 30, 35, 42, 48, 55, 52, 58, 65, 68, 72, 70, 65, 70, 75, 78, 82, 85, 80, 78, 82, 88, 85, 90, 88, 92, 95, 90, 88, 92, 95, 98, 95, 92, 95, 98]

							return (
								<div className="flex items-center gap-3">
									{/* Speed Histogram */}
									<div className="flex h-5 items-end overflow-hidden rounded-b-xs">
										{histogramBars.map((height, i) => (
											<div
												key={i}
												className="w-[2px] bg-blue-500 dark:bg-blue-400"
												style={{ height: `${height}%` }}
											/>
										))}
									</div>
									<div className="text-lg text-slate-600 dark:text-slate-400">
										<span className="font-semibold text-slate-900 dark:text-white">{totalSpeed.toFixed(1)} MB/s</span>
									</div>
								</div>
							)
						})()}
					</div>

					<div className="overflow-hidden rounded-sm border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50">
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
					<h2 className="mb-3 font-bold text-lg text-slate-900 tracking-tight sm:text-xl dark:text-white">History</h2>

					<HistoryTable
						items={history}
						onRetry={onRetry}
						onDelete={onDeleteHistory}
						onClear={onClearHistory}
					/>
				</section>
			</div>
		</div>
	)
}
