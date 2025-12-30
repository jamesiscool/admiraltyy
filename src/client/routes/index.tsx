import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
	component: RouteComponent,
})

function RouteComponent() {
	return (
		<div className="container">
			<h1 className="mb-[16px]">Dashboard</h1>
			<p className="text-muted-foreground">Overview of your media library with quick stats, recent activity, and download status.</p>
		</div>
	)
}
