import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Bookmark, Film, Search, Settings2, Trash2 } from 'lucide-react'
import { Badge } from '@/client/components/ui/badge'
import { Button } from '@/client/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/client/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/client/components/ui/table'
import { api } from '@/client/lib/api'
import type { Movie } from '@/server/db/schema'

export const Route = createFileRoute('/movies/$movieId')({
	component: MovieDetailPage,
})

function MovieDetailPage() {
	const { movieId } = Route.useParams()

	const {
		data: movie,
		isLoading,
		error,
	} = useQuery({
		queryKey: ['movie', movieId],
		queryFn: async () => {
			const res = await api.api.movies[':id'].$get({ param: { id: movieId } })
			const json = await res.json()
			if (!json.success) {
				throw new Error('Failed to fetch movie')
			}
			return json.data as Movie
		},
	})

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

	// Handle both old format (string[]) and new format ({name, character}[])
	const rawCast = movie.cast ? JSON.parse(movie.cast) : []
	const cast: Array<{ name: string; character: string }> = rawCast.map((c: string | { name: string; character: string }) => (typeof c === 'string' ? { name: c, character: '' } : c))

	// TODO: Get from files table when available
	const hasFile = false
	const fileDetails = null as null | {
		path: string
		size: string
		quality: string
		source: string
		codec: string
		dateImported: string
	}

	return (
		<div className="min-h-[calc(100vh-64px)]">
			{/* Back link */}
			<div className="border-border border-b bg-background">
				<div className="container py-3!">
					<Link
						to="/movies"
						className="inline-flex items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
					>
						<ArrowLeft className="size-4" />
						Back to Movies
					</Link>
				</div>
			</div>

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
										{/** biome-ignore lint/nursery/noUnnecessaryConditions: File hasn't been connected up to movies yet  */}
										<span className={hasFile ? 'text-green-300' : 'text-yellow-300'}>{hasFile ? 'Downloaded' : 'Missing'}</span>
									</div>
								</div>

								{/* Monitored badge */}
								<Badge
									variant={movie.monitored ? 'neutral' : 'outline'}
									className="shrink-0 gap-1.5"
								>
									<Bookmark className={movie.monitored ? 'size-3 fill-current' : 'size-3'} />
									{movie.monitored ? 'Monitored' : 'Unmonitored'}
								</Badge>
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
								<Button className="h-9 bg-destructive px-4 text-white hover:bg-destructive/90">
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
				<div className="grid gap-6 lg:grid-cols-2">
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
											label="Size"
											value={fileDetails.size}
										/>
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

					{/* Cast */}
					<Card>
						<CardHeader>
							<CardTitle>Cast</CardTitle>
						</CardHeader>
						<CardContent className="p-0!">
							{cast.length > 0 ? (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Actor</TableHead>
											<TableHead>Character</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{cast.slice(0, 6).map((member) => (
											<TableRow key={member.name}>
												<TableCell className="font-medium">{member.name}</TableCell>
												<TableCell className="text-primary">{member.character}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							) : (
								<div className="py-6 text-center text-muted-foreground">No cast information available.</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
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
