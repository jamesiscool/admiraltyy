import { Check, Loader2, Pencil, Trash2, X, Zap } from 'lucide-react'
import { useState } from 'react'
import type { Indexer } from '@/../product/sections/settings/types'

interface IndexerCardProps {
	indexer: Indexer
	isFirst: boolean
	isLast: boolean
	onEdit?: () => void
	onDelete?: () => void
	onTest?: () => Promise<boolean>
	onToggle?: (enabled: boolean) => void
	onSave?: (indexer: Indexer) => void
}

export function IndexerCard({ indexer, isFirst, isLast, onEdit, onDelete, onTest, onToggle, onSave }: IndexerCardProps) {
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
			<div className="border-slate-200 border-b bg-blue-50/50 p-4 last:border-b-0 dark:border-slate-800 dark:bg-blue-950/20">
				<div className="space-y-4">
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div>
							<label className="mb-1.5 block font-medium text-slate-500 text-xs uppercase tracking-wider dark:text-slate-500">Name</label>
							<input
								type="text"
								value={editForm.name}
								onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
								className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-slate-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white"
							/>
						</div>
						<div>
							<label className="mb-1.5 block font-medium text-slate-500 text-xs uppercase tracking-wider dark:text-slate-500">URL</label>
							<input
								type="text"
								value={editForm.url}
								onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
								className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-slate-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white"
							/>
						</div>
					</div>
					<div>
						<label className="mb-1.5 block font-medium text-slate-500 text-xs uppercase tracking-wider dark:text-slate-500">API Key</label>
						<input
							type="password"
							value={editForm.apiKey}
							onChange={(e) => setEditForm({ ...editForm, apiKey: e.target.value })}
							className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 font-mono text-slate-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white"
						/>
					</div>
					<div className="flex items-center justify-between pt-2">
						<button
							onClick={handleTest}
							disabled={isTesting}
							className="flex items-center gap-2 rounded-sm px-4 py-2 font-medium text-slate-600 text-sm transition-colors hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-blue-950/30 dark:hover:text-blue-400"
						>
							{isTesting ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : testResult === true ? (
								<Check className="h-4 w-4 text-emerald-500" />
							) : testResult === false ? (
								<X className="h-4 w-4 text-red-500" />
							) : (
								<Zap className="h-4 w-4" />
							)}
							Test Connection
						</button>
						<div className="flex items-center gap-2">
							<button
								onClick={handleCancel}
								className="rounded-sm px-4 py-2 font-medium text-slate-600 text-sm transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
							>
								Cancel
							</button>
							<button
								onClick={handleSave}
								className="rounded-sm bg-blue-600 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-blue-700"
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
		<div
			className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
				!isLast ? 'border-slate-200 border-b dark:border-slate-800' : ''
			} ${!indexer.enabled ? 'opacity-60' : ''}`}
		>
			{/* Indexer Info */}
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="truncate font-medium text-slate-900 dark:text-white">{indexer.name}</span>
					{!indexer.enabled && <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-500 text-xs dark:bg-slate-800 dark:text-slate-400">Disabled</span>}
				</div>
				<p className="truncate text-slate-500 text-sm dark:text-slate-500">{indexer.url}</p>
			</div>

			{/* Toggle */}
			<button
				onClick={() => onToggle?.(!indexer.enabled)}
				className={`relative h-6 w-10 rounded-full transition-colors ${indexer.enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
			>
				<span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${indexer.enabled ? 'left-5' : 'left-1'}`} />
			</button>

			{/* Edit Button */}
			<button
				onClick={() => {
					setIsEditing(true)
					onEdit?.()
				}}
				className="rounded-sm p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
			>
				<Pencil className="h-4 w-4" />
			</button>

			{/* Delete Button */}
			<button
				onClick={onDelete}
				className="rounded-sm p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-950/50 dark:hover:text-red-400"
			>
				<Trash2 className="h-4 w-4" />
			</button>
		</div>
	)
}
