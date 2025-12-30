import { ChevronRight } from 'lucide-react'

interface ViewAllCardProps {
	count: number
	label: string
	onClick?: () => void
}

export function ViewAllCard({ count, label, onClick }: ViewAllCardProps) {
	return (
		<button
			onClick={onClick}
			className="group relative aspect-[2/3] w-[160px] flex-shrink-0 cursor-pointer overflow-hidden rounded-sm border border-slate-300 bg-gradient-to-br from-slate-200 to-slate-300 transition-all duration-300 ease-out hover:from-slate-300 hover:to-slate-400 sm:w-[180px] dark:border-slate-700/50 dark:from-slate-800 dark:to-slate-900 dark:hover:from-slate-700 dark:hover:to-slate-800"
		>
			<div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
				<div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 transition-colors group-hover:bg-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400 dark:group-hover:bg-blue-500/30">
					<ChevronRight className="h-6 w-6 transition-transform group-hover:translate-x-0.5" />
				</div>
				<div className="px-4 text-center">
					<p className="mb-1 font-bold text-2xl text-slate-900 dark:text-white">+{count}</p>
					<p className="font-medium text-slate-600 text-xs dark:text-slate-400">{label}</p>
				</div>
			</div>

			{/* Hover glow effect */}
			<div className="pointer-events-none absolute inset-0 rounded-sm ring-2 ring-blue-500/0 transition-all duration-300 group-hover:ring-blue-500/50" />
		</button>
	)
}
