import { createServerFn } from '@tanstack/react-start'
import { testUsenetServer } from '@/services/nzbget.server'
import { settingsSchema } from './settings'
import { getSettings, updateSettings } from './settings.server'

export const getSettingsFn = createServerFn({ method: 'GET' }).handler(async () => {
	return getSettings()
})

export const updateSettingsFn = createServerFn({ method: 'POST' })
	.inputValidator(settingsSchema.partial())
	.handler(async ({ data }) => {
		return updateSettings(data)
	})

export const testUsenetFn = createServerFn({ method: 'POST' })
	.inputValidator(
		settingsSchema.shape.usenetServers.element.pick({
			host: true,
			port: true,
			username: true,
			password: true,
			ssl: true,
		}),
	)
	.handler(async ({ data }) => {
		const result = await testUsenetServer(data)
		return { result }
	})
