import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { Bookmark, ChevronDown, Download, Search, Settings2, Timer, Trash2, Tv } from 'lucide-react'
import { useState } from 'react'
import { DeleteConfirmationModal, type DeleteTarget } from '@/components/delete-confirmation-modal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn, formatNextAiring } from '@/lib/utils'
import type { EpisodeWithFiles, SeasonWithEpisodes } from '@/services/series'
import { deleteSeries, getSeries, updateEpisode, updateSeason, updateSeries } from '@/services/series.functions'

export const Route = createFileRoute('/tv/$seriesId')({
	loader: ({ params }) => getSeries({ data: { seriesId: params.seriesId } }),
	component: SeriesDetailPage,
})

function SeriesDetailPage() {
	const { seriesId } = Route.useParams()
	const series = Route.useLoaderData()
	const router = useRouter()
	const navigate = useNavigate()

	// Update state
	const [isUpdating, setIsUpdating] = useState(false)

	// Delete modal state
	const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
	const [isDeleting, setIsDeleting] = useState(false)

	const handleToggleMonitored = async () => {
		setIsUpdating(true)
		try {
			await updateSeries({ data: { seriesId, monitored: !series.monitored } })
			router.invalidate()
		} finally {
			setIsUpdating(false)
		}
	}

	const handleDeleteConfirm = async (deleteFiles: boolean) => {
		if (!deleteTarget) return
		setIsDeleting(true)
		try {
			await deleteSeries({ data: { seriesId: String(deleteTarget.id), deleteFiles } })
			setDeleteTarget(null)
			navigate({ to: '/tv' })
		} finally {
			setIsDeleting(false)
		}
	}

	// Parse JSON fields
	const genres: string[] = series.genres ? JSON.parse(series.genres) : []

	// Calculate file stats from nested structure
	const allFiles = series.seasons.flatMap((s: SeasonWithEpisodes) => s.episodes.flatMap((e: EpisodeWithFiles) => e.files))
	const fileCount = allFiles.length
	const hasFiles = fileCount > 0

	// Calculate total size in GB
	const totalSizeGb = series.sizeBytes ? `${(series.sizeBytes / 1073741824).toFixed(1)} GB` : '0 GB'

	const nextAiringLabel = formatNextAiring(series.nextAiring ?? null)

	return (
		<div className="overflow-y-auto">
			{/* Hero section with backdrop */}
			<div className="relative">
				{/* Backdrop image */}
				{series.backdropUrl && (
					<div className="absolute inset-0 h-full w-full overflow-hidden">
						<img
							src={series.backdropUrl}
							alt=""
							className="h-full w-full object-cover"
						/>
						<div className="absolute inset-0 bg-gradient-to-r from-neutral-900/90 via-neutral-900/70 to-neutral-900/50" />
					</div>
				)}

				<div className="container relative py-8">
					<div className="flex flex-col gap-6 md:flex-row md:gap-8">
						{/* Poster */}
						<div className="shrink-0">
							<div className="relative aspect-[2/3] w-40 overflow-hidden rounded-sm bg-neutral-800 shadow-lg md:w-48">
								{series.posterUrl ? (
									<img
										src={series.posterUrl}
										alt={series.title}
										className="h-full w-full object-cover"
									/>
								) : (
									<div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-700 to-neutral-900">
										<Tv className="size-12 text-neutral-600" />
									</div>
								)}
							</div>
						</div>

						{/* Series info */}
						<div className="flex flex-1 flex-col gap-4">
							<div className="flex items-start justify-between gap-4">
								<div>
									<h1 className="mb-2 text-white">{series.title}</h1>
									<div className="flex flex-wrap items-center gap-2 text-neutral-200">
										<span className="font-medium">{series.year}</span>
										<span>•</span>
										<span className={hasFiles ? 'text-size' : 'text-yellow-300'}>{hasFiles ? totalSizeGb : 'Missing Episodes'}</span>
										{series.status === 'ended' && (
											<>
												<span>•</span>
												<span className="text-white">Ended</span>
											</>
										)}
									</div>
								</div>

								{/* Monitored badge */}
								<Button
									variant={series.monitored ? 'monitored' : 'outline'}
									className="shrink-0 gap-1.5"
									disabled={isUpdating}
									onClick={handleToggleMonitored}
								>
									<Bookmark className={series.monitored ? 'size-3.5 fill-current' : 'size-3.5'} />
									{series.monitored ? 'Monitored' : 'Unmonitored'}
								</Button>
							</div>

							{/* Genres */}
							{genres.length > 0 && (
								<div className="flex flex-wrap gap-1.5">
									{genres.map((genre) => (
										<span
											key={genre}
											className="inline-flex h-5 items-center justify-center rounded-full border-0 bg-blue-100 px-2 font-medium text-blue-800 text-xs"
										>
											{genre}
										</span>
									))}
								</div>
							)}

							{/* Synopsis */}
							{series.overview && <p className="max-w-3xl text-white leading-relaxed">{series.overview}</p>}

							{/* Info cards */}
							<div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
								<div className="flex flex-wrap gap-x-6 gap-y-2">
									<div className="flex flex-col">
										<span className="font-semibold text-sm text-white/80">Quality</span>
										<span className="text-blue-300">{series.resolution ?? '1080p'}</span>
									</div>
									<div className="flex flex-col">
										<span className="font-semibold text-sm text-white/80">Seasons</span>
										<span className="text-white">{series.seasons.length}</span>
									</div>
									{series.episodeCount !== undefined && (
										<div className="flex flex-col">
											<span className="font-semibold text-sm text-white/80">Episodes</span>
											<span className="text-white">{series.episodeCount}</span>
										</div>
									)}
									{series.contentRating && (
										<div className="flex flex-col">
											<span className="font-semibold text-sm text-white/80">Rating</span>
											<span className="text-white">{series.contentRating}</span>
										</div>
									)}
									{series.runtimeMins && (
										<div className="flex flex-col">
											<span className="font-semibold text-sm text-white/80">Average runtime</span>
											<span className="text-white">{series.runtimeMins} min</span>
										</div>
									)}
									{series.network && (
										<div className="flex flex-col">
											<span className="font-semibold text-sm text-white/80">Network</span>
											<span className="text-white">{series.network}</span>
										</div>
									)}
									<div className="flex flex-col">
										<span className="font-semibold text-sm text-white/80">Added</span>
										<span className="text-white">{formatDate(series.dateAdded)}</span>
									</div>
									{nextAiringLabel && (
										<div className="flex flex-col">
											<span className="font-semibold text-sm text-white/80">Next Airing</span>
											<span className="text-white">{nextAiringLabel}</span>
										</div>
									)}
								</div>
							</div>

							{/* Action buttons */}
							<div className="mt-2 flex flex-wrap gap-2">
								<Button className="h-9 px-4">
									<Search className="size-4" />
									Auto Search
								</Button>
								<Button
									variant="outline"
									className="h-9 px-4"
								>
									<Search className="size-4" />
									Manual Search
								</Button>
								<Button
									variant="outline"
									className="h-9 px-4"
								>
									<Settings2 className="size-4" />
									Edit Quality
								</Button>
								<Button
									className="h-9 bg-destructive px-4 text-white hover:bg-destructive/90"
									onClick={() => {
										if (!series) return
										setDeleteTarget({
											type: 'series',
											id: series.id,
											title: series.title,
											sizeBytes: series.sizeBytes,
										})
									}}
								>
									<Trash2 className="size-4" />
									Delete Series
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Seasons section */}
			<div className="container py-8">
				<div className="flex flex-col gap-4">
					{sortSeasons(series.seasons).map((season) => (
						<SeasonCard
							key={season.id}
							season={season}
							seriesId={String(series.id)}
							seriesMonitored={series.monitored ?? true}
							seriesResolution={series.resolution}
						/>
					))}
				</div>
			</div>

			{/* Delete Confirmation Modal */}
			<DeleteConfirmationModal
				target={deleteTarget}
				onClose={() => setDeleteTarget(null)}
				onConfirm={handleDeleteConfirm}
				isPending={isDeleting}
			/>
		</div>
	)
}

