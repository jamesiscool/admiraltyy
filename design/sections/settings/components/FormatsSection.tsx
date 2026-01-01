import { ChevronDown, ChevronUp, GripVertical, Pencil, Plus, X } from 'lucide-react'
import { useState } from 'react'
import type { FormatPreference, FormatSettings } from '@/../product/sections/settings/types'

interface FormatsSectionProps {
	settings: FormatSettings
	onReorderCodecs?: (ids: string[]) => void
	onReorderHdr?: (ids: string[]) => void
	onReorderAudio?: (ids: string[]) => void
	onAddFormat?: (type: 'codec' | 'hdr' | 'audio', name: string) => void
	onRemoveFormat?: (type: 'codec' | 'hdr' | 'audio', id: string) => void
	onUpdateMatchTerms?: (type: 'codec' | 'hdr' | 'audio', id: string, matchTerms: string[]) => void
	onUpdateExcludeTerms?: (type: 'codec' | 'hdr' | 'audio', id: string, excludeTerms: string[]) => void
}

interface FormatListProps {
	title: string
	description: string
	items: FormatPreference[]
	onReorder: (ids: string[]) => void
	onAdd: (name: string) => void
	onRemove: (id: string) => void
	onUpdateMatchTerms: (id: string, matchTerms: string[]) => void
	onUpdateExcludeTerms: (id: string, excludeTerms: string[]) => void
}

function FormatList({ title, description, items, onReorder, onAdd, onRemove, onUpdateMatchTerms, onUpdateExcludeTerms }: FormatListProps) {
	const [expandedId, setExpandedId] = useState<string | null>(null)
	const [showAddInput, setShowAddInput] = useState(false)
	const [newFormatName, setNewFormatName] = useState('')
	const [editingMatchTerms, setEditingMatchTerms] = useState<Record<string, string>>({})
	const [editingExcludeTerms, setEditingExcludeTerms] = useState<Record<string, string>>({})

	const moveUp = (index: number) => {
		if (index === 0) return
		const ids = items.map((i) => i.id)
		;[ids[index - 1], ids[index]] = [ids[index], ids[index - 1]]
		onReorder(ids)
	}

	const moveDown = (index: number) => {
		if (index === items.length - 1) return
		const ids = items.map((i) => i.id)
		;[ids[index], ids[index + 1]] = [ids[index + 1], ids[index]]
		onReorder(ids)
	}

	const handleAdd = () => {
		if (newFormatName.trim()) {
			onAdd(newFormatName.trim())
			setNewFormatName('')
			setShowAddInput(false)
		}
	}

	const toggleExpand = (id: string) => {
		if (expandedId === id) {
			setExpandedId(null)
		} else {
			setExpandedId(id)
			// Initialize editing state with current terms
			const item = items.find((i) => i.id === id)
			if (item) {
				setEditingMatchTerms((prev) => ({
					...prev,
					[id]: item.matchTerms.join(', '),
				}))
				setEditingExcludeTerms((prev) => ({
					...prev,
					[id]: item.excludeTerms.join(', '),
				}))
			}
		}
	}

	const handleMatchTermsBlur = (id: string) => {
		const value = editingMatchTerms[id] || ''
		const terms = value
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean)
		onUpdateMatchTerms(id, terms)
	}

	const handleExcludeTermsBlur = (id: string) => {
		const value = editingExcludeTerms[id] || ''
		const terms = value
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean)
		onUpdateExcludeTerms(id, terms)
	}

	return (
		<div>
			<div className="mb-3">
				<h3 className="font-semibold text-slate-900 text-sm dark:text-white">{title}</h3>
				<p className="mt-0.5 text-slate-500 text-xs dark:text-slate-500">{description}</p>
			</div>
			<div className="overflow-hidden rounded-sm border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50">
				{items.map((item, index) => {
					const isExpanded = expandedId === item.id
					return (
						<div key={item.id}>
							<div
								className={`group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
									index !== items.length - 1 && !isExpanded ? 'border-slate-200 border-b dark:border-slate-800' : ''
								}`}
							>
								{/* Always visible drag handle */}
								<div className="cursor-grab text-slate-400 dark:text-slate-600">
									<GripVertical className="h-4 w-4" />
								</div>

								{/* Priority number */}
								<span className="flex h-6 w-6 items-center justify-center rounded-sm bg-slate-100 font-bold text-slate-500 text-xs dark:bg-slate-800 dark:text-slate-400">{index + 1}</span>

								{/* Format name */}
								<span className="font-medium text-slate-900 text-sm dark:text-white">{item.name}</span>

								<div className="flex-1" />

								{/* Move up/down buttons */}
								<div className="flex items-center gap-0.5">
									<button
										onClick={() => moveUp(index)}
										disabled={index === 0}
										className="rounded-sm p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
									>
										<ChevronUp className="h-4 w-4" />
									</button>
									<button
										onClick={() => moveDown(index)}
										disabled={index === items.length - 1}
										className="rounded-sm p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
									>
										<ChevronDown className="h-4 w-4" />
									</button>
								</div>

								{/* Edit button */}
								<button
									onClick={() => toggleExpand(item.id)}
									className={`rounded-sm p-1 transition-colors ${
										isExpanded
											? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
											: 'text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:text-slate-500 dark:hover:bg-blue-950/50 dark:hover:text-blue-400'
									}`}
								>
									<Pencil className="h-4 w-4" />
								</button>

								{/* Delete button */}
								<button
									onClick={() => onRemove(item.id)}
									className="rounded-sm p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-950/50 dark:hover:text-red-400"
								>
									<X className="h-4 w-4" />
								</button>
							</div>

							{/* Expanded terms editor */}
							{isExpanded && (
								<div className="space-y-3 border-slate-200 border-b bg-slate-50 px-3 py-3 dark:border-slate-800 dark:bg-slate-900">
									{/* Match Terms */}
									<div>
										<label className="mb-1.5 block font-medium text-slate-600 text-xs dark:text-slate-400">Match Terms (comma-separated)</label>
										<input
											type="text"
											value={editingMatchTerms[item.id] ?? item.matchTerms.join(', ')}
											onChange={(e) =>
												setEditingMatchTerms((prev) => ({
													...prev,
													[item.id]: e.target.value,
												}))
											}
											onBlur={() => handleMatchTermsBlur(item.id)}
											onKeyDown={(e) => {
												if (e.key === 'Enter') {
													handleMatchTermsBlur(item.id)
													;(e.target as HTMLInputElement).blur()
												}
											}}
											placeholder="e.g., x265, h265, hevc"
											className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white"
										/>
										<p className="mt-1 text-slate-500 text-xs dark:text-slate-500">Terms used to match release names</p>
									</div>

									{/* Exclude Terms */}
									<div>
										<label className="mb-1.5 block font-medium text-slate-600 text-xs dark:text-slate-400">Exclude Terms (comma-separated)</label>
										<input
											type="text"
											value={editingExcludeTerms[item.id] ?? item.excludeTerms.join(', ')}
											onChange={(e) =>
												setEditingExcludeTerms((prev) => ({
													...prev,
													[item.id]: e.target.value,
												}))
											}
											onBlur={() => handleExcludeTermsBlur(item.id)}
											onKeyDown={(e) => {
												if (e.key === 'Enter') {
													handleExcludeTermsBlur(item.id)
													;(e.target as HTMLInputElement).blur()
												}
											}}
											placeholder="e.g., hdr10+, hdr10plus"
											className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white"
										/>
										<p className="mt-1 text-slate-500 text-xs dark:text-slate-500">Terms to reject (prevents false matches)</p>
									</div>
								</div>
							)}
						</div>
					)
				})}

				{/* Add Format */}
				{showAddInput ? (
					<div className="flex items-center gap-2 border-slate-200 border-t bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
						<input
							type="text"
							value={newFormatName}
							onChange={(e) => setNewFormatName(e.target.value)}
							placeholder="Format name"
							className="flex-1 rounded-sm border border-slate-300 bg-white px-3 py-1.5 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white"
							autoFocus
							onKeyDown={(e) => {
								if (e.key === 'Enter') handleAdd()
								if (e.key === 'Escape') setShowAddInput(false)
							}}
						/>
						<button
							onClick={handleAdd}
							className="rounded-sm bg-blue-600 px-3 py-1.5 font-medium text-sm text-white hover:bg-blue-700"
						>
							Add
						</button>
						<button
							onClick={() => setShowAddInput(false)}
							className="px-3 py-1.5 font-medium text-slate-500 text-sm hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
						>
							Cancel
						</button>
					</div>
				) : (
					<button
						onClick={() => setShowAddInput(true)}
						className="flex w-full items-center justify-center gap-1.5 border-slate-200 border-t px-3 py-2.5 text-slate-500 text-sm transition-colors hover:bg-blue-50/50 hover:text-blue-600 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-blue-950/30 dark:hover:text-blue-400"
					>
						<Plus className="h-4 w-4" />
						Add Format
					</button>
				)}
			</div>
		</div>
	)
}

