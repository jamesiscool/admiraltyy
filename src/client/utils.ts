// Format GB to human readable
export function formatSize(gb: number): string {
	if (gb === 0) return '0 GB'
	if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`
	return `${gb.toFixed(1)} GB`
}
