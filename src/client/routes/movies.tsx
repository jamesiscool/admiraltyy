import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/movies')({
	component: RouteComponent,
})

function RouteComponent() {
	return (
		<div className="container">
			<h1 className="mb-[16px]">Movies</h1>
			<p className="text-muted-foreground">Browse your tracked movies, discover new films via TMDB, and manage monitoring.</p>
		</div>
	)
}
