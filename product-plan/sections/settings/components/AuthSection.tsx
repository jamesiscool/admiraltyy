import { Check, Copy, FormInput, KeyRound, RefreshCw, ShieldOff } from 'lucide-react'
import { useState } from 'react'
import type { AuthSettings } from '@/../product/sections/settings/types'

interface AuthSectionProps {
	settings: AuthSettings
	onUpdate?: (settings: AuthSettings) => void
	onRegenerateApiKey?: () => Promise<string>
}

export function AuthSection({ settings, onUpdate, onRegenerateApiKey }: AuthSectionProps) {
	const [copied, setCopied] = useState(false)
	const [regenerating, setRegenerating] = useState(false)

	const handleMethodChange = (method: AuthSettings['method']) => {
		onUpdate?.({ ...settings, method, enabled: method !== 'none' })
	}

	const handleUsernameChange = (username: string) => {
		onUpdate?.({ ...settings, username })
	}

	const handleApiKeyChange = (apiKey: string) => {
		onUpdate?.({ ...settings, apiKey })
	}

	const handleCopyApiKey = async () => {
		await navigator.clipboard.writeText(settings.apiKey)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	const handleRegenerateApiKey = async () => {
		if (!onRegenerateApiKey) return
		if (!confirm('Are you sure you want to regenerate your API key? This will invalidate the current key and any applications using it will need to be updated.')) return

		setRegenerating(true)
		try {
			const newKey = await onRegenerateApiKey()
			onUpdate?.({ ...settings, apiKey: newKey })
		} finally {
			setRegenerating(false)
		}
	}

	return (
		<div className="space-y-6">
			{/* Authentication Method */}
			<div>
				<h3 className="mb-3 font-semibold text-slate-900 text-sm dark:text-white">Authentication Method</h3>
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
					<button
						onClick={() => handleMethodChange('none')}
						className={`flex items-center gap-3 rounded-sm border-2 p-4 transition-all ${
							settings.method === 'none'
								? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
								: 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700'
						}`}
					>
						<div
							className={`rounded-sm p-2 ${
								settings.method === 'none' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
							}`}
						>
							<ShieldOff className="h-5 w-5" />
						</div>
						<div className="text-left">
							<div className="font-medium text-slate-900 dark:text-white">Disabled</div>
							<p className="text-slate-500 text-xs dark:text-slate-500">No authentication</p>
						</div>
					</button>

					<button
						onClick={() => handleMethodChange('form')}
						className={`flex items-center gap-3 rounded-sm border-2 p-4 transition-all ${
							settings.method === 'form'
								? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
								: 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700'
						}`}
					>
						<div
							className={`rounded-sm p-2 ${
								settings.method === 'form' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
							}`}
						>
							<FormInput className="h-5 w-5" />
						</div>
						<div className="text-left">
							<div className="font-medium text-slate-900 dark:text-white">Form Login</div>
							<p className="text-slate-500 text-xs dark:text-slate-500">Username & password</p>
						</div>
					</button>

					<button
						onClick={() => handleMethodChange('basic')}
						className={`flex items-center gap-3 rounded-sm border-2 p-4 transition-all ${
							settings.method === 'basic'
								? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
								: 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700'
						}`}
					>
						<div
							className={`rounded-sm p-2 ${
								settings.method === 'basic' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
							}`}
						>
							<KeyRound className="h-5 w-5" />
						</div>
						<div className="text-left">
							<div className="font-medium text-slate-900 dark:text-white">Basic Auth</div>
							<p className="text-slate-500 text-xs dark:text-slate-500">HTTP Basic authentication</p>
						</div>
					</button>
				</div>
			</div>

			{/* Username (when auth is enabled) */}
			{settings.method !== 'none' && (
				<div className="rounded-sm border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div>
							<label className="mb-1.5 block font-medium text-slate-500 text-xs uppercase tracking-wider dark:text-slate-500">Username</label>
							<input
								type="text"
								value={settings.username}
								onChange={(e) => handleUsernameChange(e.target.value)}
								className="w-full rounded-sm border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white"
							/>
						</div>
						<div>
							<label className="mb-1.5 block font-medium text-slate-500 text-xs uppercase tracking-wider dark:text-slate-500">Password</label>
							<input
								type="password"
								placeholder="••••••••••••"
								className="w-full rounded-sm border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-slate-900 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white dark:placeholder:text-slate-600"
							/>
						</div>
					</div>
				</div>
			)}

			{/* API Key */}
			<div className="rounded-sm border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
				<div className="mb-4 flex items-start gap-3">
					<div className="rounded-sm bg-slate-100 p-2 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
						<KeyRound className="h-5 w-5" />
					</div>
					<div>
						<div className="font-medium text-slate-900 dark:text-white">API Key</div>
						<p className="mt-0.5 text-slate-500 text-sm dark:text-slate-500">Use this key to authenticate external applications with the API</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<input
						type="text"
						value={settings.apiKey}
						onChange={(e) => handleApiKeyChange(e.target.value)}
						className="flex-1 rounded-sm border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-slate-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white"
						placeholder="Enter or paste API key"
					/>

					<button
						onClick={handleCopyApiKey}
						className="flex items-center gap-2 rounded-sm bg-slate-100 px-3 py-2 font-medium text-slate-600 text-sm transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
						title="Copy API key"
					>
						{copied ? (
							<>
								<Check className="h-4 w-4 text-green-500" />
								<span className="text-green-600 dark:text-green-400">Copied</span>
							</>
						) : (
							<>
								<Copy className="h-4 w-4" />
								<span>Copy</span>
							</>
						)}
					</button>

					<button
						onClick={handleRegenerateApiKey}
						disabled={regenerating}
						className="flex items-center gap-2 rounded-sm bg-amber-100 px-3 py-2 font-medium text-amber-700 text-sm transition-colors hover:bg-amber-200 disabled:opacity-50 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
						title="Regenerate API key"
					>
						<RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
						<span>{regenerating ? 'Regenerating...' : 'Regenerate'}</span>
					</button>
				</div>

				<p className="mt-3 text-slate-500 text-xs dark:text-slate-500">Enter your own API key or regenerate to create a new random key.</p>
			</div>
		</div>
	)
}
