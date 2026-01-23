import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/add/')({
	component: AddPage,
})

function AddPage() {
	return (
		<div className="container">
			<h1 className="mb-[16px]">Add Media</h1>
			<p className="text-muted-foreground">Search and add movies or TV series to your library.</p>
		</div>
	)
}
