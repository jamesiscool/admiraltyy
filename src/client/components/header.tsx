import { Link } from '@tanstack/react-router'
import { AnchorIcon } from 'lucide-react'
import { Button } from '@/client/components/ui/button'

export default function Header() {
	return (
		<header className="container flex items-center justify-between">
			<div className="flex items-center gap-5">
				<Link
					to="/"
					className="flex items-center gap-2 pb-1"
				>
					<AnchorIcon className="size-6" />
					<span className="font-light text-[24px] uppercase tracking-widest">Admiraltyy</span>
				</Link>
				<nav className="flex items-center gap-2">
					<Link
						to="/"
						className="rounded px-3 py-[4.5px] tracking-wide transition-colors hover:bg-neutral-100 hover:text-neutral-1000 data-active:bg-blue-50 data-active:text-blue-800"
					>
						Dashboard
					</Link>
					<Link
						to="/movies"
						className="rounded px-3 py-[4.5px] tracking-wide transition-colors hover:bg-neutral-100 hover:text-neutral-1000 data-active:bg-blue-50 data-active:text-blue-800"
					>
						Movies
					</Link>
					<Link
						to="/tv"
						className="rounded px-3 py-[4.5px] tracking-wide transition-colors hover:bg-neutral-100 hover:text-neutral-1000 data-active:bg-blue-50 data-active:text-blue-800"
					>
						TV
					</Link>
					<Link
						to="/activity"
						className="rounded px-3 py-[4.5px] tracking-wide transition-colors hover:bg-neutral-100 hover:text-neutral-1000 data-active:bg-blue-50 data-active:text-blue-800"
					>
						Activity
					</Link>
					<Link
						to="/settings"
						className="rounded px-3 py-[4.5px] tracking-wide transition-colors hover:bg-neutral-100 hover:text-neutral-1000 data-active:bg-blue-50 data-active:text-blue-800"
					>
						Settings
					</Link>
					<Link
						to="/app"
						className="rounded px-3 py-[4.5px] tracking-wide transition-colors hover:bg-neutral-100 hover:text-neutral-1000 data-active:bg-blue-50 data-active:text-blue-800"
					>
						App
					</Link>
				</nav>
			</div>
			<div className="flex items-center gap-2">
				<Button variant="default">
					<Link to="/add">
						<span className="font-medium">Add</span>
					</Link>
				</Button>
			</div>
		</header>
	)
}
