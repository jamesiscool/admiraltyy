import { Check, ChevronDown, ChevronUp, GripVertical, Loader2, Pencil, Trash2, X, Zap } from 'lucide-react'
import { useState } from 'react'
import type { Indexer } from './-types'

interface IndexerCardProps {
	indexer: Indexer
	isFirst: boolean
	isLast: boolean
	onEdit?: () => void
	onDelete?: () => void
	onTest?: () => Promise<boolean>
	onToggle?: (enabled: boolean) => void
	onMoveUp?: () => void
	onMoveDown?: () => void
	onSave?: (indexer: Indexer) => void
}

export function IndexerCard({ indexer, isFirst, isLast, onDelete, onTest, onToggle, onMoveUp, onMoveDown, onSave }: IndexerCardProps) {
	const [isEditing, setIsEditing] = useState(false)
	const [isTesting, setIsTesting] = useState(false)
	const [testResult, setTestResult] = useState<boolean | null>(null)
	const [editForm, setEditForm] = useState({
		name: indexer.name,
		url: indexer.url,
		apiKey: indexer.apiKey,
	})

	const handleTest = async () => {
		setIsTesting(true)
		setTestResult(null)
		try {
			const result = await onTest?.()
			setTestResult(result ?? true)
		} catch {
			setTestResult(false)
		} finally {
			setIsTesting(false)
			setTimeout(() => setTestResult(null), 3000)
		}
	}

	const handleSave = () => {
		onSave?.({
			...indexer,
			name: editForm.name,
			url: editForm.url,
			apiKey: editForm.apiKey,
		})
		setIsEditing(false)
	}

	const handleCancel = () => {
		setEditForm({
			name: indexer.name,
			url: indexer.url,
			apiKey: indexer.apiKey,
		})
		setIsEditing(false)
	}

	if (isEditing) {
		return (
			<div className="border-border border-b bg-primary/5 p-4 last:border-b-0">
				<div className="space-y-4">
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div>
							<span className="mb-1.5 block font-medium text-muted-foreground text-xs uppercase tracking-wider">Name</span>
							<input
								type="text"
								value={editForm.name}
								onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
								className="w-full rounded-sm border border-input bg-background px-3 py-2 text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
							/>
						</div>
						<div>
							<span className="mb-1.5 block font-medium text-muted-foreground text-xs uppercase tracking-wider">URL</span>
							<input
								type="text"
								value={editForm.url}
								onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
								className="w-full rounded-sm border border-input bg-background px-3 py-2 text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
							/>
						</div>
					</div>
					<div>
						<span className="mb-1.5 block font-medium text-muted-foreground text-xs uppercase tracking-wider">API Key</span>
						<input
							type="password"
							value={editForm.apiKey}
							onChange={(e) => setEditForm({ ...editForm, apiKey: e.target.value })}
							className="w-full rounded-sm border border-input bg-background px-3 py-2 font-mono text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
						/>
					</div>
					<div className="flex items-center justify-between pt-2">
						<button
							type="button"
							onClick={handleTest}
							disabled={isTesting}
							className="flex items-center gap-2 rounded-sm px-4 py-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-50"
						>
							{isTesting ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : testResult === true ? (
								<Check className="h-4 w-4 text-emerald-500" />
							) : testResult === false ? (
								<X className="h-4 w-4 text-destructive" />
							) : (
								<Zap className="h-4 w-4" />
							)}
							Test Connection
						</button>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={handleCancel}
								className="rounded-sm px-4 py-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleSave}
								className="rounded-sm bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90"
							>
								Save
							</button>
						</div>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 ${!isLast ? 'border-border border-b' : ''} ${!indexer.enabled ? 'opacity-60' : ''}`}>
			{/* Drag Handle */}
			<div className="cursor-grab text-muted-foreground active:cursor-grabbing">
				<GripVertical className="h-4 w-4" />
			</div>

			{/* Priority Badge */}
			<div className="flex h-8 w-8 items-center justify-center rounded-sm bg-muted font-bold text-muted-foreground text-sm">{indexer.priority}</div>

			{/* Indexer Info */}
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="truncate font-medium text-foreground">{indexer.name}</span>
					{!indexer.enabled && <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground text-xs">Disabled</span>}
				</div>
				<p className="truncate text-muted-foreground text-sm">{indexer.url}</p>
			</div>

			{/* Toggle */}
			<button
				type="button"
				onClick={() => onToggle?.(!indexer.enabled)}
				className={`relative h-6 w-10 rounded-full transition-colors ${indexer.enabled ? 'bg-primary' : 'bg-muted'}`}
			>
				<span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${indexer.enabled ? 'left-5' : 'left-1'}`} />
			</button>

			{/* Reorder Buttons */}
			<div className="flex items-center gap-0.5">
				<button
					type="button"
					onClick={onMoveUp}
					disabled={isFirst}
					className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
				>
					<ChevronUp className="h-4 w-4" />
				</button>
				<button
					type="button"
					onClick={onMoveDown}
					disabled={isLast}
					className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
				>
					<ChevronDown className="h-4 w-4" />
				</button>
			</div>

			{/* Edit Button */}
			<button
				type="button"
				onClick={() => setIsEditing(true)}
				className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
			>
				<Pencil className="h-4 w-4" />
			</button>

			{/* Delete Button */}
			<button
				type="button"
				onClick={onDelete}
				className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
			>
				<Trash2 className="h-4 w-4" />
			</button>
		</div>
	)
}
