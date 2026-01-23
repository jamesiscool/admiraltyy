import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Loader2, Play } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { scanMoviesFiles, scanSeriesFiles } from '@/services/tasks'

export const Route = createFileRoute('/tasks')({
	component: TasksPage,
})

type ScanResult = { foldersScanned: number; matched: number; filesImported: number; filesMarkedDeleted: number }

interface TaskItemProps {
	title: string
	description: string
	isLoading: boolean
	onRun: () => void
	result?: ScanResult
	error?: string
}

function TaskItem({ title, description, isLoading, onRun, result, error }: TaskItemProps) {
	return (
		<div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4">
			<div className="flex flex-col gap-0.5">
				<span className="font-medium">{title}</span>
				<span className="text-muted-foreground text-sm">{description}</span>
				{result && (
					<span className="mt-1 text-green-700 text-sm">
						Scanned {result.foldersScanned} folders, matched {result.matched}, imported {result.filesImported} files
					</span>
				)}
				{error && <span className="mt-1 text-red-600 text-sm">{error}</span>}
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

function TasksPage() {
	const router = useRouter()
	const [movieScan, setMovieScan] = useState<{ isLoading: boolean; result?: ScanResult; error?: string }>({ isLoading: false })
	const [seriesScan, setSeriesScan] = useState<{ isLoading: boolean; result?: ScanResult; error?: string }>({ isLoading: false })

	const handleScanMovies = async () => {
		setMovieScan({ isLoading: true })
		try {
			const result = await scanMoviesFiles()
			setMovieScan({ isLoading: false, result })
			router.invalidate()
		} catch (err) {
			setMovieScan({ isLoading: false, error: err instanceof Error ? err.message : 'Scan failed' })
		}
	}

	const handleScanSeries = async () => {
		setSeriesScan({ isLoading: true })
		try {
			const result = await scanSeriesFiles()
			setSeriesScan({ isLoading: false, result })
			router.invalidate()
		} catch (err) {
			setSeriesScan({ isLoading: false, error: err instanceof Error ? err.message : 'Scan failed' })
		}
	}

	return (
		<div className="container">
			<h1 className="mb-[16px]">Tasks</h1>
			<p className="mb-6 text-muted-foreground">Manual tasks for scanning and importing media files.</p>

			<div className="flex flex-col gap-3">
				<TaskItem
					title="Scan file system for movies"
					description="Scan configured movie folders and match to library"
					isLoading={movieScan.isLoading}
					onRun={handleScanMovies}
					result={movieScan.result}
					error={movieScan.error}
				/>
				<TaskItem
					title="Scan file system for TV series"
					description="Scan configured TV folders and match to library"
					isLoading={seriesScan.isLoading}
					onRun={handleScanSeries}
					result={seriesScan.result}
					error={seriesScan.error}
				/>
			</div>
		</div>
	)
}
