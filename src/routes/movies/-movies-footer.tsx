import { formatSize } from '@/lib/utils'

interface MoviesFooterProps {
	totalMovies: number
	downloadedMovies: number
	wantedMovies: number
	filteredCount: number
	filteredSize: number
	totalSize: number
	hasActiveFilters: boolean
}

export function MoviesFooter({ totalMovies, downloadedMovies, wantedMovies, filteredCount, filteredSize, totalSize, hasActiveFilters }: MoviesFooterProps) {
	return (
		<div className="shrink-0 border-border border-t bg-background">
			<div className="container py-3">
				<div className="flex items-center justify-between text-sm">
					{/* Left side - Status counts */}
					<div className="flex items-center gap-4">
						<span className="text-muted-foreground">
							<span className="font-semibold text-foreground">{totalMovies}</span> Total
						</span>
						<span className="text-border">|</span>
						<span className="text-muted-foreground">
							<span className="font-semibold text-green-400">{downloadedMovies}</span> Downloaded
						</span>
						<span className="text-border">|</span>
						<span className="text-muted-foreground">
							<span className="font-semibold text-yellow-400">{wantedMovies}</span> Wanted
						</span>
					</div>

					{/* Right side - Selection and size stats */}
					<div className="flex items-center gap-4">
						{hasActiveFilters && (
							<>
								<span className="text-muted-foreground">
									<span className="font-semibold text-foreground">{filteredCount}</span> Selected
								</span>
								<span className="text-border">|</span>
								<span className="text-muted-foreground">
									<span className="font-semibold text-foreground">{formatSize(filteredSize)}</span>
								</span>
							</>
						)}
						<span className="text-border">|</span>
						<span className="text-muted-foreground">
							<span className="font-semibold text-foreground">{totalMovies}</span> Total
						</span>
						<span className="text-border">|</span>
						<span className="text-muted-foreground">
							<span className="font-semibold text-foreground">{formatSize(totalSize)}</span>
						</span>
					</div>
				</div>
			</div>
		</div>
	)
}
