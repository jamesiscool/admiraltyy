import { createFileRoute } from '@tanstack/react-router'
import { Loader2, Play } from 'lucide-react'
import { Button } from '@/client/components/ui/button'
import { useScanMovies, useScanSeries } from '@/client/lib/api'

export const Route = createFileRoute('/tasks')({
	component: RouteComponent,
})

function RouteComponent() {
	const scanMovies = useScanMovies()
	const scanSeries = useScanSeries()

	return (
		<div className="container">
			<h1 className="mb-[16px]">Tasks</h1>
			<p className="mb-6 text-muted-foreground">Manual tasks for scanning and importing media files.</p>

			<div className="flex flex-col gap-3">
				<TaskItem
					title="Scan file system for movies"
					description="Scan configured movie folders and match to library"
					isLoading={scanMovies.isPending}
					onRun={() => scanMovies.mutate({})}
					result={scanMovies.data}
					error={scanMovies.error?.message}
				/>
				<TaskItem
					title="Scan file system for TV series"
					description="Scan configured TV folders and match to library"
					isLoading={scanSeries.isPending}
					onRun={() => scanSeries.mutate({})}
					result={scanSeries.data}
					error={scanSeries.error?.message}
				/>
			</div>
		</div>
	)
}

type ScanResult = { foldersScanned: number; matched: number; filesImported: number; filesMarkedDeleted: number } | { error: string }

function TaskItem({ title, description, isLoading, onRun, result, error }: { title: string; description: string; isLoading: boolean; onRun: () => void; result?: ScanResult; error?: string }) {
	const successResult = result && 'foldersScanned' in result ? result : undefined
	const apiError = result && 'error' in result ? result.error : undefined
	return (
		<div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4">
			<div className="flex flex-col gap-0.5">
				<span className="font-medium">{title}</span>
				<span className="text-muted-foreground text-sm">{description}</span>
				{successResult && (
					<span className="mt-1 text-green-700 text-sm">
						Scanned {successResult.foldersScanned} folders, matched {successResult.matched}, imported {successResult.filesImported} files
					</span>
				)}
				{(error || apiError) && <span className="mt-1 text-red-600 text-sm">{error || apiError}</span>}
			</div>
			<Button
				variant="outline"
				size="icon"
				onClick={onRun}
				disabled={isLoading}
			>
				{isLoading ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
			</Button>
		</div>
	)
}
