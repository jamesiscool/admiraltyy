// =============================================================================
// Data Types
// =============================================================================

export type DownloadStatus = 'downloading' | 'paused' | 'queued' | 'unpacking' | 'verifying'
export type HistoryStatus = 'completed' | 'failed' | 'removed'
export type AlertType = 'info' | 'warning' | 'error'

export interface ActivityAlert {
	id: string
	type: AlertType
	message: string
	dismissible: boolean
}

export interface QueueItem {
	id: string
	title: string
	progress: number
	speed: string
	eta: string
	size: string
	status: DownloadStatus
	quality: string
}

export interface HistoryItem {
	id: string
	title: string
	timestamp: string
	status: HistoryStatus
	size: string
	quality: string
	errorMessage?: string
}

// =============================================================================
// Component Props
// =============================================================================

export interface ActivityProps {
	/** List of active alerts to display at the top */
	alerts: ActivityAlert[]
	/** List of items currently in the download queue */
	queue: QueueItem[]
	/** List of past download history items */
	history: HistoryItem[]
	/** Called when an alert is dismissed */
	onDismissAlert?: (id: string) => void
	/** Called to pause a specific download */
	onPause?: (id: string) => void
	/** Called to resume a specific download */
	onResume?: (id: string) => void
	/** Called to cancel and remove a download from the queue */
	onCancel?: (id: string) => void
	/** Called to change the priority of an item in the queue */
	onReorder?: (id: string, direction: 'up' | 'down') => void
	/** Called to retry a failed history item */
	onRetry?: (id: string) => void
	/** Called to remove an item from history */
	onDeleteHistory?: (id: string) => void
	/** Called to clear the entire history */
	onClearHistory?: () => void
}
