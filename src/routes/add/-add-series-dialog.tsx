import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { Bookmark, Download, Loader2, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Resolution } from '@/db/schema'
import { createSeries } from '@/services/series.functions'
import { getSeriesPreviewFromTmdbOptions } from '@/services/series.queries'
import { getSettingsOptions } from '@/services/settings.queries'

interface SeriesResult {
	tmdbId: number
	title: string
	posterPath?: string
	releaseDate?: string
}

interface AddSeriesDialogProps {
	series: SeriesResult | null
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function AddSeriesDialog({ series, open, onOpenChange }: AddSeriesDialogProps) {
	const router = useRouter()
	const [monitoredSeasons, setMonitoredSeasons] = useState<Set<number>>(new Set())
	const [isLoading, setIsLoading] = useState(false)

	const { data: settings } = useSuspenseQuery(getSettingsOptions())
	const { data: seriesPreview, isLoading: isLoadingPreview } = useQuery({
		...getSeriesPreviewFromTmdbOptions(String(series?.tmdbId ?? 0)),
		enabled: open && !!series?.tmdbId,
	})

	// Initialize all seasons as monitored when preview loads
	useEffect(() => {
		if (seriesPreview?.seasons) {
			setMonitoredSeasons(new Set(seriesPreview.seasons.map((s) => s.seasonNumber)))
		}
	}, [seriesPreview])

	const seriesFolders = settings?.folders.tv ?? []
	const resolutions = settings?.resolutions ?? []
	const defaultQuality = settings?.defaultQuality ?? '1080p'
	const defaultFolder = seriesFolders.find((f) => f.isDefault) ?? seriesFolders[0]

	const [selectedQuality, setSelectedQuality] = useState<string | null>(null)
	const [selectedFolder, setSelectedFolder] = useState<string | null>(null)

	const quality = selectedQuality ?? defaultQuality
	const folder = selectedFolder ?? defaultFolder?.id ?? ''

	const year = series?.releaseDate ? new Date(series.releaseDate).getFullYear() : null

	const toggleSeason = (seasonNumber: number) => {
		setMonitoredSeasons((prev) => {
			const next = new Set(prev)
			if (next.has(seasonNumber)) {
				next.delete(seasonNumber)
			} else {
				next.add(seasonNumber)
			}
			return next
		})
	}

	const toggleAllSeasons = () => {
		if (!seriesPreview) return
		const allSeasons = seriesPreview.seasons.map((s) => s.seasonNumber)
		const allSelected = allSeasons.every((n) => monitoredSeasons.has(n))
		if (allSelected) {
			setMonitoredSeasons(new Set())
		} else {
			setMonitoredSeasons(new Set(allSeasons))
		}
	}

	const handleAdd = async () => {
		if (!series) return
		setIsLoading(true)
		try {
			await createSeries({
				data: {
					tmdbId: series.tmdbId,
					resolution: quality as Resolution,
					monitoredSeasons: Array.from(monitoredSeasons),
				},
			})
			router.invalidate()
			onOpenChange(false)
		} catch (error) {
			console.error('Failed to add series:', error)
		} finally {
			setIsLoading(false)
		}
	}

	const handleAddAndDownload = async () => {
		if (!series) return
		setIsLoading(true)
		try {
			// Same as add for now - download trigger can be added later
			await createSeries({
				data: {
					tmdbId: series.tmdbId,
					resolution: quality as Resolution,
					monitoredSeasons: Array.from(monitoredSeasons),
				},
			})
			router.invalidate()
			onOpenChange(false)
		} catch (error) {
			console.error('Failed to add series:', error)
		} finally {
			setIsLoading(false)
		}
	}

	const allSelected = seriesPreview?.seasons.every((s) => monitoredSeasons.has(s.seasonNumber)) ?? false
	const someSelected = monitoredSeasons.size > 0 && !allSelected

	if (!series) return null

	return (
		<Dialog
			open={open}
			onOpenChange={onOpenChange}
		>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="text-xl">
						{series.title}
						{year && <span className="ml-2 font-normal text-muted-foreground">({year})</span>}
					</DialogTitle>
					<DialogDescription>Configure how you want to add this series to your library.</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-4">
					{/* Quality Select */}
					<div className="flex flex-col gap-2">
						<Label htmlFor="quality">Quality</Label>
						<Select
							value={quality}
							onValueChange={setSelectedQuality}
						>
							<SelectTrigger className="w-full">
								<SelectValue>{quality ?? 'Select quality'}</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{resolutions.map((res) => (
									<SelectItem
										key={res.name}
										value={res.name}
									>
										{res.name}
										{res.name === defaultQuality && <span className="ml-2 text-muted-foreground">(default)</span>}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Folder Select - only show if multiple folders */}
					{seriesFolders.length > 1 && (
						<div className="flex flex-col gap-2">
							<Label htmlFor="folder">Folder</Label>
							<Select
								value={folder}
								onValueChange={setSelectedFolder}
							>
								<SelectTrigger className="w-full">
									<SelectValue>{seriesFolders.find((f) => f.id === folder)?.path ?? 'Select folder'}</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{seriesFolders.map((f) => (
										<SelectItem
											key={f.id}
											value={f.id}
										>
											{f.path}
											{f.isDefault && <span className="ml-2 text-muted-foreground!">(default)</span>}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					{/* Season Selection Table */}
					<div className="flex flex-col gap-2">
						<Label>Seasons to Monitor</Label>
						{isLoadingPreview ? (
							<div className="flex items-center justify-center py-4">
								<Loader2 className="size-5 animate-spin text-muted-foreground" />
							</div>
						) : (
							<div className="max-h-64 overflow-y-auto rounded-md border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-10">
												<button
													type="button"
													onClick={toggleAllSeasons}
													className="flex items-center justify-center p-1 transition-colors hover:text-pink-600"
												>
													<Bookmark className={`size-4 ${allSelected ? 'fill-pink-600 text-pink-600' : someSelected ? 'fill-pink-300 text-pink-600' : 'text-pink-300'}`} />
												</button>
											</TableHead>
											<TableHead>Season</TableHead>
											<TableHead>Year</TableHead>
											<TableHead className="text-right">Episodes</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{seriesPreview?.seasons.map((season) => {
											const isMonitored = monitoredSeasons.has(season.seasonNumber)
											const seasonYear = season.airDate ? new Date(season.airDate).getFullYear() : null
											return (
												<TableRow key={season.seasonNumber}>
													<TableCell>
														<button
															type="button"
															onClick={() => toggleSeason(season.seasonNumber)}
															className="flex items-center justify-center p-1 transition-colors hover:text-pink-600"
														>
															<Bookmark className={`size-4 ${isMonitored ? 'fill-pink-600 text-pink-600' : 'text-pink-300'}`} />
														</button>
													</TableCell>
													<TableCell className="font-medium">Season {season.seasonNumber}</TableCell>
													<TableCell className="text-muted-foreground">{seasonYear ?? '—'}</TableCell>
													<TableCell className="text-right text-muted-foreground">{season.episodeCount}</TableCell>
												</TableRow>
											)
										})}
									</TableBody>
								</Table>
							</div>
						)}
					</div>
				</div>

				<DialogFooter className="flex-row gap-2 sm:justify-end">
					<Button
						variant="outline"
						onClick={handleAdd}
						disabled={isLoading || monitoredSeasons.size === 0}
						className="flex-1 sm:flex-none"
					>
						{isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
						Add
					</Button>
					<Button
						onClick={handleAddAndDownload}
						disabled={isLoading || monitoredSeasons.size === 0}
						className="flex-1 sm:flex-none"
					>
						{isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Download className="mr-2 size-4" />}
						Add & Download
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
