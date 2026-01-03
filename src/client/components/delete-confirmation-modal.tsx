import { AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/client/components/ui/alert-dialog'

export type DeleteTarget = { type: 'movie'; id: number; title: string; sizeBytes?: number } | { type: 'series'; id: number; title: string; sizeBytes?: number }

interface DeleteConfirmationModalProps {
	target: DeleteTarget | null
	onClose: () => void
	onConfirm: (deleteFiles: boolean) => void
	isPending?: boolean
}

export function DeleteConfirmationModal({ target, onClose, onConfirm, isPending }: DeleteConfirmationModalProps) {
	const [deleteFiles, setDeleteFiles] = useState(false)

	const isOpen = target !== null
	const typeLabel = target?.type === 'movie' ? 'movie' : 'series'

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			setDeleteFiles(false)
			onClose()
		}
	}

	const handleConfirm = () => {
		onConfirm(deleteFiles)
	}

	return (
		<AlertDialog
			open={isOpen}
			onOpenChange={handleOpenChange}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-2">
						<AlertTriangle className="text-red-600" /> Delete {target?.title}
					</AlertDialogTitle>
					<AlertDialogDescription>Are you sure you want to delete this {typeLabel}? This will remove it from your library.</AlertDialogDescription>
				</AlertDialogHeader>

				{/* Delete files checkbox - only show if has files */}
				{target?.sizeBytes !== undefined && (
					<div className="rounded-md border border-border bg-muted/50 p-4">
						<label className="flex cursor-pointer items-start gap-3">
							<input
								type="checkbox"
								checked={deleteFiles}
								onChange={(e) => setDeleteFiles(e.target.checked)}
								className="mt-0.5 size-4 rounded border-border"
							/>
							<div className="flex flex-col gap-0.5">
								<span className="font-medium text-sm">Also delete files from disk</span>
								<span className="text-size text-xs">{(target.sizeBytes / 1073741824).toFixed(1)} GB will be freed</span>
							</div>
						</label>
					</div>
				)}

				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleConfirm}
						disabled={isPending}
						className="bg-destructive text-white hover:bg-destructive/90"
					>
						{isPending ? 'Deleting...' : `Delete ${typeLabel}`}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
