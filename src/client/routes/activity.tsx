import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/activity')({
	component: RouteComponent,
})

function RouteComponent() {
	return (
		<div className="container">
			<h1 className="mb-[16px]">Activity</h1>
			<p className="text-muted-foreground">Monitor the download queue, view history, and track the status of current and completed grabs.</p>
		</div>
	)
}
