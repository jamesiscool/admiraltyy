import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Bookmark, Search, Settings2, Trash2, Tv } from 'lucide-react'
import { useState } from 'react'
import { DeleteConfirmationModal, type DeleteTarget } from '@/client/components/delete-confirmation-modal'
import { Button } from '@/client/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/client/components/ui/card'
import { useDeleteSeries, useSingleSeries, useUpdateSeries } from '@/client/lib/api'

export const Route = createFileRoute('/tv/$seriesId')({
	component: SeriesDetailPage,
})

function SeriesDetailPage() {
	const { seriesId } = Route.useParams()
	const navigate = useNavigate()

	const { data: series, isLoading, error } = useSingleSeries(seriesId)
	const updateSeries = useUpdateSeries(seriesId)

	// Delete modal state
	const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
	const deleteSeries = useDeleteSeries({
		onSuccess: () => {
			setDeleteTarget(null)
			navigate({ to: '/tv' })
		},
	})

	const handleDeleteConfirm = (deleteFiles: boolean) => {
		if (!deleteTarget) return
		deleteSeries.mutate({ seriesId: deleteTarget.id, deleteFiles })
	}

	if (isLoading) {
		return (
			<div className="flex min-h-[calc(100vh-64px)] items-center justify-center">
				<div className="text-muted-foreground">Loading series...</div>
			</div>
		)
	}

	if (error || !series) {
		return (
			<div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center gap-4">
				<div className="text-destructive">{error?.message ?? 'Series not found'}</div>
				<Link
					to="/tv"
					className="inline-flex items-center gap-1.5 rounded border border-border bg-background px-2.5 py-1.5 font-medium text-sm shadow-xs transition-colors hover:bg-muted"
				>
					<ArrowLeft className="size-4" />
					Back to TV Shows
				</Link>
			</div>
		)
	}

	// Parse JSON fields
	const genres: string[] = series.genres ? JSON.parse(series.genres) : []

	// Calculate file stats from nested structure
	const allFiles = series.seasons.flatMap((s) => s.episodes.flatMap((e) => e.files))
	const fileCount = allFiles.length
	const hasFiles = fileCount > 0

	// Calculate total size in GB
	const totalSizeGb = series.sizeBytes ? `${(series.sizeBytes / 1073741824).toFixed(1)} GB` : '0 GB'

	// Format next airing
	const formatNextAiring = (dateStr: string | null) => {
		if (!dateStr) return null

		const date = new Date(dateStr)
		const now = new Date()
		const diffMs = date.getTime() - now.getTime()
		const diffHours = diffMs / (1000 * 60 * 60)

		if (diffMs < 0) return null

		// Within 24 hours: show time like "8 p.m."
		if (diffHours < 24) {
			const hour = date.getHours()
			const period = hour >= 12 ? 'p.m.' : 'a.m.'
			const hour12 = hour % 12 || 12
			return `Today at ${hour12} ${period}`
		}

		// Within 7 days: show day name
		const diffDays = diffMs / (1000 * 60 * 60 * 24)
		if (diffDays < 7) {
			return date.toLocaleDateString('en-US', { weekday: 'long' })
		}

		// More than 7 days: show date like "4 Feb"
		return formatDate(dateStr)
	}

	const nextAiringLabel = formatNextAiring(series.nextAiring ?? null)

	return (
		<div className="min-h-[calc(100vh-64px)]">
			{/* Back link */}
			<div className="border-border border-b bg-background">
				<div className="container py-3!">
					<Link
						to="/tv"
						className="inline-flex items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
					>
						<ArrowLeft className="size-4" />
						Back to TV Shows
					</Link>
				</div>
			</div>

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
									disabled={updateSeries.isPending}
									onClick={() => updateSeries.mutate({ monitored: !series.monitored })}
								>
									<Bookmark className={series.monitored ? 'size-3 fill-current' : 'size-3'} />
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
									{nextAiringLabel && (
										<div className="flex flex-col">
											<span className="font-semibold text-sm text-white/80">Next Airing</span>
											<span className="text-emerald-300">{nextAiringLabel}</span>
										</div>
									)}
									<div className="flex flex-col">
										<span className="font-semibold text-sm text-white/80">Added</span>
										<span className="text-white">{formatDate(series.dateAdded)}</span>
									</div>
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

			{/* Details section */}
			<div className="container py-8">
				<div className="grid gap-6 lg:grid-cols-2">
					{/* Library Stats */}
					<Card>
						<CardHeader>
							<CardTitle>Library Stats</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
								<DetailItem
									label="Total Size"
									value={totalSizeGb}
								/>
								<DetailItem
									label="Episodes"
									value={String(series.episodeCount)}
								/>
								<DetailItem
									label="Files"
									value={String(fileCount)}
								/>
								<DetailItem
									label="Missing"
									value={String(series.missingEpisodeCount)}
									highlight={series.missingEpisodeCount > 0}
								/>
							</div>
						</CardContent>
					</Card>

					{/* Series Info */}
					<Card>
						<CardHeader>
							<CardTitle>Series Info</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-2 gap-4">
								<DetailItem
									label="Status"
									value={series.status === 'continuing' ? 'Continuing' : 'Ended'}
								/>
								{series.network && (
									<DetailItem
										label="Network"
										value={series.network}
									/>
								)}
								{series.runtimeMins && (
									<DetailItem
										label="Runtime"
										value={`${series.runtimeMins} min`}
									/>
								)}
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Delete Confirmation Modal */}
			<DeleteConfirmationModal
				target={deleteTarget}
				onClose={() => setDeleteTarget(null)}
				onConfirm={handleDeleteConfirm}
				isPending={deleteSeries.isPending}
			/>
		</div>
	)
}

function DetailItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
	return (
		<div>
			<div className="mb-0.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">{label}</div>
			<div className={highlight ? 'font-medium text-primary' : ''}>{value}</div>
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
