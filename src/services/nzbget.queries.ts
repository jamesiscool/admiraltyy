import { queryOptions } from '@tanstack/react-query'
import { getNzbgetHistory, getNzbgetQueue, getNzbgetStatus, getNzbgetVersion } from '@/services/nzbget.functions'

export const getNzbgetStatusOptions = () =>
	queryOptions({
		queryKey: ['nzbget', 'status'],
		queryFn: () => getNzbgetStatus(),
	})

export const getNzbgetVersionOptions = () =>
	queryOptions({
		queryKey: ['nzbget', 'version'],
		queryFn: () => getNzbgetVersion(),
	})

export const getNzbgetQueueOptions = () =>
	queryOptions({
		queryKey: ['nzbget', 'queue'],
		queryFn: () => getNzbgetQueue(),
	})

export const getNzbgetHistoryOptions = (showHidden?: boolean) =>
	queryOptions({
		queryKey: ['nzbget', 'history', showHidden],
		queryFn: () => getNzbgetHistory({ data: { showHidden } }),
	})
