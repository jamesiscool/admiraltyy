import { Badge } from '@/client/components/ui/badge'
import { Card } from '@/client/components/ui/card'

interface SearchResult {
	tmdbId: number
	title: string
	posterPath?: string
	backdropPath?: string
	overview: string
	releaseDate?: string
	voteAverage: number
	mediaType: 'movie' | 'tv'
}

interface SearchResultCardProps {
	result: SearchResult
}

export function SearchResultCard({ result }: SearchResultCardProps) {
	const year = result.releaseDate ? new Date(result.releaseDate).getFullYear() : null
	const rating = result.voteAverage.toFixed(1)

	return (
		<Card className="group cursor-pointer overflow-hidden p-0 transition-all hover:bg-muted">
			<div className="flex">
				{/* Poster */}
				<div className="relative aspect-[2/3] w-[92px] shrink-0 overflow-hidden">
					{result.posterPath ? (
						<img
							src={result.posterPath}
							alt={result.title}
							className="h-full w-full object-cover transition-transform group-hover:scale-105"
						/>
					) : (
						<div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground text-xs">No Poster</div>
					)}
				</div>

				{/* Content */}
				<div className="flex flex-1 flex-col gap-1 p-3">
					<div className="flex items-start justify-between gap-2">
						<h3 className="line-clamp-2 font-medium text-sm leading-tight">
							{result.title}
							{year && <span className="ml-1 text-muted-foreground">({year})</span>}
						</h3>
						<Badge
							variant={Number(rating) >= 7 ? 'default' : 'secondary'}
							className="shrink-0 text-xs"
						>
							{rating}
						</Badge>
					</div>

					<p className="line-clamp-3 text-muted-foreground text-xs">{result.overview || 'No overview available.'}</p>
				</div>
			</div>
		</Card>
	)
}
