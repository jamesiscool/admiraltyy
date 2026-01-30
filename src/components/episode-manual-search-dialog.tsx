import { useRouter } from '@tanstack/react-router'
import { Download, Loader2, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { grabEpisodeRelease, searchEpisodeReleasesServerFn } from '@/services/episodes.functions'
import type { IndexerRelease } from '@/services/indexers'

interface Release {
	guid: string
	title: string
	downloadUrl: string
	infoUrl?: string
	size: number
	publishDate: Date
	indexerId: string
	indexerName: string
}

interface EpisodeManualSearchDialogProps {
	episodeId: string
	seriesTitle: string
	seasonNumber: number
	episodeNumber: number
	episodeTitle: string
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function EpisodeManualSearchDialog({ episodeId, seriesTitle, seasonNumber, episodeNumber, episodeTitle, open, onOpenChange }: EpisodeManualSearchDialogProps) {
	const router = useRouter()
	const [results, setResults] = useState<IndexerRelease[] | null>(null)
	const [filter, setFilter] = useState('')
	const [isSearching, setIsSearching] = useState(false)
	const [grabbingGuid, setGrabbingGuid] = useState<string | null>(null)

	// Trigger search when dialog opens
	useEffect(() => {
		if (open && results === null && !isSearching) {
			setIsSearching(true)
			searchEpisodeReleasesServerFn({ data: { episodeId } })
				.then((data) => setResults(data))
				.catch((err) => console.error('Search failed:', err))
				.finally(() => setIsSearching(false))
		}
	}, [open, episodeId, results, isSearching])

	// Reset results and filter when dialog closes
	useEffect(() => {
		if (!open) {
			setResults(null)
			setFilter('')
		}
	}, [open])

	// Filter and sort results
	const filteredResults = useMemo(() => {
		if (!results) return null
		const filtered = filter ? results.filter((r) => r.title.toLowerCase().includes(filter.toLowerCase())) : results
		return [...filtered].sort((a, b) => a.size - b.size)
	}, [results, filter])

	const handleGrab = async (release: Release) => {
		setGrabbingGuid(release.guid)
		try {
			await grabEpisodeRelease({
				data: {
					episodeId,
					guid: release.guid,
					title: release.title,
					downloadUrl: release.downloadUrl,
					infoUrl: release.infoUrl,
					size: release.size,
					publishDate: release.publishDate.toISOString(),
					indexerId: release.indexerId,
					indexerName: release.indexerName,
				},
			})
			router.invalidate()
			onOpenChange(false)
		} catch (err) {
			console.error('Grab failed:', err)
		} finally {
			setGrabbingGuid(null)
		}
	}

	const seasonStr = seasonNumber.toString().padStart(2, '0')
	const episodeStr = episodeNumber.toString().padStart(2, '0')
	const episodeLabel = `S${seasonStr}E${episodeStr}`

	return (
		<Dialog
			open={open}
			onOpenChange={onOpenChange}
		>
			<DialogContent className="flex max-h-[85vh] w-full max-w-[min(calc(100vw-40px),1200px)]! flex-col overflow-hidden p-0">
				<DialogHeader className="shrink-0 px-6 pt-6">
					<DialogTitle className="flex items-center gap-2">
						<Search className="size-5" />
						Manual Search
					</DialogTitle>
					<DialogDescription>
						{seriesTitle} - {episodeLabel}
						{episodeTitle ? ` - ${episodeTitle}` : ''}
					</DialogDescription>
				</DialogHeader>

				<div className="flex min-h-0 flex-1 flex-col gap-4 px-6 pb-6">
					{isSearching && (
						<div className="flex flex-col items-center justify-center gap-3 py-16">
							<Loader2 className="size-8 animate-spin text-muted-foreground" />
							<p className="text-muted-foreground text-sm">Searching indexers...</p>
						</div>
					)}

					{!isSearching && results !== null && results.length === 0 && <div className="py-12 text-center text-muted-foreground">No releases found for this episode.</div>}

					{!isSearching && results !== null && results.length > 0 && (
						<>
							<Input
								placeholder="Filter releases..."
								value={filter}
								onChange={(e) => setFilter(e.target.value)}
								className="max-w-sm shrink-0"
							/>
							<div className="min-h-0 flex-1 overflow-y-auto rounded-md border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-[50%]">Release</TableHead>
											<TableHead>Indexer</TableHead>
											<TableHead>Size</TableHead>
											<TableHead>Age</TableHead>
											<TableHead className="w-[60px]" />
										</TableRow>
									</TableHeader>
									<TableBody>
										{filteredResults?.map((release) => (
											<TableRow key={release.guid}>
												<TableCell className="max-w-0">
													<div
														className="truncate font-medium"
														title={release.title}
													>
														{release.title}
													</div>
												</TableCell>
												<TableCell className="text-muted-foreground">{release.indexerName}</TableCell>
												<TableCell className="whitespace-nowrap text-size">{formatSize(release.size)}</TableCell>
												<TableCell className="whitespace-nowrap text-muted-foreground">{formatAge(release.publishDate)}</TableCell>
												<TableCell>
													<Button
														variant="ghost"
														size="sm"
														className="h-7 px-2"
														title="Grab release"
														disabled={grabbingGuid !== null}
														onClick={() => handleGrab(release)}
													>
														{grabbingGuid === release.guid ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
							<div className="shrink-0 text-muted-foreground text-sm">{filter && filteredResults ? `${filteredResults.length} of ${results.length} releases` : `${results.length} releases found`}</div>
						</>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}

function formatSize(bytes: number): string {
	if (bytes === 0) return '-'
	const gb = bytes / 1073741824
	if (gb >= 1) return `${gb.toFixed(1)} GB`
	const mb = bytes / 1048576
	return `${mb.toFixed(0)} MB`
}

function formatAge(date: Date | string): string {
	const d = typeof date === 'string' ? new Date(date) : date
	const now = new Date()
	const diffMs = now.getTime() - d.getTime()
	const diffDays = Math.floor(diffMs / 86400000)

	if (diffDays === 0) return 'Today'
	if (diffDays === 1) return '1 day'
	if (diffDays < 30) return `${diffDays} days`
	if (diffDays < 365) return `${Math.floor(diffDays / 30)} mo`
	return `${Math.floor(diffDays / 365)} yr`
}
