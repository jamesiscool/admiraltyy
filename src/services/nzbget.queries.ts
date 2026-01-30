import { queryOptions } from '@tanstack/react-query'
import { getNzbgetHistoryFn, getNzbgetQueueFn, getNzbgetStatusFn, getNzbgetVersionFn } from '@/services/nzbget.functions'

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
