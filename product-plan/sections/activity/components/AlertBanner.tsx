import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import type { ActivityAlert } from '@/../product/sections/activity/types'

interface AlertBannerProps {
	alerts: ActivityAlert[]
	onDismiss?: (id: string) => void
}

export function AlertBanner({ alerts, onDismiss }: AlertBannerProps) {
	if (alerts.length === 0) return null

	return (
		<div className="space-y-2">
			{alerts.map((alert) => {
				const Icon = alert.type === 'error' ? AlertCircle : alert.type === 'warning' ? AlertTriangle : Info

				const colorClasses = {
					error: 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-200',
					warning: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200',
					info: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-900/50 text-blue-800 dark:text-blue-200',
				}

				const iconClasses = {
					error: 'text-red-500 dark:text-red-400',
					warning: 'text-amber-500 dark:text-amber-400',
					info: 'text-blue-500 dark:text-blue-400',
				}

				return (
					<div
						key={alert.id}
						className={`flex items-center gap-3 rounded-sm border px-4 py-3 ${colorClasses[alert.type]}`}
					>
						<Icon className={`h-5 w-5 flex-shrink-0 ${iconClasses[alert.type]}`} />
						<p className="flex-1 font-medium text-sm">{alert.message}</p>
						{alert.dismissible && (
							<button
								onClick={() => onDismiss?.(alert.id)}
								className="rounded-sm p-1 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
								aria-label="Dismiss alert"
							>
								<X className="h-4 w-4" />
							</button>
						)}
					</div>
				)
			})}
		</div>
	)
}
