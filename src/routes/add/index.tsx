import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { searchTmdbQueryOptions } from '@/services/search'
import { SearchResultCard } from './-search-result-card'

export const Route = createFileRoute('/add/')({
	component: AddPage,
})

function useDebounce<T>(value: T, delayMs: number): T {
	const [debouncedValue, setDebouncedValue] = useState(value)

	useEffect(() => {
		const timer = setTimeout(() => setDebouncedValue(value), delayMs)
		return () => clearTimeout(timer)
	}, [value, delayMs])

	return debouncedValue
}

function AddPage() {
	const [query, setQuery] = useState('')
	const debouncedQuery = useDebounce(query, 300)
	const inputRef = useRef<HTMLInputElement>(null)

	const {
		data: results,
		isLoading,
		error,
	} = useQuery({
		...searchTmdbQueryOptions(debouncedQuery),
		enabled: debouncedQuery.trim().length > 0,
	})

	const hasResults = results && (results.movies.length > 0 || results.tv.length > 0)
	const noResults = results && results.movies.length === 0 && results.tv.length === 0 && debouncedQuery.trim()

	return (
		<div className="flex h-full flex-col">
			{/* Search Header */}
			<div className="shrink-0 border-b">
				<div className="container flex items-center gap-4 pt-0!">
					<h1 className="mb-2 block max-w-max shrink-0 pt-3 text-3xl!">Add</h1>

					{/* Big Search Input */}
					<div className="relative grow">
						<Search className="-translate-y-1/2 absolute top-1/2 left-4 h-5 w-5 text-muted-foreground" />
						<Input
							ref={inputRef}
							type="text"
							placeholder="Search for movies or TV shows..."
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							className="h-12 max-w-full pl-12 md:text-lg"
							autoFocus
						/>
					</div>
				</div>
			</div>
			<div className="grow overflow-y-auto">
				<div className="container pt-5">
					{/* Loading State */}
					{isLoading && <div className="py-12 text-center text-muted-foreground">Searching...</div>}

					{/* Error State */}
					{error && <div className="py-12 text-center text-destructive">{error.message}</div>}

					{/* No Results */}
					{noResults && !isLoading && <div className="py-12 text-center text-muted-foreground">No results found for "{debouncedQuery}"</div>}

					{/* Results Grid */}
					{hasResults && !isLoading && (
						<div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
							{/* Movies Column */}
							<div>
								<h2 className="mb-3 flex items-center gap-2 font-semibold text-xl">
									Movies
									<span className="pt-[1px] font-light text-muted-foreground">({results.movies.length})</span>
								</h2>
								{results.movies.length > 0 ? (
									<div className="flex flex-col gap-4">
										{results.movies.map((movie) => (
											<SearchResultCard
												key={movie.tmdbId}
												result={movie}
											/>
										))}
									</div>
								) : (
									<div className="py-4 text-muted-foreground text-sm">No movies found</div>
								)}
							</div>

							{/* TV Column */}
							<div>
								<h2 className="mb-3 flex items-center gap-2 font-semibold text-xl">
									TV Shows
									<span className="pt-[1px] font-light text-muted-foreground">({results.tv.length})</span>
								</h2>
								{results.tv.length > 0 ? (
									<div className="flex flex-col gap-4">
										{results.tv.map((show) => (
											<SearchResultCard
												key={show.tmdbId}
												result={show}
											/>
										))}
									</div>
								) : (
									<div className="py-4 text-muted-foreground text-sm">No TV shows found</div>
								)}
							</div>
						</div>
					)}
				</div>
			</div>
			{/* Empty State */}
			{!query && !isLoading && <div className="py-12 text-center text-muted-foreground">Start typing to search for movies and TV shows</div>}
		</div>
	)
}
