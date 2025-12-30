import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/add')({
	component: RouteComponent,
})

function RouteComponent() {
	return (
		<div className="container">
			<h1 className="mb-[16px]">Add</h1>
			<p className="text-muted-foreground">Add a new movie or TV series to your library.</p>
		</div>
	)
}
