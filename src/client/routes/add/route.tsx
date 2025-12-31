import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Input } from '@/client/components/ui/input'
import { api } from '@/client/lib/api'
import { SearchResultCard } from './-search-result-card'

export const Route = createFileRoute('/add')({
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
		queryKey: ['search', debouncedQuery],
		queryFn: async () => {
			const res = await api.api.search.$get({ query: { q: debouncedQuery } })
			const json = await res.json()
			if (!json.success) {
				throw new Error(json.error)
			}
			return json.data
		},
		enabled: debouncedQuery.trim().length > 0,
	})

	const hasResults = results && (results.movies.length > 0 || results.tv.length > 0)
	const noResults = results && results.movies.length === 0 && results.tv.length === 0 && debouncedQuery.trim()

	return (
		<div className="container">
			{/* Search Header */}
			<div className="mb-8">
				<h1 className="mb-2">Add Media</h1>
				<p className="mb-6 text-muted-foreground">Search for movies and TV shows to add to your library.</p>

				{/* Big Search Input */}
				<div className="relative mx-auto max-w-2xl">
					<Search className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
					<Input
						ref={inputRef}
						type="text"
						placeholder="Search for movies or TV shows..."
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						className="h-14 pl-12 text-lg"
						autoFocus
					/>
				</div>
			</div>

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
						<h2 className="mb-3 flex items-center gap-2 font-semibold text-lg">
							Movies
							<span className="pt-1 font-normal text-[15px] text-muted-foreground">({results.movies.length})</span>
						</h2>
						{results.movies.length > 0 ? (
							<div className="flex flex-col gap-3">
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
						<h2 className="mb-3 flex items-center gap-2 font-semibold text-lg">
							TV Shows
							<span className="pt-1 font-normal text-[15px] text-muted-foreground">({results.tv.length})</span>
						</h2>
						{results.tv.length > 0 ? (
							<div className="flex flex-col gap-3">
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

			{/* Empty State */}
			{!query && !isLoading && <div className="py-12 text-center text-muted-foreground">Start typing to search for movies and TV shows</div>}
		</div>
	)
}
