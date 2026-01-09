import { createFileRoute } from '@tanstack/react-router'
import { useNzbgetQueue, useNzbgetStatus, useNzbgetVersion } from '@/client/lib/api'

export const Route = createFileRoute('/activity')({
	component: RouteComponent,
})

function RouteComponent() {
	const { data: status, isLoading: statusLoading, error: statusError } = useNzbgetStatus()
	const { data: version, isLoading: versionLoading, error: versionError } = useNzbgetVersion()
	const { data: queue, isLoading: queueLoading, error: queueError } = useNzbgetQueue()

	return (
		<div className="overflow-y-auto">
			<div className="container">
				<h1 className="mb-[16px]">Activity</h1>
				<p className="mb-6 text-muted-foreground">NZBGet API data (auto-refreshing every 2s)</p>

				<div className="flex flex-col gap-6">
					<JsonSection
						title="NZBGet Version"
						data={version}
						isLoading={versionLoading}
						error={versionError}
					/>
					<JsonSection
						title="NZBGet Status"
						data={status}
						isLoading={statusLoading}
						error={statusError}
					/>
					<JsonSection
						title="NZBGet Queue"
						data={queue}
						isLoading={queueLoading}
						error={queueError}
					/>
				</div>
			</div>
		</div>
	)
}

function JsonSection({ title, data, isLoading, error }: { title: string; data: unknown; isLoading: boolean; error: Error | null }) {
	return (
		<div className="rounded-lg border border-neutral-200 bg-white">
			<div className="border-neutral-200 border-b px-4 py-3">
				<h2 className="font-medium">{title}</h2>
			</div>
			<div className="p-4">
				{error ? (
					<p className="text-red-600 text-sm">{error.message}</p>
				) : isLoading ? (
					<p className="text-muted-foreground text-sm">Loading...</p>
				) : (
					<pre className="overflow-auto rounded bg-neutral-50 p-3 font-mono text-sm">{JSON.stringify(data, null, 2)}</pre>
				)}
			</div>
		</div>
	)
}
