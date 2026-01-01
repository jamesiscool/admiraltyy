import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bookmark, Download, Loader2, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/client/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/client/components/ui/dialog'
import { Label } from '@/client/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/client/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/client/components/ui/table'
import { api } from '@/client/lib/api'

interface SeriesResult {
	tmdbId: number
	title: string
	posterPath?: string
	releaseDate?: string
}

interface SeasonPreview {
	seasonNumber: number
	episodeCount: number
	airDate?: string
	name: string
}

interface SeriesPreview {
	tmdbId: number
	title: string
	year: number
	seasons: SeasonPreview[]
}

interface AddSeriesDialogProps {
	series: SeriesResult | null
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function AddSeriesDialog({ series, open, onOpenChange }: AddSeriesDialogProps) {
	const queryClient = useQueryClient()
	const [monitoredSeasons, setMonitoredSeasons] = useState<Set<number>>(new Set())

	const { data: settings } = useQuery({
		queryKey: ['settings'],
		queryFn: async () => {
			const res = await api.api.settings.$get()
			const json = await res.json()
			if (!json.success) throw new Error('Failed to load settings')
			return json.data
		},
	})

	const { data: seriesPreview, isLoading: isLoadingPreview } = useQuery({
		queryKey: ['series-preview', series?.tmdbId],
		queryFn: async () => {
			if (!series) return null
			const res = await api.api.series.tmdb[':tmdbId'].$get({ param: { tmdbId: String(series.tmdbId) } })
			const json = await res.json()
			if (!json.success) throw new Error('Failed to load series preview')
			return json.data as SeriesPreview
		},
		enabled: open && !!series,
	})

	// Initialize all seasons as monitored when preview loads
	useEffect(() => {
		if (seriesPreview?.seasons) {
			setMonitoredSeasons(new Set(seriesPreview.seasons.map((s) => s.seasonNumber)))
		}
	}, [seriesPreview])

	const addSeriesMutation = useMutation({
		mutationFn: async ({ tmdbId, resolution, monitoredSeasons }: { tmdbId: number; resolution: string; monitoredSeasons: number[] }) => {
			const res = await api.api.series.$post({ json: { tmdbId, resolution, monitoredSeasons } })
			const json = await res.json()
			if (!json.success) throw new Error('error' in json ? json.error : 'Failed to add series')
			return json.data
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['series'] })
			onOpenChange(false)
		},
	})

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

	const handleAdd = () => {
		if (!series) return
		addSeriesMutation.mutate({
			tmdbId: series.tmdbId,
			resolution: quality,
			monitoredSeasons: Array.from(monitoredSeasons),
		})
	}

	const handleAddAndDownload = () => {
		if (!series) return
		// Same as add for now - download trigger can be added later
		addSeriesMutation.mutate({
			tmdbId: series.tmdbId,
			resolution: quality,
			monitoredSeasons: Array.from(monitoredSeasons),
		})
	}

	const isLoading = addSeriesMutation.isPending
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
								<SelectValue>{(v) => v ?? 'Select quality'}</SelectValue>
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
									<SelectValue>{(v) => seriesFolders.find((f) => f.id === v)?.path ?? 'Select folder'}</SelectValue>
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
													className="flex items-center justify-center p-1 transition-colors hover:text-primary"
												>
													<Bookmark className={`size-4 ${allSelected ? 'fill-primary text-primary' : someSelected ? 'fill-primary/50 text-primary' : ''}`} />
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
															className="flex items-center justify-center p-1 transition-colors hover:text-primary"
														>
															<Bookmark className={`size-4 ${isMonitored ? 'fill-primary text-primary' : ''}`} />
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
