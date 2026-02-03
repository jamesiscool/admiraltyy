import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { listDownloadsFn } from '@/services/activity.functions'

export const deleteDownloadInput = z.object({ downloadId: z.string() })
export type DeleteDownloadInput = z.infer<typeof deleteDownloadInput>

export const listDownloadsQueryOptions = () =>
	queryOptions({
		queryKey: ['downloads'],
		queryFn: () => listDownloadsFn(),
	})
