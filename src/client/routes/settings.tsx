import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/settings')({
	component: RouteComponent,
})

function RouteComponent() {
	return (
		<div className="container">
			<h1 className="mb-[16px]">Settings</h1>
			<p className="text-muted-foreground">Connect indexers, configure NZBGet, set up folder organization, manage resolutions, and system preferences.</p>
		</div>
	)
}
