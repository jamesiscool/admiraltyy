import { Film, Tv } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/client/components/ui/badge'
import { Card } from '@/client/components/ui/card'
import { AddMovieDialog } from './-add-movie-dialog'

// Genre mappings from TMDB
const MOVIE_GENRES: Record<number, string> = {
	28: 'Action',
	12: 'Adventure',
	16: 'Animation',
	35: 'Comedy',
	80: 'Crime',
	99: 'Documentary',
	18: 'Drama',
	10751: 'Family',
	14: 'Fantasy',
	36: 'History',
	27: 'Horror',
	10402: 'Music',
	9648: 'Mystery',
	10749: 'Romance',
	878: 'Sci-Fi',
	10770: 'TV Movie',
	53: 'Thriller',
	10752: 'War',
	37: 'Western',
}

const TV_GENRES: Record<number, string> = {
	10759: 'Action & Adventure',
	16: 'Animation',
	35: 'Comedy',
	80: 'Crime',
	99: 'Documentary',
	18: 'Drama',
	10751: 'Family',
	10762: 'Kids',
	9648: 'Mystery',
	10763: 'News',
	10764: 'Reality',
	10765: 'Sci-Fi & Fantasy',
	10766: 'Soap',
	10767: 'Talk',
	10768: 'War & Politics',
	37: 'Western',
}

function TmdbLogo({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 190.24 81.52"
			role="img"
		>
			<title>TMDB</title>
			<defs>
				<linearGradient
					id="tmdb-gradient"
					y1="40.76"
					x2="190.24"
					y2="40.76"
					gradientUnits="userSpaceOnUse"
				>
					<stop
						offset="0"
						stopColor="#90cea1"
					/>
					<stop
						offset=".56"
						stopColor="#3cbec9"
					/>
					<stop
						offset="1"
						stopColor="#00b3e5"
					/>
				</linearGradient>
			</defs>
			<path
				fill="url(#tmdb-gradient)"
				d="M105.67 36.06h66.9a17.67 17.67 0 0017.67-17.66A17.67 17.67 0 00172.57.73h-66.9A17.67 17.67 0 0088 18.4a17.67 17.67 0 0017.67 17.66zm-88 45h76.9a17.67 17.67 0 0017.67-17.66 17.67 17.67 0 00-17.67-17.67h-76.9A17.67 17.67 0 000 63.4a17.67 17.67 0 0017.67 17.66zm-7.26-45.64h7.8V6.92h10.1V0h-28v6.9h10.1zm28.1 0h7.8V8.25h.1l9 27.15h6l9.3-27.15h.1V35.4h7.8V0H66.76l-8.2 23.1h-.1L50.31 0h-11.8zm113.92 20.25a15.07 15.07 0 00-4.52-5.52 18.57 18.57 0 00-6.68-3.08 33.54 33.54 0 00-8.07-1h-11.7v35.4h12.75a24.58 24.58 0 007.55-1.15 19.34 19.34 0 006.35-3.32 16.27 16.27 0 004.37-5.5 16.91 16.91 0 001.63-7.58 18.5 18.5 0 00-1.68-8.25zM145 68.6a8.8 8.8 0 01-2.64 3.4 10.7 10.7 0 01-4 1.82 21.57 21.57 0 01-5 .55h-4.05v-21h4.6a17 17 0 014.67.63 11.66 11.66 0 013.88 1.87A9.14 9.14 0 01145 59a9.87 9.87 0 011 4.52 11.89 11.89 0 01-1 5.08zm44.63-.13a8 8 0 00-1.58-2.62 8.38 8.38 0 00-2.42-1.85 10.31 10.31 0 00-3.17-1v-.1a9.22 9.22 0 004.42-2.82 7.43 7.43 0 001.68-5 8.42 8.42 0 00-1.15-4.65 8.09 8.09 0 00-3-2.72 12.56 12.56 0 00-4.18-1.3 32.84 32.84 0 00-4.62-.33h-13.2v35.4h14.5a22.41 22.41 0 004.72-.5 13.53 13.53 0 004.28-1.65 9.42 9.42 0 003.1-3 8.52 8.52 0 001.2-4.68 9.39 9.39 0 00-.55-3.18zm-19.42-15.75h5.3a10 10 0 011.85.18 6.18 6.18 0 011.7.57 3.39 3.39 0 011.22 1.13 3.22 3.22 0 01.48 1.82 3.63 3.63 0 01-.43 1.8 3.4 3.4 0 01-1.12 1.2 4.92 4.92 0 01-1.58.65 7.51 7.51 0 01-1.77.2h-5.65zm11.72 20a3.9 3.9 0 01-1.22 1.3 4.64 4.64 0 01-1.68.7 8.18 8.18 0 01-1.82.2h-7v-8h5.9a15.35 15.35 0 012 .15 8.47 8.47 0 012.05.55 4 4 0 011.57 1.18 3.11 3.11 0 01.63 2 3.71 3.71 0 01-.43 1.92z"
			/>
		</svg>
	)
}

