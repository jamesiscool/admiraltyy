import { Check, ChevronDown, ChevronUp, GripVertical, Pencil, Plus, X } from 'lucide-react'
import { useState } from 'react'
import type { FormatPreference, FormatSettings } from '@/services/settings'

interface FormatsSectionProps {
	settings: FormatSettings
	onReorderCodecs?: (ids: string[]) => void
	onReorderHdr?: (ids: string[]) => void
	onReorderAudio?: (ids: string[]) => void
	onAddFormat?: (type: 'codec' | 'hdr' | 'audio', name: string) => void
	onRemoveFormat?: (type: 'codec' | 'hdr' | 'audio', id: string) => void
	onUpdateMatchTerms?: (type: 'codec' | 'hdr' | 'audio', id: string, matchTerms: string[]) => void
	onUpdateExcludeTerms?: (type: 'codec' | 'hdr' | 'audio', id: string, excludeTerms: string[]) => void
	onSaveFormat?: (type: 'codec' | 'hdr' | 'audio', id: string, matchTerms: string[], excludeTerms: string[]) => void
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
	onSaveFormat?: (id: string, matchTerms: string[], excludeTerms: string[]) => void
}

function FormatList({ title, description, items, onReorder, onAdd, onRemove, onUpdateMatchTerms, onUpdateExcludeTerms, onSaveFormat }: FormatListProps) {
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
				<h3 className="font-semibold text-foreground text-sm">{title}</h3>
				<p className="mt-0.5 text-muted-foreground text-xs">{description}</p>
			</div>
			<div className="overflow-hidden rounded-sm border border-border bg-card">
				{items.map((item, index) => {
					const isExpanded = expandedId === item.id
					return (
						<div key={item.id}>
							<div className={`group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50 ${index !== items.length - 1 && !isExpanded ? 'border-border border-b' : ''}`}>
								{/* Drag handle */}
								<div className="cursor-grab text-muted-foreground">
									<GripVertical className="h-4 w-4" />
								</div>

								{/* Priority number */}
								<span className="flex h-6 w-6 items-center justify-center rounded-sm bg-muted font-bold text-muted-foreground text-xs">{index + 1}</span>

								{/* Format name */}
								<span className="font-medium text-foreground text-sm">{item.name}</span>

								<div className="flex-1" />

								{/* Move up/down buttons */}
								<div className="flex items-center gap-0.5">
									<button
										type="button"
										onClick={() => moveUp(index)}
										disabled={index === 0}
										className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
									>
										<ChevronUp className="h-4 w-4" />
									</button>
									<button
										type="button"
										onClick={() => moveDown(index)}
										disabled={index === items.length - 1}
										className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
									>
										<ChevronDown className="h-4 w-4" />
									</button>
								</div>

								{/* Edit button */}
								<button
									type="button"
									onClick={() => toggleExpand(item.id)}
									className={`rounded-sm p-1 transition-colors ${isExpanded ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'}`}
								>
									<Pencil className="h-4 w-4" />
								</button>

								{/* Delete button */}
								<button
									type="button"
									onClick={() => onRemove(item.id)}
									className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
								>
									<X className="h-4 w-4" />
								</button>
							</div>

							{/* Expanded terms editor */}
							{isExpanded && (
								<div className="space-y-3 border-border border-b bg-muted/50 px-3 py-3">
									{/* Match Terms */}
									<div>
										<span className="mb-1.5 block font-medium text-muted-foreground text-xs">Match Terms (comma-separated)</span>
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
											className="w-full rounded-sm border border-input bg-background px-3 py-2 text-foreground text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
										/>
										<p className="mt-1 text-muted-foreground text-xs">Terms used to match release names</p>
									</div>

									{/* Exclude Terms */}
									<div>
										<span className="mb-1.5 block font-medium text-muted-foreground text-xs">Exclude Terms (comma-separated)</span>
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
											className="w-full rounded-sm border border-input bg-background px-3 py-2 text-foreground text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
										/>
										<p className="mt-1 text-muted-foreground text-xs">Terms to reject (prevents false matches)</p>
									</div>

									{/* Save button */}
									<div className="flex justify-end pt-1">
										<button
											type="button"
											onClick={() => {
												const matchValue = editingMatchTerms[item.id] ?? item.matchTerms.join(', ')
												const excludeValue = editingExcludeTerms[item.id] ?? item.excludeTerms.join(', ')
												const matchTerms = matchValue
													.split(',')
													.map((t) => t.trim())
													.filter(Boolean)
												const excludeTerms = excludeValue
													.split(',')
													.map((t) => t.trim())
													.filter(Boolean)
												if (onSaveFormat) {
													onSaveFormat(item.id, matchTerms, excludeTerms)
												} else {
													onUpdateMatchTerms(item.id, matchTerms)
													onUpdateExcludeTerms(item.id, excludeTerms)
												}
												setExpandedId(null)
											}}
											className="flex items-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 font-medium text-primary-foreground text-sm hover:bg-primary/90"
										>
											<Check className="h-4 w-4" />
											Save
										</button>
									</div>
								</div>
							)}
						</div>
					)
				})}

				{/* Add Format */}
				{showAddInput ? (
					<div className="flex items-center gap-2 border-border border-t bg-muted/50 px-3 py-2.5">
						<input
							type="text"
							value={newFormatName}
							onChange={(e) => setNewFormatName(e.target.value)}
							placeholder="Format name"
							className="flex-1 rounded-sm border border-input bg-background px-3 py-1.5 text-foreground text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
							onKeyDown={(e) => {
								if (e.key === 'Enter') handleAdd()
								if (e.key === 'Escape') setShowAddInput(false)
							}}
						/>
						<button
							type="button"
							onClick={handleAdd}
							className="rounded-sm bg-primary px-3 py-1.5 font-medium text-primary-foreground text-sm hover:bg-primary/90"
						>
							Add
						</button>
						<button
							type="button"
							onClick={() => setShowAddInput(false)}
							className="px-3 py-1.5 font-medium text-muted-foreground text-sm hover:text-foreground"
						>
							Cancel
						</button>
					</div>
				) : (
					<button
						type="button"
						onClick={() => setShowAddInput(true)}
						className="flex w-full items-center justify-center gap-1.5 border-border border-t px-3 py-2.5 text-muted-foreground text-sm transition-colors hover:bg-primary/5 hover:text-primary"
					>
						<Plus className="h-4 w-4" />
						Add Format
					</button>
				)}
			</div>
		</div>
	)
}

export function FormatsSection({ settings, onReorderCodecs, onReorderHdr, onReorderAudio, onAddFormat, onRemoveFormat, onUpdateMatchTerms, onUpdateExcludeTerms, onSaveFormat }: FormatsSectionProps) {
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
				onSaveFormat={(id, matchTerms, excludeTerms) => onSaveFormat?.('codec', id, matchTerms, excludeTerms)}
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
				onSaveFormat={(id, matchTerms, excludeTerms) => onSaveFormat?.('hdr', id, matchTerms, excludeTerms)}
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
				onSaveFormat={(id, matchTerms, excludeTerms) => onSaveFormat?.('audio', id, matchTerms, excludeTerms)}
			/>
		</div>
	)
}
