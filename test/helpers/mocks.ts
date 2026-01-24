import type { NzbgetConfigOption, NzbgetHistoryItem, NzbgetQueueItem, NzbgetStatus } from '@/services/nzbget/nzbgetSchema'

// Mock NZBGet client for unit tests - in-memory, no network
export class MockNzbgetClient {
	private queue: NzbgetQueueItem[] = []
	private history: NzbgetHistoryItem[] = []
	private configOptions: NzbgetConfigOption[] = []
	private nextNzbId = 1
	private _calls: { method: string; params: unknown[] }[] = []

	// Track calls for assertions
	get calls() {
		return this._calls
	}

	clearCalls() {
		this._calls = []
	}

	// Simulate API calls
	async version(): Promise<string> {
		this._calls.push({ method: 'version', params: [] })
		return '21.0'
	}

	async status(): Promise<NzbgetStatus> {
		this._calls.push({ method: 'status', params: [] })
		return {
			RemainingSizeMB: this.queue.reduce((acc, item) => acc + item.RemainingSizeMB, 0),
			DownloadedSizeMB: 0,
			DownloadRate: 0,
			DownloadPaused: false,
			PostPaused: false,
			ServerStandBy: true,
			UpTimeSec: 3600,
			DownloadTimeSec: 0,
			FreeDiskSpaceMB: 100000,
			PostJobCount: 0,
			UrlCount: 0,
			ThreadCount: 1,
			DownloadLimit: 0,
			AverageDownloadRate: 0,
			MonthSizeMB: 0,
			DaySizeMB: 0,
			ArticleCacheMB: 0,
			NewsServers: [],
		}
	}

	async listQueue(): Promise<NzbgetQueueItem[]> {
		this._calls.push({ method: 'listgroups', params: [] })
		return [...this.queue]
	}

	async listHistory(showHidden = false): Promise<NzbgetHistoryItem[]> {
		this._calls.push({ method: 'history', params: [showHidden] })
		return [...this.history]
	}

	async append(options: { filename: string; nzbContent: string; category?: string; priority?: number; addToTop?: boolean; addPaused?: boolean }): Promise<number> {
		this._calls.push({ method: 'append', params: [options] })

		const nzbId = this.nextNzbId++
		const item: NzbgetQueueItem = {
			NZBID: nzbId,
			NZBName: options.filename.replace('.nzb', ''),
			NZBFilename: options.filename,
			Kind: 'NZB',
			URL: '',
			DestDir: `/downloads/inter/${options.filename.replace('.nzb', '')}`,
			FinalDir: '',
			Category: options.category ?? '',
			FileSizeMB: 1000,
			RemainingSizeMB: 1000,
			PausedSizeMB: options.addPaused ? 1000 : 0,
			FileCount: 10,
			RemainingFileCount: 10,
			Status: options.addPaused ? 'PAUSED' : 'QUEUED',
			Health: 1000,
			CriticalHealth: 900,
			DownloadedSizeMB: 0,
			DownloadTimeSec: 0,
			ActiveDownloads: 0,
			MaxPriority: options.priority ?? 0,
			PostInfoText: '',
			PostStageProgress: 0,
		}

		if (options.addToTop) {
			this.queue.unshift(item)
		} else {
			this.queue.push(item)
		}

		return nzbId
	}

	async config(): Promise<NzbgetConfigOption[]> {
		this._calls.push({ method: 'config', params: [] })
		return [...this.configOptions]
	}

	async saveConfig(options: NzbgetConfigOption[]): Promise<boolean> {
		this._calls.push({ method: 'saveconfig', params: [options] })
		for (const opt of options) {
			const existing = this.configOptions.find((c) => c.Name === opt.Name)
			if (existing) {
				existing.Value = opt.Value
			} else {
				this.configOptions.push({ ...opt })
			}
		}
		return true
	}

	async editQueue(command: string, ids: number[]): Promise<boolean> {
		this._calls.push({ method: 'editqueue', params: [command, ids] })
		if (command === 'GroupDelete') {
			this.queue = this.queue.filter((item) => !ids.includes(item.NZBID))
		}
		return true
	}