interface SearchResult {
	tmdbId: number
	title: string
	posterPath?: string
	backdropPath?: string
	overview: string
	releaseDate?: string
	voteAverage: number
	mediaType: 'movie' | 'tv'
	genreIds?: number[]
}

interface SearchResultCardProps {
	result: SearchResult
}

export function SearchResultCard({ result }: SearchResultCardProps) {
	const [dialogOpen, setDialogOpen] = useState(false)

	const year = result.releaseDate ? new Date(result.releaseDate).getFullYear() : null
	const ratingPercent = Math.round(result.voteAverage * 10)
	const MediaIcon = result.mediaType === 'tv' ? Tv : Film
	const genreMap = result.mediaType === 'tv' ? TV_GENRES : MOVIE_GENRES
	const genres = (result.genreIds ?? [])
		.slice(0, 3)
		.map((id) => genreMap[id])
		.filter(Boolean)

	const handleClick = () => {
		if (result.mediaType === 'movie') {
			setDialogOpen(true)
		}
		// TODO: Handle TV show click
	}

	return (
		<>
			<Card
				className="group cursor-pointer overflow-hidden p-0 transition-all hover:bg-muted"
				onClick={handleClick}
			>
				<div className="flex">
					{/* Poster */}
					<div className="relative aspect-[2/3] w-32 shrink-0 overflow-hidden">
						{result.posterPath ? (
							<img
								src={result.posterPath}
								alt={result.title}
								className="h-full w-full object-cover transition-transform group-hover:scale-105"
							/>
						) : (
							<div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground text-xs">
								<MediaIcon className="size-8 text-primary-foreground" />
							</div>
						)}
					</div>

					{/* Content */}
					<div className="flex flex-1 flex-col gap-2 rounded-r-xl border-foreground/10 border-y border-r bg-card p-3 transition-colors group-hover:bg-muted">
						<div className="flex flex-col gap-2">
							<div className="flex items-center justify-between gap-2">
								<h3 className="line-clamp-2 font-bold text-lg leading-tight">
									{result.title}
									{year && <span className="ml-1.5 font-normal text-neutral-700">({year})</span>}
								</h3>
								{ratingPercent > 0 && (
									<div className="flex shrink-0 items-center gap-2">
										<TmdbLogo className="h-3 w-auto" />
										<span className="font-medium text-[15px]">{ratingPercent}%</span>
									</div>
								)}
							</div>
							{genres.length > 0 && (
								<div className="flex flex-wrap gap-1">
									{genres.map((genre) => (
										<Badge key={genre}>{genre}</Badge>
									))}
								</div>
							)}
						</div>

						<p className="line-clamp-2 text-muted-foreground text-sm leading-relaxed">{result.overview || 'No overview available.'}</p>
					</div>
				</div>
			</Card>

			{result.mediaType === 'movie' && (
				<AddMovieDialog
					movie={{
						tmdbId: result.tmdbId,
						title: result.title,
						posterPath: result.posterPath,
						releaseDate: result.releaseDate,
					}}
					open={dialogOpen}
					onOpenChange={setDialogOpen}
				/>
			)}
		</>
	)
}