function formatDate(dateStr: string | null | undefined): string {
	if (!dateStr) return '—'
	try {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		})
	} catch {
		return dateStr
	}
}

// Sort seasons descending (newest first)
function sortSeasons(seasons: SeasonWithEpisodes[]): SeasonWithEpisodes[] {
	return [...seasons].sort((a, b) => b.seasonNumber - a.seasonNumber)
}

// Sort episodes ascending
function sortEpisodes(episodes: EpisodeWithFiles[]): EpisodeWithFiles[] {
	return [...episodes].sort((a, b) => a.episodeNumber - b.episodeNumber)
}

function SeasonCard({ season, seriesId, seriesMonitored, seriesResolution }: { season: SeasonWithEpisodes; seriesId: string; seriesMonitored: boolean; seriesResolution: string | null }) {
	const router = useRouter()
	const [isOpen, setIsOpen] = useState(true)
	const [isUpdating, setIsUpdating] = useState(false)

	const episodes = sortEpisodes(season.episodes)
	const totalEpisodes = episodes.length
	const downloadedEpisodes = episodes.filter((e) => e.files.length > 0).length
	const progressPercent = totalEpisodes > 0 ? Math.round((downloadedEpisodes / totalEpisodes) * 100) : 0

	const isMonitored = season.monitored ?? true
	const allEpisodesMonitored = episodes.every((e) => e.monitored)
	const someEpisodesMonitored = episodes.some((e) => e.monitored) && !allEpisodesMonitored

	const handleToggleMonitored = async (e: React.MouseEvent) => {
		e.stopPropagation()
		setIsUpdating(true)
		try {
			await updateSeason({ data: { seriesId, seasonId: season.id.toString(), monitored: !isMonitored } })
			router.invalidate()
		} finally {
			setIsUpdating(false)
		}
	}

	return (
		<Collapsible
			open={isOpen}
			onOpenChange={setIsOpen}
			className="overflow-hidden rounded-lg border border-border bg-background"
		>
			<div className="flex w-full items-center gap-4 py-2 pr-7 pl-3 hover:bg-muted/50">
				<button
					type="button"
					onClick={handleToggleMonitored}
					disabled={!seriesMonitored || isUpdating}
					className="flex items-center justify-center p-2 transition-colors hover:text-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<Bookmark
						className={cn('size-4', !seriesMonitored ? 'text-muted-foreground' : isMonitored ? 'fill-pink-600 text-pink-600' : someEpisodesMonitored ? 'fill-pink-300 text-pink-600' : 'text-pink-300')}
					/>
				</button>
				<CollapsibleTrigger className="flex flex-1 cursor-pointer items-center gap-3">
					<span className="font-semibold">Season {season.seasonNumber}</span>
					<span className="text-muted-foreground text-sm">
						{downloadedEpisodes} / {totalEpisodes} episodes
					</span>
					<span className="mx-2 text-muted-foreground">•</span>
					<Progress
						value={progressPercent}
						className="w-32"
					/>
					<span className="text-muted-foreground text-sm">{progressPercent}%</span>
					<ChevronDown className={cn('ml-auto size-5 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
				</CollapsibleTrigger>
			</div>

			<CollapsibleContent>
				<Table>
					<TableHeader>
						<TableRow className="hover:bg-transparent">
							<TableHead className="w-10" />
							<TableHead className="w-16">Episode</TableHead>
							<TableHead>Title</TableHead>
							<TableHead className="w-32">Air Date</TableHead>
							<TableHead className="w-28">Status</TableHead>
							<TableHead className="w-20">Quality</TableHead>
							<TableHead className="w-20">Size</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{episodes.map((episode) => (
							<EpisodeRow
								key={episode.id}
								episode={episode}
								seriesId={seriesId}
								seriesMonitored={seriesMonitored}
								seriesResolution={seriesResolution}
							/>
						))}
					</TableBody>
				</Table>
			</CollapsibleContent>
		</Collapsible>
	)
}

function EpisodeRow({ episode, seriesId, seriesMonitored, seriesResolution }: { episode: EpisodeWithFiles; seriesId: string; seriesMonitored: boolean; seriesResolution: string | null }) {
	const router = useRouter()
	const [isUpdating, setIsUpdating] = useState(false)
	const hasFiles = episode.files.length > 0
	const today = new Date().toISOString().split('T')[0]
	const airDate = episode.airDate ?? ''
	const isAired = airDate && airDate <= today
	const isFuture = airDate && airDate > today

	// Calculate total size of files
	const totalSizeBytes = episode.files.reduce((sum, f) => sum + (f.size ?? 0), 0)
	const sizeDisplay = totalSizeBytes > 0 ? `${(totalSizeBytes / 1073741824).toFixed(1)} GB` : '—'

	// Get quality from first file or use series resolution
	const quality = hasFiles ? (episode.files[0].quality ?? seriesResolution ?? '—') : '—'

	const isMonitored = episode.monitored ?? true

	const handleToggleMonitored = async () => {
		setIsUpdating(true)
		try {
			await updateEpisode({ data: { seriesId, episodeId: episode.id.toString(), monitored: !isMonitored } })
			router.invalidate()
		} finally {
			setIsUpdating(false)
		}
	}

	// Status badge
	let statusBadge: React.ReactNode = null
	if (hasFiles) {
		statusBadge = (
			<Badge variant="downloaded">
				<Download className="size-3" />
				Downloaded
			</Badge>
		)
	} else if (isFuture) {
		statusBadge = (
			<Badge variant="default">
				<Timer className="size-3" />
				Airing
			</Badge>
		)
	} else if (isAired) {
		statusBadge = (
			<Badge variant="wanted">
				<Search className="size-3" />
				Wanted
			</Badge>
		)
	}

	return (
		<TableRow>
			<TableCell className="w-10 pl-3">
				<button
					type="button"
					onClick={handleToggleMonitored}
					disabled={!seriesMonitored || isUpdating}
					className="flex items-center justify-center p-2 transition-colors hover:text-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<Bookmark className={cn('size-4', !seriesMonitored ? 'text-muted-foreground' : isMonitored ? 'fill-pink-600 text-pink-600' : 'text-pink-300')} />
				</button>
			</TableCell>
			<TableCell>
				<span className="font-medium">{episode.episodeNumber}</span>
			</TableCell>
			<TableCell>
				<div>
					<div className="font-medium">{episode.title || 'TBA'}</div>
					<div className="text-muted-foreground text-xs">{episode.runtimeMins ? `${episode.runtimeMins} min` : '—'}</div>
				</div>
			</TableCell>
			<TableCell className="text-muted-foreground">{formatDate(episode.airDate)}</TableCell>
			<TableCell>{statusBadge}</TableCell>
			<TableCell className={quality !== '—' ? 'text-primary' : 'text-muted-foreground'}>{quality}</TableCell>
			<TableCell className={sizeDisplay !== '—' ? 'text-size' : 'text-muted-foreground'}>{sizeDisplay}</TableCell>
			<TableCell className="text-right">
				<Button
					variant="ghost"
					size="sm"
					className="h-7 gap-1.5 text-muted-foreground hover:text-foreground"
				>
					<Search className="size-3.5" />
					Search
				</Button>
			</TableCell>
		</TableRow>
	)
}
