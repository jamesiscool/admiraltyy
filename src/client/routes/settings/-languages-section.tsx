import { ChevronDown, ChevronUp, GripVertical, Plus, X } from 'lucide-react'
import { useState } from 'react'
import type { Language, LanguageSettings } from './-types'

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
			<h3 className="mb-3 font-semibold text-foreground text-sm">{title}</h3>
			<div className="overflow-hidden rounded-sm border border-border bg-card">
				{languages.map((lang, index) => (
					<div
						key={lang.code}
						className={`flex items-center gap-3 px-3 py-2.5 ${index !== languages.length - 1 ? 'border-border border-b' : ''}`}
					>
						<div className="cursor-grab text-muted-foreground">
							<GripVertical className="h-4 w-4" />
						</div>
						<span className="flex h-6 w-6 items-center justify-center rounded-sm bg-muted font-bold text-muted-foreground text-xs">{index + 1}</span>
						<span className="flex-1 font-medium text-foreground text-sm">{lang.name}</span>
						<span className="font-mono text-muted-foreground text-xs uppercase">{lang.code}</span>
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
								disabled={index === languages.length - 1}
								className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
							>
								<ChevronDown className="h-4 w-4" />
							</button>
						</div>
						<button
							type="button"
							onClick={() => onRemove(lang.code)}
							className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
						>
							<X className="h-4 w-4" />
						</button>
					</div>
				))}

				{/* Add Language */}
				{showAddInput ? (
					<div className="flex items-center gap-2 border-border border-t bg-muted/50 px-3 py-2.5">
						<input
							type="text"
							value={newLanguage}
							onChange={(e) => setNewLanguage(e.target.value)}
							placeholder="Language name"
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
						Add Language
					</button>
				)}
			</div>
		</div>
	)
}

function Toggle({ label, description, enabled, onChange }: { label: string; description: string; enabled: boolean; onChange: (enabled: boolean) => void }) {
	return (
		<div className="flex items-start justify-between gap-4 rounded-sm border border-border bg-card p-4">
			<div>
				<div className="font-medium text-foreground">{label}</div>
				<p className="mt-0.5 text-muted-foreground text-sm">{description}</p>
			</div>
			<button
				type="button"
				onClick={() => onChange(!enabled)}
				className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-muted'}`}
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