	async clearHistory(nzbIds: number[]): Promise<boolean> {
		this._calls.push({ method: 'editqueue', params: ['HistoryFinalDelete', nzbIds] })
		this.history = this.history.filter((item) => !nzbIds.includes(item.NZBID))
		return true
	}

	// Test helpers - manipulate internal state
	addToQueue(item: Partial<NzbgetQueueItem>): NzbgetQueueItem {
		const nzbId = this.nextNzbId++
		const fullItem: NzbgetQueueItem = {
			NZBID: nzbId,
			NZBName: 'Test.Download',
			NZBFilename: 'Test.Download.nzb',
			Kind: 'NZB',
			URL: '',
			DestDir: '/downloads/inter/Test.Download',
			FinalDir: '',
			Category: '',
			FileSizeMB: 1000,
			RemainingSizeMB: 1000,
			PausedSizeMB: 0,
			FileCount: 10,
			RemainingFileCount: 10,
			Status: 'QUEUED',
			Health: 1000,
			CriticalHealth: 900,
			DownloadedSizeMB: 0,
			DownloadTimeSec: 0,
			ActiveDownloads: 0,
			MaxPriority: 0,
			PostInfoText: '',
			PostStageProgress: 0,
			...item,
		}
		this.queue.push(fullItem)
		return fullItem
	}

	addToHistory(item: Partial<NzbgetHistoryItem>): NzbgetHistoryItem {
		const nzbId = item.NZBID ?? this.nextNzbId++
		const fullItem: NzbgetHistoryItem = {
			ID: nzbId,
			NZBID: nzbId,
			Kind: 'NZB',
			Name: 'Test.Download',
			NZBFilename: 'Test.Download.nzb',
			URL: '',
			DestDir: '/downloads/inter/Test.Download',
			FinalDir: '/downloads/completed/Test.Download',
			Category: '',
			FileSizeMB: 1000,
			FileSizeLo: 1000 * 1024 * 1024,
			FileSizeHi: 0,
			FileCount: 10,
			RemainingFileCount: 0,
			MinPostTime: Date.now() / 1000 - 3600,
			MaxPostTime: Date.now() / 1000,
			TotalArticles: 100,
			SuccessArticles: 100,
			FailedArticles: 0,
			Health: 1000,
			CriticalHealth: 900,
			HistoryTime: Date.now() / 1000,
			Status: 'SUCCESS',
			DownloadedSizeMB: 1000,
			DownloadedSizeLo: 1000 * 1024 * 1024,
			DownloadedSizeHi: 0,
			DownloadTimeSec: 600,
			PostTotalTimeSec: 60,
			ParTimeSec: 30,
			RepairTimeSec: 0,
			UnpackTimeSec: 30,
			DeleteStatus: 'NONE',
			MarkStatus: 'NONE',
			UrlStatus: 'NONE',
			ParStatus: 'SUCCESS',
			UnpackStatus: 'SUCCESS',
			MoveStatus: 'SUCCESS',
			DupeKey: '',
			DupeScore: 0,
			DupeMode: 'SCORE',
			RetryData: false,
			Parameters: [],
			ScriptStatuses: [],
			ServerStats: [],
			...item,
		}
		this.history.push(fullItem)
		return fullItem
	}

	setConfig(options: NzbgetConfigOption[]) {
		this.configOptions = [...options]
	}

	reset() {
		this.queue = []
		this.history = []
		this.configOptions = []
		this.nextNzbId = 1
		this._calls = []
	}
}

// Factory function based on NZBGET_MODE env var
export function createNzbgetClient(): MockNzbgetClient {
	const mode = process.env.NZBGET_MODE ?? 'mock'

	if (mode === 'mock') {
		return new MockNzbgetClient()
	}

	// stub and real modes - future implementation
	// For now, return mock for all modes
	return new MockNzbgetClient()
}
