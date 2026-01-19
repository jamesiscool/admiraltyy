import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Bookmark, Film, Search, Settings2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { DeleteConfirmationModal, type DeleteTarget } from '@/client/components/delete-confirmation-modal'
import { MovieManualSearchDialog } from '@/client/components/movie-manual-search-dialog'
import { Button } from '@/client/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/client/components/ui/card'
import { useDeleteMovie, useMovie, useUpdateMovie } from '@/client/lib/api'

export const Route = createFileRoute('/movies/$movieId')({
	component: MovieDetailPage,
})

function MovieDetailPage() {
	const { movieId } = Route.useParams()
	const navigate = useNavigate()

	const { data: movie, isLoading, error } = useMovie(movieId)
	const updateMovie = useUpdateMovie(movieId)

	// Manual search dialog state
	const [manualSearchOpen, setManualSearchOpen] = useState(false)

	// Delete modal state
	const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
	const deleteMovie = useDeleteMovie({
		onSuccess: () => {
			setDeleteTarget(null)
			navigate({ to: '/movies' })
		},
	})

	const handleDeleteConfirm = (deleteFiles: boolean) => {
		if (!deleteTarget) return
		deleteMovie.mutate({ param: { id: String(deleteTarget.id) }, query: { deleteFiles: String(deleteFiles) } })
	}

	if (isLoading) {
		return (
			<div className="flex min-h-[calc(100vh-64px)] items-center justify-center">
				<div className="text-muted-foreground">Loading movie...</div>
			</div>
		)
	}

	if (error || !movie) {
		return (
			<div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center gap-4">
				<div className="text-destructive">{error?.message ?? 'Movie not found'}</div>
				<Link
					to="/movies"
					className="inline-flex items-center gap-1.5 rounded border border-border bg-background px-2.5 py-1.5 font-medium text-sm shadow-xs transition-colors hover:bg-muted"
				>
					<ArrowLeft className="size-4" />
					Back to Movies
				</Link>
			</div>
		)
	}

	// Parse JSON fields
	const genres: string[] = movie.genres ? JSON.parse(movie.genres) : []

	// Get file details from files table
	const hasFile = movie.files && movie.files.length > 0
	const fileDetails = hasFile
		? {
				path: movie.files[0].path,
				size: `${(movie.files[0].size / 1073741824).toFixed(1)} GB`,
				quality: movie.files[0].quality,
				source: movie.files[0].source ?? 'Unknown',
				codec: movie.files[0].codec ?? 'Unknown',
				dateImported: movie.files[0].dateImported,
			}
		: null

	return (
		<div className="overflow-y-auto">
			{/* Hero section with backdrop */}
			<div className="relative">
				{/* Backdrop image */}
				{movie.backdropUrl && (
					<div className="absolute inset-0 h-full w-full overflow-hidden">
						<img
							src={movie.backdropUrl}
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
								{movie.posterUrl ? (
									<img
										src={movie.posterUrl}
										alt={movie.title}
										className="h-full w-full object-cover"
									/>
								) : (
									<div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-700 to-neutral-900">
										<Film className="size-12 text-neutral-600" />
									</div>
								)}
							</div>
						</div>

						{/* Movie info */}
						<div className="flex flex-1 flex-col gap-4">
							<div className="flex items-start justify-between gap-4">
								<div>
									<h1 className="mb-2 text-white">{movie.title}</h1>
									<div className="flex flex-wrap items-center gap-2 text-neutral-200">
										<span className="font-medium">{movie.year}</span>
										<span>•</span>
										<span>{movie.runtimeMins} min</span>
										<span>•</span>
										{hasFile && movie.sizeBytes ? (
											<span className="text-size">{(movie.sizeBytes / 1073741824).toFixed(1)} GB</span>
										) : movie.monitored ? (
											<span className="text-yellow-400 tracking-wide">Missing</span>
										) : (
											<Bookmark className="size-3.5 text-pink-300" />
										)}
									</div>
								</div>

								{/* Monitored badge */}
								<Button
									variant={movie.monitored ? 'monitored' : 'outline'}
									className="shrink-0 gap-1.5"
									disabled={updateMovie.isPending}
									onClick={() => updateMovie.mutate({ param: { id: movieId }, json: { monitored: !movie.monitored } })}
								>
									<Bookmark className={movie.monitored ? 'size-3 fill-current' : 'size-3'} />
									{movie.monitored ? 'Monitored' : 'Unmonitored'}
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
							{movie.synopsis && <p className="max-w-3xl text-white leading-relaxed">{movie.synopsis}</p>}

							{/* Info cards */}
							<div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
								<div className="flex flex-wrap gap-x-6 gap-y-2">
									<div className="flex flex-col">
										<span className="font-semibold text-sm text-white/80">Quality</span>
										<span className="text-blue-300">{movie.resolution ?? '1080p'}</span>
									</div>
									{movie.cinemaReleaseDate && (
										<div className="flex flex-col">
											<span className="font-semibold text-sm text-white/80">Cinema Release</span>
											<span className="text-white">{formatDate(movie.cinemaReleaseDate)}</span>
										</div>
									)}
									{movie.digitalReleaseDate && (
										<div className="flex flex-col">
											<span className="font-semibold text-sm text-white/80">Digital Release</span>
											<span className="text-white">{formatDate(movie.digitalReleaseDate)}</span>
										</div>
									)}
									<div className="flex flex-col">
										<span className="font-semibold text-sm text-white/80">Added</span>
										<span className="text-white">{formatDate(movie.dateAdded)}</span>
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
									onClick={() => setManualSearchOpen(true)}
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
										if (!movie) return
										setDeleteTarget({
											type: 'movie',
											id: movie.id,
											title: movie.title,
											sizeBytes: movie.sizeBytes,
										})
									}}
								>
									<Trash2 className="size-4" />
									Delete Movie
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Details section */}
			<div className="container py-8">
				{/* File Details */}
				<Card>
					<CardHeader>
						<CardTitle>File Details</CardTitle>
					</CardHeader>
					<CardContent>
						{fileDetails ? (
							<div className="space-y-4">
								<div>
									<div className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wider">Path</div>
									<code className="block break-all rounded bg-muted px-2 py-1.5 font-mono text-sm">{fileDetails.path}</code>
								</div>
								<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
									<DetailItem
										label="Quality"
										value={fileDetails.quality}
										highlight
									/>
									<DetailItem
										label="Source"
										value={fileDetails.source}
									/>
									<DetailItem
										label="Codec"
										value={fileDetails.codec}
									/>
									<DetailItem
										label="Size"
										value={fileDetails.size}
									/>
								</div>
								<div>
									<DetailItem
										label="Date Imported"
										value={fileDetails.dateImported}
									/>
								</div>
							</div>
						) : (
							<div className="py-6 text-center text-muted-foreground">No file associated with this movie yet.</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Movie Manual Search Dialog */}
			<MovieManualSearchDialog
				movieId={movieId}
				movieTitle={movie.title}
				movieYear={movie.year}
				open={manualSearchOpen}
				onOpenChange={setManualSearchOpen}
			/>

			{/* Delete Confirmation Modal */}
			<DeleteConfirmationModal
				target={deleteTarget}
				onClose={() => setDeleteTarget(null)}
				onConfirm={handleDeleteConfirm}
				isPending={deleteMovie.isPending}
			/>
		</div>
	)
}

function DetailItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
	return (
		<div>
			<div className="mb-0.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">{label}</div>
			<div className={highlight ? 'font-medium text-primary' : label === 'Size' ? 'text-size' : ''}>{value}</div>
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
