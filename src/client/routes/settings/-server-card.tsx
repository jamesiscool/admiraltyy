import { Check, ChevronDown, ChevronUp, GripVertical, Loader2, Lock, Pencil, Trash2, X, Zap } from 'lucide-react'
import { useState } from 'react'
import type { UsenetServer } from './-types'

interface ServerCardProps {
	server: UsenetServer
	isFirst: boolean
	isLast: boolean
	onEdit?: () => void
	onDelete?: () => void
	onTest?: () => Promise<boolean>
	onToggle?: (enabled: boolean) => void
	onMoveUp?: () => void
	onMoveDown?: () => void
	onSave?: (server: UsenetServer) => void
}

export function ServerCard({ server, isFirst, isLast, onDelete, onTest, onToggle, onMoveUp, onMoveDown, onSave }: ServerCardProps) {
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
			<div className="border-border border-b bg-primary/5 p-4 last:border-b-0">
				<div className="space-y-4">
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
						<div>
							<span className="mb-1.5 block font-medium text-muted-foreground text-xs uppercase tracking-wider">Name</span>
							<input
								type="text"
								value={editForm.name}
								onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
								className="w-full rounded-sm border border-input bg-background px-3 py-2 text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
							/>
						</div>
						<div>
							<span className="mb-1.5 block font-medium text-muted-foreground text-xs uppercase tracking-wider">Host</span>
							<input
								type="text"
								value={editForm.host}
								onChange={(e) => setEditForm({ ...editForm, host: e.target.value })}
								className="w-full rounded-sm border border-input bg-background px-3 py-2 text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
							/>
						</div>
						<div>
							<span className="mb-1.5 block font-medium text-muted-foreground text-xs uppercase tracking-wider">Port</span>
							<input
								type="number"
								value={editForm.port}
								onChange={(e) => setEditForm({ ...editForm, port: Number(e.target.value) })}
								className="w-full rounded-sm border border-input bg-background px-3 py-2 text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
							/>
						</div>
					</div>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div>
							<span className="mb-1.5 block font-medium text-muted-foreground text-xs uppercase tracking-wider">Username</span>
							<input
								type="text"
								value={editForm.username}
								onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
								className="w-full rounded-sm border border-input bg-background px-3 py-2 text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
							/>
						</div>
						<div>
							<span className="mb-1.5 block font-medium text-muted-foreground text-xs uppercase tracking-wider">Password</span>
							<input
								type="password"
								value={editForm.password}
								onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
								placeholder="••••••••••••"
								className="w-full rounded-sm border border-input bg-background px-3 py-2 font-mono text-foreground text-sm placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
							/>
						</div>
					</div>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
						<div>
							<span className="mb-1.5 block font-medium text-muted-foreground text-xs uppercase tracking-wider">Priority</span>
							<input
								type="number"
								min="0"
								max="999"
								value={editForm.priority}
								onChange={(e) => setEditForm({ ...editForm, priority: Number(e.target.value) })}
								className="w-full rounded-sm border border-input bg-background px-3 py-2 text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
							/>
						</div>
						<div>
							<span className="mb-1.5 block font-medium text-muted-foreground text-xs uppercase tracking-wider">Connections</span>
							<input
								type="number"
								min="1"
								max="100"
								value={editForm.connections}
								onChange={(e) => setEditForm({ ...editForm, connections: Number(e.target.value) })}
								className="w-full rounded-sm border border-input bg-background px-3 py-2 text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
							/>
						</div>
						<div>
							<span className="mb-1.5 block font-medium text-muted-foreground text-xs uppercase tracking-wider">SSL</span>
							<button
								type="button"
								onClick={() => setEditForm({ ...editForm, ssl: !editForm.ssl })}
								className={`w-full rounded-sm border px-3 py-2 font-medium text-sm transition-colors ${
									editForm.ssl ? 'border-emerald-300 bg-emerald-100 text-emerald-700' : 'border-input bg-background text-muted-foreground'
								}`}
							>
								{editForm.ssl ? 'Enabled' : 'Disabled'}
							</button>
						</div>
					</div>
					<div className="flex items-center justify-between pt-2">
						<button
							type="button"
							onClick={handleTest}
							disabled={isTesting}
							className="flex items-center gap-2 rounded-sm px-4 py-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-50"
						>
							{isTesting ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : testResult === true ? (
								<Check className="h-4 w-4 text-emerald-500" />
							) : testResult === false ? (
								<X className="h-4 w-4 text-destructive" />
							) : (
								<Zap className="h-4 w-4" />
							)}
							Test Connection
						</button>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={handleCancel}
								className="rounded-sm px-4 py-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleSave}
								className="rounded-sm bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90"
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
		<div className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 ${!isLast ? 'border-border border-b' : ''} ${!server.enabled ? 'opacity-60' : ''}`}>
			{/* Drag Handle */}
			<div className="cursor-grab text-muted-foreground active:cursor-grabbing">
				<GripVertical className="h-4 w-4" />
			</div>

			{/* Priority Badge */}
			<div className="flex h-8 w-8 items-center justify-center rounded-sm bg-muted font-bold text-muted-foreground text-sm">{server.priority}</div>

			{/* Server Info */}
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="truncate font-medium text-foreground">{server.name}</span>
					{server.ssl && <Lock className="h-3.5 w-3.5 text-emerald-500" />}
					{!server.enabled && <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground text-xs">Disabled</span>}
				</div>
				<p className="truncate text-muted-foreground text-sm">
					{server.host}:{server.port} · {server.connections} connections
				</p>
			</div>

			{/* Toggle */}
			<button
				type="button"
				onClick={() => onToggle?.(!server.enabled)}
				className={`relative h-6 w-10 rounded-full transition-colors ${server.enabled ? 'bg-primary' : 'bg-muted'}`}
			>
				<span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${server.enabled ? 'left-5' : 'left-1'}`} />
			</button>

			{/* Reorder Buttons */}
			<div className="flex items-center gap-0.5">
				<button
					type="button"
					onClick={onMoveUp}
					disabled={isFirst}
					className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
				>
					<ChevronUp className="h-4 w-4" />
				</button>
				<button
					type="button"
					onClick={onMoveDown}
					disabled={isLast}
					className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
				>
					<ChevronDown className="h-4 w-4" />
				</button>
			</div>

			{/* Edit Button */}
			<button
				type="button"
				onClick={() => setIsEditing(true)}
				className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
			>
				<Pencil className="h-4 w-4" />
			</button>

			{/* Delete Button */}
			<button
				type="button"
				onClick={onDelete}
				className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
			>
				<Trash2 className="h-4 w-4" />
			</button>
		</div>
	)
}
