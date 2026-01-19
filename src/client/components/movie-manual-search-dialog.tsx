import { Download, Loader2, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/client/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/client/components/ui/dialog'
import { Input } from '@/client/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/client/components/ui/table'
import { useGrabMovieRelease, useSearchMovieReleases } from '@/client/lib/api'

interface Release {
	guid: string
	title: string
	downloadUrl: string
	infoUrl?: string
	size: number
	publishDate: string
	indexerId: string
	indexerName: string
}

interface MovieManualSearchDialogProps {
	movieId: string
	movieTitle: string
	movieYear?: number | null
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function MovieManualSearchDialog({ movieId, movieTitle, movieYear, open, onOpenChange }: MovieManualSearchDialogProps) {
	const [results, setResults] = useState<Release[] | null>(null)
	const [filter, setFilter] = useState('')
	const searchReleases = useSearchMovieReleases()
	const grabRelease = useGrabMovieRelease()

	// Trigger search when dialog opens
	useEffect(() => {
		if (open && results === null && !searchReleases.isPending) {
			searchReleases.mutate(
				{ param: { id: movieId } },
				{
					onSuccess: (data) => setResults(data),
				},
			)
		}
	}, [open, movieId, results, searchReleases])

	// Reset results and filter when dialog closes
	useEffect(() => {
		if (!open) {
			setResults(null)
			setFilter('')
		}
	}, [open])

	const isLoading = searchReleases.isPending

	// Filter and sort results
	const filteredResults = useMemo(() => {
		if (!results) return null
		const filtered = filter ? results.filter((r) => r.title.toLowerCase().includes(filter.toLowerCase())) : results
		return [...filtered].sort((a, b) => a.size - b.size)
	}, [results, filter])

	return (
		<Dialog
			open={open}
			onOpenChange={onOpenChange}
		>
			<DialogContent className="flex max-h-[85vh] w-[calc(100vw-40px)] max-w-[calc(100vw-40px)] flex-col overflow-hidden p-0 sm:max-w-[calc(100vw-40px)]">
				<DialogHeader className="shrink-0 px-6 pt-6">
					<DialogTitle className="flex items-center gap-2">
						<Search className="size-5" />
						Manual Search
					</DialogTitle>
					<DialogDescription>
						{movieTitle}
						{movieYear ? ` (${movieYear})` : ''}
					</DialogDescription>
				</DialogHeader>

				<div className="flex min-h-0 flex-1 flex-col gap-4 px-6 pb-6">
					{isLoading && (
						<div className="flex flex-col items-center justify-center gap-3 py-16">
							<Loader2 className="size-8 animate-spin text-muted-foreground" />
							<p className="text-muted-foreground text-sm">Searching indexers...</p>
						</div>
					)}

					{!isLoading && results !== null && results.length === 0 && <div className="py-12 text-center text-muted-foreground">No releases found for this movie.</div>}

					{!isLoading && results !== null && results.length > 0 && (
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
														disabled={grabRelease.isPending}
														onClick={() => {
															grabRelease.mutate(
																{
																	param: { id: movieId },
																	json: {
																		guid: release.guid,
																		title: release.title,
																		downloadUrl: release.downloadUrl,
																		infoUrl: release.infoUrl,
																		size: release.size,
																		publishDate: release.publishDate,
																		indexerId: release.indexerId,
																		indexerName: release.indexerName,
																	},
																},
																{
																	onSuccess: () => {
																		onOpenChange(false)
																	},
																},
															)
														}}
													>
														{grabRelease.isPending ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
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
	if (bytes === 0) return '—'
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
