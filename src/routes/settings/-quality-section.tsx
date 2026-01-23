import { useState } from 'react'

interface QualityTier {
	id: string
	name: string
	resolution: 480 | 720 | 1080 | 2160
	minGbPerHour: number
	targetGbPerHour: number
	maxGbPerHour: number
}

interface QualitySectionProps {
	qualityTiers: QualityTier[]
	onUpdate?: (tier: QualityTier) => void
}

const RESOLUTION_COLORS: Record<number, { bg: string; text: string }> = {
	480: {
		bg: 'bg-muted',
		text: 'text-muted-foreground',
	},
	720: {
		bg: 'bg-sky-100',
		text: 'text-sky-600',
	},
	1080: {
		bg: 'bg-blue-100',
		text: 'text-blue-600',
	},
	2160: {
		bg: 'bg-violet-100',
		text: 'text-violet-600',
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
		<div className="overflow-hidden rounded-sm border border-border bg-card">
			{/* Header */}
			<div className="grid grid-cols-[100px_1fr_1fr_1fr_auto] gap-4 border-border border-b bg-muted/50 px-4 py-3">
				<div className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">Resolution</div>
				<div className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">Min GB/hr</div>
				<div className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">Target GB/hr</div>
				<div className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">Max GB/hr</div>
				<div className="w-16" />
			</div>

			{/* Tiers */}
			{qualityTiers.map((tier, index) => {
				const colors = RESOLUTION_COLORS[tier.resolution] || RESOLUTION_COLORS[1080]
				const isEditing = editingId === tier.id

				return (
					<div
						key={tier.id}
						className={`grid grid-cols-[100px_1fr_1fr_1fr_auto] items-center gap-4 px-4 py-3 ${index !== qualityTiers.length - 1 ? 'border-border border-b' : ''}`}
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
										className="w-full rounded-sm border border-input bg-background px-3 py-1.5 text-foreground text-sm focus:ring-2 focus:ring-primary/20"
									/>
								</div>
								<div>
									<input
										type="number"
										value={editValues.target}
										onChange={(e) => setEditValues({ ...editValues, target: Number(e.target.value) })}
										className="w-full rounded-sm border border-input bg-background px-3 py-1.5 text-foreground text-sm focus:ring-2 focus:ring-primary/20"
									/>
								</div>
								<div>
									<input
										type="number"
										value={editValues.max}
										onChange={(e) => setEditValues({ ...editValues, max: Number(e.target.value) })}
										className="w-full rounded-sm border border-input bg-background px-3 py-1.5 text-foreground text-sm focus:ring-2 focus:ring-primary/20"
									/>
								</div>
								<div className="flex items-center gap-1">
									<button
										type="button"
										onClick={cancelEditing}
										className="px-2 py-1 font-medium text-muted-foreground text-xs hover:text-foreground"
									>
										Cancel
									</button>
									<button
										type="button"
										onClick={() => saveEditing(tier)}
										className="rounded-sm bg-primary px-3 py-1 font-medium text-primary-foreground text-xs hover:bg-primary/90"
									>
										Save
									</button>
								</div>
							</>
						) : (
							<>
								{/* Display Values */}
								<div className="font-mono text-foreground/80 text-sm">{formatSize(tier.minGbPerHour)}</div>
								<div className="font-mono font-semibold text-foreground text-sm">{formatSize(tier.targetGbPerHour)}</div>
								<div className="font-mono text-foreground/80 text-sm">{formatSize(tier.maxGbPerHour)}</div>
								<div>
									<button
										type="button"
										onClick={() => startEditing(tier)}
										className="rounded-sm px-3 py-1 font-medium text-muted-foreground text-xs transition-colors hover:bg-primary/10 hover:text-primary"
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
