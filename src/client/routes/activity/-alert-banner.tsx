import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

export type AlertType = 'info' | 'warning' | 'error'

export interface ActivityAlert {
	id: string
	type: AlertType
	message: string
	dismissible: boolean
}

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
					error: 'bg-red-100 border-red-200 text-red-700',
					warning: 'bg-yellow-100 border-yellow-200 text-yellow-700',
					info: 'bg-blue-100 border-blue-200 text-blue-700',
				}

				const iconClasses = {
					error: 'text-red-500',
					warning: 'text-yellow-500',
					info: 'text-blue-500',
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
								type="button"
								onClick={() => onDismiss?.(alert.id)}
								className="rounded-sm p-1 transition-colors hover:bg-black/10"
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
