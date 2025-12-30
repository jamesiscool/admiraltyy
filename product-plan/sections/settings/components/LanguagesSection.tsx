import { ChevronDown, ChevronUp, GripVertical, Plus, X } from 'lucide-react'
import { useState } from 'react'
import type { Language, LanguageSettings } from '@/../product/sections/settings/types'

interface LanguagesSectionProps {
	settings: LanguageSettings
	onReorderSubtitles?: (codes: string[]) => void
	onReorderAudio?: (codes: string[]) => void
	onTogglePreferOriginal?: (enabled: boolean) => void
	onToggleAcceptFallback?: (enabled: boolean) => void
	onAdd?: (type: 'subtitle' | 'audio', code: string) => void
	onRemove?: (type: 'subtitle' | 'audio', code: string) => void
}

interface LanguageListProps {
	title: string
	languages: Language[]
	onReorder: (codes: string[]) => void
	onRemove: (code: string) => void
	onAdd: (code: string) => void
}

function LanguageList({ title, languages, onReorder, onRemove, onAdd }: LanguageListProps) {
	const [showAddInput, setShowAddInput] = useState(false)
	const [newLanguage, setNewLanguage] = useState('')

	const moveUp = (index: number) => {
		if (index === 0) return
		const codes = languages.map((l) => l.code)
		;[codes[index - 1], codes[index]] = [codes[index], codes[index - 1]]
		onReorder(codes)
	}

	const moveDown = (index: number) => {
		if (index === languages.length - 1) return
		const codes = languages.map((l) => l.code)
		;[codes[index], codes[index + 1]] = [codes[index + 1], codes[index]]
		onReorder(codes)
	}

	const handleAdd = () => {
		if (newLanguage.trim()) {
			onAdd(newLanguage.trim())
			setNewLanguage('')
			setShowAddInput(false)
		}
	}

	return (
		<div>
			<h3 className="mb-3 font-semibold text-slate-900 text-sm dark:text-white">{title}</h3>
			<div className="overflow-hidden rounded-sm border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50">
				{languages.map((lang, index) => (
					<div
						key={lang.code}
						className={`flex items-center gap-3 px-3 py-2.5 ${index !== languages.length - 1 ? 'border-slate-200 border-b dark:border-slate-800' : ''}`}
					>
						<div className="cursor-grab text-slate-400 dark:text-slate-600">
							<GripVertical className="h-4 w-4" />
						</div>
						<span className="flex h-6 w-6 items-center justify-center rounded-sm bg-slate-100 font-bold text-slate-500 text-xs dark:bg-slate-800 dark:text-slate-400">{index + 1}</span>
						<span className="flex-1 font-medium text-slate-900 text-sm dark:text-white">{lang.name}</span>
						<span className="font-mono text-slate-500 text-xs uppercase dark:text-slate-500">{lang.code}</span>
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
								disabled={index === languages.length - 1}
								className="rounded-sm p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
							>
								<ChevronDown className="h-4 w-4" />
							</button>
						</div>
						<button
							onClick={() => onRemove(lang.code)}
							className="rounded-sm p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-950/50 dark:hover:text-red-400"
						>
							<X className="h-4 w-4" />
						</button>
					</div>
				))}

				{/* Add Language */}
				{showAddInput ? (
					<div className="flex items-center gap-2 border-slate-200 border-t bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
						<input
							type="text"
							value={newLanguage}
							onChange={(e) => setNewLanguage(e.target.value)}
							placeholder="Language name"
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
						Add Language
					</button>
				)}
			</div>
		</div>
	)
}

function Toggle({ label, description, enabled, onChange }: { label: string; description: string; enabled: boolean; onChange: (enabled: boolean) => void }) {
	return (
		<div className="flex items-start justify-between gap-4 rounded-sm border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
			<div>
				<div className="font-medium text-slate-900 dark:text-white">{label}</div>
				<p className="mt-0.5 text-slate-500 text-sm dark:text-slate-500">{description}</p>
			</div>
			<button
				onClick={() => onChange(!enabled)}
				className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
			>
				<span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${enabled ? 'left-6' : 'left-1'}`} />
			</button>
		</div>
	)
}

export function LanguagesSection({ settings, onReorderSubtitles, onReorderAudio, onTogglePreferOriginal, onToggleAcceptFallback, onAdd, onRemove }: LanguagesSectionProps) {
	return (
		<div className="space-y-6">
			{/* Toggles */}
			<div className="space-y-3">
				<Toggle
					label="Prefer Original Audio"
					description="Always prefer the original language audio track when available"
					enabled={settings.preferOriginalAudio}
					onChange={(enabled) => onTogglePreferOriginal?.(enabled)}
				/>
				<Toggle
					label="Accept Any Audio Fallback"
					description="If preferred languages aren't available, accept any audio track"
					enabled={settings.acceptAnyAudioFallback}
					onChange={(enabled) => onToggleAcceptFallback?.(enabled)}
				/>
			</div>

			{/* Language Lists */}
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
				<LanguageList
					title="Subtitle Languages"
					languages={settings.subtitleLanguages}
					onReorder={(codes) => onReorderSubtitles?.(codes)}
					onRemove={(code) => onRemove?.('subtitle', code)}
					onAdd={(code) => onAdd?.('subtitle', code)}
				/>
				<LanguageList
					title="Audio Languages"
					languages={settings.audioLanguages}
					onReorder={(codes) => onReorderAudio?.(codes)}
					onRemove={(code) => onRemove?.('audio', code)}
					onAdd={(code) => onAdd?.('audio', code)}
				/>
			</div>
		</div>
	)
}
