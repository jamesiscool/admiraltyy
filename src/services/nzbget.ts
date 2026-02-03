import { queryOptions } from '@tanstack/react-query'
import { getNzbgetHistoryFn, getNzbgetQueueFn, getNzbgetStatusFn, getNzbgetVersionFn } from '@/services/nzbget.functions'

// --- Query Options ---

export const getNzbgetStatusOptions = () =>
	queryOptions({
		queryKey: ['nzbget', 'status'],
		queryFn: () => getNzbgetStatusFn(),
	})

export const getNzbgetVersionOptions = () =>
	queryOptions({
		queryKey: ['nzbget', 'version'],
		queryFn: () => getNzbgetVersionFn(),
	})

export const getNzbgetQueueOptions = () =>
	queryOptions({
		queryKey: ['nzbget', 'queue'],
		queryFn: () => getNzbgetQueueFn(),
	})

export const getNzbgetHistoryOptions = (showHidden?: boolean) =>
	queryOptions({
		queryKey: ['nzbget', 'history', showHidden],
		queryFn: () => getNzbgetHistoryFn({ data: { showHidden } }),
	})

// --- Types ---

// JSON-RPC response wrapper
export interface NzbgetRpcResponse<T> {
	version: '1.1'
	result: T
}

// Status response from NZBGet
export interface NzbgetStatus {
	RemainingSizeMB: number
	DownloadedSizeMB: number
	DownloadRate: number
	DownloadPaused: boolean
	PostPaused: boolean
	ServerStandBy: boolean
	UpTimeSec: number
	DownloadTimeSec: number
	FreeDiskSpaceMB: number
	PostJobCount: number
	UrlCount: number
	ThreadCount: number
	DownloadLimit: number
	AverageDownloadRate: number
	MonthSizeMB: number
	DaySizeMB: number
	ArticleCacheMB: number
	NewsServers: NzbgetNewsServer[]
}

export interface NzbgetNewsServer {
	ID: number
	Active: boolean
}

// Queue item from listgroups
export interface NzbgetQueueItem {
	NZBID: number
	NZBName: string
	NZBFilename: string
	Kind: 'NZB' | 'URL'
	URL: string
	DestDir: string
	FinalDir: string
	Category: string
	FileSizeMB: number
	RemainingSizeMB: number
	PausedSizeMB: number
	FileCount: number
	RemainingFileCount: number
	Status: string
	Health: number
	CriticalHealth: number
	DownloadedSizeMB: number
	DownloadTimeSec: number
	ActiveDownloads: number
	MaxPriority: number
	PostInfoText: string
	PostStageProgress: number
}

// History item from history
export interface NzbgetHistoryItem {
	ID: number // Deprecated, use NZBID
	NZBID: number
	Kind: 'NZB' | 'URL' | 'DUP'
	Name: string
	NZBFilename: string
	URL: string
	DestDir: string
	FinalDir: string
	Category: string
	FileSizeMB: number
	FileSizeLo: number
	FileSizeHi: number
	FileCount: number
	RemainingFileCount: number
	MinPostTime: number
	MaxPostTime: number
	TotalArticles: number
	SuccessArticles: number
	FailedArticles: number
	Health: number
	CriticalHealth: number
	HistoryTime: number
	Status: string
	DownloadedSizeMB: number
	DownloadedSizeLo: number
	DownloadedSizeHi: number
	DownloadTimeSec: number
	PostTotalTimeSec: number
	ParTimeSec: number
	RepairTimeSec: number
	UnpackTimeSec: number
	DeleteStatus: string
	MarkStatus: string
	UrlStatus: string
	ParStatus: string
	UnpackStatus: string
	MoveStatus: string
	DupeKey: string
	DupeScore: number
	DupeMode: string
	RetryData: boolean
	Parameters: { Name: string; Value: string }[]
	ScriptStatuses: { Name: string; Status: string }[]
	ServerStats: { ServerID: number; SuccessArticles: number; FailedArticles: number }[]
}

// Config option from NZBGet
export interface NzbgetConfigOption {
	Name: string
	Value: string
}
