import { Film, Plus, Star, Trash2, Tv } from 'lucide-react'
import type { Folder, Folders } from '@/../product/sections/settings/types'

interface FolderSectionProps {
	folders: Folders
	onAdd?: (type: 'movies' | 'tv') => void
	onEdit?: (id: string) => void
	onDelete?: (id: string) => void
	onSetDefault?: (id: string, type: 'movies' | 'tv') => void
	onSave?: (folder: Folder, type: 'movies' | 'tv') => void
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
}

function FolderList({ title, type, icon: Icon, iconColor, folders, onAdd, onDelete, onSetDefault }: FolderListProps) {
	return (
		<div>
			<div className="mb-3 flex items-center gap-2">
				<Icon className={`h-4 w-4 ${iconColor}`} />
				<h3 className="font-semibold text-slate-900 text-sm dark:text-white">{title}</h3>
			</div>
			<div className="overflow-hidden rounded-sm border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50">
				{folders.length === 0 ? (
					<div className="px-4 py-8 text-center">
						<p className="text-slate-500 text-sm dark:text-slate-500">No folders configured</p>
					</div>
				) : (
					<div>
						{folders.map((folder, index) => (
							<div
								key={folder.id}
								className={`flex items-center gap-3 px-4 py-3 ${index !== folders.length - 1 ? 'border-slate-200 border-b dark:border-slate-800' : ''}`}
							>
								<code className="flex-1 truncate font-mono text-slate-700 text-sm dark:text-slate-300">{folder.path}</code>

								{folder.isDefault ? (
									<span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700 text-xs dark:bg-amber-950 dark:text-amber-300">
										<Star className="h-3 w-3 fill-current" />
										Default
									</span>
								) : (
									<button
										onClick={() => onSetDefault?.(folder.id)}
										className="rounded-sm px-2 py-0.5 font-medium text-slate-500 text-xs transition-colors hover:bg-amber-50 hover:text-amber-600 dark:text-slate-400 dark:hover:bg-amber-950/30 dark:hover:text-amber-400"
									>
										Set default
									</button>
								)}

								<button
									onClick={() => onDelete?.(folder.id)}
									disabled={folder.isDefault}
									className="rounded-sm p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-500 dark:hover:bg-red-950/50 dark:hover:text-red-400"
								>
									<Trash2 className="h-4 w-4" />
								</button>
							</div>
						))}
					</div>
				)}

				<button
					onClick={onAdd}
					className="flex w-full items-center justify-center gap-1.5 border-slate-200 border-t px-3 py-2.5 text-slate-500 text-sm transition-colors hover:bg-blue-50/50 hover:text-blue-600 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-blue-950/30 dark:hover:text-blue-400"
				>
					<Plus className="h-4 w-4" />
					Add Folder
				</button>
			</div>
		</div>
	)
}

export function FolderSection({ folders, onAdd, onDelete, onSetDefault }: FolderSectionProps) {
	return (
		<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
			<FolderList
				title="Movies"
				type="movies"
				icon={Film}
				iconColor="text-amber-500 dark:text-amber-400"
				folders={folders.movies}
				onAdd={() => onAdd?.('movies')}
				onDelete={onDelete}
				onSetDefault={(id) => onSetDefault?.(id, 'movies')}
			/>
			<FolderList
				title="TV Shows"
				type="tv"
				icon={Tv}
				iconColor="text-sky-500 dark:text-sky-400"
				folders={folders.tv}
				onAdd={() => onAdd?.('tv')}
				onDelete={onDelete}
				onSetDefault={(id) => onSetDefault?.(id, 'tv')}
			/>
		</div>
	)
}
