import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

// Format GB to human readable
export function formatSize(gb: number): string {
	if (gb === 0) return '0 GB'
	if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`
	return `${gb.toFixed(1)} GB`
}

// Format next airing date with humanization:
// - Within 24h: time like "8 p.m."
// - 24h to 7 days: day name like "Wednesday"
// - More than 7 days: date like "4 Feb"
export function formatNextAiring(dateStr: string | null): string | null {
	if (!dateStr) return null

	const date = new Date(dateStr)
	const now = new Date()
	const diffMs = date.getTime() - now.getTime()
	const diffHours = diffMs / (1000 * 60 * 60)

	if (diffMs < 0) return null

	// Within 24 hours: show time like "8 p.m."
	if (diffHours < 24) {
		const hour = date.getHours()
		const period = hour >= 12 ? 'pm' : 'am'
		const hour12 = hour % 12 || 12
		return `${hour12} ${period}`
	}

	// Within 7 days: show day name
	const diffDays = diffMs / (1000 * 60 * 60 * 24)
	if (diffDays < 7) {
		return date.toLocaleDateString('en-US', { weekday: 'long' })
	}

	// More than 7 days: show date like "4 Feb"
	const day = date.getDate()
	const month = date.toLocaleDateString('en-US', { month: 'short' })
	return `${day} ${month}`
}

export function generateSettingId(): string {
	const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
	let key = ''
	for (let i = 0; i < 5; i++) {
		key += chars[Math.floor(Math.random() * chars.length)]
	}
	return key
}
