import { createServerFn } from '@tanstack/react-start'
import { settingsSchema } from './settings'

export const getSettingsServerFn = createServerFn({ method: 'GET' }).handler(async () => {
	const { getSettings } = await import('./settings.server')
	return getSettings()
})

export const updateSettingsServerFn = createServerFn({ method: 'POST' })
	.inputValidator(settingsSchema.partial())
	.handler(async ({ data }) => {
		const { updateSettings } = await import('./settings.server')
		return updateSettings(data)
	})

export const testUsenetServerFn = createServerFn({ method: 'POST' })
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
		const { testUsenetServer } = await import('@/services/nzbget.server')
		const result = await testUsenetServer(data)
		return { result }
	})
