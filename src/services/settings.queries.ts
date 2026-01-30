import { queryOptions } from '@tanstack/react-query'
import { getSettingsFn } from '@/services/settings.functions'

export const getSettingsOptions = () =>
	queryOptions({
		queryKey: ['settings'],
		queryFn: () => getSettingsFn(),
	})
