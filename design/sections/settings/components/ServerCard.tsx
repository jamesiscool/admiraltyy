import { Check, ChevronDown, ChevronUp, GripVertical, Loader2, Lock, Pencil, Trash2, X, Zap } from 'lucide-react'
import { useState } from 'react'
import type { Server } from '@/../product/sections/settings/types'

interface ServerCardProps {
	server: Server
	isFirst: boolean
	isLast: boolean
	onEdit?: () => void
	onDelete?: () => void
	onTest?: () => Promise<boolean>
	onMoveUp?: () => void
	onMoveDown?: () => void
	onSave?: (server: Server) => void
}

export function ServerCard({ server, isFirst, isLast, onEdit, onDelete, onTest, onMoveUp, onMoveDown, onSave }: ServerCardProps) {
	const [isEditing, setIsEditing] = useState(false)
	const [isTesting, setIsTesting] = useState(false)
	const [testResult, setTestResult] = useState<boolean | null>(null)
	const [editForm, setEditForm] = useState({
		name: server.name,
		host: server.host,
		port: server.port,
		username: server.username,
		password: '',
		ssl: server.ssl,
		priority: server.priority,
		connections: server.connections,
	})

	const handleTest = async () => {
		setIsTesting(true)
		setTestResult(null)
		try {
			const result = await onTest?.()
			setTestResult(result ?? true)
		} catch {
			setTestResult(false)
		} finally {
			setIsTesting(false)
			setTimeout(() => setTestResult(null), 3000)
		}
	}

	const handleSave = () => {
		onSave?.({
			...server,
			name: editForm.name,
			host: editForm.host,
			port: editForm.port,
			username: editForm.username,
			password: editForm.password || server.password,
			ssl: editForm.ssl,
			priority: editForm.priority,
			connections: editForm.connections,
		})
		setIsEditing(false)
	}

	const handleCancel = () => {
		setEditForm({
			name: server.name,
			host: server.host,
			port: server.port,
			username: server.username,
			password: '',
			ssl: server.ssl,
			priority: server.priority,
			connections: server.connections,
		})
		setIsEditing(false)
	}

	if (isEditing) {
		return (
			<div className="border-slate-200 border-b bg-blue-50/50 p-4 last:border-b-0 dark:border-slate-800 dark:bg-blue-950/20">
				<div className="space-y-4">
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
						<div>
							<label className="mb-1.5 block font-medium text-slate-500 text-xs uppercase tracking-wider dark:text-slate-500">Name</label>
							<input
								type="text"
								value={editForm.name}
								onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
								className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-slate-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white"
							/>
						</div>
						<div>
							<label className="mb-1.5 block font-medium text-slate-500 text-xs uppercase tracking-wider dark:text-slate-500">Host</label>
							<input
								type="text"
								value={editForm.host}
								onChange={(e) => setEditForm({ ...editForm, host: e.target.value })}
								className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-slate-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white"
							/>
						</div>
						<div>
							<label className="mb-1.5 block font-medium text-slate-500 text-xs uppercase tracking-wider dark:text-slate-500">Port</label>
							<input
								type="number"
								value={editForm.port}
								onChange={(e) => setEditForm({ ...editForm, port: Number(e.target.value) })}
								className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-slate-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white"
							/>
						</div>
					</div>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div>
							<label className="mb-1.5 block font-medium text-slate-500 text-xs uppercase tracking-wider dark:text-slate-500">Username</label>
							<input
								type="text"
								value={editForm.username}
								onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
								className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-slate-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white"
							/>
						</div>
						<div>
							<label className="mb-1.5 block font-medium text-slate-500 text-xs uppercase tracking-wider dark:text-slate-500">Password</label>
							<input
								type="password"
								value={editForm.password}
								onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
								placeholder="••••••••••••"
								className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 font-mono text-slate-900 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white dark:placeholder:text-slate-600"
							/>
						</div>
					</div>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
						<div>
							<label className="mb-1.5 block font-medium text-slate-500 text-xs uppercase tracking-wider dark:text-slate-500">Priority</label>
							<input
								type="number"
								min="0"
								max="999"
								value={editForm.priority}
								onChange={(e) => setEditForm({ ...editForm, priority: Number(e.target.value) })}
								className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-slate-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white"
							/>
						</div>
						<div>
							<label className="mb-1.5 block font-medium text-slate-500 text-xs uppercase tracking-wider dark:text-slate-500">Connections</label>
							<input
								type="number"
								min="1"
								max="100"
								value={editForm.connections}
								onChange={(e) =>
									setEditForm({
										...editForm,
										connections: Number(e.target.value),
									})
								}
								className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-slate-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white"
							/>
						</div>
						<div>
							<label className="mb-1.5 block font-medium text-slate-500 text-xs uppercase tracking-wider dark:text-slate-500">SSL</label>
							<button
								onClick={() => setEditForm({ ...editForm, ssl: !editForm.ssl })}
								className={`w-full rounded-sm border px-3 py-2 font-medium text-sm transition-colors ${
									editForm.ssl
										? 'border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
										: 'border-slate-300 bg-white text-slate-600 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-400'
								}`}
							>
								{editForm.ssl ? 'Enabled' : 'Disabled'}
							</button>
						</div>
					</div>
					<div className="flex items-center justify-between pt-2">
						<button
							onClick={handleTest}
							disabled={isTesting}
							className="flex items-center gap-2 rounded-sm px-4 py-2 font-medium text-slate-600 text-sm transition-colors hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-blue-950/30 dark:hover:text-blue-400"
						>
							{isTesting ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : testResult === true ? (
								<Check className="h-4 w-4 text-emerald-500" />
							) : testResult === false ? (
								<X className="h-4 w-4 text-red-500" />
							) : (
								<Zap className="h-4 w-4" />
							)}
							Test Connection
						</button>
						<div className="flex items-center gap-2">
							<button
								onClick={handleCancel}
								className="rounded-sm px-4 py-2 font-medium text-slate-600 text-sm transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
							>
								Cancel
							</button>
							<button
								onClick={handleSave}
								className="rounded-sm bg-blue-600 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-blue-700"
							>
								Save
							</button>
						</div>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div
			className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
				!isLast ? 'border-slate-200 border-b dark:border-slate-800' : ''
			} ${!server.enabled ? 'opacity-60' : ''}`}
		>
			{/* Drag Handle */}
			<div className="cursor-grab text-slate-400 active:cursor-grabbing dark:text-slate-600">
				<GripVertical className="h-4 w-4" />
			</div>

			{/* Priority Badge */}
			<div className="flex h-8 w-8 items-center justify-center rounded-sm bg-slate-100 font-bold text-slate-600 text-sm dark:bg-slate-800 dark:text-slate-400">{server.priority}</div>

			{/* Server Info */}
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="truncate font-medium text-slate-900 dark:text-white">{server.name}</span>
					{server.ssl && <Lock className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />}
				</div>
				<p className="truncate text-slate-500 text-sm dark:text-slate-500">
					{server.host}:{server.port} · {server.connections} connections
				</p>
			</div>

			{/* Reorder Buttons */}
			<div className="flex items-center gap-0.5">
				<button
					onClick={onMoveUp}
					disabled={isFirst}
					className="rounded-sm p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
				>
					<ChevronUp className="h-4 w-4" />
				</button>
				<button
					onClick={onMoveDown}
					disabled={isLast}
					className="rounded-sm p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
				>
					<ChevronDown className="h-4 w-4" />
				</button>
			</div>

			{/* Edit Button */}
			<button
				onClick={() => {
					setIsEditing(true)
					onEdit?.()
				}}
				className="rounded-sm p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
			>
				<Pencil className="h-4 w-4" />
			</button>

			{/* Delete Button */}
			<button
				onClick={onDelete}
				className="rounded-sm p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-950/50 dark:hover:text-red-400"
			>
				<Trash2 className="h-4 w-4" />
			</button>
		</div>
	)
}
