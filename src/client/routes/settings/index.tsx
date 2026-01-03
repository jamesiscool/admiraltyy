import { createFileRoute } from '@tanstack/react-router'
import { Download, FileVideo, FolderOpen, Gauge, Languages, Loader2, Plus, Radar, Server } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Input } from '@/client/components/ui/input'
import { useSettings, useUpdateSettings } from '@/client/lib/api'
import { FolderSection } from './-folder-section'
import { FormatsSection } from './-formats-section'
import { IndexerCard } from './-indexer-card'
import { LanguagesSection } from './-languages-section'
import { QualitySection } from './-quality-section'
import { ServerCard } from './-server-card'

export const Route = createFileRoute('/settings/')({
	component: SettingsPage,
})

const SECTIONS = [
	{ id: 'indexers', label: 'Indexers', icon: Radar },
	{ id: 'servers', label: 'Servers', icon: Server },
	{ id: 'downloads', label: 'Downloads', icon: Download },
	{ id: 'folders', label: 'Folders', icon: FolderOpen },
	{ id: 'quality', label: 'Quality', icon: Gauge },
	{ id: 'languages', label: 'Languages', icon: Languages },
	{ id: 'formats', label: 'Formats', icon: FileVideo },
] as const

function SettingsPage() {
	const [activeSection, setActiveSection] = useState<string>('indexers')
	const { data: settings, isLoading, error } = useSettings()
	const updateSettings = useUpdateSettings()

	const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

	// Intersection Observer for active section tracking
	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						setActiveSection(entry.target.id)
					}
				})
			},
			{ rootMargin: '-20% 0px -60% 0px', threshold: 0 },
		)

		SECTIONS.forEach(({ id }) => {
			const el = sectionRefs.current[id]
			if (el) observer.observe(el)
		})

		return () => observer.disconnect()
	}, [])

	const scrollToSection = (id: string) => {
		const el = sectionRefs.current[id]
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'start' })
		}
	}

	if (isLoading) {
		return (
			<div className="flex h-full items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		)
	}

	if (error || !settings) {
		return (
			<div className="flex h-full items-center justify-center">
				<p className="text-destructive">Failed to load settings</p>
			</div>
		)
	}

	// Convert backend resolutions to frontend QualityTier format
	const qualityTiers = settings.resolutions.map((r) => ({
		id: `q-${r.name.replace('p', '')}`,
		name: r.name,
		resolution: Number.parseInt(r.name.replace('p', ''), 10) as 480 | 720 | 1080 | 2160,
		minGbPerHour: r.minGbPerHour,
		targetGbPerHour: r.targetGbPerHour,
		maxGbPerHour: r.maxGbPerHour,
	}))

	return (
		<div className="overflow-y-auto">
			<div className="container">
				{/* Header */}
				<h1 className="mb-6">Settings</h1>

				<div className="flex gap-8">
					{/* Main Content */}
					<div className="min-w-0 flex-1 space-y-12 pb-24">
						{/* Indexers Section */}
						<section
							id="indexers"
							ref={(el) => {
								sectionRefs.current.indexers = el
							}}
							className="scroll-mt-20"
						>
							<div className="mb-4 flex items-center gap-3">
								<div className="flex h-9 w-9 items-center justify-center rounded-sm bg-blue-100 text-blue-600">
									<Radar className="h-5 w-5" />
								</div>
								<div>
									<h2 className="font-bold text-lg tracking-tight">Indexers</h2>
									<p className="text-muted-foreground text-sm">Usenet indexers for searching releases</p>
								</div>
							</div>

							<div className="overflow-hidden rounded-sm border border-border bg-card">
								{settings.indexers.map((indexer, index) => (
									<IndexerCard
										key={indexer.id}
										indexer={indexer}
										isFirst={index === 0}
										isLast={index === settings.indexers.length - 1}
										onDelete={() => {
											updateSettings.mutate({
												indexers: settings.indexers.filter((i) => i.id !== indexer.id),
											})
										}}
										onTest={async () => {
											await new Promise((r) => setTimeout(r, 1000))
											return Math.random() > 0.3
										}}
										onToggle={(enabled) => {
											updateSettings.mutate({
												indexers: settings.indexers.map((i) => (i.id === indexer.id ? { ...i, enabled } : i)),
											})
										}}
										onMoveUp={() => {
											if (index > 0) {
												const newIndexers = [...settings.indexers]
												;[newIndexers[index - 1], newIndexers[index]] = [newIndexers[index], newIndexers[index - 1]]
												// Update priorities to match new order
												const reordered = newIndexers.map((item, i) => ({ ...item, priority: i }))
												updateSettings.mutate({ indexers: reordered })
											}
										}}
										onMoveDown={() => {
											if (index < settings.indexers.length - 1) {
												const newIndexers = [...settings.indexers]
												;[newIndexers[index], newIndexers[index + 1]] = [newIndexers[index + 1], newIndexers[index]]
												// Update priorities to match new order
												const reordered = newIndexers.map((item, i) => ({ ...item, priority: i }))
												updateSettings.mutate({ indexers: reordered })
											}
										}}
										onSave={(updated) => {
											updateSettings.mutate({
												indexers: settings.indexers.map((i) => (i.id === updated.id ? updated : i)),
											})
										}}
									/>
								))}

								<button
									type="button"
									onClick={() => console.log('Add indexer')}
									className="flex w-full items-center justify-center gap-1.5 border-border border-t px-3 py-3 text-muted-foreground text-sm transition-colors hover:bg-primary/5 hover:text-primary"
								>
									<Plus className="h-4 w-4" />
									Add Indexer
								</button>
							</div>
						</section>

						{/* Servers Section */}
						<section
							id="servers"
							ref={(el) => {
								sectionRefs.current.servers = el
							}}
							className="scroll-mt-20"
						>
							<div className="mb-4 flex items-center gap-3">
								<div className="flex h-9 w-9 items-center justify-center rounded-sm bg-sky-100 text-sky-600">
									<Server className="h-5 w-5" />
								</div>
								<div>
									<h2 className="font-bold text-lg tracking-tight">Usenet Servers</h2>
									<p className="text-muted-foreground text-sm">Download servers in priority order</p>
								</div>
							</div>

							<div className="overflow-hidden rounded-sm border border-border bg-card">
								{settings.usenetServers.map((server, index) => (
									<ServerCard
										key={server.id}
										server={server}
										isFirst={index === 0}
										isLast={index === settings.usenetServers.length - 1}
										onDelete={() => {
											updateSettings.mutate({
												usenetServers: settings.usenetServers.filter((s) => s.id !== server.id),
											})
										}}
										onTest={async () => {
											await new Promise((r) => setTimeout(r, 1500))
											return Math.random() > 0.2
										}}
										onToggle={(enabled) => {
											updateSettings.mutate({
												usenetServers: settings.usenetServers.map((s) => (s.id === server.id ? { ...s, enabled } : s)),
											})
										}}
										onMoveUp={() => {
											if (index > 0) {
												const newServers = [...settings.usenetServers]
												;[newServers[index - 1], newServers[index]] = [newServers[index], newServers[index - 1]]
												// Update priorities to match new order
												const reordered = newServers.map((item, i) => ({ ...item, priority: i }))
												updateSettings.mutate({ usenetServers: reordered })
											}
										}}
										onMoveDown={() => {
											if (index < settings.usenetServers.length - 1) {
												const newServers = [...settings.usenetServers]
												;[newServers[index], newServers[index + 1]] = [newServers[index + 1], newServers[index]]
												// Update priorities to match new order
												const reordered = newServers.map((item, i) => ({ ...item, priority: i }))
												updateSettings.mutate({ usenetServers: reordered })
											}
										}}
										onSave={(updated) => {
											updateSettings.mutate({
												usenetServers: settings.usenetServers.map((s) => (s.id === updated.id ? updated : s)),
											})
										}}
									/>
								))}

								<button
									type="button"
									onClick={() => console.log('Add server')}
									className="flex w-full items-center justify-center gap-1.5 border-border border-t px-3 py-3 text-muted-foreground text-sm transition-colors hover:bg-primary/5 hover:text-primary"
								>
									<Plus className="h-4 w-4" />
									Add Server
								</button>
							</div>
						</section>

						{/* Downloads Section */}
						<section
							id="downloads"
							ref={(el) => {
								sectionRefs.current.downloads = el
							}}
							className="scroll-mt-20"
						>
							<div className="mb-4 flex items-center gap-3">
								<div className="flex h-9 w-9 items-center justify-center rounded-sm bg-teal-100 text-teal-600">
									<Download className="h-5 w-5" />
								</div>
								<div>
									<h2 className="font-bold text-lg tracking-tight">Downloads</h2>
									<p className="text-muted-foreground text-sm">Where files are downloaded before processing</p>
								</div>
							</div>

							<div className="overflow-hidden rounded-sm border border-border bg-card p-4">
								<label
									htmlFor="download-folder"
									className="mb-2 block font-medium text-foreground text-sm"
								>
									Download Folder
								</label>
								<Input
									id="download-folder"
									type="text"
									value={settings.downloadFolder}
									onChange={(e) => updateSettings.mutate({ downloadFolder: e.target.value })}
									placeholder="/path/to/downloads"
									className="font-mono"
								/>
								<p className="mt-2 text-muted-foreground text-xs">Completed downloads will be moved to the appropriate library folder</p>
							</div>
						</section>

						{/* Folders Section */}
						<section
							id="folders"
							ref={(el) => {
								sectionRefs.current.folders = el
							}}
							className="scroll-mt-20"
						>
							<div className="mb-4 flex items-center gap-3">
								<div className="flex h-9 w-9 items-center justify-center rounded-sm bg-amber-100 text-amber-600">
									<FolderOpen className="h-5 w-5" />
								</div>
								<div>
									<h2 className="font-bold text-lg tracking-tight">Library Folders</h2>
									<p className="text-muted-foreground text-sm">Media storage locations</p>
								</div>
							</div>

							<FolderSection
								folders={settings.folders}
								onAdd={(type) => console.log('Add folder:', type)}
								onDelete={(id) => {
									const newFolders = {
										movies: settings.folders.movies.filter((f) => f.id !== id),
										tv: settings.folders.tv.filter((f) => f.id !== id),
									}
									updateSettings.mutate({ folders: newFolders })
								}}
								onSetDefault={(id, type) => {
									const newFolders = {
										...settings.folders,
										[type]: settings.folders[type].map((f) => ({ ...f, isDefault: f.id === id })),
									}
									updateSettings.mutate({ folders: newFolders })
								}}
							/>
						</section>

						{/* Quality Section */}
						<section
							id="quality"
							ref={(el) => {
								sectionRefs.current.quality = el
							}}
							className="scroll-mt-20"
						>
							<div className="mb-4 flex items-center gap-3">
								<div className="flex h-9 w-9 items-center justify-center rounded-sm bg-emerald-100 text-emerald-600">
									<Gauge className="h-5 w-5" />
								</div>
								<div>
									<h2 className="font-bold text-lg tracking-tight">Quality Profiles</h2>
									<p className="text-muted-foreground text-sm">File size targets per resolution</p>
								</div>
							</div>

							<QualitySection
								qualityTiers={qualityTiers}
								onUpdate={(tier) => {
									const newResolutions = settings.resolutions.map((r) =>
										r.name === tier.name
											? {
													...r,
													minGbPerHour: tier.minGbPerHour,
													targetGbPerHour: tier.targetGbPerHour,
													maxGbPerHour: tier.maxGbPerHour,
												}
											: r,
									)
									updateSettings.mutate({ resolutions: newResolutions })
								}}
							/>
						</section>

						{/* Languages Section */}
						<section
							id="languages"
							ref={(el) => {
								sectionRefs.current.languages = el
							}}
							className="scroll-mt-20"
						>
							<div className="mb-4 flex items-center gap-3">
								<div className="flex h-9 w-9 items-center justify-center rounded-sm bg-violet-100 text-violet-600">
									<Languages className="h-5 w-5" />
								</div>
								<div>
									<h2 className="font-bold text-lg tracking-tight">Languages</h2>
									<p className="text-muted-foreground text-sm">Subtitle and audio preferences</p>
								</div>
							</div>

							<LanguagesSection
								settings={settings.languageSettings}
								onReorderSubtitles={(codes) => {
									const newLangs = codes
										.map((code, i) => {
											const lang = settings.languageSettings.subtitleLanguages.find((l) => l.code === code)
											return lang ? { ...lang, priority: i } : null
										})
										.filter((l): l is NonNullable<typeof l> => l !== null)
									updateSettings.mutate({
										languageSettings: { ...settings.languageSettings, subtitleLanguages: newLangs },
									})
								}}
								onReorderAudio={(codes) => {
									const newLangs = codes
										.map((code, i) => {
											const lang = settings.languageSettings.audioLanguages.find((l) => l.code === code)
											return lang ? { ...lang, priority: i } : null
										})
										.filter((l): l is NonNullable<typeof l> => l !== null)
									updateSettings.mutate({
										languageSettings: { ...settings.languageSettings, audioLanguages: newLangs },
									})
								}}
								onTogglePreferOriginal={(enabled) => {
									updateSettings.mutate({
										languageSettings: { ...settings.languageSettings, preferOriginalAudio: enabled },
									})
								}}
								onToggleAcceptFallback={(enabled) => {
									updateSettings.mutate({
										languageSettings: { ...settings.languageSettings, acceptAnyAudioFallback: enabled },
									})
								}}
								onAdd={(type, code) => console.log('Add language:', type, code)}
								onRemove={(type, code) => {
									if (type === 'subtitle') {
										updateSettings.mutate({
											languageSettings: {
												...settings.languageSettings,
												subtitleLanguages: settings.languageSettings.subtitleLanguages.filter((l) => l.code !== code),
											},
										})
									} else {
										updateSettings.mutate({
											languageSettings: {
												...settings.languageSettings,
												audioLanguages: settings.languageSettings.audioLanguages.filter((l) => l.code !== code),
											},
										})
									}
								}}
							/>
						</section>

						{/* Formats Section */}
						<section
							id="formats"
							ref={(el) => {
								sectionRefs.current.formats = el
							}}
							className="scroll-mt-20"
						>
							<div className="mb-4 flex items-center gap-3">
								<div className="flex h-9 w-9 items-center justify-center rounded-sm bg-rose-100 text-rose-600">
									<FileVideo className="h-5 w-5" />
								</div>
								<div>
									<h2 className="font-bold text-lg tracking-tight">Format Preferences</h2>
									<p className="text-muted-foreground text-sm">Codec, HDR, and audio priorities</p>
								</div>
							</div>

							<FormatsSection
								settings={settings.formatSettings}
								onReorderCodecs={(ids) => {
									const newCodecs = ids
										.map((id, i) => {
											const codec = settings.formatSettings.codecs.find((c) => c.id === id)
											return codec ? { ...codec, priority: i } : null
										})
										.filter((c): c is NonNullable<typeof c> => c !== null)
									updateSettings.mutate({
										formatSettings: { ...settings.formatSettings, codecs: newCodecs },
									})
								}}
								onReorderHdr={(ids) => {
									const newFormats = ids
										.map((id, i) => {
											const format = settings.formatSettings.hdrFormats.find((f) => f.id === id)
											return format ? { ...format, priority: i } : null
										})
										.filter((f): f is NonNullable<typeof f> => f !== null)
									updateSettings.mutate({
										formatSettings: { ...settings.formatSettings, hdrFormats: newFormats },
									})
								}}
								onReorderAudio={(ids) => {
									const newFormats = ids
										.map((id, i) => {
											const format = settings.formatSettings.audioFormats.find((f) => f.id === id)
											return format ? { ...format, priority: i } : null
										})
										.filter((f): f is NonNullable<typeof f> => f !== null)
									updateSettings.mutate({
										formatSettings: { ...settings.formatSettings, audioFormats: newFormats },
									})
								}}
								onAddFormat={(type, name) => console.log('Add format:', type, name)}
								onRemoveFormat={(type, id) => {
									if (type === 'codec') {
										updateSettings.mutate({
											formatSettings: {
												...settings.formatSettings,
												codecs: settings.formatSettings.codecs.filter((c) => c.id !== id),
											},
										})
									} else if (type === 'hdr') {
										updateSettings.mutate({
											formatSettings: {
												...settings.formatSettings,
												hdrFormats: settings.formatSettings.hdrFormats.filter((f) => f.id !== id),
											},
										})
									} else {
										updateSettings.mutate({
											formatSettings: {
												...settings.formatSettings,
												audioFormats: settings.formatSettings.audioFormats.filter((f) => f.id !== id),
											},
										})
									}
								}}
								onUpdateMatchTerms={() => {
									// Handled via onSaveFormat
								}}
								onUpdateExcludeTerms={() => {
									// Handled via onSaveFormat
								}}
								onSaveFormat={(type, id, matchTerms, excludeTerms) => {
									if (type === 'codec') {
										updateSettings.mutate({
											formatSettings: {
												...settings.formatSettings,
												codecs: settings.formatSettings.codecs.map((c) => (c.id === id ? { ...c, matchTerms, excludeTerms } : c)),
											},
										})
									} else if (type === 'hdr') {
										updateSettings.mutate({
											formatSettings: {
												...settings.formatSettings,
												hdrFormats: settings.formatSettings.hdrFormats.map((f) => (f.id === id ? { ...f, matchTerms, excludeTerms } : f)),
											},
										})
									} else {
										updateSettings.mutate({
											formatSettings: {
												...settings.formatSettings,
												audioFormats: settings.formatSettings.audioFormats.map((f) => (f.id === id ? { ...f, matchTerms, excludeTerms } : f)),
											},
										})
									}
								}}
							/>
						</section>
					</div>

					{/* Sticky Sidebar Navigation */}
					<nav className="hidden w-48 shrink-0 lg:block">
						<div className="sticky top-20">
							<div className="rounded-sm border border-border bg-muted/50 p-2">
								<div className="space-y-0.5">
									{SECTIONS.map(({ id, label, icon: Icon }) => (
										<button
											type="button"
											key={id}
											onClick={() => scrollToSection(id)}
											className={`flex w-full items-center gap-2.5 rounded-sm px-3 py-2 font-medium text-sm transition-all ${
												activeSection === id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
											}`}
										>
											<Icon className="h-4 w-4" />
											{label}
										</button>
									))}
								</div>
							</div>
						</div>
					</nav>
				</div>
			</div>
		</div>
	)
}