export function FormatsSection({ settings, onReorderCodecs, onReorderHdr, onReorderAudio, onAddFormat, onRemoveFormat, onUpdateMatchTerms, onUpdateExcludeTerms }: FormatsSectionProps) {
	return (
		<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<FormatList
				title="Video Codecs"
				description="Higher priority codecs preferred"
				items={settings.codecs}
				onReorder={(ids) => onReorderCodecs?.(ids)}
				onAdd={(name) => onAddFormat?.('codec', name)}
				onRemove={(id) => onRemoveFormat?.('codec', id)}
				onUpdateMatchTerms={(id, terms) => onUpdateMatchTerms?.('codec', id, terms)}
				onUpdateExcludeTerms={(id, terms) => onUpdateExcludeTerms?.('codec', id, terms)}
			/>
			<FormatList
				title="HDR Formats"
				description="Dolby Vision and HDR preferences"
				items={settings.hdrFormats}
				onReorder={(ids) => onReorderHdr?.(ids)}
				onAdd={(name) => onAddFormat?.('hdr', name)}
				onRemove={(id) => onRemoveFormat?.('hdr', id)}
				onUpdateMatchTerms={(id, terms) => onUpdateMatchTerms?.('hdr', id, terms)}
				onUpdateExcludeTerms={(id, terms) => onUpdateExcludeTerms?.('hdr', id, terms)}
			/>
			<FormatList
				title="Audio Formats"
				description="Atmos, TrueHD, and codec priorities"
				items={settings.audioFormats}
				onReorder={(ids) => onReorderAudio?.(ids)}
				onAdd={(name) => onAddFormat?.('audio', name)}
				onRemove={(id) => onRemoveFormat?.('audio', id)}
				onUpdateMatchTerms={(id, terms) => onUpdateMatchTerms?.('audio', id, terms)}
				onUpdateExcludeTerms={(id, terms) => onUpdateExcludeTerms?.('audio', id, terms)}
			/>
		</div>
	)
}
