import { Menu, X } from "lucide-react";
import { useState } from "react";
import { UserMenu } from "./UserMenu";

interface MainNavProps {
	navigationItems: Array<{ label: string; href: string; isActive?: boolean }>;
	user?: { name: string; avatarUrl?: string };
	onNavigate?: (href: string) => void;
	onLogout?: () => void;
}

export function MainNav({
	navigationItems,
	user,
	onNavigate,
	onLogout,
}: MainNavProps) {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	return (
		<nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-slate-800 dark:bg-slate-900/95 dark:supports-[backdrop-filter]:bg-slate-900/80">
			<div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
				<div className="flex h-16 items-center justify-between">
					{/* Logo */}
					<div className="flex items-center gap-8">
						<a
							href="/"
							onClick={(e) => {
								e.preventDefault();
								onNavigate?.("/");
							}}
							className="flex items-center gap-2"
						>
							<span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
								Admiraltyy
							</span>
						</a>

						{/* Desktop Navigation */}
						<div className="hidden items-center gap-1 md:flex">
							{navigationItems.map((item) => (
								<a
									key={item.href}
									href={item.href}
									onClick={(e) => {
										e.preventDefault();
										onNavigate?.(item.href);
									}}
									className={`rounded-sm px-3 py-2 text-sm font-medium transition-colors ${
										item.isActive
											? "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
											: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
									}`}
								>
									{item.label}
								</a>
							))}
						</div>
					</div>

					{/* Right side */}
					<div className="flex items-center gap-4">
						{/* User Menu (Desktop) */}
						<div className="hidden md:block">
							<UserMenu user={user} onLogout={onLogout} />
						</div>

						{/* Mobile menu button */}
						<button
							onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
							className="rounded-sm p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
						>
							{isMobileMenuOpen ? (
								<X className="h-6 w-6" />
							) : (
								<Menu className="h-6 w-6" />
							)}
						</button>
					</div>
				</div>
			</div>

			{/* Mobile Navigation */}
			{isMobileMenuOpen && (
				<div className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:hidden">
					<div className="space-y-1 px-4 py-3">
						{navigationItems.map((item) => (
							<a
								key={item.href}
								href={item.href}
								onClick={(e) => {
									e.preventDefault();
									onNavigate?.(item.href);
									setIsMobileMenuOpen(false);
								}}
								className={`block rounded-sm px-3 py-2.5 text-sm font-medium transition-colors ${
									item.isActive
										? "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
										: "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
								}`}
							>
								{item.label}
							</a>
						))}
					</div>
					<div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800">
						<UserMenu user={user} onLogout={onLogout} />
					</div>
				</div>
			)}
		</nav>
	);
}

