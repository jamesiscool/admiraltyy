import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/tv')({
	component: RouteComponent,
})

function RouteComponent() {
	return (
		<div className="container">
			<h1 className="mb-[16px]">TV Series</h1>
			<p className="text-muted-foreground">Browse your tracked TV series, discover new shows via TVDB, and manage monitoring at series, season, or episode level.</p>
		</div>
	)
}
