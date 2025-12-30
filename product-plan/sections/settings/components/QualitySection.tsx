import { useState } from 'react'
import type { QualityTier } from '@/../product/sections/settings/types'

interface QualitySectionProps {
	qualityTiers: QualityTier[]
	onUpdate?: (tier: QualityTier) => void
}

const RESOLUTION_COLORS: Record<number, { bg: string; text: string; accent: string }> = {
	480: {
		bg: 'bg-slate-100 dark:bg-slate-800',
		text: 'text-slate-600 dark:text-slate-400',
		accent: 'bg-slate-400',
	},
	720: {
		bg: 'bg-sky-100 dark:bg-sky-950',
		text: 'text-sky-600 dark:text-sky-400',
		accent: 'bg-sky-500',
	},
	1080: {
		bg: 'bg-blue-100 dark:bg-blue-950',
		text: 'text-blue-600 dark:text-blue-400',
		accent: 'bg-blue-500',
	},
	2160: {
		bg: 'bg-violet-100 dark:bg-violet-950',
		text: 'text-violet-600 dark:text-violet-400',
		accent: 'bg-violet-500',
	},
}

function formatSize(gbPerHour: number): string {
	if (gbPerHour < 1) {
		return gbPerHour.toFixed(1)
	}
	return String(gbPerHour)
}

export function QualitySection({ qualityTiers, onUpdate }: QualitySectionProps) {
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editValues, setEditValues] = useState<{
		min: number
		target: number
		max: number
	} | null>(null)

	const startEditing = (tier: QualityTier) => {
		setEditingId(tier.id)
		setEditValues({
			min: tier.minGbPerHour,
			target: tier.targetGbPerHour,
			max: tier.maxGbPerHour,
		})
	}

	const saveEditing = (tier: QualityTier) => {
		if (editValues) {
			onUpdate?.({
				...tier,
				minGbPerHour: editValues.min,
				targetGbPerHour: editValues.target,
				maxGbPerHour: editValues.max,
			})
		}
		setEditingId(null)
		setEditValues(null)
	}

	const cancelEditing = () => {
		setEditingId(null)
		setEditValues(null)
	}

	return (
		<div className="overflow-hidden rounded-sm border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50">
			{/* Header */}
			<div className="grid grid-cols-[100px_1fr_1fr_1fr_auto] gap-4 border-slate-200 border-b bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
				<div className="font-semibold text-slate-500 text-xs uppercase tracking-wider dark:text-slate-500">Resolution</div>
				<div className="font-semibold text-slate-500 text-xs uppercase tracking-wider dark:text-slate-500">Min GB/hr</div>
				<div className="font-semibold text-slate-500 text-xs uppercase tracking-wider dark:text-slate-500">Target GB/hr</div>
				<div className="font-semibold text-slate-500 text-xs uppercase tracking-wider dark:text-slate-500">Max GB/hr</div>
				<div className="w-16" />
			</div>

			{/* Tiers */}
			{qualityTiers.map((tier, index) => {
				const colors = RESOLUTION_COLORS[tier.resolution] || RESOLUTION_COLORS[1080]
				const isEditing = editingId === tier.id

				return (
					<div
						key={tier.id}
						className={`grid grid-cols-[100px_1fr_1fr_1fr_auto] items-center gap-4 px-4 py-3 ${index !== qualityTiers.length - 1 ? 'border-slate-200 border-b dark:border-slate-800' : ''}`}
					>
						{/* Resolution Badge */}
						<div>
							<span className={`inline-flex items-center rounded-sm px-3 py-1 font-bold text-sm ${colors.bg} ${colors.text}`}>{tier.name}</span>
						</div>

						{isEditing && editValues ? (
							<>
								{/* Editable Inputs */}
								<div>
									<input
										type="number"
										value={editValues.min}
										onChange={(e) => setEditValues({ ...editValues, min: Number(e.target.value) })}
										className="w-full rounded-sm border border-slate-300 bg-slate-50 px-3 py-1.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white"
									/>
								</div>
								<div>
									<input
										type="number"
										value={editValues.target}
										onChange={(e) =>
											setEditValues({
												...editValues,
												target: Number(e.target.value),
											})
										}
										className="w-full rounded-sm border border-slate-300 bg-slate-50 px-3 py-1.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white"
									/>
								</div>
								<div>
									<input
										type="number"
										value={editValues.max}
										onChange={(e) => setEditValues({ ...editValues, max: Number(e.target.value) })}
										className="w-full rounded-sm border border-slate-300 bg-slate-50 px-3 py-1.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white"
									/>
								</div>
								<div className="flex items-center gap-1">
									<button
										onClick={cancelEditing}
										className="px-2 py-1 font-medium text-slate-500 text-xs hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
									>
										Cancel
									</button>
									<button
										onClick={() => saveEditing(tier)}
										className="rounded-sm bg-blue-600 px-3 py-1 font-medium text-white text-xs hover:bg-blue-700"
									>
										Save
									</button>
								</div>
							</>
						) : (
							<>
								{/* Display Values */}
								<div className="font-mono text-slate-700 text-sm dark:text-slate-300">{formatSize(tier.minGbPerHour)}</div>
								<div className="font-mono font-semibold text-slate-900 text-sm dark:text-white">{formatSize(tier.targetGbPerHour)}</div>
								<div className="font-mono text-slate-700 text-sm dark:text-slate-300">{formatSize(tier.maxGbPerHour)}</div>
								<div>
									<button
										onClick={() => startEditing(tier)}
										className="rounded-sm px-3 py-1 font-medium text-slate-500 text-xs transition-colors hover:bg-blue-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-blue-950/30 dark:hover:text-blue-400"
									>
										Edit
									</button>
								</div>
							</>
						)}
					</div>
				)
			})}
		</div>
	)
}
