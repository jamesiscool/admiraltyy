import { join, resolve } from 'node:path'
import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

const configDirectory = process.env.CONFIG_DIRECTORY || process.cwd()

export const env = createEnv({
	server: {
		CONFIG_DIRECTORY: z.string().default(process.cwd()),
		SETTINGS_PATH: z.string().default(join(configDirectory, 'admiraltyy.settings.json')),
		DATABASE_PATH: z.string().default(join(configDirectory, 'admiraltyy.db')),
		LOG_DIRECTORY: z.string().default(join(configDirectory, 'logs')),
		BUN_ENV: z.enum(['development', 'test', 'production']).default('production'),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
})

export const paths = {
	configDirectory: resolve(env.CONFIG_DIRECTORY),
	settingsPath: resolve(env.SETTINGS_PATH),
	databasePath: resolve(env.DATABASE_PATH),
	logDirectory: resolve(env.LOG_DIRECTORY),
}
