import { MainNav } from './MainNav'

interface AppShellProps {
	children: React.ReactNode
	navigationItems: Array<{ label: string; href: string; isActive?: boolean }>
	user?: { name: string; avatarUrl?: string }
	onNavigate?: (href: string) => void
	onLogout?: () => void
}

export function AppShell({ children, navigationItems, user, onNavigate, onLogout }: AppShellProps) {
	return (
		<div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
			<MainNav
				navigationItems={navigationItems}
				user={user}
				onNavigate={onNavigate}
				onLogout={onLogout}
			/>
			<main className="flex flex-1 flex-col">{children}</main>
		</div>
	)
}
