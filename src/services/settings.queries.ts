import { queryOptions } from '@tanstack/react-query'
import { getSettingsServerFn } from '@/services/settings.functions'

export const getSettingsOptions = () =>
	queryOptions({
		queryKey: ['settings'],
		queryFn: () => getSettingsServerFn(),
	})
