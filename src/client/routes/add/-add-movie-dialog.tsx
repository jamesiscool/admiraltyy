import { useQuery } from '@tanstack/react-query'
import { Download, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/client/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/client/components/ui/dialog'
import { Label } from '@/client/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/client/components/ui/select'
import { api } from '@/client/lib/api'

interface MovieResult {
	tmdbId: number
	title: string
	posterPath?: string
	releaseDate?: string
}

interface AddMovieDialogProps {
	movie: MovieResult | null
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function AddMovieDialog({ movie, open, onOpenChange }: AddMovieDialogProps) {
	const { data: settings } = useQuery({
		queryKey: ['settings'],
		queryFn: async () => {
			const res = await api.api.settings.$get()
			const json = await res.json()
			if (!json.success) throw new Error('Failed to load settings')
			return json.data
		},
	})

	const movieFolders = settings?.folders.movies ?? []
	const resolutions = settings?.resolutions ?? []
	const defaultQuality = settings?.defaultQuality ?? '1080p'

	// Find the default folder
	const defaultFolder = movieFolders.find((f) => f.isDefault) ?? movieFolders[0]

	const [selectedQuality, setSelectedQuality] = useState<string | null>(null)
	const [selectedFolder, setSelectedFolder] = useState<string | null>(null)

	// Use defaults when dialog opens
	const quality = selectedQuality ?? defaultQuality
	const folder = selectedFolder ?? defaultFolder?.id ?? ''

	const year = movie?.releaseDate ? new Date(movie.releaseDate).getFullYear() : null

	const handleAdd = () => {
		// TODO: Implement add movie API call
		console.log('Adding movie:', { tmdbId: movie?.tmdbId, quality, folder })
		onOpenChange(false)
	}

	const handleAddAndDownload = () => {
		// TODO: Implement add and download (same as add for now)
		console.log('Adding and downloading movie:', { tmdbId: movie?.tmdbId, quality, folder })
		onOpenChange(false)
	}

	if (!movie) return null

	return (
		<Dialog
			open={open}
			onOpenChange={onOpenChange}
		>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="text-xl">
						{movie.title}
						{year && <span className="ml-2 font-normal text-muted-foreground">({year})</span>}
					</DialogTitle>
					<DialogDescription>Configure how you want to add this movie to your library.</DialogDescription>
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
								<SelectValue placeholder="Select quality" />
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
					{movieFolders.length > 1 && (
						<div className="flex flex-col gap-2">
							<Label htmlFor="folder">Folder</Label>
							<Select
								value={folder}
								onValueChange={setSelectedFolder}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select folder" />
								</SelectTrigger>
								<SelectContent>
									{movieFolders.map((f) => (
										<SelectItem
											key={f.id}
											value={f.id}
										>
											{f.path}
											{f.isDefault && <span className="ml-2 text-muted-foreground">(default)</span>}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}
				</div>

				<DialogFooter className="flex-row gap-2 sm:justify-end">
					<Button
						variant="outline"
						onClick={handleAdd}
						className="flex-1 sm:flex-none"
					>
						<Plus className="mr-2 size-4" />
						Add
					</Button>
					<Button
						onClick={handleAddAndDownload}
						className="flex-1 sm:flex-none"
					>
						<Download className="mr-2 size-4" />
						Add & Download
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
