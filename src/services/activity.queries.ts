import { queryOptions } from '@tanstack/react-query'
import { listDownloadsFn } from '@/services/activity.functions'

export const listDownloadsQueryOptions = () =>
	queryOptions({
		queryKey: ['downloads'],
		queryFn: () => listDownloadsFn(),
	})
