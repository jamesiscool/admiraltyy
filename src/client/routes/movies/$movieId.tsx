import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Bookmark, Calendar, Clock, Film, HardDrive, Search, Settings2, Trash2 } from 'lucide-react'
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
							className="h-full w-full object-cover opacity-20"
						/>
						<div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
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
									<h1 className="mb-2">{movie.title}</h1>
									<div className="flex flex-wrap items-center gap-2 text-muted-foreground">
										<span className="font-medium">{movie.year}</span>
										<span>•</span>
										<span>{movie.runtimeMins} min</span>
										<span>•</span>
										<Badge variant={hasFile ? 'downloaded' : 'wanted'}>{hasFile ? 'Downloaded' : 'Missing'}</Badge>
									</div>
								</div>

								{/* Monitored badge */}
								<Badge
									variant={movie.monitored ? 'neutral' : 'outline'}
									className="shrink-0"
								>
									<Bookmark className={movie.monitored ? 'size-3 fill-current' : 'size-3'} />
									{movie.monitored ? 'Monitored' : 'Unmonitored'}
								</Badge>
							</div>

							{/* Genres */}
							{genres.length > 0 && (
								<div className="flex flex-wrap gap-1.5">
									{genres.map((genre) => (
										<Badge
											key={genre}
											variant="outline"
										>
											{genre}
										</Badge>
									))}
								</div>
							)}

							{/* Synopsis */}
							{movie.synopsis && <p className="max-w-3xl text-foreground/90 leading-relaxed">{movie.synopsis}</p>}

							{/* Info cards */}
							<div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
								<InfoCard
									icon={<Settings2 className="size-4" />}
									label="Quality"
									value={movie.resolution ?? '1080p'}
								/>
								<InfoCard
									icon={<Calendar className="size-4" />}
									label="Cinema Release"
									value={formatDate(movie.cinemaReleaseDate)}
								/>
								<InfoCard
									icon={<HardDrive className="size-4" />}
									label="Digital Release"
									value={formatDate(movie.digitalReleaseDate)}
								/>
								<InfoCard
									icon={<Clock className="size-4" />}
									label="Added"
									value={formatDate(movie.dateAdded)}
								/>
							</div>

							{/* Action buttons */}
							<div className="mt-2 flex flex-wrap gap-2">
								<Button>
									<Search className="size-4" />
									Auto Search
								</Button>
								<Button variant="outline">
									<Search className="size-4" />
									Manual Search
								</Button>
								<Button variant="outline">
									<Settings2 className="size-4" />
									Edit Quality
								</Button>
								<Button variant="destructive">
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

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
	return (
		<div className="rounded-sm bg-muted/50 px-3 py-2">
			<div className="mb-1 flex items-center gap-1.5 text-muted-foreground text-xs">
				{icon}
				{label}
			</div>
			<div className="font-semibold">{value}</div>
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
