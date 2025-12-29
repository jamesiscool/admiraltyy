import { LogOut, User } from "lucide-react";
import { useState } from "react";

interface UserMenuProps {
	user?: {
		name: string;
		avatarUrl?: string;
	};
	onLogout?: () => void;
}

export function UserMenu({ user, onLogout }: UserMenuProps) {
	const [isOpen, setIsOpen] = useState(false);

	const initials = user?.name
		?.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);

	return (
		<div className="relative">
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="flex items-center justify-center p-0 border-0 bg-transparent rounded-full"
			>
				{user?.avatarUrl ? (
					<img
						src={user.avatarUrl}
						alt={user.name}
						className="h-8 w-8 rounded-full object-cover"
					/>
				) : (
					<div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-xs font-medium text-white leading-none">
						{initials || <User className="h-4 w-4" />}
					</div>
				)}
			</button>

			{isOpen && (
				<>
					<div
						className="fixed inset-0 z-40"
						onClick={() => setIsOpen(false)}
					/>
					<div className="absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-sm border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
						<button
							onClick={() => {
								setIsOpen(false);
								onLogout?.();
							}}
							className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
						>
							<LogOut className="h-4 w-4" />
							Sign out
						</button>
					</div>
				</>
			)}
		</div>
	);
}

