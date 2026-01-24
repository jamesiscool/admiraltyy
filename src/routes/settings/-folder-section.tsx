import { Film, Plus, Star, Trash2, Tv } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import type { Folder, Folders } from '@/services/settings'

interface FolderSectionProps {
	folders: Folders
	onAdd?: (type: 'movies' | 'tv') => void
	onDelete?: (id: string) => void
	onSetDefault?: (id: string, type: 'movies' | 'tv') => void
	onUpdatePath?: (id: string, path: string, type: 'movies' | 'tv') => void
}

interface FolderListProps {
	title: string
	type: 'movies' | 'tv'
	icon: typeof Film
	iconColor: string
	folders: Folder[]
	onAdd?: () => void
	onDelete?: (id: string) => void
	onSetDefault?: (id: string) => void
	onUpdatePath?: (id: string, path: string) => void
}

function FolderList({ title, icon: Icon, iconColor, folders, onAdd, onDelete, onSetDefault, onUpdatePath }: FolderListProps) {
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editPath, setEditPath] = useState('')

	const startEditing = (folder: Folder) => {
		setEditingId(folder.id)
		setEditPath(folder.path)
	}

	const saveEdit = (id: string) => {
		onUpdatePath?.(id, editPath)
		setEditingId(null)
	}

	return (
		<div>
			<div className="mb-3 flex items-center gap-2">
				<Icon className={`h-4 w-4 ${iconColor}`} />
				<h3 className="font-semibold text-foreground text-sm">{title}</h3>
			</div>
			<div className="overflow-hidden rounded-sm border border-border bg-card">
				{folders.length === 0 ? (
					<div className="px-4 py-8 text-center">
						<p className="text-muted-foreground text-sm">No folders configured</p>
					</div>
				) : (
					<div>
						{folders.map((folder, index) => (
							<div
								key={folder.id}
								className={`flex items-center gap-3 px-4 py-3 ${index !== folders.length - 1 ? 'border-border border-b' : ''}`}
							>
								{editingId === folder.id ? (
									<Input
										type="text"
										value={editPath}
										onChange={(e) => setEditPath(e.target.value)}
										onBlur={() => saveEdit(folder.id)}
										onKeyDown={(e) => {
											if (e.key === 'Enter') saveEdit(folder.id)
											if (e.key === 'Escape') setEditingId(null)
										}}
										autoFocus
										className="flex-1 font-mono"
									/>
								) : (
									<button
										type="button"
										onClick={() => startEditing(folder)}
										className="flex-1 truncate text-left font-mono text-foreground text-sm hover:text-primary"
									>
										{folder.path || '/path/to/folder'}
									</button>
								)}

								{folder.isDefault ? (
									<span className="flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 font-medium text-xs text-yellow-700">
										<Star className="h-3 w-3 fill-current" />
										Default
									</span>
								) : (
									<button
										type="button"
										onClick={() => onSetDefault?.(folder.id)}
										className="rounded-sm px-2 py-0.5 font-medium text-muted-foreground text-xs transition-colors hover:bg-yellow-50 hover:text-yellow-600"
									>
										Set default
									</button>
								)}

								<button
									type="button"
									onClick={() => onDelete?.(folder.id)}
									disabled={folder.isDefault}
									className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-30"
								>
									<Trash2 className="h-4 w-4" />
								</button>
							</div>
						))}
					</div>
				)}

				<button
					type="button"
					onClick={onAdd}
					className="flex w-full items-center justify-center gap-1.5 border-border border-t px-3 py-2.5 text-muted-foreground text-sm transition-colors hover:bg-primary/5 hover:text-primary"
				>
					<Plus className="h-4 w-4" />
					Add Folder
				</button>
			</div>
		</div>
	)
}

export function FolderSection({ folders, onAdd, onDelete, onSetDefault, onUpdatePath }: FolderSectionProps) {
	return (
		<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
			<FolderList
				title="Movies"
				type="movies"
				icon={Film}
				iconColor="text-yellow-500"
				folders={folders.movies}
				onAdd={() => onAdd?.('movies')}
				onDelete={onDelete}
				onSetDefault={(id) => onSetDefault?.(id, 'movies')}
				onUpdatePath={(id, path) => onUpdatePath?.(id, path, 'movies')}
			/>
			<FolderList
				title="TV Shows"
				type="tv"
				icon={Tv}
				iconColor="text-sky-500"
				folders={folders.tv}
				onAdd={() => onAdd?.('tv')}
				onDelete={onDelete}
				onSetDefault={(id) => onSetDefault?.(id, 'tv')}
				onUpdatePath={(id, path) => onUpdatePath?.(id, path, 'tv')}
			/>
		</div>
	)
}
