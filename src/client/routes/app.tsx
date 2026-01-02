import { createFileRoute } from '@tanstack/react-router'
import { Activity, CheckCircle2, Film, Settings, Ship, Tv } from 'lucide-react'
import { useHealth } from '@/client/lib/api'

export const Route = createFileRoute('/app')({
	component: App,
})

function App() {
	const { data: health, isLoading, error } = useHealth()

	return (
		<div className="min-h-screen bg-[var(--color-background)]">
			{/* Header */}
			<header className="border-[var(--color-border)] border-b bg-[var(--color-surface)]">
				<div className="mx-auto max-w-7xl px-6 py-4">
					<div className="flex items-center gap-3">
						<Ship className="h-8 w-8 text-[var(--color-primary-500)]" />
						<h1 className="font-bold text-2xl text-[var(--color-text-primary)]">Admiraltyy</h1>
					</div>
				</div>
			</header>

			{/* Main content */}
			<main className="mx-auto max-w-7xl px-6 py-12">
				<div className="mb-12 text-center">
					<h2 className="mb-4 font-bold text-3xl text-[var(--color-text-primary)]">Welcome to Admiraltyy</h2>
					<p className="mx-auto max-w-2xl text-[var(--color-text-secondary)] text-lg">
						A modern, unified Usenet media automation platform combining the intelligence of Sonarr and Radarr with the reliability of NZBGet.
					</p>
				</div>

				{/* API Status */}
				<div className="mx-auto mb-12 max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
					<h3 className="mb-4 font-semibold text-[var(--color-text-primary)] text-lg">API Status</h3>
					{isLoading ? (
						<div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
							<div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-primary-500)] border-t-transparent" />
							Checking connection...
						</div>
					) : error ? (
						<div className="flex items-center gap-2 text-[var(--color-error)]">
							<span className="h-2 w-2 rounded-full bg-[var(--color-error)]" />
							API Offline
						</div>
					) : (
						<div className="flex items-center gap-2 text-[var(--color-success)]">
							<CheckCircle2 className="h-5 w-5" />
							API Online - {health?.status}
						</div>
					)}
				</div>

				{/* Feature cards */}
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
					<FeatureCard
						icon={<Activity className="h-6 w-6" />}
						title="Dashboard"
						description="Overview of your media library with quick stats and recent activity."
					/>
					<FeatureCard
						icon={<Film className="h-6 w-6" />}
						title="Movies"
						description="Browse tracked movies, discover new films via TMDB."
					/>
					<FeatureCard
						icon={<Tv className="h-6 w-6" />}
						title="TV Series"
						description="Manage TV series with per-season and per-episode control."
					/>
					<FeatureCard
						icon={<Settings className="h-6 w-6" />}
						title="Settings"
						description="Configure indexers, NZBGet, resolutions, and more."
					/>
				</div>
			</main>

			{/* Footer */}
			<footer className="mt-12 border-[var(--color-border)] border-t">
				<div className="mx-auto max-w-7xl px-6 py-6 text-center text-[var(--color-text-muted)]">
					<p>Admiraltyy • Usenet Media Automation</p>
				</div>
			</footer>
		</div>
	)
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
	return (
		<div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition-colors hover:border-[var(--color-primary-500)]">
			<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--color-primary-50)] text-[var(--color-primary-500)]">{icon}</div>
			<h3 className="mb-2 font-semibold text-[var(--color-text-primary)] text-lg">{title}</h3>
			<p className="text-[var(--color-text-secondary)] text-sm">{description}</p>
		</div>
	)
}

export default App
